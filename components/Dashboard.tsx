
import React, { useMemo, useState } from 'react';
import { UserProfile, Recipe, PantryItem, MealSlot, MealCategory } from '../types';
import { ChefHat, Sparkles, ArrowRight, PiggyBank, Timer, Sunrise, Sun, Moon, Calendar, ShoppingCart, BookOpen, Heart, Bell, AlertCircle, TrendingUp, ArrowLeft, Clock, Users, Check, X, CheckCircle2, CalendarPlus } from 'lucide-react';
import { getHours, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { SmartImage } from './SmartImage';

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

const MOCK_NOTIFICATIONS = [
    { id: 1, type: 'cooking', title: '¡Hora de cocinar!', desc: 'Es momento de preparar tu pasta primavera para la cena', time: 'Hoy, 20:41', isNew: true, icon: ChefHat, color: 'bg-orange-100 text-orange-600' },
    { id: 2, type: 'shopping', title: 'Lista de compras lista', desc: 'Tu lista para esta semana está preparada. ¡Ve al súper!', time: 'Hoy, 19:11', isNew: true, icon: ShoppingCart, color: 'bg-green-100 text-green-600' },
];

export const Dashboard: React.FC<DashboardProps> = ({ user, mealPlan = [], recipes = [], onNavigate, onAddToPlan, isOnline = true, favoriteIds = [], onToggleFavorite }) => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'favorites' | 'notifications'>('dashboard');
  
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
          try {
             return isWithinInterval(parseISO(slot.date), { start, end });
          } catch { return false; }
      });

      const estimatedSpent = weeklySlots.length * 3.5; 
      const percentage = Math.min(100, (estimatedSpent / BUDGET_LIMIT) * 100);
      const isOverBudget = estimatedSpent > BUDGET_LIMIT;
      const remaining = BUDGET_LIMIT - estimatedSpent;

      return { limit: BUDGET_LIMIT, spent: estimatedSpent, percentage, isOverBudget, remaining };
  }, [mealPlan]);

  const latestRecipes = useMemo(() => {
      return [...recipes].reverse().slice(0, 8);
  }, [recipes]);

  const favoriteRecipes = useMemo(() => {
      return recipes.filter(r => favoriteIds.includes(r.id));
  }, [recipes, favoriteIds]);

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
                      <p className="text-gray-500 font-medium">Tus recetas guardadas para cocinar cuando quieras.</p>
                  </div>
              </div>

              {favoriteRecipes.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {favoriteRecipes.map(recipe => (
                          <div key={recipe.id} className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-lg transition-all group flex flex-col">
                              <div className="aspect-[4/3] relative overflow-hidden">
                                  <SmartImage src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                  <button onClick={() => onToggleFavorite && onToggleFavorite(recipe.id)} className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-md z-10">
                                      <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                                  </button>
                              </div>
                              <div className="p-4 flex-1 flex flex-col">
                                  <h3 className="font-black text-teal-900 line-clamp-1 mb-2">{recipe.title}</h3>
                                  <div className="flex items-center gap-2 mb-4">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-teal-600 bg-teal-50 px-2 py-0.5 rounded">{recipe.difficulty}</span>
                                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{recipe.prep_time} min</span>
                                  </div>
                                  <button onClick={() => onAddToPlan && onAddToPlan(recipe, recipe.servings)} className="w-full py-2.5 bg-teal-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-teal-800 transition-all">Añadir al plan</button>
                              </div>
                          </div>
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

  if (currentView === 'notifications') {
    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <div className="flex items-center gap-4">
                <button onClick={() => setCurrentView('dashboard')} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-teal-900">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-3xl font-black text-teal-900">Notificaciones</h1>
                    <p className="text-gray-500 font-medium">Mantente al día con tus comidas y recordatorios.</p>
                </div>
            </div>
            <div className="space-y-4">
                {MOCK_NOTIFICATIONS.map(notif => (
                    <div key={notif.id} className="bg-white border border-gray-50 p-6 rounded-3xl shadow-sm flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${notif.color}`}>
                            <notif.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-teal-950">{notif.title}</h4>
                            <p className="text-gray-500 text-xs mt-1 leading-relaxed">{notif.desc}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest mt-3 text-gray-300">{notif.time}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-12 animate-fade-in pb-10">
      <header className="flex items-start justify-between">
          <div className="space-y-1">
              <div className="flex items-center gap-3">
                  <span className="text-4xl md:text-3xl">{timeGreeting.text.includes('Días') ? '👋' : timeGreeting.text.includes('Tardes') ? '☀️' : '🌙'}</span>
                  <h1 className="text-4xl md:text-3xl font-black text-teal-900 tracking-tight leading-none">
                      ¡{timeGreeting.text}, {user.name.split(' ')[0]}!
                  </h1>
              </div>
              <p className="text-lg md:text-base font-bold text-teal-900/60 pl-1">
                  ¿Qué vas a cocinar hoy? Organiza tu semana y ahorra.
              </p>
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
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-50 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                  <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Recetas</p>
                      <p className="text-4xl font-black text-teal-900 mt-1">{recipes.length}</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-2xl text-orange-500"><BookOpen className="w-6 h-6" /></div>
              </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-50 shadow-sm">
               <div className="flex justify-between items-start mb-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Gasto Semanal</p>
                  <div className={`p-3 rounded-2xl ${budgetStats.isOverBudget ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}><TrendingUp className="w-6 h-6" /></div>
              </div>
              <div className="flex items-end gap-1 mb-3">
                  <p className="text-4xl font-black text-teal-900 leading-none">{budgetStats.spent.toFixed(0)}€</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-300 mb-1">/ {budgetStats.limit}€</p>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ${budgetStats.isOverBudget ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${budgetStats.percentage}%` }} />
              </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-50 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                  <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ahorro Total</p>
                      <p className="text-4xl font-black text-teal-900 mt-1">{user.total_savings.toFixed(0)}€</p>
                  </div>
                  <div className="p-3 bg-teal-50 rounded-2xl text-teal-600"><PiggyBank className="w-6 h-6" /></div>
              </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-50 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                  <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Recuperado</p>
                      <p className="text-4xl font-black text-teal-900 mt-1">{Math.round(safeTimeSaved / 60)}h</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-2xl text-purple-500"><Timer className="w-6 h-6" /></div>
              </div>
          </div>
      </div>

      <section className="space-y-8">
          <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-teal-900 tracking-tight">Últimas del Chef</h2>
              <button onClick={() => onNavigate('recipes')} className="text-[10px] font-black uppercase tracking-widest text-teal-600 flex items-center gap-2 hover:gap-3 transition-all">Ver todas <ArrowRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {latestRecipes.map((recipe) => (
                    <div key={recipe.id} onClick={() => { window.history.pushState(null, '', `?tab=recipes&recipe=${recipe.id}`); onNavigate('recipes'); }}
                        className="group bg-white rounded-[2rem] overflow-hidden border border-gray-50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer"
                    >
                        <div className="relative aspect-[3/2] overflow-hidden bg-gray-100 flex-shrink-0">
                            <SmartImage src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-md z-10">
                                <Heart className={`w-3.5 h-3.5 ${favoriteIds.includes(recipe.id) ? 'fill-red-500 text-red-500' : 'text-gray-300'}`} />
                            </div>
                        </div>
                        <div className="p-4 flex-1 flex flex-col">
                            <h3 className="font-black text-teal-950 text-sm line-clamp-2 leading-tight group-hover:text-teal-600 transition-colors mb-3">{recipe.title}</h3>
                            <div className="mt-auto flex items-center justify-between pt-2 border-t border-gray-50">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 truncate max-w-[80px]">{recipe.cuisine_type}</span>
                                <CalendarPlus className="w-4 h-4 text-teal-200 group-hover:text-teal-500 transition-colors" />
                            </div>
                        </div>
                    </div>
                ))}
          </div>
      </section>
    </div>
  );
};
