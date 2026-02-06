
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MealSlot, Recipe, MealCategory, PantryItem, UserProfile } from '../types';
import { Plus, X, Loader2, ChevronLeft, ChevronRight, Wand2, Trash2, Sunrise, Sun, Moon, ChefHat, Search, Check, CalendarDays, Clock, Sparkles } from 'lucide-react';
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectorSearch, setSelectorSearch] = useState('');
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const days = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i)), [currentWeekStart]);
  
  const absoluteWeekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const minWeekStart = useMemo(() => subWeeks(absoluteWeekStart, 1), [absoluteWeekStart]);
  const maxWeekStart = useMemo(() => addWeeks(absoluteWeekStart, 5), [absoluteWeekStart]);

  const canGoBack = isAfter(currentWeekStart, minWeekStart);
  const canGoForward = isBefore(currentWeekStart, maxWeekStart);

  // Auto-scroll al día de hoy al cargar
  useEffect(() => {
    const timer = setTimeout(() => {
        if (scrollContainerRef.current) {
            const todayIndex = days.findIndex(d => isSameDay(d, new Date()));
            if (todayIndex !== -1) {
                const dayWidth = window.innerWidth < 768 ? window.innerWidth * 0.85 : 400; 
                scrollContainerRef.current.scrollTo({
                    left: todayIndex * dayWidth - 20,
                    behavior: 'smooth'
                });
            }
        }
    }, 150);
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
      {/* HEADER PREMIUM - UNIFICADO */}
      <header className="w-full pt-8 pb-6 bg-white border-b border-gray-100 flex-shrink-0 z-20 px-6 md:px-12">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-[#0F4E0E] shadow-sm">
                        <CalendarDays className="w-6 h-6" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-[#0F4E0E] tracking-tighter leading-none">Planificador</h1>
                </div>
                <p className="text-gray-300 font-black uppercase text-[9px] tracking-[0.4em] mt-3 ml-1 md:block hidden">PLANIFICACIÓN SEMANAL DE FRESCO</p>
                <p className="text-gray-300 font-black uppercase text-[8px] tracking-[0.2em] mt-2 ml-1 md:hidden">Semana del {format(currentWeekStart, 'd MMM', {locale: es})}</p>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-2xl shadow-inner border border-gray-100">
                    <button 
                        disabled={!canGoBack}
                        onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} 
                        className={`p-2 rounded-xl transition-all ${canGoBack ? 'bg-white text-[#0F4E0E] shadow-sm hover:scale-105 active:scale-95' : 'text-gray-200 cursor-not-allowed opacity-30'}`}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="min-w-[140px] text-center text-[10px] font-black text-[#0F4E0E] px-2 uppercase tracking-[0.2em]">
                        {format(currentWeekStart, 'MMMM yyyy', { locale: es })}
                    </span>
                    <button 
                        disabled={!canGoForward}
                        onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} 
                        className={`p-2 rounded-xl transition-all ${canGoForward ? 'bg-white text-[#0F4E0E] shadow-sm hover:scale-105 active:scale-95' : 'text-gray-200 cursor-not-allowed opacity-30'}`}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => triggerDialog({ title: 'Limpiar Plan', message: '¿Borrar todo el calendario actual?', type: 'confirm', onConfirm: onClear })} 
                        className="w-12 h-12 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all border border-red-100 flex items-center justify-center shrink-0 shadow-sm"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setShowPlanWizard(true)} 
                        className="h-12 px-6 bg-[#0F4E0E] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-[#062606] transition-all active:scale-[0.98] flex items-center gap-3"
                    >
                        <Wand2 className="w-4 h-4 text-orange-400" />
                        <span className="hidden sm:inline">AUTO-PLAN</span>
                    </button>
                </div>
            </div>
        </div>
      </header>

      {/* VIEWPORT DE CALENDARIO: DISEÑO DE COLUMNAS INFINITAS */}
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
              className={`min-w-[85vw] md:min-w-[380px] flex-shrink-0 flex flex-col gap-8 animate-fade-in transition-transform duration-500 ${isToday ? 'scale-100' : 'opacity-90 scale-[0.98]'}`}
            >
                {/* CABECERA DEL DÍA: UNIFICADA */}
                <div className={`flex items-center justify-between px-10 py-7 rounded-[3rem] transition-all duration-700 flex-shrink-0 ${isToday ? 'bg-[#0F4E0E] text-white shadow-2xl z-10' : 'bg-white text-[#0F4E0E] border border-gray-100 shadow-sm'}`}>
                    <div className="flex flex-col">
                        <span className={`text-[11px] font-black uppercase tracking-[0.4em] ${isToday ? 'text-orange-400' : 'text-[#0F4E0E]/30'}`}>
                            {format(day, 'EEEE', { locale: es })}
                        </span>
                        <span className="text-4xl font-black leading-none mt-1 tracking-tighter">{format(day, 'd')}</span>
                    </div>
                    {isToday && (
                      <div className="px-5 py-2.5 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10 backdrop-blur-md">
                        HOY
                      </div>
                    )}
                </div>
                
                {/* LISTA DE COMIDAS: ESPACIADO GENEROSO */}
                <div className="flex-1 flex flex-col gap-6 overflow-y-auto no-scrollbar pb-10">
                  {(['breakfast', 'lunch', 'dinner'] as MealCategory[]).map((type) => {
                      const slot = plan.find(p => p.date === dateStr && p.type === type);
                      const recipe = slot?.recipeId ? recipes.find(r => String(r.id) === String(slot.recipeId)) : null;
                      
                      return (
                          <div 
                            key={type} 
                            onClick={() => recipe ? setSelectedRecipe(recipe) : setShowRecipeSelector({date: dateStr, type})} 
                            className={`relative min-h-[180px] md:min-h-[220px] rounded-[3.5rem] transition-all duration-500 cursor-pointer overflow-hidden group border-2 ${recipe ? 'bg-gray-900 border-transparent shadow-xl' : 'bg-white border-dashed border-gray-100 hover:border-[#0F4E0E] hover:bg-teal-50/10'}`}
                          >
                              {recipe ? (
                                  <div className="absolute inset-0 w-full h-full flex flex-col animate-fade-in">
                                      <SmartImage src={recipe.image_url} alt={recipe.title} className="absolute inset-0 w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 opacity-60" />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
                                      
                                      <div className="relative z-10 flex flex-col h-full justify-between p-10">
                                          <div className="flex justify-between items-start">
                                              <div className="px-5 py-2.5 rounded-2xl bg-white/10 backdrop-blur-3xl border border-white/10 flex items-center">
                                                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white leading-none">
                                                    {type === 'breakfast' ? 'MAÑANA' : type === 'lunch' ? 'COMIDA' : 'CENA'}
                                                  </span>
                                              </div>
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); onUpdateSlot(dateStr, type, undefined); }} 
                                                className="p-3.5 bg-red-500 text-white rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                                              >
                                                  <X className="w-5 h-5" />
                                              </button>
                                          </div>
                                          
                                          <div className="space-y-4">
                                              <h5 className="font-black text-2xl text-white leading-tight uppercase line-clamp-2 drop-shadow-2xl tracking-tighter">{recipe.title}</h5>
                                              <div className="flex items-center gap-4">
                                                  <div className="flex items-center gap-2 bg-orange-500/20 px-3 py-1.5 rounded-xl backdrop-blur-md">
                                                    <Clock className="w-3.5 h-3.5 text-orange-400" />
                                                    <span className="text-[11px] font-black text-orange-400 uppercase tracking-widest">{recipe.prep_time}'</span>
                                                  </div>
                                                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                                  <span className="text-[10px] font-black text-white/50 uppercase tracking-widest capitalize">{recipe.difficulty}</span>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center p-10 text-center animate-fade-in">
                                      <div className="w-20 h-20 rounded-[2.2rem] bg-gray-50 flex items-center justify-center mb-5 border border-gray-50 group-hover:bg-[#0F4E0E] group-hover:text-white group-hover:shadow-2xl group-hover:-translate-y-1 transition-all duration-500">
                                        <Plus className="w-9 h-9 text-[#0F4E0E] group-hover:text-white transition-all" />
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-[11px] font-black uppercase tracking-[0.5em] text-gray-200 group-hover:text-[#0F4E0E] transition-all">{type}</span>
                                        <span className="text-[9px] font-bold text-gray-100 uppercase mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Añadir plato</span>
                                      </div>
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

      {/* SELECTOR DE RECETA - DISEÑO PREMIUM MODAL */}
      {showRecipeSelector && (
          <ModalPortal>
              <div className="fixed inset-0 z-[5000] bg-[#0F4E0E]/95 backdrop-blur-3xl flex items-center justify-center p-4 md:p-8" onClick={() => setShowRecipeSelector(null)}>
                  <div className="bg-white w-full max-w-4xl rounded-[4rem] p-10 md:p-16 shadow-2xl relative animate-slide-up flex flex-col max-h-[90vh] border border-white/20" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-start mb-12">
                        <div>
                            <h3 className="text-5xl font-black text-[#0F4E0E] tracking-tighter">Qué comemos?</h3>
                            <div className="flex items-center gap-3 mt-4">
                                <span className="text-[11px] font-black text-orange-500 uppercase tracking-[0.3em] bg-orange-50 px-4 py-2 rounded-xl">
                                    {showRecipeSelector.type}
                                </span>
                                <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">
                                    {format(new Date(showRecipeSelector.date), "d 'de' MMMM", {locale: es})}
                                </span>
                            </div>
                        </div>
                        <button onClick={() => setShowRecipeSelector(null)} className="p-5 bg-gray-50 rounded-3xl hover:bg-red-50 hover:text-red-500 transition-all text-gray-400 shadow-sm"><X className="w-7 h-7" /></button>
                    </div>

                    <div className="relative mb-10">
                        <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-300" />
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="Busca por ingrediente o tipo..." 
                            value={selectorSearch}
                            onChange={(e) => setSelectorSearch(e.target.value)}
                            className="w-full h-20 pl-20 pr-10 bg-gray-50 border-2 border-transparent focus:border-[#0F4E0E]/10 rounded-[2.5rem] font-bold text-xl outline-none transition-all shadow-inner text-[#0F4E0E] placeholder:text-gray-200"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pr-2">
                        {filteredSelectorRecipes.map(recipe => (
                            <div 
                                key={recipe.id}
                                onClick={() => { onUpdateSlot(showRecipeSelector.date, showRecipeSelector.type, recipe.id); setShowRecipeSelector(null); }}
                                className="group flex items-center gap-8 p-6 bg-white border border-gray-100 rounded-[3rem] hover:bg-teal-50/20 hover:border-teal-100 transition-all cursor-pointer shadow-sm hover:shadow-xl"
                            >
                                <div className="w-28 h-28 rounded-[2rem] overflow-hidden shadow-xl flex-shrink-0">
                                    <SmartImage src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-2xl text-[#0F4E0E] leading-tight mb-3 truncate tracking-tighter uppercase">{recipe.title}</h4>
                                    <div className="flex items-center gap-4">
                                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest bg-gray-50 px-3 py-1 rounded-lg">{recipe.cuisine_type}</span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                                        <span className="text-[10px] font-black uppercase text-orange-500 tracking-widest">{recipe.prep_time} MIN</span>
                                    </div>
                                </div>
                                <div className="w-16 h-16 bg-[#0F4E0E] rounded-[1.8rem] flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all text-white shadow-2xl flex-shrink-0">
                                    <Check className="w-8 h-8 stroke-[3px]" />
                                </div>
                            </div>
                        ))}
                        {filteredSelectorRecipes.length === 0 && (
                            <div className="text-center py-20 opacity-20 flex flex-col items-center gap-4">
                                <ChefHat className="w-16 h-16" />
                                <p className="font-black uppercase tracking-widest text-sm">No encontramos esa receta</p>
                            </div>
                        )}
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
