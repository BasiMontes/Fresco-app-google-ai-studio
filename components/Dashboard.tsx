
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
  favoriteIds?: string[]; // Nuevo prop
  onToggleFavorite?: (id: string) => void; // Nuevo prop
}

// MOCK DATA PARA NOTIFICACIONES
const MOCK_NOTIFICATIONS = [
    { id: 1, type: 'cooking', title: '¡Hora de cocinar!', desc: 'Es momento de preparar tu pasta primavera para la cena', time: '10 ene 2026, 20:41', isNew: true, icon: ChefHat, color: 'bg-orange-100 text-orange-600' },
    { id: 2, type: 'shopping', title: 'Lista de compras lista', desc: 'Tu lista para esta semana está preparada. ¡Ve al supermercado!', time: '10 ene 2026, 19:11', isNew: true, icon: ShoppingCart, color: 'bg-green-100 text-green-600' },
    { id: 3, type: 'recipes', title: 'Nuevas recetas disponibles', desc: 'Hemos encontrado 3 recetas mediterráneas perfectas para ti', time: '10 ene 2026, 16:11', isNew: false, icon: Sparkles, color: 'bg-purple-100 text-purple-600' },
    { id: 4, type: 'planning', title: 'Planifica tu semana', desc: '¡No olvides planificar tus comidas para los próximos 7 días!', time: '9 ene 2026, 21:11', isNew: false, icon: Clock, color: 'bg-teal-100 text-teal-600' },
    { id: 5, type: 'achievement', title: '¡Meta alcanzada!', desc: 'Has planificado 7 días consecutivos. ¡Excelente trabajo!', time: '8 ene 2026, 21:11', isNew: false, icon: CheckCircle2, color: 'bg-blue-100 text-blue-600' },
];

