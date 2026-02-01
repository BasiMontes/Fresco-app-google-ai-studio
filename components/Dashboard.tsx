
import React, { useMemo, useState, useEffect } from 'react';
import { UserProfile, Recipe, PantryItem, MealSlot, MealCategory } from '../types';
import { ChefHat, Sparkles, ArrowRight, PiggyBank, Timer, Sunrise, Sun, Moon, Calendar, ShoppingCart, BookOpen, Heart, Bell, AlertCircle, TrendingUp, ArrowLeft, Clock, Users, Check, X, CheckCircle2, CalendarPlus, Key, Zap, Lightbulb, Info } from 'lucide-react';
import { getHours, startOfWeek, endOfWeek, isWithinInterval, parseISO, differenceInDays } from 'date-fns';
import { SmartImage } from './SmartImage';
import { getWastePreventionTip } from '../services/geminiService';

interface DashboardProps {
  user: UserProfile;
  pantry: PantryItem[];
  mealPlan?: MealSlot[]; 
  recipes?: Recipe[]; 
  onNavigate: (tab: string) => void;
  onQuickRecipe: (ingredientName: string) => void; 
  onResetApp: () => void;
  onQuickConsume?: (id: string) => void;
  isOnline?: boolean;
  onAddToPlan?: (recipe: Recipe, servings: number) => void; 
  favoriteIds?: string[];
  onToggleFavorite?: (id: string) => void;
}

const StatCard = ({ label, value, subValue, icon: Icon, colorClass, progress }: { 
    label: string, 
    value: string | number, 
    subValue?: string,
    icon: any, 
    colorClass: string,
    progress?: number 
}) => (
    <div className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-gray-50 shadow-sm flex flex-col h-40 md:h-48 transition-all">
        <div className="flex justify-between items-start">
            <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
            <div className={`p-2 md:p-3 rounded-xl md:rounded-2xl ${colorClass}`}><Icon className="w-4 h-4 md:w-6 md:h-6" /></div>
        </div>
        <div className="mt-auto">
            <div className="flex items-end gap-1">
                <p className="text-2xl md:text-4xl font-black text-teal-900 leading-none">{value}</p>
                {subValue && <p className="text-[7px] md:text-[10px] font-black uppercase tracking-widest text-gray-300 mb-0.5 md:mb-1">{subValue}</p>}
            </div>
            {progress !== undefined ? (
                <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mt-2 md:mt-3">
                    <div className={`h-full rounded-full transition-all duration-1000 ${progress > 100 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, progress)}%` }} />
                </div>
            ) : (
                <div className="h-1 mt-2 md:mt-3 invisible" aria-hidden="true" />
            )}
        </div>
    </div>
);

