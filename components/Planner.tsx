
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MealSlot, Recipe, MealCategory, PantryItem, UserProfile } from '../types';
import { Plus, X, ChevronLeft, ChevronRight, Wand2, Trash2, CalendarDays, Clock, Search, Check, BarChart2 } from 'lucide-react';
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
                // Ancho ajustado para el scroll automático en desktop
                const dayWidth = window.innerWidth < 768 ? window.innerWidth * 0.88 : 260; 
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
      {/* HEADER */}
      <header className="w-full py-3 md:py-3 bg-white flex-shrink-0 z-20 px-4 md:px-10 shadow-sm border-b border-gray-100">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-2 md:gap-4">
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                <div className="w-7 h-7 md:w-8 md:h-8 bg-teal-50 rounded-lg flex items-center justify-center text-[#0F4E0E]">
                    <CalendarDays className="w-4 h-4 md:w-4.5 md:h-4.5" />
                </div>
                <h1 className="text-lg md:text-xl font-black text-[#0F4E0E] tracking-tighter whitespace-nowrap leading-none">Mi Menú</h1>
            </div>

            <div className="flex items-center gap-2 overflow-hidden">
                <div className="flex items-center gap-0.5 bg-gray-50 p-1 rounded-xl border border-gray-100 shrink-0">
                    <button 
                        disabled={!canGoBack}
                        onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} 
                        className={`p-1.5 rounded-lg transition-all ${canGoBack ? 'bg-white text-[#0F4E0E] shadow-sm active:scale-95' : 'text-gray-200'}`}
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="min-w-[75px] md:min-w-[100px] text-center text-[8px] md:text-[10px] font-black text-[#0F4E0E] px-1 uppercase tracking-widest truncate">
                        {format(currentWeekStart, 'MMM yyyy', { locale: es })}
                    </span>
                    <button 
                        disabled={!canGoForward}
                        onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} 
                        className={`p-1.5 rounded-lg transition-all ${canGoForward ? 'bg-white text-[#0F4E0E] shadow-sm active:scale-95' : 'text-gray-200'}`}
                    >
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                        onClick={() => triggerDialog({ title: 'Limpiar Plan', message: '¿Borrar todo el calendario actual?', type: 'confirm', onConfirm: onClear })} 
                        className="w-9 h-9 md:w-10 md:h-10 bg-red-50 text-red-500 rounded-xl border border-red-100 flex items-center justify-center shadow-sm hover:bg-red-500 hover:text-white transition-all active:scale-90"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => {}} 
                        className="h-9 md:h-10 px-3 md:px-5 bg-[#0F4E0E] text-white rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] shadow-lg flex items-center gap-2 active:scale-95 hover:bg-[#062606] transition-all"
                    >
                        <Wand2 className="w-3.5 h-3.5 text-orange-400" />
                        <span className="hidden sm:inline">GENERAR</span>
                    </button>
                </div>
            </div>
        </div>
      </header>

      {/* VIEWPORT - AJUSTADO PADDING DESKTOP */}
      <div 
        ref={scrollContainerRef} 
        className="flex-1 overflow-x-auto no-scrollbar flex gap-4 md:gap-5 p-5 md:p-6 bg-[#F8F9FA] scroll-smooth"
      >
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isToday = isSameDay(day, new Date());
          return (
            <div 
              key={dateStr} 
              className="min-w-[85vw] md:min-w-[260px] lg:min-w-[280px] flex-shrink-0 flex flex-col gap-4 h-full animate-fade-in transition-all duration-500"
            >
                {/* CABECERA DEL DÍA - MÁS COMPACTA EN DESKTOP */}
                <div className="flex items-center px-6 py-4 md:py-4 rounded-[1.5rem] md:rounded-[2rem] bg-white text-[#0F4E0E] shadow-sm border border-gray-100 flex-shrink-0">
                    <span className="text-lg md:text-xl font-black uppercase tracking-tighter">
                        {format(day, 'EEEE d', { locale: es })}
                    </span>
                    {isToday && (
                        <div className="ml-auto flex items-center gap-2">
                            <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest hidden md:inline">Hoy</span>
                            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_12px_rgba(232,124,62,0.8)] animate-pulse" />
                        </div>
                    )}
                </div>
                
                {/* LISTA DE COMIDAS - TAMAÑO REDUCIDO EN DESKTOP (185px) */}
                <div className="flex-1 flex flex-col gap-4 pb-40 md:pb-10 overflow-y-auto no-scrollbar pr-1">
                  {(['breakfast', 'lunch', 'dinner'] as MealCategory[]).map((type) => {
                      const slot = plan.find(p => p.date === dateStr && p.type === type);
                      const recipe = slot?.recipeId ? recipes.find(r => String(r.id) === String(slot.recipeId)) : null;
                      
                      return (
                          <div 
                            key={type} 
                            onClick={() => recipe ? setSelectedRecipe(recipe) : setShowRecipeSelector({date: dateStr, type})} 
                            className={`relative w-full h-[200px] md:h-[185px] flex-shrink-0 rounded-[2.5rem] md:rounded-[2.8rem] transition-all duration-700 cursor-pointer overflow-hidden group shadow-sm ${recipe ? 'bg-black' : 'bg-white border-2 border-dashed border-gray-100 hover:border-[#0F4E0E]/20'}`}
                          >
                              {recipe ? (
                                  <>
                                      {/* CAPA 0: IMAGEN A SANGRE TOTAL */}
                                      <SmartImage 
                                        src={recipe.image_url} 
                                        alt={recipe.title} 
                                        className="absolute inset-0 w-full h-full object-cover transition-all duration-1000 group-hover:scale-110" 
                                      />
                                      
                                      {/* CAPA 1: DEGRADADO */}
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent z-[1]" />
                                      
                                      {/* CAPA 2: CONTENIDO FLOTANTE - PADDING MÁS PEQUEÑO EN DESKTOP */}
                                      <div className="relative z-[2] flex flex-col h-full justify-between p-6 md:p-5 lg:p-6">
                                          <div className="flex justify-between items-start">
                                              {/* PÍLDORA MOMENTO GLASS */}
                                              <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 flex items-center shadow-lg">
                                                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white leading-none">
                                                    {type === 'breakfast' ? 'MAÑANA' : type === 'lunch' ? 'COMIDA' : 'CENA'}
                                                  </span>
                                              </div>
                                              
                                              {/* BOTÓN X GLASS CIRCULAR */}
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); onUpdateSlot(dateStr, type, undefined); }} 
                                                className="w-10 h-10 md:w-9 md:h-9 bg-white/20 hover:bg-red-500 text-white rounded-full backdrop-blur-md shadow-2xl transition-all active:scale-90 flex items-center justify-center border border-white/10 group-hover:opacity-100 md:opacity-0"
                                              >
                                                  <X className="w-5 h-5 md:w-4 md:h-4 stroke-[3px]" />
                                              </button>
                                          </div>
                                          
                                          <div className="space-y-3">
                                              {/* TÍTULO AJUSTADO PARA DESKTOP (xl) */}
                                              <h5 className="font-black text-xl md:text-lg lg:text-xl text-white leading-[1.1] capitalize line-clamp-2 tracking-tight drop-shadow-xl">
                                                {recipe.title}
                                              </h5>
                                              
                                              {/* PÍLDORAS INFERIORES MÁS COMPACTAS */}
                                              <div className="flex items-center gap-2">
                                                  <div className="flex items-center gap-2 bg-black/50 px-3 py-2 rounded-xl backdrop-blur-3xl border border-white/5 shadow-2xl">
                                                    <Clock className="w-3 h-3 text-white" />
                                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{recipe.prep_time} MIN</span>
                                                  </div>
                                                  <div className="flex items-center gap-2 bg-black/50 px-3 py-2 rounded-xl backdrop-blur-3xl border border-white/5 shadow-2xl">
                                                    <BarChart2 className="w-3 h-3 text-white" />
                                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{recipe.difficulty || 'EASY'}</span>
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  </>
                              ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center animate-fade-in relative z-[2]">
                                      <div className="w-12 h-12 md:w-10 md:h-10 rounded-[1.2rem] bg-gray-50 flex items-center justify-center mb-3 border border-gray-50 group-hover:bg-[#0F4E0E] group-hover:text-white transition-all duration-700 group-hover:scale-110 group-hover:rotate-90">
                                        <Plus className="w-5 h-5 md:w-4 md:h-4 text-[#0F4E0E] group-hover:text-white" />
                                      </div>
                                      <span className="text-[9px] font-black uppercase tracking-[0.5em] text-gray-300 group-hover:text-[#0F4E0E] transition-all duration-500">{type}</span>
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
              <div className="fixed inset-0 z-[5000] bg-[#0F4E0E]/95 backdrop-blur-3xl flex items-center justify-center p-4" onClick={() => setShowRecipeSelector(null)}>
                  <div className="bg-white w-full max-w-2xl rounded-[3.5rem] p-8 md:p-12 shadow-2xl relative animate-slide-up flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h3 className="text-4xl font-black text-[#0F4E0E] tracking-tighter uppercase leading-none">¿Qué cocinamos?</h3>
                            <div className="flex items-center gap-3 mt-3">
                                <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em] bg-orange-50 px-4 py-2 rounded-xl">
                                    {showRecipeSelector.type}
                                </span>
                            </div>
                        </div>
                        <button onClick={() => setShowRecipeSelector(null)} className="p-4 bg-gray-50 rounded-2xl text-gray-400 hover:text-red-500 transition-colors"><X className="w-6 h-6" /></button>
                    </div>

                    <div className="relative mb-8">
                        <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-300" />
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="Busca por nombre o ingrediente..." 
                            value={selectorSearch}
                            onChange={(e) => setSelectorSearch(e.target.value)}
                            className="w-full h-16 pl-16 pr-8 bg-gray-50 border-2 border-transparent focus:border-[#0F4E0E]/10 rounded-2xl font-bold outline-none transition-all text-[#0F4E0E] placeholder:text-gray-200 text-lg"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                        {filteredSelectorRecipes.map(recipe => (
                            <div 
                                key={recipe.id}
                                onClick={() => { onUpdateSlot(showRecipeSelector.date, showRecipeSelector.type, recipe.id); setShowRecipeSelector(null); }}
                                className="group flex items-center gap-5 p-4 bg-white border border-gray-100 rounded-3xl hover:bg-teal-50/30 transition-all cursor-pointer shadow-sm hover:shadow-md"
                            >
                                <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg flex-shrink-0">
                                    <SmartImage src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-base text-[#0F4E0E] leading-tight mb-2 truncate capitalize tracking-tight">{recipe.title}</h4>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[9px] font-black uppercase text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-50">{recipe.cuisine_type}</span>
                                        <span className="text-[9px] font-black uppercase text-orange-500 tracking-widest">{recipe.prep_time} MIN</span>
                                    </div>
                                </div>
                                <div className="w-12 h-12 bg-[#0F4E0E] rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white flex-shrink-0 shadow-lg">
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