export const Dashboard: React.FC<DashboardProps> = ({ user, mealPlan = [], recipes = [], onNavigate, onAddToPlan, isOnline = true, favoriteIds = [], onToggleFavorite }) => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'favorites' | 'notifications'>('dashboard');
  
  // Estados para configuración de notificaciones
  const [configNotifs, setConfigNotifs] = useState({
      foodReminders: true,
      iaSuggestions: true,
      shoppingList: false,
      weeklyPlan: true
  });

  const timeGreeting = useMemo(() => {
      const h = getHours(new Date());
      if (h < 12) return { text: "Buenos días", icon: Sunrise };
      if (h < 20) return { text: "Buenas tardes", icon: Sun };
      return { text: "Buenas noches", icon: Moon };
  }, []);

  // Lógica de Presupuesto Semanal (Simulada para UI)
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
      return [...recipes].reverse().slice(0, 4); // Muestra 4 para mejor grid
  }, [recipes]);

  const favoriteRecipes = useMemo(() => {
      // Filtrar recetas reales usando los IDs guardados
      return recipes.filter(r => favoriteIds.includes(r.id));
  }, [recipes, favoriteIds]);

  const toggleConfig = (key: keyof typeof configNotifs) => {
      setConfigNotifs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const safeTimeSaved = useMemo(() => {
      const val = Number(user.time_saved_mins);
      return isNaN(val) ? 0 : val;
  }, [user.time_saved_mins]);

  // --- VISTA FAVORITOS ---
  if (currentView === 'favorites') {
      return (
          <div className="space-y-8 animate-fade-in pb-10">
              <div className="flex items-center gap-4">
                  <button onClick={() => setCurrentView('dashboard')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                      <ArrowLeft className="w-6 h-6 text-gray-600" />
                  </button>
                  <div>
                      <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2">
                          <Heart className="w-8 h-8 text-red-500 fill-current" /> Mis Favoritos
                      </h1>
                      <p className="text-gray-500 font-medium text-sm">Tus recetas guardadas para cocinar cuando quieras</p>
                  </div>
              </div>

              <div className="flex justify-center">
                  <div className="bg-white border border-gray-100 px-6 py-2 rounded-full shadow-sm">
                      <span className="font-bold text-gray-800 text-sm">{favoriteRecipes.length} recetas favoritas</span>
                  </div>
              </div>

              {favoriteRecipes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {favoriteRecipes.map(recipe => (
                          <div key={recipe.id} className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-lg transition-all group flex flex-col">
                              <div className="aspect-[4/3] relative overflow-hidden">
                                  <SmartImage src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                  <button 
                                    onClick={() => onToggleFavorite && onToggleFavorite(recipe.id)}
                                    className="absolute top-3 right-3 bg-white p-2 rounded-full shadow-md z-10"
                                  >
                                      <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                                  </button>
                              </div>
                              <div className="p-6 flex-1 flex flex-col">
                                  <h3 className="text-lg font-black text-gray-900 leading-tight mb-2">{recipe.title}</h3>
                                  <p className="text-gray-500 text-xs font-medium line-clamp-2 mb-4 flex-1">{recipe.description}</p>
                                  
                                  <div className="flex items-center gap-4 mb-6">
                                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                          recipe.difficulty === 'easy' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                      }`}>
                                          {recipe.difficulty === 'easy' ? 'Fácil' : recipe.difficulty === 'medium' ? 'Media' : 'Difícil'}
                                      </span>
                                      <div className="flex items-center gap-1 text-gray-500 text-xs">
                                          <Clock className="w-4 h-4" /> {recipe.prep_time} min
                                      </div>
                                      <div className="flex items-center gap-1 text-gray-500 text-xs">
                                          <Users className="w-4 h-4" /> {recipe.servings}
                                      </div>
                                  </div>

                                  <button 
                                    onClick={() => {
                                        if(onAddToPlan) {
                                            onAddToPlan(recipe, recipe.servings);
                                        }
                                    }}
                                    className="w-full py-3 bg-teal-700 text-white rounded-xl font-bold text-sm hover:bg-teal-800 active:scale-95 transition-all"
                                  >
                                      Añadir al planificador
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="text-center py-20 opacity-50">
                      <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="font-bold text-gray-500">Aún no tienes favoritos.</p>
                  </div>
              )}
          </div>
      );
  }

  // --- VISTA NOTIFICACIONES ---
  if (currentView === 'notifications') {
      return (
          <div className="space-y-10 animate-fade-in pb-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                      {/* FIX: Botón atrás visible también en desktop */}
                      <button onClick={() => setCurrentView('dashboard')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                          <ArrowLeft className="w-6 h-6 text-gray-600" />
                      </button>
                      <div>
                          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                              <Bell className="w-8 h-8 text-teal-900" /> Notificaciones
                          </h1>
                          <p className="text-gray-500 font-medium text-sm mt-1">Mantente al día con tus comidas y recordatorios</p>
                      </div>
                  </div>
                  <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm">
                      <CheckCircle2 className="w-4 h-4" /> Marcar todas como leídas (2)
                  </button>
              </div>

              {/* LISTA DE NOTIFICACIONES */}
              <div className="space-y-4">
                  {MOCK_NOTIFICATIONS.map(notif => (
                      <div key={notif.id} className="bg-white border border-teal-50 p-4 rounded-2xl shadow-sm flex items-start gap-4 transition-all hover:shadow-md">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${notif.color}`}>
                              <notif.icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-bold text-gray-900 text-sm truncate">{notif.title}</h4>
                                  {notif.isNew && (
                                      <span className="bg-teal-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">Nuevo</span>
                                  )}
                              </div>
                              <p className="text-gray-600 text-sm leading-snug mb-2">{notif.desc}</p>
                              <p className="text-gray-400 text-xs font-medium">{notif.time}</p>
                          </div>
                          <div className="flex items-center gap-2">
                              {notif.isNew && (
                                  <button className="p-2 text-teal-600 hover:bg-teal-50 rounded-full transition-all" title="Marcar como leída">
                                      <CheckCircle2 className="w-5 h-5" />
                                  </button>
                              )}
                              <button className="p-2 text-gray-300 hover:text-gray-500 hover:bg-gray-50 rounded-full transition-all">
                                  <X className="w-4 h-4" />
                              </button>
                          </div>
                      </div>
                  ))}
              </div>

              {/* CONFIGURACIÓN */}
              <div className="pt-6 border-t border-gray-100">
                  <h3 className="text-lg font-black text-gray-900 mb-6">Configurar Notificaciones</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-700">Recordatorios de comida</span>
                          <button 
                            onClick={() => toggleConfig('foodReminders')}
                            className={`w-12 h-7 rounded-full transition-colors relative ${configNotifs.foodReminders ? 'bg-gray-900' : 'bg-gray-200'}`}
                          >
                              <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform ${configNotifs.foodReminders ? 'left-6' : 'left-1'}`} />
                          </button>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-700">Sugerencias de IA</span>
                          <button 
                            onClick={() => toggleConfig('iaSuggestions')}
                            className={`w-12 h-7 rounded-full transition-colors relative ${configNotifs.iaSuggestions ? 'bg-gray-900' : 'bg-gray-200'}`}
                          >
                              <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform ${configNotifs.iaSuggestions ? 'left-6' : 'left-1'}`} />
                          </button>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-700">Lista de compras</span>
                          <button 
                            onClick={() => toggleConfig('shoppingList')}
                            className={`w-12 h-7 rounded-full transition-colors relative ${configNotifs.shoppingList ? 'bg-gray-900' : 'bg-gray-200'}`}
                          >
                              <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform ${configNotifs.shoppingList ? 'left-6' : 'left-1'}`} />
                          </button>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-700">Planificación semanal</span>
                          <button 
                            onClick={() => toggleConfig('weeklyPlan')}
                            className={`w-12 h-7 rounded-full transition-colors relative ${configNotifs.weeklyPlan ? 'bg-gray-900' : 'bg-gray-200'}`}
                          >
                              <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform ${configNotifs.weeklyPlan ? 'left-6' : 'left-1'}`} />
                          </button>
                      </div>

                  </div>
              </div>
          </div>
      );
  }

  // --- VISTA DASHBOARD (DEFAULT) ---
  return (
    <div className="space-y-10 animate-fade-in pb-10">
      
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between">
          <div>
              <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{timeGreeting.text.includes('días') ? '👋' : timeGreeting.text.includes('tardes') ? '☀️' : '🌙'}</span>
                  <h1 className="text-3xl md:text-4xl font-black text-teal-900 tracking-tight">¡Hola, {user.name.split(' ')[0]}!</h1>
              </div>
              <p className="text-gray-500 font-medium text-sm md:text-base">¿Qué vas a cocinar hoy? Organiza tu semana y ahorra.</p>
          </div>
          
          <div className="flex items-center gap-3">
              <button 
                onClick={() => setCurrentView('favorites')}
                className="w-12 h-12 bg-white rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all shadow-sm group"
              >
                  <Heart className="w-6 h-6 group-hover:fill-current" />
              </button>
              <button 
                onClick={() => setCurrentView('notifications')}
                className="w-12 h-12 bg-white rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-teal-900 hover:border-teal-200 transition-all shadow-sm relative"
              >
                  <Bell className="w-6 h-6" />
                  <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
          </div>
      </div>

      {/* KPI CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Recetas Disponibles */}
          <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                  <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Recetas Disponibles</p>
                      <p className="text-3xl font-black text-teal-900">{recipes.length}</p>
                  </div>
                  <div className="p-2 bg-orange-50 rounded-xl text-orange-500">
                      <BookOpen className="w-5 h-5" />
                  </div>
              </div>
              <p className="text-[10px] text-gray-400 font-medium">En tu biblioteca personal</p>
          </div>

          {/* Card 2: Presupuesto Semanal */}
          <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
               <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Presupuesto Semanal</p>
                  <div className={`p-2 rounded-xl ${budgetStats.isOverBudget ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                      <TrendingUp className="w-5 h-5" />
                  </div>
              </div>
              
              <div className="flex items-end gap-1 mb-3">
                  <p className="text-3xl font-black text-teal-900">{budgetStats.spent.toFixed(0)}€</p>
                  <p className="text-sm font-bold text-gray-400 mb-1">/ {budgetStats.limit}€</p>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${budgetStats.isOverBudget ? 'bg-red-500' : 'bg-green-500'}`} 
                    style={{ width: `${budgetStats.percentage}%` }} 
                  />
              </div>
              
              <p className={`text-[10px] font-bold ${budgetStats.isOverBudget ? 'text-red-500' : 'text-gray-400'}`}>
                  {budgetStats.isOverBudget 
                    ? `Has excedido tu presupuesto por ${Math.abs(budgetStats.remaining).toFixed(0)}€` 
                    : `${budgetStats.remaining.toFixed(0)}€ restantes para esta semana`}
              </p>
          </div>

          {/* Card 3: Ahorro */}
          <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                  <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Ahorro Acumulado</p>
                      <p className="text-3xl font-black text-teal-900">{user.total_savings.toFixed(0)}€</p>
                  </div>
                  <div className="p-2 bg-teal-50 rounded-xl text-teal-600">
                      <PiggyBank className="w-5 h-5" />
                  </div>
              </div>
              <p className="text-[10px] text-gray-400 font-medium">Calculado por desperdicio evitado</p>
          </div>

          {/* Card 4: Tiempo */}
          <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                  <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Tiempo Recuperado</p>
                      {/* FIX: Safe check for NaN */}
                      <p className="text-3xl font-black text-teal-900">{Math.round(safeTimeSaved / 60)}h</p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-xl text-purple-500">
                      <Timer className="w-5 h-5" />
                  </div>
              </div>
              <p className="text-[10px] text-gray-400 font-medium">Gracias al Batch Cooking</p>
          </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="space-y-6">
        <h2 className="text-xl font-black text-teal-900">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Action 1 */}
            <button 
                onClick={() => onNavigate('planner')}
                className="bg-white p-6 rounded-[2rem] text-left border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
            >
                <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-700 mb-4 group-hover:scale-110 transition-transform">
                    <Calendar className="w-6 h-6" />
                </div>
                <h3 className="font-black text-lg text-gray-900 mb-1">Planificar Semana</h3>
                <p className="text-xs text-gray-500 font-medium mb-6 leading-relaxed">Organiza tus comidas para los próximos 7 días.</p>
                <div className="text-teal-600 text-xs font-black uppercase tracking-widest flex items-center gap-2 group-hover:gap-3 transition-all">
                    Comenzar <ArrowRight className="w-3 h-3" />
                </div>
            </button>

            {/* Action 2 */}
            <button 
                onClick={() => onNavigate('recipes')}
                className="bg-white p-6 rounded-[2rem] text-left border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
            >
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 mb-4 group-hover:scale-110 transition-transform">
                    <ChefHat className="w-6 h-6" />
                </div>
                <h3 className="font-black text-lg text-gray-900 mb-1">Explorar Recetas</h3>
                <p className="text-xs text-gray-500 font-medium mb-6 leading-relaxed">Descubre nuevas recetas adaptadas a tu inventario.</p>
                <div className="text-teal-600 text-xs font-black uppercase tracking-widest flex items-center gap-2 group-hover:gap-3 transition-all">
                    Comenzar <ArrowRight className="w-3 h-3" />
                </div>
            </button>

            {/* Action 3 */}
            <button 
                onClick={() => onNavigate('shopping')}
                className="bg-white p-6 rounded-[2rem] text-left border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
            >
                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-4 group-hover:scale-110 transition-transform">
                    <ShoppingCart className="w-6 h-6" />
                </div>
                <h3 className="font-black text-lg text-gray-900 mb-1">Lista de Compras</h3>
                <p className="text-xs text-gray-500 font-medium mb-6 leading-relaxed">Genera tu lista automáticamente según tu plan.</p>
                <div className="text-teal-600 text-xs font-black uppercase tracking-widest flex items-center gap-2 group-hover:gap-3 transition-all">
                    Comenzar <ArrowRight className="w-3 h-3" />
                </div>
            </button>

        </div>
      </div>

      {/* LATEST RECIPES SECTION */}
      <div className="space-y-6">
          <h2 className="text-xl font-black text-teal-900">Tus Últimas Recetas</h2>
          {latestRecipes.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {latestRecipes.map((recipe) => {
                    const isFav = favoriteIds.includes(recipe.id);
                    return (
                        <div 
                            key={recipe.id}
                            onClick={() => {
                                 window.history.pushState(null, '', `?tab=recipes&recipe=${recipe.id}`);
                                 onNavigate('recipes');
                            }}
                            className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer relative h-full min-h-[280px]"
                        >
                            <div className="relative aspect-[3/2] overflow-hidden bg-gray-100 flex-shrink-0">
                                <SmartImage src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                <div className="absolute bottom-2 left-2 flex gap-1">
                                     <div className="bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest text-teal-800 flex items-center gap-1 shadow-sm">
                                        <Clock className="w-2.5 h-2.5" /> {recipe.prep_time}'
                                     </div>
                                </div>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onToggleFavorite) onToggleFavorite(recipe.id);
                                    }}
                                    className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-md z-10 hover:scale-110 transition-transform"
                                >
                                    <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                                </button>
                            </div>
                            
                            <div className="p-3 flex-1 flex flex-col">
                                <h3 className="text-sm md:text-xs font-bold text-gray-900 leading-tight mb-2 line-clamp-2 group-hover:text-teal-700 transition-colors">
                                    {recipe.title}
                                </h3>
                                
                                <div className="mt-auto flex items-center gap-2 pt-2 border-t border-gray-50">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 truncate max-w-[80px]">
                                        {recipe.cuisine_type}
                                    </span>
                                    <div className="flex-1" />
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            // Lógica para abrir planificador si es necesario, 
                                            // aquí solo redirigimos a detalle en esta vista simplificada
                                            window.history.pushState(null, '', `?tab=recipes&recipe=${recipe.id}`);
                                            onNavigate('recipes');
                                        }}
                                        className="w-8 h-8 md:w-7 md:h-7 bg-teal-50 text-teal-700 rounded-lg flex items-center justify-center hover:bg-teal-900 hover:text-white transition-all active:scale-90 flex-shrink-0"
                                    >
                                        <CalendarPlus className="w-4 h-4 md:w-3.5 md:h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-[2rem] p-8 text-center border-2 border-dashed border-gray-200">
                <p className="text-gray-400 font-bold text-sm">Aún no tienes recetas guardadas.</p>
                <button onClick={() => onNavigate('recipes')} className="mt-4 text-teal-600 font-black text-xs uppercase tracking-widest hover:underline">Ir a Biblioteca</button>
            </div>
          )}
      </div>

    </div>
  );
};
