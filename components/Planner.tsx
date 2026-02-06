
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MealSlot, Recipe, MealCategory, PantryItem, UserProfile } from '../types';
import { Plus, X, ChevronLeft, ChevronRight, Wand2, Trash2, CalendarDays, Clock, Search, Check } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, addWeeks, subWeeks, isBefore, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
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
                const dayWidth = window.innerWidth < 768 ? window.innerWidth * 0.85 : 340; 
                scrollContainerRef.current.scrollTo({
                    left: todayIndex * dayWidth,
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
      {/* HEADER COMPACTO */}
      <header className="w-full py-4 md:py-6 bg-white flex-shrink-0 z-20 px-6 md:px-10 shadow-sm">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center text-[#0F4E0E]">
                    <CalendarDays className="w-5 h-5" />
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-[#0F4E0E] tracking-tighter">Mi Menú</h1>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100 shrink-0">
                    <button 
                        disabled={!canGoBack}
                        onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} 
                        className={`p-2 rounded-lg transition-all ${canGoBack ? 'bg-white text-[#0F4E0E] shadow-sm active:scale-95' : 'text-gray-200'}`}
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="min-w-[100px] text-center text-[10px] font-black text-[#0F4E0E] px-2 uppercase tracking-[0.1em]">
                        {format(currentWeekStart, 'MMM yyyy', { locale: es })}
                    </span>
                    <button 
                        disabled={!canGoForward}
                        onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} 
                        className={`p-2 rounded-lg transition-all ${canGoForward ? 'bg-white text-[#0F4E0E] shadow-sm active:scale-95' : 'text-gray-200'}`}
                    >
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                        onClick={() => triggerDialog({ title: 'Limpiar Plan', message: '¿Borrar todo el calendario actual?', type: 'confirm', onConfirm: onClear })} 
                        className="w-10 h-10 bg-red-50 text-red-500 rounded-xl border border-red-100 flex items-center justify-center shadow-sm"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => {}} 
                        className="h-10 px-4 bg-[#0F4E0E] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2 active:scale-95"
                    >
                        <Wand2 className="w-3.5 h-3.5 text-orange-400" />
                        <span>GENERAR</span>
                    </button>
                </div>
            </div>
        </div>
      </header>

      {/* VIEWPORT DE CALENDARIO - AJUSTE DE ESCALA PARA DESKTOP */}
      <div 
        ref={scrollContainerRef} 
        className="flex-1 overflow-x-auto no-scrollbar flex gap-4 md:gap-6 p-4 md:p-8 bg-[#F8F9FA] scroll-smooth"
      >
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isToday = isSameDay(day, new Date());
          return (
            <div 
              key={dateStr} 
              className="min-w-[85vw] md:min-w-[320px] flex-shrink-0 flex flex-col gap-3 animate-fade-in transition-all duration-500"
            >
                {/* CABECERA DEL DÍA - UNIFICADA Y EN UNA LÍNEA */}
                <div className="flex items-center px-6 py-4 rounded-2xl bg-white text-[#0F4E0E] shadow-sm border border-gray-100 flex-shrink-0">
                    <span className="text-lg font-black uppercase tracking-tighter">
                        {format(day, 'EEEE d', { locale: es })}
                    </span>
                    {isToday && (
                        <div className="ml-auto flex items-center gap-2">
                            <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest">Hoy</span>
                            <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(232,124,62,0.6)]" />
                        </div>
                    )}
                </div>
                
                {/* LISTA DE COMIDAS - MÁS COMPACTA VERTICALMENTE */}
                <div className="flex-1 flex flex-col gap-3 md:gap-4 overflow-y-auto no-scrollbar pb-10">
                  {(['breakfast', 'lunch', 'dinner'] as MealCategory[]).map((type) => {
                      const slot = plan.find(p => p.date === dateStr && p.type === type);
                      const recipe = slot?.recipeId ? recipes.find(r => String(r.id) === String(slot.recipeId)) : null;
                      
                      return (
                          <div 
                            key={type} 
                            onClick={() => recipe ? setSelectedRecipe(recipe) : setShowRecipeSelector({date: dateStr, type})} 
                            className={`relative min-h-[120px] md:min-h-[160px] rounded-[2rem] transition-all duration-500 cursor-pointer overflow-hidden group border ${recipe ? 'bg-gray-900 border-transparent shadow-md' : 'bg-white border-dashed border-gray-200 hover:border-[#0F4E0E] hover:bg-teal-50/20'}`}
                          >
                              {recipe ? (
                                  <div className="absolute inset-0 w-full h-full flex flex-col animate-fade-in">
                                      <SmartImage src={recipe.image_url} alt={recipe.title} className="absolute inset-0 w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 opacity-60" />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
                                      
                                      <div className="relative z-10 flex flex-col h-full justify-between p-5 md:p-6">
                                          <div className="flex justify-between items-start">
                                              <div className="px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-3xl border border-white/10 flex items-center">
                                                  <span className="text-[7px] font-black uppercase tracking-[0.3em] text-white leading-none">
                                                    {type === 'breakfast' ? 'MAÑANA' : type === 'lunch' ? 'COMIDA' : 'CENA'}
                                                  </span>
                                              </div>
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); onUpdateSlot(dateStr, type, undefined); }} 
                                                className="p-2 bg-red-500 text-white rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                                              >
                                                  <X className="w-3.5 h-3.5" />
                                              </button>
                                          </div>
                                          
                                          <div className="space-y-1.5">
                                              <h5 className="font-black text-sm md:text-base text-white leading-tight uppercase line-clamp-2 tracking-tight">{recipe.title}</h5>
                                              <div className="flex items-center gap-2">
                                                  <div className="flex items-center gap-1 bg-orange-500/20 px-1.5 py-0.5 rounded-md backdrop-blur-md">
                                                    <Clock className="w-2.5 h-2.5 text-orange-400" />
                                                    <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest">{recipe.prep_time}'</span>
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center animate-fade-in">
                                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gray-50 flex items-center justify-center mb-2 border border-gray-50 group-hover:bg-[#0F4E0E] group-hover:text-white transition-all duration-500">
                                        <Plus className="w-4 h-4 text-[#0F4E0E] group-hover:text-white" />
                                      </div>
                                      <span className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-300 group-hover:text-[#0F4E0E] transition-all">{type}</span>
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
              <div className="fixed inset-0 z-[5000] bg-[#0F4E0E]/90 backdrop-blur-2xl flex items-center justify-center p-4 md:p-8" onClick={() => setShowRecipeSelector(null)}>
                  <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative animate-slide-up flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-3xl font-black text-[#0F4E0E] tracking-tighter uppercase">¿Qué comemos?</h3>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="text-[9px] font-black text-orange-500 uppercase tracking-[0.3em] bg-orange-50 px-3 py-1.5 rounded-lg">
                                    {showRecipeSelector.type}
                                </span>
                            </div>
                        </div>
                        <button onClick={() => setShowRecipeSelector(null)} className="p-3 bg-gray-50 rounded-xl text-gray-400"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="relative mb-6">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="Busca por ingrediente..." 
                            value={selectorSearch}
                            onChange={(e) => setSelectorSearch(e.target.value)}
                            className="w-full h-14 pl-14 pr-6 bg-gray-50 border-2 border-transparent focus:border-[#0F4E0E]/10 rounded-2xl font-bold outline-none transition-all text-[#0F4E0E] placeholder:text-gray-200"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
                        {filteredSelectorRecipes.map(recipe => (
                            <div 
                                key={recipe.id}
                                onClick={() => { onUpdateSlot(showRecipeSelector.date, showRecipeSelector.type, recipe.id); setShowRecipeSelector(null); }}
                                className="group flex items-center gap-4 p-3 bg-white border border-gray-100 rounded-2xl hover:bg-teal-50/20 transition-all cursor-pointer shadow-sm"
                            >
                                <div className="w-16 h-16 rounded-xl overflow-hidden shadow-md flex-shrink-0">
                                    <SmartImage src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-sm text-[#0F4E0E] leading-tight mb-1 truncate uppercase">{recipe.title}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[8px] font-black uppercase text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{recipe.cuisine_type}</span>
                                        <span className="text-[8px] font-black uppercase text-orange-500">{recipe.prep_time} MIN</span>
                                    </div>
                                </div>
                                <div className="w-10 h-10 bg-[#0F4E0E] rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white flex-shrink-0">
                                    <Check className="w-5 h-5" />
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
