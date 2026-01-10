
import React, { useMemo } from 'react';
import { UserProfile, Recipe, PantryItem, MealSlot } from '../types';
import { ChefHat, Sparkles, ArrowRight, PiggyBank, Timer, Sunrise, Sun, Moon, Calendar, ShoppingCart, BookOpen, Heart, Bell, AlertCircle, TrendingUp } from 'lucide-react';
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
}

export const Dashboard: React.FC<DashboardProps> = ({ user, mealPlan = [], recipes = [], onNavigate, isOnline = true }) => {
  const timeGreeting = useMemo(() => {
      const h = getHours(new Date());
      if (h < 12) return { text: "Buenos días", icon: Sunrise };
      if (h < 20) return { text: "Buenas tardes", icon: Sun };
      return { text: "Buenas noches", icon: Moon };
  }, []);

  // Lógica de Presupuesto Semanal (Simulada para UI)
  const budgetStats = useMemo(() => {
      const BUDGET_LIMIT = 50; // Presupuesto ejemplo 50€
      
      // Calcular gasto estimado de la semana actual
      const today = new Date();
      const start = startOfWeek(today, { weekStartsOn: 1 });
      const end = endOfWeek(today, { weekStartsOn: 1 });

      const weeklySlots = mealPlan.filter(slot => {
          try {
             return isWithinInterval(parseISO(slot.date), { start, end });
          } catch { return false; }
      });

      // Estimación burda: 3€ por comida planificada si no tenemos precio exacto calculado
      const estimatedSpent = weeklySlots.length * 3.5; 
      
      const percentage = Math.min(100, (estimatedSpent / BUDGET_LIMIT) * 100);
      const isOverBudget = estimatedSpent > BUDGET_LIMIT;
      const remaining = BUDGET_LIMIT - estimatedSpent;

      return { limit: BUDGET_LIMIT, spent: estimatedSpent, percentage, isOverBudget, remaining };
  }, [mealPlan]);

  // Últimas recetas (o random si son pocas)
  const latestRecipes = useMemo(() => {
      return [...recipes].reverse().slice(0, 3);
  }, [recipes]);

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
                onClick={() => onNavigate('recipes')} // Placeholder acción favoritos
                className="w-12 h-12 bg-white rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all shadow-sm group"
              >
                  <Heart className="w-6 h-6 group-hover:fill-current" />
              </button>
              <button 
                onClick={() => alert("Sin notificaciones nuevas")} 
                className="w-12 h-12 bg-white rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-teal-900 hover:border-teal-200 transition-all shadow-sm relative"
              >
                  <Bell className="w-6 h-6" />
                  <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
          </div>
      </div>

      {/* KPI CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Plan Semanal (Usando Recetas Disponibles como pidió el usuario) */}
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

          {/* Card 2: Presupuesto Semanal (Barra de Progreso) */}
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
                      <p className="text-3xl font-black text-teal-900">{Math.round(user.time_saved_mins / 60)}h</p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {latestRecipes.map((recipe) => (
                    <div 
                        key={recipe.id}
                        onClick={() => {
                            // Hack: Navegamos a recetas y luego abrimos el detalle pasando el ID por URL o estado global
                            // Por simplicidad en esta demo, navegamos a la tab recetas
                             window.history.pushState(null, '', `?tab=recipes&recipe=${recipe.id}`);
                             onNavigate('recipes');
                        }}
                        className="bg-white p-4 pb-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                    >
                        <div className="aspect-[4/3] rounded-[1.5rem] overflow-hidden mb-4 relative">
                             <SmartImage src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                             <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg">
                                 <ChefHat className="w-4 h-4 text-teal-600" />
                             </div>
                        </div>
                        <h3 className="font-bold text-gray-900 truncate mb-1 px-2">{recipe.title}</h3>
                        <div className="flex justify-between items-center px-2">
                             <p className="text-xs text-gray-500 capitalize">{recipe.cuisine_type}</p>
                             <p className="text-xs font-bold text-teal-600">{recipe.prep_time} min</p>
                        </div>
                    </div>
                ))}
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
