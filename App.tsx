
import React, { useState, useEffect, Suspense } from 'react';
import { UserProfile, Recipe, MealSlot, PantryItem, MealCategory, ShoppingItem, BatchSession } from './types';
import { Onboarding } from './components/Onboarding';
import { ErrorBoundary } from './components/ErrorBoundary';
import { supabase, isConfigured } from './lib/supabase';
import { generateBatchCookingAI } from './services/geminiService';
import * as db from './services/dbService';
import { subtractIngredient, addIngredient, cleanName, roundSafe } from './services/unitService';
import { AuthPage } from './components/AuthPage';
import { addToSyncQueue, initSyncListener } from './services/syncService';
import { MOCK_USER, FALLBACK_RECIPES, STATIC_RECIPES } from './constants';

const Dashboard = React.lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const Planner = React.lazy(() => import('./components/Planner').then(module => ({ default: module.Planner })));
const Recipes = React.lazy(() => import('./components/Recipes').then(module => ({ default: module.Recipes })));
const ShoppingList = React.lazy(() => import('./components/ShoppingList').then(module => ({ default: module.ShoppingList })));
const Pantry = React.lazy(() => import('./components/Pantry').then(module => ({ default: module.Pantry })));
const Profile = React.lazy(() => import('./components/Profile').then(module => ({ default: module.Profile })));

import { Logo } from './components/Logo';
import { Home, Calendar, ShoppingBag, BookOpen, Package, User, Sparkles, AlertOctagon, FileText, CloudCog, WifiOff, ArrowRight, RefreshCw, X } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';

type ViewState = 'auth' | 'onboarding' | 'app';

const DEMO_USER_ID = 'demo-user-id';

