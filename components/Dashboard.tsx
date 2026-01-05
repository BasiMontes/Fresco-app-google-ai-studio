
import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile, Recipe, PantryItem, MealSlot } from '../types';
import { ChefHat, Sparkles, ArrowRight, PiggyBank, Package, RefreshCw, TrendingUp, AlertTriangle, Zap, Clock, Smile, WifiOff, Sunrise, Sun, Moon, Timer, Apple, Minus, CloudCog, FlaskConical } from 'lucide-react';
import { generateRecipesAI } from '../services/geminiService';
import { SPANISH_PRICES, FEATURES } from '../constants';
import { differenceInDays, getHours, format } from 'date-fns';
import { MorningBriefing } from './MorningBriefing';

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

export const Dashboard: React.FC<DashboardProps> = ({ user, pantry, mealPlan = [], recipes = [], onNavigate, onQuickRecipe, onResetApp, onQuickConsume, isOnline = true }) => {
  const [showBriefing, setShowBriefing] = useState(false);

  useEffect(() => {
      // QA: Feature Flag check
      if (!FEATURES.MORNING_BRIEFING) return;

      const hour = getHours(new Date());
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const lastBriefingDate = localStorage.getItem('fresco_briefing_seen_date');
      
      const criticalCount = pantry.filter(i => i.expires_at && differenceInDays(new Date(i.expires_at), new Date()) <= 2).length;
      const today = format(new Date(), 'yyyy-MM-dd');
      const hasPlanToday = mealPlan.some(slot => slot.date === today);

      if (hour >= 5 && hour < 12 && lastBriefingDate !== todayStr && (criticalCount > 0 || hasPlanToday)) {
          const timer = setTimeout(() => setShowBriefing(true), 1500);
          return () => clearTimeout(timer);
      }
  }, [pantry, mealPlan]);

  const handleCloseBriefing = () => {
      setShowBriefing(false);
      localStorage.setItem('fresco_briefing_seen_date', format(new Date(), 'yyyy-MM-dd'));
  };

  const dailyPlanDetails = useMemo(() => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return mealPlan
          .filter(slot => slot.date === today)
          .map(slot => ({
              slot,
              recipe: recipes.find(r => r.id === slot.recipeId)
          }));
  }, [mealPlan, recipes]);

  const snackItems = useMemo(() => {
      return pantry.filter(item => {
          const isSnackCategory = ['fruits', 'dairy', 'other'].includes(item.category);
          const isQuantity = item.quantity >= 1;
          return isSnackCategory && isQuantity;
      }).sort((a, b) => b.quantity - a.quantity).slice(0, 5); 
  }, [pantry]);

  const timeGreeting = useMemo(() => {
      const h = getHours(new Date());
      if (h < 12) return { text: "Buenos días", icon: Sunrise };
      if (h < 20) return { text: "Buenas tardes", icon: Sun };
      return { text: "Buenas noches", icon: Moon };
  }, []);

  return (
    <div className="space-y-6 pb-32 animate-fade-in relative">
      
      {showBriefing && (
          <MorningBriefing 
            pantry={pantry} 
            userName={user.name} 
            dailyPlan={dailyPlanDetails} 
            onClose={handleCloseBriefing} 
            onCookNow={(item) => {
                handleCloseBriefing();
                onQuickRecipe(item);
            }} 
          />
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4 w-full">
          <div className="w-10 h-10 md:w-10 md:h-10 rounded-full bg-teal-900 flex items-center justify-center text-white font-black flex-shrink-0 text-sm">{user.name[0]}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-teal-600 font-bold text-[10px] uppercase tracking-widest mb-0.5">
                <timeGreeting.icon className="w-3 h-3" /> {timeGreeting.text}
            </div>
            <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-2xl font-black text-teal-900 leading-none truncate max-w-[200px] md:max-w-none">{user.name.split(' ')[0]}</h1>
                <span className="bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest flex items-center gap-1 shadow-sm animate-pulse-slow cursor-help flex-shrink-0" title="Versión de prueba">
                    <FlaskConical className="w-3 h-3" /> Beta
                </span>
            </div>
          </div>
          {isOnline ? (
            <div className="hidden md:flex items-center gap-2 bg-teal-50 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-teal-600 border border-teal-100 shadow-sm">
                <CloudCog className="w-3 h-3" /> Nube
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 border border-gray-200">
                <WifiOff className="w-3 h-3" /> Offline
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white p-6 md:p-4 rounded-3xl md:rounded-2xl border border-gray-100 shadow-sm border-b-4 border-b-teal-600">
              <PiggyBank className="w-6 h-6 md:w-5 md:h-5 text-teal-600 mb-2 md:mb-1" />
              <div className="text-3xl md:text-2xl font-black text-gray-900">{user.total_savings.toFixed(1)}€</div>
              <div className="text-[10px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest">Ahorro Acumulado</div>
          </div>

          <div className="bg-white p-6 md:p-4 rounded-3xl md:rounded-2xl border border-gray-100 shadow-sm border-b-4 border-b-orange-500">
              <Timer className="w-6 h-6 md:w-5 md:h-5 text-orange-500 mb-2 md:mb-1" />
              <div className="text-3xl md:text-2xl font-black text-gray-900">{user.time_saved_mins || 0}m</div>
              <div className="text-[10px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest">Tiempo Recuperado</div>
          </div>

          <div className="bg-white p-6 md:p-4 rounded-3xl md:rounded-2xl border border-gray-100 shadow-sm border-b-4 border-b-purple-600">
              <ChefHat className="w-6 h-6 md:w-5 md:h-5 text-purple-600 mb-2 md:mb-1" />
              <div className="text-3xl md:text-2xl font-black text-gray-900">{user.meals_cooked}</div>
              <div className="text-[10px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest">Platos Saludables</div>
          </div>
      </div>

      {snackItems.length > 0 && onQuickConsume && (
          <section>
              <div className="flex items-center gap-2 mb-2 px-1">
                  <Apple className="w-4 h-4 text-red-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Picoteo Rápido (-1)</h3>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  {snackItems.map(item => (
                      <button 
                        key={item.id}
                        onClick={() => onQuickConsume(item.id)}
                        className="bg-white p-3 pr-5 md:p-2 md:pr-4 rounded-2xl md:rounded-xl border border-gray-100 flex items-center gap-3 md:gap-2 hover:shadow-lg hover:border-orange-200 transition-all group flex-shrink-0"
                      >
                          <div className="w-10 h-10 md:w-8 md:h-8 bg-gray-50 rounded-xl md:rounded-lg flex items-center justify-center text-lg md:text-base shadow-sm group-hover:bg-orange-50 group-hover:scale-110 transition-transform">
                              {item.category === 'fruits' ? '🍎' : item.category === 'dairy' ? '🥛' : '🥨'}
                          </div>
                          <div className="text-left">
                              <div className="font-black text-gray-900 truncate max-w-[80px] text-sm md:text-xs">{item.name}</div>
                              <div className="text-[9px] md:text-[8px] font-bold text-gray-400 group-hover:text-orange-500">Quedan {item.quantity}</div>
                          </div>
                          <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Minus className="w-3 h-3" />
                          </div>
                      </button>
                  ))}
              </div>
          </section>
      )}

      <section className="bg-teal-900 rounded-[3rem] md:rounded-[2rem] p-8 md:p-6 text-white relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center">
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                  <div className="bg-orange-500 p-2 rounded-xl shadow-lg">
                      <Sparkles className="w-5 h-5 md:w-4 md:h-4 text-white" />
                  </div>
                  <h3 className="text-2xl md:text-xl font-black">Planificador</h3>
              </div>
              <p className="text-teal-100/60 text-sm md:text-xs mb-4 font-medium max-w-md mx-auto md:mx-0 leading-tight">¿Hoy cocinas para toda la semana? Usa Batch Cooking.</p>
              
              <div className="flex flex-col md:flex-row gap-2">
                  <button onClick={() => onNavigate('planner')} className="px-5 py-2.5 bg-orange-500 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-600 active:scale-95 transition-all">
                    Planificar <ArrowRight className="w-3 h-3" />
                  </button>
                  <button onClick={() => onNavigate('shopping')} className="px-5 py-2.5 bg-white/10 border border-white/20 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all">
                    Lista
                  </button>
              </div>
            </div>
        </div>
      </section>
    </div>
  );
};
