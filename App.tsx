
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
import { Home, Calendar, ShoppingBag, BookOpen, Package, User } from 'lucide-react';

const Dashboard = React.lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const Planner = React.lazy(() => import('./components/Planner').then(module => ({ default: module.Planner })));
const Recipes = React.lazy(() => import('./components/Recipes').then(module => ({ default: module.Recipes })));
const ShoppingList = React.lazy(() => import('./components/ShoppingList').then(module => ({ default: module.ShoppingList })));
const Pantry = React.lazy(() => import('./components/Pantry').then(module => ({ default: module.Pantry })));
const Profile = React.lazy(() => import('./components/Profile').then(module => ({ default: module.Profile })));
const Settings = React.lazy(() => import('./components/Settings').then(module => ({ default: module.Settings })));
const FAQ = React.lazy(() => import('./components/FAQ').then(module => ({ default: module.FAQ })));

type ViewState = 'loading' | 'auth' | 'onboarding' | 'app' | 'error-config';

const PageLoader = () => (
  <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FDFDFD] p-6 text-center">
    <div className="w-12 h-12 border-4 border-teal-100 border-t-[#0F4E0E] rounded-full animate-spin mb-4" />
    <Logo className="animate-pulse scale-90" />
    <p className="text-[#0F4E0E] font-black uppercase tracking-widest text-[10px] mt-4">Abriendo cocina...</p>
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
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    const handleVisualViewportResize = () => {
      if (window.visualViewport) {
        setIsKeyboardOpen(window.visualViewport.height < window.innerHeight * 0.8);
      }
    };
    window.visualViewport?.addEventListener('resize', handleVisualViewportResize);
    return () => window.visualViewport?.removeEventListener('resize', handleVisualViewportResize);
  }, []);

  // FIXED: Listener para diálogos globales
  useEffect(() => {
    const handleDialog = (e: any) => setDialogOptions(e.detail);
    window.addEventListener('fresco-dialog', handleDialog);
    return () => window.removeEventListener('fresco-dialog', handleDialog);
  }, []);

  useEffect(() => {
    if (!isConfigured) { setView('error-config'); return; }
    initSyncListener();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) handleSessionChange(session);
      else setView('auth');
    });
  }, []);

  const handleSessionChange = async (session: any) => {
    const uid = session.user.id;
    setUserId(uid);
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (profile?.onboarding_completed) {
      setUser({ ...profile, name: profile.full_name || profile.name || session.user.email.split('@')[0] });
      const [p, r, m, s] = await Promise.all([db.fetchPantry(uid), db.fetchRecipes(uid), db.fetchMealPlan(uid), db.fetchShoppingList(uid)]);
      setPantry(p || []);
      setRecipes(r?.length < 5 ? [...(r || []), ...STATIC_RECIPES.slice(0, 50)] : r);
      setMealPlan(m || []);
      setShoppingList(s || []);
      setView('app');
    } else { setView('onboarding'); }
  };

  const handleUpdateMealSlot = useCallback((date: string, type: MealCategory, recipeId: string | undefined) => {
    if (!userId) return;
    const newSlot = { date, type, recipeId, servings: user?.household_size || 2, isCooked: false };
    
    setMealPlan(prev => {
      const filtered = prev.filter(p => !(p.date === date && p.type === type));
      return recipeId ? [...filtered, { ...newSlot }] : [...filtered];
    });

    if (recipeId) addToSyncQueue(userId, 'UPDATE_SLOT', newSlot);
    else addToSyncQueue(userId, 'DELETE_SLOT', { date, type });
  }, [userId, user]);

  const handleClearPlan = useCallback(async () => {
    if (!userId) return;
    setMealPlan([]);
    await db.clearMealPlanDB(userId);
  }, [userId]);

  if (view === 'loading') return <PageLoader />;

  const isProfileActive = ['settings', 'faq'].includes(activeTab) || activeTab === 'profile';

  const navItems = [ 
    {id:'dashboard', icon:Home}, 
    {id:'planner', icon:Calendar}, 
    {id:'pantry', icon:Package}, 
    {id:'recipes', icon:BookOpen}, 
    {id:'shopping', icon:ShoppingBag}, 
    {id:'profile', icon:User} 
  ];
  
  const activeIndex = navItems.findIndex(item => 
    activeTab === item.id || (item.id === 'profile' && isProfileActive)
  );

  return (
    <ErrorBoundary>
      <div className="h-screen bg-[#F4F4F4] flex flex-col md:flex-row overflow-hidden">
        <Dialog isOpen={!!dialogOptions} {...(dialogOptions || { title: '', message: '' })} onClose={() => setDialogOptions(null)} />
        
        {view === 'auth' ? <AuthPage onLogin={() => {}} onSignup={() => {}} /> : 
         view === 'onboarding' ? <Onboarding onComplete={() => setView('app')} /> :
         <>
          {/* SIDEBAR DESKTOP */}
          <aside className="hidden md:flex flex-col w-64 bg-[#0F4E0E] text-white h-screen flex-shrink-0 z-50 shadow-[4px_0_24px_rgba(0,0,0,0.05)]">
            <div className="p-8"><Logo variant="inverted" /></div>
            
            <nav className="flex-1 px-4 space-y-1.5 mt-2 overflow-y-auto no-scrollbar">
                {navItems.map(item => {
                  const isActive = activeTab === item.id || (item.id === 'profile' && isProfileActive);
                  return (
                    <button 
                      key={item.id} 
                      onClick={() => setActiveTab(item.id)} 
                      className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl transition-all duration-200 group relative ${
                        isActive 
                        ? 'bg-white text-[#0F4E0E] font-black shadow-md' 
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <item.icon className={`w-4.5 h-4.5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                      <span className="text-[13px] font-bold tracking-tight">{item.id === 'dashboard' ? 'Inicio' : item.id === 'planner' ? 'Calendario' : item.id === 'pantry' ? 'Despensa' : item.id === 'recipes' ? 'Recetas' : item.id === 'shopping' ? 'Lista Compra' : 'Perfil'}</span>
                      {isActive && <div className="absolute left-0 w-1 h-5 bg-orange-500 rounded-r-full" />}
                    </button>
                  );
                })}
            </nav>

            <div className="p-8 mt-auto border-t border-white/5 opacity-20">
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-center">Fresco App v1.0</p>
            </div>
          </aside>

          {/* ÁREA PRINCIPAL */}
          <main className="flex-1 h-screen overflow-y-auto bg-[#F4F4F4] relative">
            <div className="w-full max-w-7xl mx-auto p-0 md:p-4 pb-40 md:pb-4 min-h-full">
                <div className="bg-[#FDFDFD] md:rounded-[2.5rem] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border-0 md:border md:border-gray-100 p-0 md:p-4 h-full min-h-screen md:min-h-[calc(100vh-2rem)]">
                    <Suspense fallback={<PageLoader />}>
                        {activeTab === 'dashboard' && user && <Dashboard user={user} pantry={pantry} mealPlan={mealPlan} recipes={recipes} onNavigate={setActiveTab} onQuickRecipe={() => {}} onResetApp={() => {}} favoriteIds={favoriteIds} onToggleFavorite={id => setFavoriteIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])} />}
                        {activeTab === 'planner' && user && <Planner user={user} plan={mealPlan} recipes={recipes} pantry={pantry} onUpdateSlot={handleUpdateMealSlot} onAIPlanGenerated={(p, r) => { setRecipes(prev => [...prev, ...r]); setMealPlan(prev => [...prev, ...p]); }} onClear={handleClearPlan} />}
                        {activeTab === 'pantry' && <Pantry items={pantry} onRemove={id => setPantry(p => p.filter(x => x.id !== id))} onAdd={i => setPantry(p => [...p, i])} onUpdateQuantity={() => {}} onAddMany={items => setPantry(p => [...p, ...items])} onEdit={i => setPantry(p => p.map(x => x.id === i.id ? i : x))} />}
                        {activeTab === 'recipes' && user && <Recipes recipes={recipes} user={user} pantry={pantry} onAddRecipes={r => setRecipes(p => [...p, ...r])} onAddToPlan={() => {}} onCookFinish={() => {}} onAddToShoppingList={() => {}} favoriteIds={favoriteIds} onToggleFavorite={id => setFavoriteIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])} />}
                        {activeTab === 'shopping' && user && <ShoppingList plan={mealPlan} recipes={recipes} pantry={pantry} user={user} dbItems={shoppingList} onAddShoppingItem={i => setShoppingList(p => [...p, ...i])} onUpdateShoppingItem={i => setShoppingList(p => p.map(x => x.id === i.id ? i : x))} onRemoveShoppingItem={id => setShoppingList(p => p.filter(x => x.id !== id))} onFinishShopping={items => setPantry(p => [...p, ...items])} onOpenRecipe={() => {}} onSyncServings={() => {}} />}
                        {activeTab === 'profile' && user && <Profile user={user} onUpdate={u => setUser(u)} onLogout={() => supabase.auth.signOut()} onReset={() => {}} onNavigate={setActiveTab} />}
                        {activeTab === 'settings' && user && <Settings user={user} onBack={() => setActiveTab('profile')} onUpdateUser={u => setUser(u)} onLogout={() => supabase.auth.signOut()} onReset={() => {}} />}
                        {activeTab === 'faq' && <FAQ onBack={() => setActiveTab('profile')} />}
                    </Suspense>
                </div>
            </div>

            {/* NAVBAR MÓVIL PRO-DOCK V7 - INSPIRACIÓN INSTAGRAM */}
            <nav className={`md:hidden fixed bottom-6 left-4 right-4 z-[800] mobile-pro-dock rounded-[2.5rem] px-2 transition-all duration-500 ${isKeyboardOpen ? 'opacity-0 translate-y-32' : 'opacity-100 translate-y-0'}`}>
                
                {/* INDICADOR LINEAL PROFESIONAL */}
                <div 
                  className="nav-indicator-pill" 
                  style={{ 
                    width: `calc((100% - 16px) / 6)`, 
                    left: `calc(8px + (${activeIndex} * (100% - 16px) / 6))` 
                  }} 
                />

                {navItems.map((item, idx) => {
                    const isActive = activeIndex === idx;
                    return (
                      <button 
                        key={item.id} 
                        onClick={() => setActiveTab(item.id)} 
                        className="flex-1 flex flex-col items-center justify-center h-full relative group transition-all duration-300 z-10 active:scale-90"
                      >
                          <item.icon 
                            strokeWidth={2.2}
                            className={`nav-icon w-[26px] h-[26px] ${isActive ? 'active-icon' : 'inactive-icon'}`} 
                          />
                      </button>
                    );
                })}
            </nav>
          </main>
         </>
        }
      </div>
    </ErrorBoundary>
  );
};
export default App;
