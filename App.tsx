
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

const PageLoader = ({ message = "Abriendo cocina..." }: { message?: string }) => (
  <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FDFDFD] p-6 text-center">
    <div className="w-12 h-12 border-4 border-teal-100 border-t-[#0F4E0E] rounded-full animate-spin mb-4" />
    <Logo className="animate-pulse scale-90" />
    <p className="text-[#0F4E0E] font-black uppercase tracking-widest text-[10px] mt-4">{message}</p>
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
        setIsKeyboardOpen(window.visualViewport.height < window.innerHeight * 0.8);
      }
    };
    window.visualViewport?.addEventListener('resize', handleVisualViewportResize);
    return () => window.visualViewport?.removeEventListener('resize', handleVisualViewportResize);
  }, []);

  useEffect(() => {
    if (!isConfigured) { setView('error-config'); return; }
    initSyncListener();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) handleSessionChange(session);
      else setView('auth');
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) { setView('auth'); return; }
      handleSessionChange(session);
    });
    return () => authListener.subscription.unsubscribe();
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
      return recipeId ? [...filtered, newSlot] : filtered;
    });
    if (recipeId) addToSyncQueue(userId, 'UPDATE_SLOT', newSlot);
    else addToSyncQueue(userId, 'DELETE_SLOT', { date, type });
  }, [userId, user]);

  if (view === 'loading') return <PageLoader />;

  const isProfileActive = ['settings', 'faq'].includes(activeTab) || activeTab === 'profile';

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#F4F4F4] flex flex-col md:flex-row">
        <Dialog isOpen={!!dialogOptions} {...(dialogOptions || { title: '', message: '' })} onClose={() => setDialogOptions(null)} />
        {view === 'auth' ? <AuthPage onLogin={() => {}} onSignup={() => {}} /> : 
         view === 'onboarding' ? <Onboarding onComplete={() => setView('app')} /> :
         <>
          {/* DESKTOP SIDEBAR: GLASSMORPHISM */}
          <aside className="hidden md:flex flex-col w-72 bg-[#0F4E0E]/90 backdrop-blur-2xl text-white h-screen sticky top-0 z-50 flex-shrink-0 border-r border-white/10 shadow-[20px_0_40px_rgba(0,0,0,0.1)]">
            <div className="p-10"><Logo variant="inverted" /></div>
            <nav className="flex-1 px-6 space-y-3 mt-4">
                {[
                  {id:'dashboard', icon:Home, label:'Inicio'},
                  {id:'planner', icon:Calendar, label:'Calendario'}, 
                  {id:'pantry', icon:Package, label:'Despensa'}, 
                  {id:'recipes', icon:BookOpen, label:'Recetas'}, 
                  {id:'shopping', icon:ShoppingBag, label:'Lista Compra'}, 
                  {id:'profile', icon:User, label:'Perfil'}
                ].map(item => {
                  const isActive = activeTab === item.id || (item.id === 'profile' && isProfileActive);
                  return (
                    <button 
                      key={item.id} 
                      onClick={() => setActiveTab(item.id)} 
                      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 relative group overflow-hidden ${
                        isActive 
                        ? 'bg-white text-[#0F4E0E] font-black shadow-[0_10px_20px_rgba(0,0,0,0.2)] scale-[1.02]' 
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                      <span className="text-[15px] tracking-tight">{item.label}</span>
                      {isActive && <div className="absolute left-0 w-1.5 h-6 bg-orange-500 rounded-r-full" />}
                    </button>
                  );
                })}
            </nav>
            <div className="p-8 mt-auto">
              <div className="p-5 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
                <p className="text-[10px] font-black uppercase tracking-widest text-teal-400 mb-2">Estado Premium</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-[10px] font-black text-white">PRO</div>
                  <span className="text-xs font-bold text-white/80">Sincronización OK</span>
                </div>
              </div>
            </div>
          </aside>

          <main className="flex-1 flex flex-col bg-[#F4F4F4] min-h-screen">
            <div className="w-full max-w-7xl mx-auto p-4 pb-36 md:pb-12 flex-1">
                <div className="bg-[#FDFDFD] rounded-[3rem] shadow-[0_10px_50px_rgba(0,0,0,0.03)] border border-gray-100/50 p-4 md:p-10 min-h-[calc(100vh-8rem)] md:min-h-0">
                    <Suspense fallback={<PageLoader message="Cargando..." />}>
                        {activeTab === 'dashboard' && user && <Dashboard user={user} pantry={pantry} mealPlan={mealPlan} recipes={recipes} onNavigate={setActiveTab} onQuickRecipe={() => {}} onResetApp={() => {}} favoriteIds={favoriteIds} onToggleFavorite={id => setFavoriteIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])} />}
                        {activeTab === 'planner' && user && <Planner user={user} plan={mealPlan} recipes={recipes} pantry={pantry} onUpdateSlot={handleUpdateMealSlot} onAIPlanGenerated={(p, r) => { setRecipes(prev => [...prev, ...r]); setMealPlan(prev => [...prev, ...p]); }} onClear={() => setMealPlan([])} />}
                        {activeTab === 'pantry' && <Pantry items={pantry} onRemove={id => setPantry(p => p.filter(x => x.id !== id))} onAdd={i => setPantry(p => [...p, i])} onUpdateQuantity={() => {}} onAddMany={items => setPantry(p => [...p, ...items])} onEdit={i => setPantry(p => p.map(x => x.id === i.id ? i : x))} />}
                        {activeTab === 'recipes' && user && <Recipes recipes={recipes} user={user} pantry={pantry} onAddRecipes={r => setRecipes(p => [...p, ...r])} onAddToPlan={() => {}} onCookFinish={() => {}} onAddToShoppingList={() => {}} favoriteIds={favoriteIds} onToggleFavorite={id => setFavoriteIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])} />}
                        {activeTab === 'shopping' && user && <ShoppingList plan={mealPlan} recipes={recipes} pantry={pantry} user={user} dbItems={shoppingList} onAddShoppingItem={i => setShoppingList(p => [...p, ...i])} onUpdateShoppingItem={i => setShoppingList(p => p.map(x => x.id === i.id ? i : x))} onRemoveShoppingItem={id => setShoppingList(p => p.filter(x => x.id !== id))} onFinishShopping={items => setPantry(p => [...p, ...items])} onOpenRecipe={() => {}} onSyncServings={() => {}} />}
                        {activeTab === 'profile' && user && <Profile user={user} onUpdate={u => setUser(u)} onLogout={() => supabase.auth.signOut()} onReset={() => {}} onNavigate={setActiveTab} />}
                        {activeTab === 'settings' && user && <Settings user={user} onBack={() => setActiveTab('profile')} onUpdateUser={u => setUser(u)} onLogout={() => supabase.auth.signOut()} onReset={() => {}} />}
                        {activeTab === 'faq' && <FAQ onBack={() => setActiveTab('profile')} />}
                    </Suspense>
                </div>
            </div>

            {/* MOBILE NAVBAR: LIQUID GLASS EFFECT */}
            <nav className={`md:hidden fixed bottom-6 left-6 right-6 z-[800] bg-white/70 backdrop-blur-2xl p-2 rounded-[3.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.1)] flex gap-1 border border-white/50 transition-all duration-500 ring-1 ring-black/5 ${isKeyboardOpen ? 'opacity-0 translate-y-24 scale-90' : 'opacity-100 translate-y-0 scale-100'}`}>
                {[ 
                  {id:'dashboard', icon:Home, label: 'Home'}, 
                  {id:'planner', icon:Calendar, label: 'Plan'}, 
                  {id:'pantry', icon:Package, label: 'Stock'}, 
                  {id:'recipes', icon:BookOpen, label: 'Libro'}, 
                  {id:'shopping', icon:ShoppingBag, label: 'Lista'}, 
                  {id:'profile', icon:User, label: 'Yo'} 
                ].map(item => {
                    const isActive = activeTab === item.id || (item.id === 'profile' && isProfileActive);
                    return (
                      <button 
                        key={item.id} 
                        onClick={() => setActiveTab(item.id)} 
                        className={`flex-1 flex flex-col items-center justify-center py-4 rounded-[2.5rem] transition-all duration-500 relative group`}
                        aria-label={item.label}
                      >
                          {isActive && (
                            <div className="absolute inset-1 bg-[#0F4E0E] rounded-[2rem] shadow-[0_8px_15px_rgba(15,78,14,0.3)] animate-[liquid-pop_0.5s_ease-out] z-0" />
                          )}
                          <item.icon className={`w-[22px] h-[22px] z-10 transition-all duration-500 ${isActive ? 'text-white scale-110 stroke-[2.5px]' : 'text-[#0F4E0E]/40 group-hover:text-[#0F4E0E]'}`} />
                      </button>
                    );
                })}
            </nav>
          </main>
         </>
        }
      </div>

      <style>{`
        @keyframes liquid-pop {
          0% { transform: scale(0.8) translateY(10px); opacity: 0; }
          60% { transform: scale(1.05) translateY(-2px); opacity: 1; }
          100% { transform: scale(1) translateY(0); }
        }
      `}</style>
    </ErrorBoundary>
  );
};
export default App;
