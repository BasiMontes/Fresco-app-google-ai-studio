
import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { UserProfile, Recipe, MealSlot, PantryItem, MealCategory, ShoppingItem } from './types';
import { Onboarding } from './components/Onboarding';
import { ErrorBoundary } from './components/ErrorBoundary';
import { supabase, isConfigured } from './lib/supabase';
import * as db from './services/dbService';
import { AuthPage } from './components/AuthPage';
import { initSyncListener, addToSyncQueue } from './services/syncService';
import { STATIC_RECIPES } from './constants';
import { Dialog, DialogOptions } from './components/Dialog';
import { Logo } from './components/Logo';
import { Home, Calendar, ShoppingBag, BookOpen, Package, User, RotateCcw } from 'lucide-react';

const Dashboard = React.lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const Planner = React.lazy(() => import('./components/Planner').then(module => ({ default: module.Planner })));
const Recipes = React.lazy(() => import('./components/Recipes').then(module => ({ default: module.Recipes })));
const ShoppingList = React.lazy(() => import('./components/ShoppingList').then(module => ({ default: module.ShoppingList })));
const Pantry = React.lazy(() => import('./components/Pantry').then(module => ({ default: module.Pantry })));
const Profile = React.lazy(() => import('./components/Profile').then(module => ({ default: module.Profile })));
const Settings = React.lazy(() => import('./components/Settings').then(module => ({ default: module.Settings })));
const FAQ = React.lazy(() => import('./components/FAQ').then(module => ({ default: module.FAQ })));

type ViewState = 'loading' | 'auth' | 'onboarding' | 'app' | 'error-config' | 'stuck';

