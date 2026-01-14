
import React, { useState, useEffect, Suspense } from 'react';
import { UserProfile, Recipe, MealSlot, PantryItem, MealCategory, ShoppingItem } from './types';
import { Onboarding } from './components/Onboarding';
import { ErrorBoundary } from './components/ErrorBoundary';
import { supabase, isConfigured } from './lib/supabase';
import * as db from './services/dbService';
import { subtractIngredient, cleanName } from './services/unitService';
import { AuthPage } from './components/AuthPage';
import { initSyncListener } from './services/syncService';
import { STATIC_RECIPES } from './constants';
import { Dialog, DialogOptions, triggerDialog } from './components/Dialog';
import { Logo } from './components/Logo';
import { Home, Calendar, ShoppingBag, BookOpen, Package, User, RefreshCw, AlertCircle, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';

const Dashboard = React.lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const Planner = React.lazy(() => import('./components/Planner').then(module => ({ default: module.Planner })));
const Recipes = React.lazy(() => import('./components/Recipes').then(module => ({ default: module.Recipes })));
const ShoppingList = React.lazy(() => import('./components/ShoppingList').then(module => ({ default: module.ShoppingList })));
const Pantry = React.lazy(() => import('./components/Pantry').then(module => ({ default: module.Pantry })));
const Profile = React.lazy(() => import('./components/Profile').then(module => ({ default: module.Profile })));

type ViewState = 'loading' | 'auth' | 'onboarding' | 'app' | 'error-config' | 'stuck';

const PageLoader = ({ message = "Abriendo cocina...", onReset }: { message?: string, onReset?: () => void }) => (
  <div className="h-screen w-full flex flex-col items-center justify-center bg-[#FDFDFD] p-6 text-center">
    <div className="w-12 h-12 border-4 border-teal-100 border-t-teal-600 rounded-full animate-spin mb-4" />
    <Logo className="animate-pulse scale-90" />
    <p className="text-teal-800 font-black uppercase tracking-widest text-[10px] mt-4">{message}</p>
    {onReset && (
        <button 
            onClick={onReset}
            className="mt-12 flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold text-xs hover:bg-gray-200 transition-all animate-fade-in"
        >
            <RotateCcw className="w-4 h-4" /> ¿Tardando mucho? Forzar Reinicio
        </button>
    )}
  </div>
);

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('loading');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
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
      if (view === 'loading') {
          const timer = setTimeout(() => {
              if (view === 'loading') setView('stuck');
          }, 6000);
          return () => clearTimeout(timer);
      }
  }, [view]);

  useEffect(() => {
    const handleDialog = (e: any) => setDialogOptions(e.detail);
    window.addEventListener('fresco-dialog', handleDialog);
    return () => window.removeEventListener('fresco-dialog', handleDialog);
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadUserData = async (uid: string) => {
    try {
        const [p, r, m, s] = await Promise.all([
          db.fetchPantry(uid), 
          db.fetchRecipes(uid), 
          db.fetchMealPlan(uid), 
          db.fetchShoppingList(uid)
        ]);
        setPantry(p || []); 
        setRecipes(r?.length < 5 ? [...(r || []), ...STATIC_RECIPES.slice(0, 50)] : (r || [])); 
        setMealPlan(m || []); 
        setShoppingList(s || []);
    } catch (e) {
        console.error("Error cargando datos:", e);
    }
  };

  const handleOnboardingComplete = async (profile: UserProfile) => {
    if (!userId) return;
    
    const dbProfile = {
      id: userId,
      email: userEmail || profile.email,
      onboarding_completed: true,
      dietary_preferences: profile.dietary_preferences
    };

    try {
        const { error } = await supabase.from('profiles').upsert(dbProfile);
        if (error) throw error;
        
        setUser({ ...profile, onboarding_completed: true, total_savings: 0, meals_cooked: 0, time_saved_mins: 0, history_savings: [] });
        await loadUserData(userId);
        setActiveTab('dashboard');
        setView('app');
    } catch (err: any) {
        triggerDialog({ 
            title: 'Error al guardar', 
            message: `No pudimos completar tu perfil: ${err.message || 'Error de base de datos'}.`, 
            type: 'alert' 
        });
    }
  };

  useEffect(() => {
    if (!isConfigured) {
        setView('error-config');
        return;
    }

    initSyncListener();
    
    const checkSession = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) await handleSessionChange(session);
            else setView('auth');
        } catch (e) {
            setView('auth');
        }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setView('auth'); setUser(null); setUserId(null); setUserEmail(undefined);
        setMealPlan([]); setPantry([]); setShoppingList([]);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        await handleSessionChange(session);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleSessionChange = async (session: any) => {
    if (!session?.user) return;
    const uid = session.user.id;
    const email = session.user.email;
    
    // Limpieza preventiva para evitar flashes de datos de otra cuenta
    setMealPlan([]); setPantry([]); setShoppingList([]);
    setUserId(uid);
    setUserEmail(email);

    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
      if (profile && profile.onboarding_completed) {
        setUser({ 
            ...profile, 
            name: profile.full_name || profile.name || email.split('@')[0],
            total_savings: profile.total_savings || 0,
            history_savings: profile.history_savings || [] 
        });
        await loadUserData(uid);
        setActiveTab('dashboard'); // Redirección explícita a Home
        setView('app');
      } else {
        setView('onboarding');
      }
    } catch (e) {
      setView('onboarding');
    }
  };

  const handleCookFinish = async (usedIngredients: { name: string, quantity: number, unit?: string }[], recipeId?: string) => {
      if (!userId) return;
      let updatedPantry = [...pantry];
      usedIngredients.forEach(used => {
          const usedName = cleanName(used.name);
          const idx = updatedPantry.findIndex(p => cleanName(p.name).includes(usedName));
          if (idx >= 0) {
              const res = subtractIngredient(updatedPantry[idx].quantity, updatedPantry[idx].unit, used.quantity, used.unit || 'uds');
              if (res) {
                updatedPantry[idx] = { ...updatedPantry[idx], quantity: res.quantity };
                db.updatePantryItemDB(userId, updatedPantry[idx]);
              }
          }
      });
      setPantry(updatedPantry);
      if (recipeId) {
        const today = format(new Date(), 'yyyy-MM-dd');
        const slotIdx = mealPlan.findIndex(p => p.date === today && p.recipeId === recipeId && !p.isCooked);
        if (slotIdx >= 0) {
          const updated = { ...mealPlan[slotIdx], isCooked: true };
          const newPlan = [...mealPlan];
          newPlan[slotIdx] = updated;
          setMealPlan(newPlan);
          db.updateMealSlotDB(userId, updated);
        }
      }
      setToast({ msg: "Inventario actualizado", type: 'success' });
  };

  const handleForceReset = async () => {
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
  };

  if (view === 'error-config') {
      return (
          <div className="h-screen w-full flex flex-col items-center justify-center p-8 bg-red-50 text-center font-sans">
              <AlertCircle className="w-16 h-16 text-red-600 mb-4" />
              <h1 className="text-2xl font-black text-red-900 mb-2">Error de Configuración</h1>
              <p className="text-red-700 max-w-md mb-6">No se han detectado las claves de Supabase.</p>
              <button onClick={handleForceReset} className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold">Limpiar y Reintentar</button>
          </div>
      );
  }

  if (view === 'stuck') return <PageLoader message="La cocina está tardando más de lo habitual..." onReset={handleForceReset} />;
  if (view === 'loading') return <PageLoader />;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#FDFDFD] flex flex-col md:flex-row font-sans overflow-x-hidden">
        {toast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-2xl shadow-2xl bg-teal-900 text-white font-bold animate-slide-up">
            {toast.msg}
          </div>
        )}

        <Dialog isOpen={!!dialogOptions} {...(dialogOptions || { title: '', message: '' })} onClose={() => setDialogOptions(null)} />

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

          <main className="flex-1 md:ml-64 min-h-screen pb-32 md:pb-0">
            <div className="max-w-7xl mx-auto p-4 md:p-8 h-full">
                <Suspense fallback={<PageLoader message="Cargando vista..." />}>
                {activeTab === 'dashboard' && user && <Dashboard user={user} pantry={pantry} mealPlan={mealPlan} recipes={recipes} onNavigate={setActiveTab} onQuickRecipe={() => {}} onResetApp={() => {}} onToggleFavorite={id => setFavoriteIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])} favoriteIds={favoriteIds} />}
                {activeTab === 'planner' && user && <Planner user={user} plan={mealPlan} recipes={recipes} pantry={pantry} onUpdateSlot={(d, t, rid) => {
                    if (rid) {
                      const ns = { date: d, type: t, recipeId: rid, servings: user.household_size, isCooked: false };
                      setMealPlan(p => [...p.filter(x => !(x.date === d && x.type === t)), ns]);
                      db.updateMealSlotDB(userId!, ns);
                    } else {
                      setMealPlan(p => p.filter(x => !(x.date === d && x.type === t)));
                      db.deleteMealSlotDB(userId!, d, t);
                    }
                }} onAIPlanGenerated={(p, r) => { setRecipes(x => [...x, ...r]); setMealPlan(p); }} 
                   onClear={() => { 
                       setMealPlan([]); 
                       db.clearMealPlanDB(userId!); // FIX: Llamada correcta para borrar calendario
                   }} 
                   onCookFinish={handleCookFinish} onAddToShoppingList={(items) => { setShoppingList(prev => [...prev, ...items]); setActiveTab('shopping'); }} />}
                {activeTab === 'pantry' && <Pantry items={pantry} onRemove={id => setPantry(p => p.filter(x => x.id !== id))} onAdd={i => setPantry(p => [...p, i])} onUpdateQuantity={(id, delta) => setPantry(p => p.map(x => x.id === id ? {...x, quantity: x.quantity + delta} : x))} onAddMany={items => setPantry(p => [...p, ...items])} onEdit={i => setPantry(p => p.map(x => x.id === i.id ? i : x))} />}
                {activeTab === 'recipes' && user && <Recipes recipes={recipes} user={user} pantry={pantry} onAddRecipes={r => setRecipes(x => [...x, ...r])} onAddToPlan={(rid, serv, date, type) => {
                     if (date && type) {
                        const ns = { date, type, recipeId: rid.id, servings: serv, isCooked: false };
                        setMealPlan(p => [...p.filter(x => !(x.date === date && x.type === type)), ns]);
                        db.updateMealSlotDB(userId!, ns);
                        setToast({ msg: "Planificado", type: 'success' });
                     }
                }} onCookFinish={handleCookFinish} onAddToShoppingList={(items) => { setShoppingList(prev => [...prev, ...items]); setActiveTab('shopping'); }} favoriteIds={favoriteIds} onToggleFavorite={id => setFavoriteIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])} />}
                {activeTab === 'shopping' && user && <ShoppingList plan={mealPlan} recipes={recipes} pantry={pantry} user={user} dbItems={shoppingList} onAddShoppingItem={s => setShoppingList(x => [...x, ...s])} onUpdateShoppingItem={s => setShoppingList(x => x.map(y => y.id === s.id ? s : y))} onRemoveShoppingItem={id => setShoppingList(x => x.filter(y => y.id !== id))} onFinishShopping={items => setPantry(p => [...p, ...items])} onOpenRecipe={() => {}} onSyncServings={() => {}} />}
                {activeTab === 'profile' && user && <Profile user={user} onUpdate={u => setUser(u)} onLogout={() => supabase.auth.signOut()} onReset={handleForceReset} />}
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
