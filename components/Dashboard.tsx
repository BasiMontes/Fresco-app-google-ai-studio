
import React, { useMemo } from 'react';
import { UserProfile, Recipe, PantryItem, MealSlot } from '../types';
import { ChefHat, Sparkles, ArrowRight, PiggyBank, Timer, CloudCog, FlaskConical, Sunrise, Sun, Moon } from 'lucide-react';
import { getHours } from 'date-fns';

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

export const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate, isOnline = true }) => {
  const timeGreeting = useMemo(() => {
      const h = getHours(new Date());
      if (h < 12) return { text: "Buenos días", icon: Sunrise };
      if (h < 20) return { text: "Buenas tardes", icon: Sun };
      return { text: "Buenas noches", icon: Moon };
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* HEADER SECTION (Scaled Down) */}
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-teal-900 flex items-center justify-center text-white font-black text-lg">
                  {user.name[0]}
              </div>
              <div>
                  <div className="flex items-center gap-2 mb-0.5">
                      <timeGreeting.icon className="w-3 h-3 text-teal-600" />
                      <span className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em]">{timeGreeting.text}</span>
                  </div>
                  <div className="flex items-center gap-3">
                      <h1 className="text-3xl font-black text-teal-900 tracking-tight">{user.name.split(' ')[0]}</h1>
                      <span className="bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest">Beta</span>
                  </div>
              </div>
          </div>
          {isOnline && (
              <div className="hidden md:flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full border border-green-100 shadow-sm">
                  <CloudCog className="w-4 h-4 text-green-600" />
                  <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Nube Activa</span>
              </div>
          )}
      </div>

      {/* KPI CARDS (Compact Version) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Ahorro */}
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden group">
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
              <div className="mb-4">
                  <PiggyBank className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-3xl font-black text-gray-900 mb-1">{user.total_savings.toFixed(1)}€</div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Ahorro Acumulado</div>
          </div>

          {/* Card 2: Tiempo */}
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden group">
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
              <div className="mb-4">
                  <Timer className="w-6 h-6 text-orange-500" />
              </div>
              <div className="text-3xl font-black text-gray-900 mb-1">{user.time_saved_mins || 0}m</div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Tiempo Recuperado</div>
          </div>

          {/* Card 3: Platos */}
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden group">
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
              <div className="mb-4">
                  <ChefHat className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-3xl font-black text-gray-900 mb-1">{user.meals_cooked}</div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Platos Saludables</div>
          </div>
      </div>

      {/* HERO SECTION (Compact) */}
      <section className="bg-teal-900 rounded-[2.5rem] p-10 relative overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-4 mb-4">
                <div className="bg-orange-500 p-3 rounded-xl shadow-lg">
                    <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-3xl font-black text-white tracking-tight">Planificador Inteligente</h2>
            </div>
            
            <p className="text-teal-100/80 text-sm font-medium leading-relaxed mb-8 max-w-lg">
                ¿Hoy cocinas para toda la semana? Usa Batch Cooking para optimizar tu tiempo y reducir el desperdicio al mínimo.
            </p>
            
            <div className="flex flex-wrap gap-3">
                <button 
                    onClick={() => onNavigate('planner')} 
                    className="px-6 py-3 bg-orange-500 rounded-xl font-black text-[10px] uppercase tracking-widest text-white shadow-lg hover:bg-orange-600 hover:scale-105 transition-all flex items-center gap-2"
                >
                  Planificar Semana <ArrowRight className="w-3 h-3" />
                </button>
                <button 
                    onClick={() => onNavigate('shopping')} 
                    className="px-6 py-3 bg-white/10 border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest text-white hover:bg-white/20 transition-all"
                >
                  Lista de Compra
                </button>
            </div>
        </div>
        
        {/* Decorative Background Elements */}
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-teal-800 to-transparent opacity-50" />
        <div className="absolute -right-20 -bottom-40 w-96 h-96 bg-orange-500 rounded-full blur-[150px] opacity-20" />
      </section>
    </div>
  );
};