const PageLoader = ({ message = "Abriendo cocina...", onReset }: { message?: string, onReset?: () => void }) => (
  <div className="h-screen w-full flex flex-col items-center justify-center bg-[#FDFDFD] p-6 text-center">
    <div className="w-12 h-12 border-4 border-teal-100 border-t-[#0F4E0E] rounded-full animate-spin mb-4" />
    <Logo className="animate-pulse scale-90" />
    <p className="text-[#0F4E0E] font-black uppercase tracking-widest text-[10px] mt-4">{message}</p>
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dialogOptions, setDialogOptions] = useState<DialogOptions | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mealPlan, setMealPlan] = useState<MealSlot[]>([]);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
      try { return JSON.parse(localStorage.getItem('fresco_favorites') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    const handleVisualViewportResize = () => {
      if (window.visualViewport) {
        const isCurrentlyOpen = window.visualViewport.height < window.innerHeight * 0.8;
        setIsKeyboardOpen(isCurrentlyOpen);
      }
    };
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportResize);
    }
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
      }
    };
  }, []);

  useEffect(() => { localStorage.setItem('fresco_favorites', JSON.stringify(favoriteIds)); }, [favoriteIds]);

  useEffect(() => {
    const handleDialog = (e: any) => setDialogOptions(e.detail);
    window.addEventListener('fresco-dialog', handleDialog);
    return () => window.removeEventListener('fresco-dialog', handleDialog);
  }, []);

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

  useEffect(() => {
    if (!isConfigured) { setView('error-config'); return; }
    initSyncListener();
    const checkSession = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) await handleSessionChange(session);
            else setView('auth');
        } catch (e) { setView('auth'); }
    };
    checkSession();
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setView('auth'); setUser(null); setUserId(null);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') { await handleSessionChange(session); }
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleSessionChange = async (session: any) => {
    if (!session?.user) return;
    const uid = session.user.id;
    const email = session.user.email;
    setUserId(uid);
    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
      if (profile && profile.onboarding_completed) {
        setUser({ ...profile, name: profile.full_name || profile.name || email.split('@')[0] });
        await loadUserData(uid);
        setView('app');
      } else { setView('onboarding'); }
    } catch (e) { setView('onboarding'); }
  };

  const handleAddPantry = (item: PantryItem) => {
      if (!userId) return;
      setPantry(prev => [...prev, item]);
      addToSyncQueue(userId, 'ADD_PANTRY', item);
  };
  const handleUpdatePantryQty = (id: string, delta: number) => {
      if (!userId) return;
      const currentItem = pantry.find(p => p.id === id);
      if (!currentItem) return;
      const updatedItem = { ...currentItem, quantity: Math.max(0, currentItem.quantity + delta) };
      setPantry(prev => prev.map(p => p.id === id ? updatedItem : p));
      addToSyncQueue(userId, 'UPDATE_PANTRY', updatedItem);
  };
  const handleRemovePantry = (id: string) => {
      if (!userId) return;
      setPantry(prev => prev.filter(p => p.id !== id));
      addToSyncQueue(userId, 'DELETE_PANTRY', { id });
  };

  const handleUpdateMealSlot = useCallback(async (date: string, type: MealCategory, recipeId: string | undefined) => {
    if (!userId) return;
    const newSlot: MealSlot = { date, type, recipeId, servings: user?.household_size || 2, isCooked: false };
    setMealPlan(prev => {
        const filtered = prev.filter(p => !(p.date === date && p.type === type));
        return recipeId ? [...filtered, newSlot] : filtered;
    });
    if (recipeId) addToSyncQueue(userId, 'UPDATE_SLOT', newSlot);
    else addToSyncQueue(userId, 'DELETE_SLOT', { date, type });
  }, [userId, user]);

  const handleForceReset = async () => {
      await supabase.auth.signOut();
      localStorage.clear();
      window.location.reload();
  };

  if (view === 'loading') return <PageLoader />;

  const isProfileActive = ['settings', 'faq'].includes(activeTab) || activeTab === 'profile';

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen bg-[#FDFDFD] flex flex-col md:flex-row font-sans overflow-hidden fixed inset-0">
        <Dialog isOpen={!!dialogOptions} {...(dialogOptions || { title: '', message: '' })} onClose={() => setDialogOptions(null)} />
        {view === 'auth' ? <AuthPage onLogin={() => {}} onSignup={() => {}} /> : 
         view === 'onboarding' ? <Onboarding onComplete={() => setView('app')} /> :
         <>
          <aside className="hidden md:flex flex-col w-64 bg-[#0F4E0E] text-white h-full z-50 flex-shrink-0 overflow-hidden">
            <div className="p-8"><Logo variant="inverted" /></div>
            <nav className="flex-1 px-4 space-y-2 mt-4 overflow-hidden">
                {[
                  {id:'dashboard', icon:Home, label:'Home'},
                  {id:'planner', icon:Calendar, label:'Calendario'}, 
                  {id:'pantry', icon:Package, label:'Despensa'}, 
                  {id:'recipes', icon:BookOpen, label:'Recetas'}, 
                  {id:'shopping', icon:ShoppingBag, label:'Lista'}, 
                  {id:'profile', icon:User, label:'Perfil'}
                ].map(item => (
                  <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-5 py-3 rounded-xl transition-all ${activeTab === item.id || (item.id === 'profile' && isProfileActive) ? 'bg-white text-[#0F4E0E] font-bold shadow-lg' : 'text-teal-100/60 hover:bg-white/10 hover:text-white'}`}>
                    <item.icon className={`w-4 h-4 ${(activeTab === item.id || (item.id === 'profile' && isProfileActive)) ? 'text-[#0F4E0E]' : 'text-teal-400'}`} /> 
                    <span className="text-sm font-medium tracking-wide">{item.label}</span>
                  </button>
                ))}
            </nav>
          </aside>

          <main className="flex-1 h-full overflow-hidden flex flex-col relative bg-[#FDFDFD]">
            <div className={`flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 ${isKeyboardOpen ? 'pb-4' : 'pb-36'} md:pb-8 h-full overflow-y-auto no-scrollbar`}>
                <Suspense fallback={<PageLoader message="Cargando vista..." />}>
                    {activeTab === 'dashboard' && user && <Dashboard user={user} pantry={pantry} mealPlan={mealPlan} recipes={recipes} onNavigate={setActiveTab} onQuickRecipe={() => {}} onResetApp={() => {}} onToggleFavorite={id => setFavoriteIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])} favoriteIds={favoriteIds} />}
                    {activeTab === 'planner' && user && <Planner user={user} plan={mealPlan} recipes={recipes} pantry={pantry} onUpdateSlot={handleUpdateMealSlot} onAIPlanGenerated={(p, r) => { setRecipes(prev => [...prev, ...r]); setMealPlan(prev => [...prev, ...p]); }} onClear={() => setMealPlan([])} />}
                    {activeTab === 'pantry' && <Pantry 
                        items={pantry} 
                        onRemove={handleRemovePantry} 
                        onAdd={handleAddPantry} 
                        onUpdateQuantity={handleUpdatePantryQty} 
                        onAddMany={items => { setPantry(prev => [...prev, ...items]); }} 
                        onEdit={i => setPantry(prev => prev.map(p => p.id === i.id ? i : p))} 
                    />}
                    {activeTab === 'recipes' && user && <Recipes recipes={recipes} user={user} pantry={pantry} onAddRecipes={r => setRecipes(p => [...p, ...r])} onAddToPlan={() => {}} onCookFinish={() => {}} onAddToShoppingList={() => {}} favoriteIds={favoriteIds} onToggleFavorite={id => setFavoriteIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])} />}
                    {activeTab === 'shopping' && user && <ShoppingList plan={mealPlan} recipes={recipes} pantry={pantry} user={user} dbItems={shoppingList} onAddShoppingItem={i => setShoppingList(p => [...p, ...i])} onUpdateShoppingItem={i => setShoppingList(p => p.map(x => x.id === i.id ? i : x))} onRemoveShoppingItem={id => setShoppingList(p => p.filter(x => x.id !== id))} onFinishShopping={items => setPantry(p => [...p, ...items])} onOpenRecipe={() => {}} onSyncServings={() => {}} />}
                    {activeTab === 'profile' && user && <Profile user={user} onUpdate={u => setUser(u)} onLogout={() => supabase.auth.signOut()} onReset={handleForceReset} onNavigate={setActiveTab} />}
                    {activeTab === 'settings' && user && <Settings user={user} onBack={() => setActiveTab('profile')} onUpdateUser={u => setUser(u)} onLogout={() => supabase.auth.signOut()} onReset={handleForceReset} />}
                    {activeTab === 'faq' && <FAQ onBack={() => setActiveTab('profile')} />}
                </Suspense>
            </div>
          </main>
          
          <nav className={`md:hidden fixed left-6 right-6 z-[800] bg-[#0F4E0E] p-1.5 rounded-[2.2rem] shadow-2xl flex gap-1 safe-pb border border-white/5 transition-all duration-500 ${isKeyboardOpen ? 'bottom-[-100px] opacity-0 pointer-events-none' : 'bottom-8 opacity-100'}`}>
              {[ 
                {id:'dashboard', icon:Home}, 
                {id:'planner', icon:Calendar}, 
                {id:'pantry', icon:Package}, 
                {id:'recipes', icon:BookOpen}, 
                {id:'shopping', icon:ShoppingBag}, 
                {id:'profile', icon:User} 
              ].map(item => {
                  const isActive = activeTab === item.id || (item.id === 'profile' && isProfileActive);
                  return (
                    <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex-1 flex flex-col items-center justify-center py-4 rounded-[1.8rem] transition-all duration-500 relative ${isActive ? 'text-[#0F4E0E] z-10 scale-105' : 'text-teal-100/25'}`}>
                        {isActive && <div className="absolute inset-0 bg-white rounded-[1.6rem] -z-10 shadow-lg" style={{ margin: '1px' }} />}
                        <item.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                    </button>
                  );
              })}
          </nav>
         </>
        }
      </div>
    </ErrorBoundary>
  );
};
export default App;
