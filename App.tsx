
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
import { Dialog, DialogOptions } from './components/Dialog';

const Dashboard = React.lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const Planner = React.lazy(() => import('./components/Planner').then(module => ({ default: module.Planner })));
const Recipes = React.lazy(() => import('./components/Recipes').then(module => ({ default: module.Recipes })));
const ShoppingList = React.lazy(() => import('./components/ShoppingList').then(module => ({ default: module.ShoppingList })));
const Pantry = React.lazy(() => import('./components/Pantry').then(module => ({ default: module.Pantry })));
const Profile = React.lazy(() => import('./components/Profile').then(module => ({ default: module.Profile })));

import { Logo } from './components/Logo';
import { Home, Calendar, ShoppingBag, BookOpen, Package, User, Sparkles, AlertOctagon, CloudCog, WifiOff, RefreshCw, X } from 'lucide-react';
import { format } from 'date-fns';

type ViewState = 'auth' | 'onboarding' | 'app';
const DEMO_USER_ID = 'demo-user-id';

const PageLoader = ({ message = "Cargando Fresco...", showReload = false }: { message?: string, showReload?: boolean }) => (
  <div className="h-full w-full flex flex-col items-center justify-center p-10 min-h-screen bg-[#FDFDFD]">
    <div className="w-12 h-12 border-4 border-teal-100 border-t-teal-600 rounded-full animate-spin mb-4" />
    <Logo className="mb-4 animate-pulse scale-75" />
    <p className="text-teal-800 font-black uppercase tracking-widest text-[10px]">{message}</p>
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
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Dialog State
  const [dialogOptions, setDialogOptions] = useState<DialogOptions | null>(null);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mealPlan, setMealPlan] = useState<MealSlot[]>([]);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
      try { return JSON.parse(localStorage.getItem('fresco_favorites') || '[]'); } catch { return []; }
  });

  useEffect(() => { localStorage.setItem('fresco_favorites', JSON.stringify(favoriteIds)); }, [favoriteIds]);

  useEffect(() => {
    const handleDialog = (e: any) => setDialogOptions(e.detail);
    window.addEventListener('fresco-dialog', handleDialog);
    return () => window.removeEventListener('fresco-dialog', handleDialog);
  }, []);

  useEffect(() => {
      if (toast) {
          const timer = setTimeout(() => setToast(null), 5000);
          return () => clearTimeout(timer);
      }
  }, [toast]);

  const handleCookFinish = async (usedIngredients: { name: string, quantity: number, unit?: string }[], recipeId?: string) => {
      if (!userId) return;
      let updatedPantry = [...pantry];
      usedIngredients.forEach(used => {
          const usedName = cleanName(used.name);
          const pantryIndex = updatedPantry.findIndex(p => {
              const pName = cleanName(p.name);
              return pName === usedName || pName.includes(usedName) || usedName.includes(pName);
          });
          if (pantryIndex >= 0) {
              const item = updatedPantry[pantryIndex];
              const result = subtractIngredient(item.quantity, item.unit, used.quantity, used.unit || 'uds');
              if (result) {
                  const newItem = { ...item, quantity: result.quantity, unit: result.unit };
                  if (newItem.quantity <= 0.05) {
                      updatedPantry.splice(pantryIndex, 1);
                      db.deletePantryItemDB(item.id);
                  } else {
                      updatedPantry[pantryIndex] = newItem;
                      db.updatePantryItemDB(userId, newItem);
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
              db.updateMealSlotDB(userId, updatedSlot);
          }
      }
      setToast({ msg: "Stock actualizado", type: 'success' });
  };

  const handleOnboardingComplete = async (profile: UserProfile) => {
      if (!userId) return;
      const updatedUser: UserProfile = { ...profile, onboarding_completed: true };
      setUser(updatedUser);
      const seedRecipes = STATIC_RECIPES.map(r => ({ ...r, id: `st-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, user_id: userId }));
      setRecipes(seedRecipes);
      const seedPantry = [
          { id: `s1-${Date.now()}`, name: 'Aceite de Oliva', quantity: 1, unit: 'l', category: 'pantry', added_at: new Date().toISOString() },
          { id: `s2-${Date.now()}`, name: 'Sal', quantity: 1, unit: 'kg', category: 'spices', added_at: new Date().toISOString() },
      ].map(p => ({...p, user_id: userId}));
      setPantry(seedPantry);
      await supabase.from('profiles').upsert({ id: userId, ...profile, full_name: profile.name, onboarding_completed: true });
      db.saveRecipesBulkDB(userId, seedRecipes);
      db.addPantryItemsBulkDB(userId, seedPantry);
      setView('app');
  };

  useEffect(() => {
    initSyncListener();
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
            setView('auth');
            setUser(null); setUserId(null); setIsLoaded(true);
            return;
        }
        if (session?.user) {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            if (profile) {
                setUser({ ...profile, name: profile.full_name, onboarding_completed: profile.onboarding_completed });
                setUserId(session.user.id);
                if (profile.onboarding_completed) {
                    const [p, r, m, s] = await Promise.all([db.fetchPantry(session.user.id), db.fetchRecipes(session.user.id), db.fetchMealPlan(session.user.id), db.fetchShoppingList(session.user.id)]);
                    setPantry(p); setRecipes(r.length < 5 ? [...r, ...STATIC_RECIPES.slice(0, 50)] : r); setMealPlan(m); setShoppingList(s);
                    setView('app');
                } else setView('onboarding');
            } else setView('onboarding');
            setIsLoaded(true);
        } else {
            setView('auth'); setIsLoaded(true);
        }
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  if (!isLoaded) return <PageLoader />;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#FDFDFD] flex flex-col md:flex-row overflow-x-hidden font-sans">
        {toast && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9000] px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-slide-up bg-teal-900 text-white">
                <span className="font-bold text-sm">{toast.msg}</span>
            </div>
        )}

        <Dialog 
          isOpen={!!dialogOptions} 
          {...(dialogOptions || { title: '', message: '' })} 
          onClose={() => setDialogOptions(null)} 
        />

        {view === 'auth' ? <AuthPage onLogin={() => {}} onSignup={() => {}} /> : 
         view === 'onboarding' ? <Onboarding onComplete={handleOnboardingComplete} /> :
         <>
          <aside className="hidden md:flex flex-col w-64 bg-teal-900 text-white fixed h-full z-50">
            <div className="p-8"><Logo variant="inverted" /></div>
            <nav className="flex-1 px-4 space-y-2 mt-4">
                {[
                  {id:'dashboard', icon:Home, label:'Home'},
                  {id:'planner', icon:Calendar, label:'Calendario'}, 
                  {id:'pantry', icon:Package, label:'Despensa'}, 
                  {id:'recipes', icon:BookOpen, label:'Recetas'}, 
                  {id:'shopping', icon:ShoppingBag, label:'Lista'}, 
                  {id:'profile', icon:User, label:'Perfil'}
                ].map(item => (
                  <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-5 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-white text-teal-900 font-bold shadow-lg' : 'text-teal-100 hover:bg-white/10'}`}>
                    <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-teal-900' : 'text-teal-400'}`} /> 
                    <span className="text-sm font-medium tracking-wide">{item.label}</span>
                  </button>
                ))}
            </nav>
          </aside>

          <main className="flex-1 md:ml-64 min-h-screen bg-[#FDFDFD] w-full pb-32 md:pb-0">
            <div className="max-w-7xl mx-auto p-4 md:p-8 h-full">
                <Suspense fallback={<PageLoader />}>
                {activeTab === 'dashboard' && user && <Dashboard user={user} pantry={pantry} mealPlan={mealPlan} recipes={recipes} onNavigate={setActiveTab} onQuickRecipe={() => {}} onResetApp={() => {}} isOnline={isOnline} onToggleFavorite={id => setFavoriteIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])} favoriteIds={favoriteIds} />}
                {activeTab === 'planner' && user && <Planner user={user} plan={mealPlan} recipes={recipes} pantry={pantry} onUpdateSlot={(d, t, rid) => {
                    if (rid) {
                      const ns = { date: d, type: t, recipeId: rid, servings: user.household_size, isCooked: false };
                      setMealPlan(p => [...p.filter(x => !(x.date === d && x.type === t)), ns]);
                      db.updateMealSlotDB(userId!, ns);
                    } else {
                      setMealPlan(p => p.filter(x => !(x.date === d && x.type === t)));
                      db.deleteMealSlotDB(userId!, d, t);
                    }
                }} onAIPlanGenerated={(p, r) => { setRecipes(x => [...x, ...r]); setMealPlan(p); }} onClear={() => setMealPlan([])} onCookFinish={handleCookFinish} onAddToShoppingList={setShoppingList} isOnline={isOnline} />}
                {activeTab === 'pantry' && <Pantry items={pantry} onRemove={id => setPantry(p => p.filter(x => x.id !== id))} onAdd={i => setPantry(p => [...p, i])} onUpdateQuantity={(id, delta) => setPantry(p => p.map(x => x.id === id ? {...x, quantity: x.quantity + delta} : x))} onAddMany={items => setPantry(p => [...p, ...items])} onEdit={i => setPantry(p => p.map(x => x.id === i.id ? i : x))} isOnline={isOnline} />}
                {activeTab === 'recipes' && user && <Recipes recipes={recipes} user={user} pantry={pantry} onAddRecipes={r => setRecipes(x => [...x, ...r])} onAddToPlan={(r, s, d, t) => {}} onCookFinish={handleCookFinish} onAddToShoppingList={() => {}} isOnline={isOnline} initialRecipeId={initialRecipeId} />}
                {activeTab === 'shopping' && user && <ShoppingList plan={mealPlan} recipes={recipes} pantry={pantry} user={user} dbItems={shoppingList} onAddShoppingItem={s => setShoppingList(x => [...x, ...s])} onUpdateShoppingItem={s => setShoppingList(x => x.map(y => y.id === s.id ? s : y))} onRemoveShoppingItem={id => setShoppingList(x => x.filter(y => y.id !== id))} onFinishShopping={items => setPantry(p => [...p, ...items])} onOpenRecipe={() => {}} onSyncServings={() => {}} />}
                {activeTab === 'profile' && user && <Profile user={user} onUpdate={u => setUser(u)} onLogout={() => supabase.auth.signOut()} onReset={() => {}} />}
                </Suspense>
            </div>
          </main>
          
           <nav className="md:hidden fixed bottom-6 left-4 right-4 z-[800] bg-teal-800/95 backdrop-blur-3xl p-1.5 rounded-3xl shadow-2xl flex gap-1 safe-pb">
              {[ {id:'dashboard', icon:Home}, {id:'planner', icon:Calendar}, {id:'pantry', icon:Package}, {id:'recipes', icon:BookOpen}, {id:'shopping', icon:ShoppingBag}, {id:'profile', icon:User} ].map(item => (
                  <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${activeTab === item.id ? 'bg-white text-teal-800' : 'text-teal-100 opacity-40'}`}><item.icon className="w-5 h-5" /></button>
              ))}
          </nav>
         </>
        }
      </div>
    </ErrorBoundary>
  );
};

export default App;
