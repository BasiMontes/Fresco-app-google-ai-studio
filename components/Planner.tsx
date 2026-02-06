
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MealSlot, Recipe, MealCategory, PantryItem, UserProfile } from '../types';
import { Plus, X, ChevronLeft, ChevronRight, Wand2, Trash2, Sunrise, Sun, Moon, CalendarDays, Clock, Sparkles, ChefHat, Search, Check } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, addWeeks, subWeeks, isBefore, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { generateSmartMenu } from '../services/geminiService';
import { RecipeDetail } from './RecipeDetail';
import { triggerDialog } from './Dialog';
import { ModalPortal } from './ModalPortal';
import { SmartImage } from './SmartImage';

interface PlannerProps {
  user: UserProfile;
  plan: MealSlot[];
  recipes: Recipe[];
  pantry: PantryItem[];
  onUpdateSlot: (date: string, type: MealCategory, recipeId: string | undefined) => void;
  onAIPlanGenerated: (plan: MealSlot[], recipes: Recipe[]) => void;
  onClear: () => void;
}

export const Planner: React.FC<PlannerProps> = ({ user, plan, recipes, pantry, onUpdateSlot, onAIPlanGenerated, onClear }) => {
  const [showPlanWizard, setShowPlanWizard] = useState(false);
  const [showRecipeSelector, setShowRecipeSelector] = useState<{date: string, type: MealCategory} | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectorSearch, setSelectorSearch] = useState('');
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const days = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i)), [currentWeekStart]);
  
  const absoluteWeekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const minWeekStart = useMemo(() => subWeeks(absoluteWeekStart, 1), [absoluteWeekStart]);
  const maxWeekStart = useMemo(() => addWeeks(absoluteWeekStart, 5), [absoluteWeekStart]);

  const canGoBack = isAfter(currentWeekStart, minWeekStart);
  const canGoForward = isBefore(currentWeekStart, maxWeekStart);

  useEffect(() => {
    const timer = setTimeout(() => {
        if (scrollContainerRef.current) {
            const todayIndex = days.findIndex(d => isSameDay(d, new Date()));
            if (todayIndex !== -1) {
                const dayWidth = window.innerWidth < 768 ? window.innerWidth * 0.88 : 420; 
                scrollContainerRef.current.scrollTo({
                    left: todayIndex * dayWidth - 20,
                    behavior: 'smooth'
                });
            }
        }
    }, 200);
    return () => clearTimeout(timer);
  }, [currentWeekStart, days]);

  const filteredSelectorRecipes = useMemo(() => {
      const lower = selectorSearch.toLowerCase();
      return recipes.filter(r => 
        (r.title.toLowerCase().includes(lower) || r.cuisine_type.toLowerCase().includes(lower)) &&
        (showRecipeSelector ? (showRecipeSelector.type === 'breakfast' ? r.meal_category === 'breakfast' : r.meal_category !== 'breakfast') : true)
      ).slice(0, 15);
  }, [recipes, selectorSearch, showRecipeSelector]);

  return (
    <div className="h-full w-full flex flex-col animate-fade-in overflow-hidden bg-[#F8F9FA]">
      {/* HEADER - LIMPIEZA DE BORDES PARA EVITAR LÍNEAS NEGRAS */}
      <header className="w-full pt-8 pb-6 bg-white flex-shrink-0 z-20 px-6 md:px-12 shadow-sm">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
            <div className="flex flex-col">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-[#0F4E0E]">
                        <CalendarDays className="w-6 h-6" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-[#0F4E0E] tracking-tighter leading-none">Mi Menú</h1>
                </div>
                <p className="text-gray-300 font-black uppercase text-[8px] tracking-[0.2em] mt-3 ml-1">Planificación Inteligente</p>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-2xl border border-gray-100 shrink-0">
                    <button 
                        disabled={!canGoBack}
                        onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} 
                        className={`p-2 rounded-xl transition-all ${canGoBack ? 'bg-white text-[#0F4E0E] shadow-sm active:scale-95' : 'text-gray-200 opacity-30'}`}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="min-w-[120px] text-center text-[10px] font-black text-[#0F4E0E] px-2 uppercase tracking-[0.1em]">
                        {format(currentWeekStart, 'MMM yyyy', { locale: es })}
                    </span>
                    <button 
                        disabled={!canGoForward}
                        onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} 
                        className={`p-2 rounded-xl transition-all ${canGoForward ? 'bg-white text-[#0F4E0E] shadow-sm active:scale-95' : 'text-gray-200 opacity-30'}`}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                        onClick={() => triggerDialog({ title: 'Limpiar Plan', message: '¿Borrar todo el calendario actual?', type: 'confirm', onConfirm: onClear })} 
                        className="w-11 h-11 bg-red-50 text-red-500 rounded-xl border border-red-100 flex items-center justify-center shadow-sm"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setShowPlanWizard(true)} 
                        className="h-11 px-5 bg-[#0F4E0E] text-white rounded-xl font-black text-[9px] uppercase tracking-[0.15em] shadow-lg flex items-center gap-2 active:scale-95"
                    >
                        <Wand2 className="w-3.5 h-3.5 text-orange-400" />
                        <span>IA PLAN</span>
                    </button>
                </div>
            </div>
        </div>
      </header>

      {/* VIEWPORT - AJUSTE DE ESPACIADO PARA EVITAR SOLAPAMIENTO */}
      <div 
        ref={scrollContainerRef} 
        className="flex-1 overflow-x-auto no-scrollbar flex gap-6 md:gap-10 p-6 md:p-12 bg-[#F8F9FA] scroll-smooth"
      >
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isToday = isSameDay(day, new Date());
          return (
            <div 
              key={dateStr} 
              className={`min-w-[85vw] md:min-w-[380px] flex-shrink-0 flex flex-col gap-6 animate-fade-in transition-all duration-500 ${isToday ? 'scale-100' : 'opacity-80 scale-[0.97]'}`}
            >
                {/* CABECERA DEL DÍA - SIN BORDES GRUESOS */}
                <div className={`flex items-center justify-between px-8 py-6 rounded-[2.5rem] transition-all duration-700 flex-shrink-0 ${isToday ? 'bg-[#0F4E0E] text-white shadow-xl z-10' : 'bg-white text-[#0F4E0E] shadow-sm border border-gray-50'}`}>
                    <div className="flex flex-col">
                        <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${isToday ? 'text-orange-400' : 'text-[#0F4E0E]/30'}`}>
                            {format(day, 'EEEE', { locale: es })}
                        </span>
                        <span className="text-3xl font-black leading-none mt-1 tracking-tighter">{format(day, 'd')}</span>
                    </div>
                    {isToday && (
                      <div className="px-4 py-2 bg-white/10 rounded-full text-[8px] font-black uppercase tracking-widest border border-white/10 backdrop-blur-md">
                        HOY
                      </div>
                    )}
                </div>
                
                {/* LISTA DE COMIDAS */}
                <div className="flex-1 flex flex-col gap-5 md:gap-6 overflow-y-auto no-scrollbar pb-10">
                  {(['breakfast', 'lunch', 'dinner'] as MealCategory[]).map((type) => {
                      const slot = plan.find(p => p.date === dateStr && p.type === type);
                      const recipe = slot?.recipeId ? recipes.find(r => String(r.id) === String(slot.recipeId)) : null;
                      
                      return (
                          <div 
                            key={type} 
                            onClick={() => recipe ? setSelectedRecipe(recipe) : setShowRecipeSelector({date: dateStr, type})} 
                            className={`relative min-h-[160px] md:min-h-[200px] rounded-[3rem] transition-all duration-500 cursor-pointer overflow-hidden group border ${recipe ? 'bg-gray-900 border-transparent shadow-md' : 'bg-white border-dashed border-gray-200 hover:border-[#0F4E0E]'}`}
                          >
                              {recipe ? (
                                  <div className="absolute inset-0 w-full h-full flex flex-col animate-fade-in">
                                      <SmartImage src={recipe.image_url} alt={recipe.title} className="absolute inset-0 w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 opacity-60" />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
                                      
                                      <div className="relative z-10 flex flex-col h-full justify-between p-8 md:p-10">
                                          <div className="flex justify-between items-start">
                                              <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-3xl border border-white/10 flex items-center">
                                                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white leading-none">
                                                    {type === 'breakfast' ? 'MAÑANA' : type === 'lunch' ? 'COMIDA' : 'CENA'}
                                                  </span>
                                              </div>
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); onUpdateSlot(dateStr, type, undefined); }} 
                                                className="p-3 bg-red-500 text-white rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                                              >
                                                  <X className="w-4 h-4" />
                                              </button>
                                          </div>
                                          
                                          <div className="space-y-3">
                                              <h5 className="font-black text-xl text-white leading-tight uppercase line-clamp-2 drop-shadow-2xl tracking-tighter">{recipe.title}</h5>
                                              <div className="flex items-center gap-3">
                                                  <div className="flex items-center gap-2 bg-orange-500/20 px-2 py-1 rounded-lg backdrop-blur-md">
                                                    <Clock className="w-3 h-3 text-orange-400" />
                                                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">{recipe.prep_time}'</span>
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                                      <div className="w-14 h-14 md:w-16 md:h-16 rounded-[1.8rem] bg-gray-50 flex items-center justify-center mb-4 border border-gray-50 group-hover:bg-[#0F4E0E] group-hover:text-white transition-all duration-500">
                                        <Plus className="w-6 h-6 text-[#0F4E0E] group-hover:text-white" />
                                      </div>
                                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-200 group-hover:text-[#0F4E0E] transition-all">{type}</span>
                                  </div>
                              )}
                          </div>
                      );
                  })}
                </div>
            </div>
          );
        })}
      </div>

      {showRecipeSelector && (
          <ModalPortal>
              <div className="fixed inset-0 z-[5000] bg-[#0F4E0E]/95 backdrop-blur-3xl flex items-center justify-center p-4 md:p-8" onClick={() => setShowRecipeSelector(null)}>
                  <div className="bg-white w-full max-w-4xl rounded-[3.5rem] p-8 md:p-16 shadow-2xl relative animate-slide-up flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-start mb-10">
                        <div>
                            <h3 className="text-4xl font-black text-[#0F4E0E] tracking-tighter uppercase">¿Qué comemos?</h3>
                            <div className="flex items-center gap-3 mt-4">
                                <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] bg-orange-50 px-4 py-2 rounded-xl">
                                    {showRecipeSelector.type}
                                </span>
                            </div>
                        </div>
                        <button onClick={() => setShowRecipeSelector(null)} className="p-4 bg-gray-50 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all text-gray-400"><X className="w-6 h-6" /></button>
                    </div>

                    <div className="relative mb-8">
                        <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-300" />
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="Busca por ingrediente o tipo..." 
                            value={selectorSearch}
                            onChange={(e) => setSelectorSearch(e.target.value)}
                            className="w-full h-16 md:h-20 pl-20 pr-10 bg-gray-50 border-2 border-transparent focus:border-[#0F4E0E]/10 rounded-[2.2rem] font-bold text-lg outline-none transition-all text-[#0F4E0E] placeholder:text-gray-200"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 md:space-y-6">
                        {filteredSelectorRecipes.map(recipe => (
                            <div 
                                key={recipe.id}
                                onClick={() => { onUpdateSlot(showRecipeSelector.date, showRecipeSelector.type, recipe.id); setShowRecipeSelector(null); }}
                                className="group flex items-center gap-6 p-4 bg-white border border-gray-100 rounded-[2.5rem] hover:bg-teal-50/20 transition-all cursor-pointer shadow-sm hover:shadow-xl"
                            >
                                <div className="w-20 h-20 md:w-24 md:h-24 rounded-[1.5rem] overflow-hidden shadow-xl flex-shrink-0">
                                    <SmartImage src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-xl text-[#0F4E0E] leading-tight mb-2 truncate tracking-tighter uppercase">{recipe.title}</h4>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest bg-gray-50 px-2.5 py-1 rounded-lg">{recipe.cuisine_type}</span>
                                        <span className="text-[9px] font-black uppercase text-orange-500 tracking-widest">{recipe.prep_time} MIN</span>
                                    </div>
                                </div>
                                <div className="w-12 h-12 bg-[#0F4E0E] rounded-[1.4rem] flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all text-white shadow-2xl flex-shrink-0">
                                    <Check className="w-6 h-6 stroke-[3px]" />
                                </div>
                            </div>
                        ))}
                    </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {selectedRecipe && (
        <RecipeDetail 
            recipe={selectedRecipe} pantry={pantry} userProfile={user} onClose={() => setSelectedRecipe(null)} 
            onAddToPlan={(serv, date, type) => { onUpdateSlot(date!, type!, selectedRecipe.id); setSelectedRecipe(null); }}
        />
      )}
    </div>
  );
};