const UnifiedRecipeCard: React.FC<{ 
    recipe: Recipe; 
    isFav: boolean; 
    onNavigate: (tab: string) => void; 
    onToggleFavorite?: (id: string) => void; 
}> = ({ recipe, isFav, onNavigate, onToggleFavorite }) => (
    <div 
        onClick={() => { window.history.pushState(null, '', `?tab=recipes&recipe=${recipe.id}`); onNavigate('recipes'); }}
        className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer relative h-full min-h-[280px] animate-fade-in"
    >
        <div className="relative aspect-[3/2] overflow-hidden bg-gray-100 flex-shrink-0">
            <SmartImage src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <button 
                onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(recipe.id); }}
                className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-md z-10 hover:scale-110 transition-transform"
            >
                <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
            </button>
        </div>
        <div className="p-3 flex-1 flex flex-col">
            <h3 className="text-sm md:text-xs font-bold text-gray-900 leading-tight mb-2 line-clamp-2 group-hover:text-teal-700 transition-colors">{recipe.title}</h3>
            <div className="mt-auto flex items-center gap-2 pt-2 border-t border-gray-50">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 whitespace-nowrap">{recipe.cuisine_type}</span>
                <div className="flex-1" />
                <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        window.history.pushState(null, '', `?tab=recipes&recipe=${recipe.id}&mode=plan`);
                        onNavigate('recipes');
                    }}
                    className="w-8 h-8 bg-teal-50 text-teal-700 rounded-lg flex items-center justify-center hover:bg-teal-900 hover:text-white transition-all active:scale-90 flex-shrink-0"
                >
                    <CalendarPlus className="w-4 h-4" />
                </button>
            </div>
        </div>
    </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ user, pantry, mealPlan = [], recipes = [], onNavigate, onAddToPlan, isOnline = true, favoriteIds = [], onToggleFavorite }) => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'favorites' | 'notifications'>('dashboard');
  const [aiTip, setAiTip] = useState<string>("Cargando tu consejo de hoy...");
  const [isLoadingTip, setIsLoadingTip] = useState(true);
  
  useEffect(() => {
    const loadTip = async () => {
        setIsLoadingTip(true);
        try {
            const tip = await getWastePreventionTip(pantry);
            setAiTip(tip);
        } catch (e) {
            setAiTip("Organiza tu cocina hoy para ahorrar mañana.");
        } finally {
            setIsLoadingTip(false);
        }
    };
    loadTip();
  }, [pantry]);

  const timeGreeting = useMemo(() => {
      const h = getHours(new Date());
      if (h < 12) return { text: "Buenos Días", icon: Sunrise };
      if (h < 20) return { text: "Buenas Tardes", icon: Sun };
      return { text: "Buenas Noches", icon: Moon };
  }, []);

  const alerts = useMemo(() => {
      const list = [];
      const expiringSoon = pantry.filter(i => i.expires_at && differenceInDays(new Date(i.expires_at), new Date()) <= 3);
      if (expiringSoon.length > 0) list.push({ type: 'expiry', title: 'Productos por caducar', msg: `Tienes ${expiringSoon.length} items que caducan pronto.`, icon: AlertCircle, color: 'text-orange-500' });
      
      const emptyStock = pantry.filter(i => i.quantity <= 0);
      if (emptyStock.length > 3) list.push({ type: 'stock', title: 'Stock Agotado', msg: 'Varios básicos se han agotado. Revisa tu lista.', icon: ShoppingCart, color: 'text-red-500' });
      
      return list;
  }, [pantry]);

  const budgetStats = useMemo(() => {
      const BUDGET_LIMIT = 50; 
      const today = new Date();
      const start = startOfWeek(today, { weekStartsOn: 1 });
      const end = endOfWeek(today, { weekStartsOn: 1 });
      const weeklySlots = mealPlan.filter(slot => {
          try { return isWithinInterval(parseISO(slot.date), { start, end }); } catch { return false; }
      });
      const estimatedSpent = weeklySlots.length * 3.5; 
      const percentage = (estimatedSpent / BUDGET_LIMIT) * 100;
      return { limit: BUDGET_LIMIT, spent: estimatedSpent, percentage };
  }, [mealPlan]);

  const latestRecipes = useMemo(() => [...recipes].reverse().slice(0, 8), [recipes]);
  const favoriteRecipes = useMemo(() => recipes.filter(r => favoriteIds.includes(r.id)), [recipes, favoriteIds]);
  const safeTimeSaved = useMemo(() => {
      const val = Number(user.time_saved_mins);
      return isNaN(val) ? 0 : val;
  }, [user.time_saved_mins]);

  if (currentView === 'notifications') {
    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <div className="flex items-center gap-4">
                <button onClick={() => setCurrentView('dashboard')} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-[#0F4E0E]">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-3xl font-black text-[#0F4E0E]">Centro de Avisos</h1>
                    <p className="text-gray-500 font-medium text-sm">Gestiona tus alertas de cocina y stock.</p>
                </div>
            </div>
            <div className="space-y-4">
                {alerts.length > 0 ? alerts.map((alert, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex gap-4 items-start animate-slide-up">
                        <div className={`p-3 rounded-2xl bg-gray-50 ${alert.color}`}><alert.icon className="w-6 h-6" /></div>
                        <div>
                            <h3 className="font-black text-lg text-teal-950">{alert.title}</h3>
                            <p className="text-gray-500 text-sm font-medium mt-1">{alert.msg}</p>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-20 opacity-30">
                        <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
                        <p className="font-bold text-lg">Todo bajo control.</p>
                        <p className="text-sm">No hay alertas críticas en tu cocina.</p>
                    </div>
                )}
            </div>
        </div>
    );
  }

  if (currentView === 'favorites') {
      return (
          <div className="space-y-8 animate-fade-in pb-10">
              <div className="flex items-center gap-4">
                  <button onClick={() => setCurrentView('dashboard')} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-[#0F4E0E]">
                      <ArrowLeft className="w-6 h-6" />
                  </button>
                  <div>
                      <h1 className="text-3xl font-black text-[#0F4E0E] flex items-center gap-3">
                          <Heart className="w-8 h-8 text-red-500 fill-current" /> Favoritos
                      </h1>
                      <p className="text-gray-500 font-medium text-sm">Tus recetas guardadas para cocinar cuando quieras.</p>
                  </div>
              </div>
              {favoriteRecipes.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {favoriteRecipes.map(recipe => (
                          <UnifiedRecipeCard key={recipe.id} recipe={recipe} isFav={true} onNavigate={onNavigate} onToggleFavorite={onToggleFavorite} />
                      ))}
                  </div>
              ) : (
                  <div className="text-center py-20 opacity-30">
                      <Heart className="w-16 h-16 mx-auto mb-4" />
                      <p className="font-bold">Aún no tienes favoritos.</p>
                  </div>
              )}
          </div>
      );
  }

  return (
    <div className="space-y-8 md:space-y-10 animate-fade-in pb-10">
      {/* Sugerencia Inteligente de IA */}
      <div className="bg-gradient-to-r from-[#0F4E0E] to-[#062606] p-4 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-700" />
          <div className="flex flex-row items-center gap-3 md:gap-6 relative z-10">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-white/10 rounded-xl md:rounded-2xl flex items-center justify-center text-orange-400 shrink-0">
                  <Sparkles className={`w-5 h-5 md:w-8 md:h-8 ${isLoadingTip ? 'animate-pulse' : ''}`} />
              </div>
              <div className="flex-1 min-w-0">
                  <h3 className="text-white font-black text-xs md:text-xl leading-tight uppercase tracking-tighter md:normal-case md:tracking-normal">Sugerencia Fresco Pro</h3>
                  <p className={`text-teal-100/70 font-bold text-[10px] md:text-base mt-0.5 md:mt-1 italic line-clamp-1 md:line-clamp-none ${isLoadingTip ? 'animate-pulse' : ''}`}>
                      "{aiTip}"
                  </p>
              </div>
              <button 
                onClick={() => onNavigate('planner')}
                className="h-10 md:h-14 px-3 md:px-8 bg-orange-500 text-white rounded-lg md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest md:tracking-[0.2em] shadow-xl hover:bg-orange-600 transition-all active:scale-95 shrink-0"
              >
                  Ver Plan
              </button>
          </div>
      </div>

      <header className="flex items-start justify-between">
          <div className="space-y-1">
              <div className="flex items-center gap-3">
                  <span className="text-3xl md:text-3xl">{timeGreeting.text.includes('Días') ? '👋' : timeGreeting.text.includes('Tardes') ? '☀️' : '🌙'}</span>
                  <h1 className="text-3xl md:text-3xl font-black text-[#0F4E0E] tracking-tight leading-none">¡{timeGreeting.text}, {user.name.split(' ')[0]}!</h1>
              </div>
              <p className="text-base md:text-base font-bold text-[#0F4E0E]/60 pl-1 line-clamp-1">Organiza tu semana y ahorra hoy.</p>
          </div>
          <div className="flex items-center gap-2 pt-1">
              <button onClick={() => setCurrentView('favorites')} className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl md:rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm group">
                  <Heart className="w-5 h-5 md:w-6 md:h-6 group-hover:fill-current" />
              </button>
              <button onClick={() => setCurrentView('notifications')} className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl md:rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-[#0F4E0E] hover:bg-teal-50 transition-all shadow-sm relative">
                  <Bell className="w-5 h-5 md:w-6 md:h-6" />
                  {alerts.length > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-orange-500 rounded-full border-2 border-white animate-pulse"></span>}
              </button>
          </div>
      </header>

      {/* Grid de Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard label="Recetas" value={recipes.length} icon={BookOpen} colorClass="bg-orange-50 text-orange-500" />
          <StatCard label="Gasto Semanal" value={`${budgetStats.spent.toFixed(0)}€`} subValue={`/ ${budgetStats.limit}€`} icon={TrendingUp} colorClass={budgetStats.spent > budgetStats.limit ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'} progress={budgetStats.percentage} />
          <StatCard label="Ahorro Total" value={`${user.total_savings.toFixed(0)}€`} icon={PiggyBank} colorClass="bg-teal-50 text-teal-600" />
          <StatCard label="Recuperado" value={`${Math.round(safeTimeSaved / 60)}h`} icon={Timer} colorClass="bg-purple-50 text-purple-500" />
      </div>

      <section className="space-y-6 md:space-y-8">
          <div className="flex justify-between items-center">
              <h2 className="text-xl md:text-2xl font-black text-[#0F4E0E] tracking-tight">Últimas del Chef</h2>
              <button onClick={() => onNavigate('recipes')} className="text-[10px] font-black uppercase tracking-widest text-teal-600 flex items-center gap-2 hover:gap-3 transition-all">Ver todas <ArrowRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {latestRecipes.map((recipe) => (
                    <UnifiedRecipeCard key={recipe.id} recipe={recipe} isFav={favoriteIds.includes(recipe.id)} onNavigate={onNavigate} onToggleFavorite={onToggleFavorite} />
                ))}
          </div>
      </section>
    </div>
  );
};