const PageLoader = ({ message = "Cargando Fresco...", showReload = false }: { message?: string, showReload?: boolean }) => (
  <div className="h-full w-full flex flex-col items-center justify-center p-10 min-h-screen bg-[#FDFDFD]">
    <div className="w-12 h-12 border-4 border-teal-100 border-t-teal-600 rounded-full animate-spin mb-4" />
    <Logo className="mb-4 animate-pulse scale-75" />
    <p className="text-teal-800 font-black uppercase tracking-widest text-[10px]">{message}</p>
    <div className="mt-4 flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
        <CloudCog className="w-4 h-4" /> Sincronizando con la nube
    </div>
    {showReload && (
        <button onClick={() => window.location.reload()} className="mt-8 flex items-center gap-2 text-orange-500 font-bold text-xs uppercase tracking-widest hover:text-orange-600">
            <RefreshCw className="w-4 h-4" /> ¿Tarda mucho? Recargar
        </button>
    )}
  </div>
);

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('auth');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [initialRecipeId, setInitialRecipeId] = useState<string | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showLoaderReload, setShowLoaderReload] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info'; action?: { label: string; onClick: () => void } } | null>(null);
  
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mealPlan, setMealPlan] = useState<MealSlot[]>([]);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);

  const [activeBatchSession, setActiveBatchSession] = useState<BatchSession | null>(null);
  const [batchRecipes, setBatchRecipes] = useState<Recipe[]>([]);

  // Estado para Favoritos (Persistente Local)
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
      try {
          const saved = localStorage.getItem('fresco_favorites');
          return saved ? JSON.parse(saved) : [];
      } catch { return []; }
  });

  useEffect(() => {
      localStorage.setItem('fresco_favorites', JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  const toggleFavorite = (id: string) => {
      setFavoriteIds(prev => prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]);
      if (!favoriteIds.includes(id)) {
          setToast({ msg: "Añadido a favoritos", type: 'success' });
      }
  };

  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const recipeParam = params.get('recipe');

      if (recipeParam) {
          setActiveTab('recipes');
          setInitialRecipeId(recipeParam);
      } else if (tabParam) {
          setActiveTab(tabParam);
      }
  }, []);

  // SAFETY TIMEOUT
  useEffect(() => {
      if (!isLoaded) {
          const timer = setTimeout(() => setShowLoaderReload(true), 5000);
          return () => clearTimeout(timer);
      }
  }, [isLoaded]);

  // TOAST TIMEOUT
  useEffect(() => {
      if (toast) {
          const timer = setTimeout(() => setToast(null), 5000);
          return () => clearTimeout(timer);
      }
  }, [toast]);

  if (!isConfigured) {
      return (
          <div className="min-h-screen bg-teal-900 flex flex-col items-center justify-center p-8 text-white text-center animate-fade-in">
              <div className="w-24 h-24 bg-red-500 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl animate-bounce">
                  <AlertOctagon className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-4xl font-black mb-4">Falta Configuración</h1>
              <p className="text-teal-200 text-lg mb-8 max-w-md mx-auto">
                  No hemos detectado las variables de entorno.
                  <br/><br/>
                  <span className="text-sm font-mono bg-black/20 p-2 rounded">
                      Asegúrate de haber añadido <strong>VITE_SUPABASE_URL</strong> y <strong>VITE_SUPABASE_ANON_KEY</strong> en Vercel y haber hecho <strong>Redeploy</strong>.
                  </span>
              </p>
              <button onClick={() => window.location.reload()} className="mt-8 px-8 py-4 bg-white text-teal-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-teal-50 transition-all">
                  Hecho, Recargar
              </button>
          </div>
      );
  }
  
  const normalizeName = (name: string) => cleanName(name);

  // FIX: Bypass DB calls in Demo Mode
  const safeDbCall = async (action: () => Promise<void>, fallbackType: any, fallbackPayload: any) => {
      if (!userId) return;
      if (userId === DEMO_USER_ID) return; // Demo mode bypass

      if (!navigator.onLine) {
          addToSyncQueue(userId, fallbackType, fallbackPayload);
          return;
      }
      try {
          await action();
      } catch (e) {
          console.warn("DB call failed, queueing offline action", e);
          addToSyncQueue(userId, fallbackType, fallbackPayload);
      }
  };

  const smartPantryMerge = async (incomingItems: PantryItem[]) => {
      if (!userId) return;

      let currentPantry = [...pantry];
      let proteinFound = null; 
      
      for (const incoming of incomingItems) {
          if (incoming.category === 'meat' || incoming.category === 'fish') {
              proteinFound = incoming.name;
          }

          const incomingNorm = normalizeName(incoming.name);
          const matchIndex = currentPantry.findIndex(p => {
              const pNorm = normalizeName(p.name);
              return pNorm === incomingNorm || pNorm.includes(incomingNorm) || incomingNorm.includes(pNorm);
          });

          if (matchIndex >= 0) {
              const existingItem = currentPantry[matchIndex];
              const result = addIngredient(existingItem.quantity, existingItem.unit, incoming.quantity, incoming.unit);
              
              const existingExpiry = existingItem.expires_at ? new Date(existingItem.expires_at).getTime() : 0;
              const incomingExpiry = incoming.expires_at ? new Date(incoming.expires_at).getTime() : 0;
              
              let finalExpiryTime = incomingExpiry;
              if (existingExpiry > 0 && existingItem.quantity > 0.2) {
                  finalExpiryTime = Math.min(existingExpiry, incomingExpiry);
              } else if (existingExpiry > 0) {
                  finalExpiryTime = Math.max(existingExpiry, incomingExpiry);
              }

              const mergedItem: PantryItem = {
                  ...existingItem,
                  quantity: result.quantity,
                  unit: result.unit,
                  expires_at: finalExpiryTime > 0 ? new Date(finalExpiryTime).toISOString() : undefined,
                  added_at: new Date().toISOString()
              };

              currentPantry[matchIndex] = mergedItem;
              safeDbCall(() => db.updatePantryItemDB(userId, mergedItem), 'UPDATE_PANTRY', mergedItem);
          } else {
              currentPantry.push(incoming);
              safeDbCall(() => db.addPantryItemDB(userId, incoming), 'ADD_PANTRY', incoming);
          }
      }
      setPantry(currentPantry);

      if (proteinFound) {
          setToast({ 
              msg: `Has añadido ${proteinFound}. ¿Buscamos recetas?`, 
              type: 'info',
              action: {
                  label: 'Ver Recetas',
                  onClick: () => {
                      sessionStorage.setItem('recipes_search', proteinFound || '');
                      setActiveTab('recipes');
                  }
              }
          });
      }
  };

  const handleAddPantry = async (item: PantryItem) => {
      await smartPantryMerge([item]);
      setToast(prev => prev?.action ? prev : { msg: "Producto añadido", type: 'success' });
  };

  const handleRemovePantry = (id: string) => {
      setPantry(prev => prev.filter(i => i.id !== id));
      safeDbCall(() => db.deletePantryItemDB(id), 'DELETE_PANTRY', { id });
  };

  const handleUpdatePantryQuantity = (id: string, delta: number) => {
      setPantry(prev => {
          const updatedPantry = [...prev];
          const index = updatedPantry.findIndex(i => i.id === id);
          if (index === -1) return prev;

          const item = updatedPantry[index];
          const newQuantity = roundSafe(item.quantity + delta);

          if (newQuantity <= 0) {
              safeDbCall(() => db.deletePantryItemDB(id), 'DELETE_PANTRY', { id });
              updatedPantry.splice(index, 1);
          } else {
              const updated = { ...item, quantity: newQuantity };
              updatedPantry[index] = updated;
              safeDbCall(() => db.updatePantryItemDB(userId!, updated), 'UPDATE_PANTRY', updated);
          }
          return updatedPantry;
      });
  };

  const handleUpdatePantryItem = (item: PantryItem) => {
      setPantry(prev => prev.map(i => i.id === item.id ? item : i));
      safeDbCall(() => db.updatePantryItemDB(userId!, item), 'UPDATE_PANTRY', item);
  };

  const handleWasteReport = (item: PantryItem, valueLost: number) => {
      if (user && userId) {
          const newTotalSavings = Math.max(0, user.total_savings - valueLost);
          const updatedUser = { ...user, total_savings: newTotalSavings };
          setUser(updatedUser);
          
          safeDbCall(
              async () => { await supabase.from('profiles').update({ total_savings: newTotalSavings }).eq('id', userId); },
              'UPDATE_PROFILE',
              { total_savings: newTotalSavings }
          );
          
          setToast({ msg: `Desperdicio registrado (-${valueLost.toFixed(2)}€). ¡Ánimo para la próxima!`, type: 'info' });
      }
  };

  const handleAddRecipes = (newRecipes: Recipe[]) => {
      setRecipes(prev => [...prev, ...newRecipes]);
      if (userId) {
          db.saveRecipesBulkDB(userId, newRecipes).catch(e => console.error("Error saving generated recipes", e));
      }
  };

  const handleUpdateSlot = (date: string, type: MealCategory, recipeId: string | undefined) => {
      if (!userId) return;
      
      if (recipeId) {
          const newSlot: MealSlot = { date, type, recipeId, servings: user?.household_size || 1, isCooked: false };
          setMealPlan(prev => {
              const others = prev.filter(p => !(p.date === date && p.type === type));
              return [...others, newSlot];
          });
          safeDbCall(() => db.updateMealSlotDB(userId, newSlot), 'UPDATE_SLOT', newSlot);
      } else {
          setMealPlan(prev => prev.filter(p => !(p.date === date && p.type === type)));
          safeDbCall(() => db.deleteMealSlotDB(userId, date, type), 'DELETE_SLOT', { date, type });
      }
  };

  const handleClearPlan = () => {
      const oldPlan = [...mealPlan];
      setMealPlan([]);
      if (userId) {
          oldPlan.forEach(p => {
              safeDbCall(() => db.deleteMealSlotDB(userId, p.date, p.type), 'DELETE_SLOT', { date: p.date, type: p.type });
          });
      }
  };

  const handleAddToPlan = (recipe: Recipe, servings: number, date?: string, type?: MealCategory) => {
      const targetDate = date || format(new Date(), 'yyyy-MM-dd');
      const targetType = type || recipe.meal_category;
      
      const newSlot: MealSlot = { date: targetDate, type: targetType, recipeId: recipe.id, servings, isCooked: false };
      
      setMealPlan(prev => {
          const cleanPrev = prev.filter(p => !(p.date === targetDate && p.type === targetType));
          return [...cleanPrev, newSlot];
      });
      
      if (userId) safeDbCall(() => db.updateMealSlotDB(userId, newSlot), 'UPDATE_SLOT', newSlot);
  };

  const handleFinishShopping = async (items: PantryItem[]) => {
      setToast({ msg: "Guardando compra...", type: 'success' });
      await smartPantryMerge(items);
  };

  const handleAddToShoppingList = (items: ShoppingItem[]) => {
      if (!userId) return;
      
      const newItems = items.map(i => ({
          ...i, 
          id: i.id || `shop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }));

      setShoppingList(prev => [...prev, ...newItems]);

      newItems.forEach(item => {
          safeDbCall(() => db.addShoppingItemDB(userId, item), 'ADD_SHOPPING', item);
      });

      const names = items.map(i => i.name).slice(0, 2).join(', ');
      const more = items.length > 2 ? ` y ${items.length - 2} más` : '';
      
      setToast({ 
          msg: `Añadido: ${names}${more}`, 
          type: 'success',
          action: { label: 'Ver Lista', onClick: () => setActiveTab('shopping') }
      });
  };

  const handleUpdateShoppingItem = (item: ShoppingItem) => {
      if (!userId) return;
      setShoppingList(prev => prev.map(i => i.id === item.id ? item : i));
      safeDbCall(() => db.updateShoppingItemDB(userId, item), 'UPDATE_SHOPPING', item);
  };

  const handleRemoveShoppingItem = (id: string) => {
      if (!userId) return;
      setShoppingList(prev => prev.filter(i => i.id !== id));
      safeDbCall(() => db.deleteShoppingItemDB(id), 'DELETE_SHOPPING', { id });
  };

  const handleCookFinish = async (usedIngredients: { name: string, quantity: number, unit?: string }[], recipeId?: string) => {
      if (!userId) return;

      let updatedPantry = [...pantry];
      
      usedIngredients.forEach(used => {
          const usedName = normalizeName(used.name);
          const pantryIndex = updatedPantry.findIndex(p => {
              const pName = normalizeName(p.name);
              return pName === usedName || pName.includes(usedName) || usedName.includes(pName);
          });

          if (pantryIndex >= 0) {
              const item = updatedPantry[pantryIndex];
              const result = subtractIngredient(
                  item.quantity, 
                  item.unit, 
                  used.quantity, 
                  used.unit || 'uds'
              );

              if (result) {
                  const newItem = { ...item, quantity: result.quantity, unit: result.unit };
                  if (newItem.quantity <= 0.05) {
                      updatedPantry.splice(pantryIndex, 1);
                      safeDbCall(() => db.deletePantryItemDB(item.id), 'DELETE_PANTRY', { id: item.id });
                  } else {
                      updatedPantry[pantryIndex] = newItem;
                      safeDbCall(() => db.updatePantryItemDB(userId, newItem), 'UPDATE_PANTRY', newItem);
                  }
              }
          }
      });

      setPantry(updatedPantry);
      
      if (recipeId) {
          const today = format(new Date(), 'yyyy-MM-dd');
          let slotIndex = mealPlan.findIndex(p => p.date === today && p.recipeId === recipeId && !p.isCooked);
          
          if (slotIndex >= 0) {
              const updatedSlot = { ...mealPlan[slotIndex], isCooked: true };
              setMealPlan(prev => {
                  const newPlan = [...prev];
                  newPlan[slotIndex] = updatedSlot;
                  return newPlan;
              });
              safeDbCall(() => db.updateMealSlotDB(userId, updatedSlot), 'UPDATE_SLOT', updatedSlot);
          }
      }

      if (user) {
          const newUserStats = { 
              ...user, 
              meals_cooked: (user.meals_cooked || 0) + 1 
          };
          setUser(newUserStats);
          safeDbCall(
              async () => { await supabase.from('profiles').update({ meals_cooked: newUserStats.meals_cooked }).eq('id', userId); },
              'UPDATE_PROFILE',
              { meals_cooked: newUserStats.meals_cooked }
          );
      }
      
      setToast({ msg: "Cocinado (Stock actualizado)", type: 'success' });
  };

  const handleQuickRecipeSearch = (ingredientName: string) => {
      sessionStorage.setItem('recipes_search', ingredientName);
      setActiveTab('recipes');
  };

  const handleOnboardingComplete = async (profile: UserProfile) => {
      if (!userId) return;

      const updatedUser: UserProfile = { ...profile, onboarding_completed: true };
      setUser(updatedUser);

      // FIX CRITICO: Inicializar Recetas Estáticas inmediatamente para que la biblioteca no salga vacía
      // Si el usuario es vegetariano, intentamos priorizar/filtrar las recetas estáticas, pero siempre cargamos algo.
      const isVegetarian = profile.dietary_preferences.includes('vegetarian') || profile.dietary_preferences.includes('vegan');
      const filteredStatic = isVegetarian 
          ? STATIC_RECIPES.filter(r => r.dietary_tags.includes('vegetarian') || r.dietary_tags.includes('vegan')) 
          : STATIC_RECIPES;
          
      // Si el filtrado deja vacío (que no debería), usamos todas
      const initialRecipesSource = filteredStatic.length > 0 ? filteredStatic : STATIC_RECIPES;
      
      const seedRecipes = initialRecipesSource.map(r => ({
          ...r,
          id: `static-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          user_id: userId
      }));
      
      setRecipes(seedRecipes); // Estado UI instantáneo

      // También poblamos la despensa básica
      const seedPantry = [
          { id: `start-1-${Date.now()}`, name: 'Aceite de Oliva', quantity: 1, unit: 'l', category: 'pantry', added_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86400000 * 365).toISOString() },
          { id: `start-2-${Date.now()}`, name: 'Sal', quantity: 1, unit: 'kg', category: 'spices', added_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86400000 * 700).toISOString() },
      ].map(p => ({...p, user_id: userId}));
      setPantry(seedPantry); // Estado UI instantáneo

      if (userId === DEMO_USER_ID) {
          setView('app');
          return;
      }

      // Persistencia en segundo plano
      const { error } = await supabase.from('profiles').upsert({
          id: userId,
          dietary_preferences: profile.dietary_preferences,
          favorite_cuisines: profile.favorite_cuisines,
          household_size: profile.household_size,
          cooking_experience: profile.cooking_experience,
          onboarding_completed: true,
          full_name: profile.name || user?.name || 'Usuario', 
          updated_at: new Date().toISOString()
      });

      if (error) console.error("Error saving profile", error);
      
      // Guardar recetas y despensa inicial en DB
      db.saveRecipesBulkDB(userId, seedRecipes).catch(e => console.error("Error background seeding recipes", e));
      db.addPantryItemsBulkDB(userId, seedPantry).catch(e => console.error("Error background seeding pantry", e));

      setView('app');
  };

  useEffect(() => {
    initSyncListener(); 

    const handleCustomToast = (e: any) => setToast({ msg: e.detail.message, type: e.detail.type || 'info', action: e.detail.action });
    window.addEventListener('fresco-toast', handleCustomToast);

    const handleForceRepopulate = async () => {
        if (userId) {
            await db.forceRepopulateRecipes(userId);
            const newRecipes = await db.fetchRecipes(userId);
            setRecipes(newRecipes);
        }
    };
    window.addEventListener('fresco-force-repopulate', handleForceRepopulate);

    const handleOnline = () => { setIsOnline(true); setToast({ msg: 'Conexión recuperada', type: 'success' }); };
    const handleOffline = () => { setIsOnline(false); setToast({ msg: 'Modo Offline: Los cambios se guardarán luego.', type: 'info' }); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const initData = async (uid: string, profileData: any) => {
        setIsLoaded(false);
        try {
            const appUser: UserProfile = {
                name: profileData.full_name,
                dietary_preferences: profileData.dietary_preferences || [],
                favorite_cuisines: profileData.favorite_cuisines || [],
                cooking_experience: profileData.cooking_experience || 'intermediate',
                household_size: profileData.household_size || 1,
                onboarding_completed: profileData.onboarding_completed || false,
                total_savings: profileData.total_savings || 0,
                meals_cooked: profileData.meals_cooked || 0,
                time_saved_mins: profileData.time_saved_mins || 0,
                history_savings: []
            };
            setUser(appUser);
            setUserId(uid);

            if (appUser.onboarding_completed) {
                const [fetchedPantry, fetchedRecipes, fetchedPlan, fetchedShopping] = await Promise.all([
                    db.fetchPantry(uid),
                    db.fetchRecipes(uid),
                    db.fetchMealPlan(uid),
                    db.fetchShoppingList(uid)
                ]);

                // Si por alguna razón la DB está vacía pero el user completó onboarding (bug previo), re-sembrar.
                let finalRecipes = fetchedRecipes;
                if (fetchedRecipes.length === 0) {
                     const isVegetarian = appUser.dietary_preferences.includes('vegetarian') || appUser.dietary_preferences.includes('vegan');
                     const filteredStatic = isVegetarian 
                        ? STATIC_RECIPES.filter(r => r.dietary_tags.includes('vegetarian') || r.dietary_tags.includes('vegan')) 
                        : STATIC_RECIPES;
                     const fallbackRecipes = filteredStatic.length > 0 ? filteredStatic : STATIC_RECIPES;

                     const seedRecipes = fallbackRecipes.map(r => ({
                        ...r,
                        id: `static-recover-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        user_id: uid
                    }));
                    finalRecipes = seedRecipes;
                    db.saveRecipesBulkDB(uid, seedRecipes).catch(e => console.error("Error recovering recipes", e));
                }
                
                setPantry(fetchedPantry);
                setRecipes(finalRecipes);
                setMealPlan(fetchedPlan);
                setShoppingList(fetchedShopping);
                
                setView('app');
            } else {
                setView('onboarding');
            }
        } catch (e) {
            console.error("Error initializing app:", e);
            setToast({ msg: "Error cargando datos.", type: 'error' });
        } finally {
            setIsLoaded(true);
        }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            if (profile) {
                await initData(session.user.id, profile);
            } else {
                setView('onboarding');
                setIsLoaded(true);
            }
        } else if (event === 'SIGNED_OUT') {
            setView('auth');
            setUser(null);
            setUserId(null);
            setRecipes([]);
            setMealPlan([]);
            setPantry([]);
            setShoppingList([]);
            setIsLoaded(true);
        } else {
             if (!session) {
                 setIsLoaded(true);
             }
        }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('fresco-toast', handleCustomToast);
      window.removeEventListener('fresco-force-repopulate', handleForceRepopulate);
      authListener.subscription.unsubscribe();
    };
  }, []); // FIXED: Removed [userId] dependency to prevent infinite loop

  const handleStartBatch = async () => {
      if (!isOnline) {
          setToast({ msg: "Batch Cooking requiere internet para la IA.", type: 'error' });
          return;
      }
      const today = format(new Date(), 'yyyy-MM-dd');
      const upcomingRecipes = mealPlan
          .filter(slot => slot.date >= today && slot.recipeId)
          .map(slot => recipes.find(r => r.id === slot.recipeId))
          .filter(Boolean) as Recipe[];

      if (upcomingRecipes.length < 2) {
          alert("Añade al menos 2 recetas a tu plan semanal para usar Batch Cooking.");
          return;
      }

      setToast({ msg: "Generando sesión eficiente...", type: 'success' });
      const session = await generateBatchCookingAI(upcomingRecipes.slice(0, 3));
      setBatchRecipes(upcomingRecipes.slice(0, 3));
      setActiveBatchSession(session);
  };

  const finishBatch = async (timeSaved: number, completedIds: string[]) => {
      const completedRecipes = batchRecipes.filter(r => completedIds.includes(r.id));
      const usedIngredients: {name: string, quantity: number, unit: string}[] = [];
      completedRecipes.forEach(rec => {
          rec.ingredients.forEach(ing => {
              usedIngredients.push({name: ing.name, quantity: ing.quantity, unit: ing.unit});
          });
      });

      if (usedIngredients.length > 0) {
          await handleCookFinish(usedIngredients); 
      }

      if (user && userId) {
          const updatedUser = { 
              ...user, 
              time_saved_mins: (user.time_saved_mins || 0) + timeSaved,
              meals_cooked: (user.meals_cooked || 0) + completedRecipes.length 
          };
          setUser(updatedUser);
          safeDbCall(
              async () => {
                  await supabase.from('profiles').update({
                      time_saved_mins: updatedUser.time_saved_mins,
                      meals_cooked: updatedUser.meals_cooked
                  }).eq('id', userId);
              },
              'UPDATE_PROFILE',
              { time_saved_mins: updatedUser.time_saved_mins, meals_cooked: updatedUser.meals_cooked }
          );
      }
      setActiveBatchSession(null);
      setToast({ msg: `¡Sesión terminada! ${completedRecipes.length} platos listos.`, type: 'success' });
  };

  if (!isLoaded) return <PageLoader showReload={showLoaderReload} />;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#FDFDFD] flex flex-col md:flex-row overflow-x-hidden font-sans">
        {toast && (
            <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9000] px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-slide-up ${toast.type === 'success' ? 'bg-green-500 text-white' : toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-teal-900 text-white'}`}>
                {toast.type === 'success' ? <CloudCog className="w-5 h-5" /> : toast.type === 'error' ? <AlertOctagon className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                <span className="font-bold text-sm">{toast.msg}</span>
                <button onClick={() => setToast(null)} className="ml-2 hover:opacity-50"><X className="w-4 h-4" /></button>
            </div>
        )}

        {view === 'auth' ? <AuthPage onLogin={() => {}} onSignup={() => {}} /> : 
         view === 'onboarding' ? <Onboarding onComplete={handleOnboardingComplete} /> :
         <>
          {/* SIDEBAR: Fixed Left - Matches Design */}
          <aside className="hidden md:flex flex-col w-64 bg-teal-900 text-white fixed h-full z-50 shadow-2xl">
            <div className="p-8">
                <Logo variant="inverted" />
            </div>
            <nav className="flex-1 px-4 space-y-2 mt-4">
                {[
                  {id:'dashboard', icon:Home, label:'Impacto'}, 
                  {id:'planner', icon:Calendar, label:'Calendario'}, 
                  {id:'pantry', icon:Package, label:'Despensa'}, 
                  {id:'recipes', icon:BookOpen, label:'Recetas'}, 
                  {id:'shopping', icon:ShoppingBag, label:'Lista'}, 
                  {id:'profile', icon:User, label:'Perfil'}
                ].map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => setActiveTab(item.id)} 
                    className={`w-full flex items-center gap-4 px-5 py-3 rounded-xl transition-all group ${activeTab === item.id ? 'bg-white text-teal-900 font-bold shadow-lg' : 'text-teal-100 hover:bg-white/10'}`}
                  >
                    <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-teal-900' : 'text-teal-400 group-hover:text-white'}`} /> 
                    <span className="text-sm font-medium tracking-wide">{item.label}</span>
                  </button>
                ))}
            </nav>
            <div className="p-8">
                <div className="bg-teal-800 rounded-2xl p-4 flex items-center gap-3 border border-teal-700">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center font-bold text-xs">
                        {user?.name?.[0] || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{user?.name}</p>
                        <p className="text-[10px] text-teal-300 truncate">Plan Gratuito</p>
                    </div>
                </div>
            </div>
          </aside>

          {/* MAIN CONTENT AREA */}
          <main className="flex-1 md:ml-64 min-h-screen bg-[#FDFDFD] w-full pb-32 md:pb-0">
            <div className="max-w-7xl mx-auto p-4 md:p-8 h-full">
                <Suspense fallback={<PageLoader message="Cargando módulo..." />}>
                {activeTab === 'dashboard' && user && <Dashboard 
                    user={user} 
                    pantry={pantry} 
                    mealPlan={mealPlan} 
                    recipes={recipes}   
                    onNavigate={setActiveTab} 
                    onQuickRecipe={handleQuickRecipeSearch} 
                    onResetApp={() => {}} 
                    isOnline={isOnline} 
                    onQuickConsume={(id) => handleUpdatePantryQuantity(id, -1)} 
                    onAddToPlan={(r, servings) => handleAddToPlan(r, servings || user.household_size)}
                    favoriteIds={favoriteIds}
                    onToggleFavorite={toggleFavorite}
                />}
                
                {activeTab === 'planner' && user && <Planner user={user} plan={mealPlan} recipes={recipes} pantry={pantry} 
                    onUpdateSlot={handleUpdateSlot} 
                    onAIPlanGenerated={(p, r) => { handleAddRecipes(r); setMealPlan(p); if(userId) p.forEach(s => db.updateMealSlotDB(userId, s)); }} 
                    onClear={handleClearPlan} 
                    onAddToPlan={(r, servings) => handleAddToPlan(r, servings || user.household_size)} 
                    onCookFinish={handleCookFinish}
                    onAddToShoppingList={handleAddToShoppingList} 
                    isOnline={isOnline} />}
                
                {activeTab === 'pantry' && <Pantry items={pantry} 
                    onRemove={handleRemovePantry} 
                    onAdd={handleAddPantry} 
                    onUpdateQuantity={handleUpdatePantryQuantity} 
                    onAddMany={(items) => smartPantryMerge(items)} 
                    onEdit={handleUpdatePantryItem} 
                    onWaste={handleWasteReport} 
                    onCook={handleQuickRecipeSearch} 
                    isOnline={isOnline} />}
                
                {activeTab === 'recipes' && user && <Recipes recipes={recipes} user={user} pantry={pantry} 
                    onAddRecipes={handleAddRecipes} 
                    onAddToPlan={(r, servings, date, type) => handleAddToPlan(r, servings || user.household_size, date, type)} 
                    onCookFinish={(used, rId) => handleCookFinish(used, rId)}
                    onAddToShoppingList={handleAddToShoppingList}
                    isOnline={isOnline} 
                    initialRecipeId={initialRecipeId}
                />}
                
                {activeTab === 'shopping' && user && <ShoppingList 
                    plan={mealPlan} 
                    recipes={recipes} 
                    pantry={pantry} 
                    user={user} 
                    dbItems={shoppingList}
                    onAddShoppingItem={handleAddToShoppingList}
                    onUpdateShoppingItem={handleUpdateShoppingItem}
                    onRemoveShoppingItem={handleRemoveShoppingItem}
                    onFinishShopping={handleFinishShopping} 
                    onOpenRecipe={() => {}} 
                    onSyncServings={() => {}} 
                />}
                
                {activeTab === 'profile' && user && <Profile user={user} 
                    onUpdate={(u) => { setUser(u); if(userId) supabase.from('profiles').update({ household_size: u.household_size, dietary_preferences: u.dietary_preferences }).eq('id', userId); }} 
                    onLogout={() => {
                        if(userId === DEMO_USER_ID) {
                            setUserId(null); setUser(null); setView('auth');
                        } else {
                            supabase.auth.signOut();
                        }
                    }} 
                    onReset={() => {
                        if(userId) {
                            alert("Para borrar la cuenta completamente contacta con soporte.");
                        }
                    }} />}
                </Suspense>
            </div>
          </main>
          
           {/* Mobile Nav */}
           <nav className="md:hidden fixed bottom-6 left-4 right-4 z-[800] bg-teal-800/95 backdrop-blur-3xl p-1.5 rounded-3xl shadow-2xl flex gap-1 safe-pb">
              {[
                {id:'dashboard', icon:Home}, 
                {id:'planner', icon:Calendar}, 
                {id:'pantry', icon:Package}, 
                {id:'recipes', icon:BookOpen}, 
                {id:'shopping', icon:ShoppingBag}, 
                {id:'profile', icon:User}
              ].map(item => (
                  <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${activeTab === item.id ? 'bg-white text-teal-800' : 'text-teal-100 opacity-40'}`}>
                      <item.icon className="w-5 h-5" />
                  </button>
              ))}
          </nav>
         </>
        }
      </div>
    </ErrorBoundary>
  );
};

export default App;
