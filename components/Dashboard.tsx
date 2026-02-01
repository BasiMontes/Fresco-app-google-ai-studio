
import React, { useMemo, useState, useEffect } from 'react';
import { UserProfile, Recipe, PantryItem, MealSlot, MealCategory } from '../types';
import { ChefHat, Sparkles, ArrowRight, PiggyBank, Timer, Sunrise, Sun, Moon, Calendar, ShoppingCart, BookOpen, Heart, Bell, AlertCircle, TrendingUp, ArrowLeft, Clock, Users, Check, X, CheckCircle2, CalendarPlus, Key, Zap, Lightbulb } from 'lucide-react';
import { getHours, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
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
    <div className="bg-white p-6 rounded-[2.5rem] border border-gray-50 shadow-sm flex flex-col h-48">
        <div className="flex justify-between items-start">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
            <div className={`p-3 rounded-2xl ${colorClass}`}><Icon className="w-6 h-6" /></div>
        </div>
        <div className="mt-auto">
            <div className="flex items-end gap-1">
                <p className="text-4xl font-black text-teal-900 leading-none">{value}</p>
                {subValue && <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mb-1">{subValue}</p>}
            </div>
            {progress !== undefined ? (
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-3">
                    <div className={`h-full rounded-full transition-all duration-1000 ${progress > 100 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, progress)}%` }} />
                </div>
            ) : (
                <div className="h-1.5 mt-3 invisible" aria-hidden="true" />
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
  const [hasApiKey, setHasApiKey] = useState(true);
  const [aiTip, setAiTip] = useState<string>("Cargando tu consejo de hoy...");
  const [isLoadingTip, setIsLoadingTip] = useState(true);
  
  useEffect(() => {
    const checkKey = async () => {
        const isSet = !!(process.env.API_KEY || (window as any).process?.env?.API_KEY);
        setHasApiKey(isSet);
    };
    checkKey();
    
    // Cargar consejo de la IA
    const loadTip = async () => {
        setIsLoadingTip(true);
        const tip = await getWastePreventionTip(pantry);
        setAiTip(tip);
        setIsLoadingTip(false);
    };
    loadTip();
  }, [pantry]);

  const handleLinkKey = async () => {
      if ((window as any).aistudio) {
          await (window as any).aistudio.openSelectKey();
      }
  };

  const timeGreeting = useMemo(() => {
      const h = getHours(new Date());
      if (h < 12) return { text: "Buenos Días", icon: Sunrise };
      if (h < 20) return { text: "Buenas Tardes", icon: Sun };
      return { text: "Buenas Noches", icon: Moon };
  }, []);

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

  if (currentView === 'favorites') {
      return (
          <div className="space-y-8 animate-fade-in pb-10">
              <div className="flex items-center gap-4">
                  <button onClick={() => setCurrentView('dashboard')} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-teal-900">
                      <ArrowLeft className="w-6 h-6" />
                  </button>
                  <div>
                      <h1 className="text-3xl font-black text-teal-900 flex items-center gap-3">
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
    <div className="space-y-10 animate-fade-in pb-10">
      {/* Alerta de IA no conectada */}
      {!hasApiKey && (
          <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4 animate-slide-up">
              <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                      <Key className="w-6 h-6" />
                  </div>
                  <div>
                      <h4 className="font-black text-teal-900 text-sm">IA Desconectada</h4>
                      <p className="text-[10px] text-teal-900/60 font-medium">Vincula tu llave de Google para activar el escáner y planes inteligentes.</p>
                  </div>
              </div>
              <button 
                onClick={handleLinkKey}
                className="px-6 py-3 bg-orange-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-orange-600 transition-all active:scale-95"
              >
                  Conectar IA
              </button>
          </div>
      )}

      {/* Sugerencia Inteligente de IA */}
      {hasApiKey && (
          <div className="bg-gradient-to-r from-teal-900 to-teal-800 p-6 md:p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-700" />
              <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                  <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-orange-400 shrink-0">
                      <Sparkles className={`w-8 h-8 ${isLoadingTip ? 'animate-pulse' : ''}`} />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                      <h3 className="text-white font-black text-lg md:text-xl leading-tight">Sugerencia Fresco Pro</h3>
                      <p className={`text-teal-100/70 font-bold text-sm md:text-base mt-1 italic ${isLoadingTip ? 'animate-pulse' : ''}`}>
                          "{aiTip}"
                      </p>
                  </div>
                  <button 
                    onClick={() => onNavigate('planner')}
                    className="h-14 px-8 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-orange-600 transition-all active:scale-95"
                  >
                      Ver mi Plan
                  </button>
              </div>
          </div>
      )}

      <header className="flex items-start justify-between">
          <div className="space-y-1">
              <div className="flex items-center gap-3">
                  <span className="text-4xl md:text-3xl">{timeGreeting.text.includes('Días') ? '👋' : timeGreeting.text.includes('Tardes') ? '☀️' : '🌙'}</span>
                  <h1 className="text-4xl md:text-3xl font-black text-teal-900 tracking-tight leading-none">¡{timeGreeting.text}, {user.name.split(' ')[0]}!</h1>
              </div>
              <p className="text-lg md:text-base font-bold text-teal-900/60 pl-1">¿Qué vas a cocinar hoy? Organiza tu semana y ahorra.</p>
          </div>
          <div className="flex items-center gap-3 pt-1">
              <button onClick={() => setCurrentView('favorites')} className="w-12 h-12 bg-white rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm group">
                  <Heart className="w-6 h-6 group-hover:fill-current" />
              </button>
              <button onClick={() => setCurrentView('notifications')} className="w-12 h-12 bg-white rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-teal-900 hover:bg-teal-50 transition-all shadow-sm relative">
                  <Bell className="w-6 h-6" />
                  <span className="absolute top-3 right-3 w-2 h-2 bg-orange-500 rounded-full border-2 border-white"></span>
              </button>
          </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Recetas" value={recipes.length} icon={BookOpen} colorClass="bg-orange-50 text-orange-500" />
          <StatCard label="Gasto Semanal" value={`${budgetStats.spent.toFixed(0)}€`} subValue={`/ ${budgetStats.limit}€`} icon={TrendingUp} colorClass={budgetStats.spent > budgetStats.limit ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'} progress={budgetStats.percentage} />
          <StatCard label="Ahorro Total" value={`${user.total_savings.toFixed(0)}€`} icon={PiggyBank} colorClass="bg-teal-50 text-teal-600" />
          <StatCard label="Recuperado" value={`${Math.round(safeTimeSaved / 60)}h`} icon={Timer} colorClass="bg-purple-50 text-purple-500" />
      </div>

      <section className="space-y-8">
          <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-teal-900 tracking-tight">Últimas del Chef</h2>
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
