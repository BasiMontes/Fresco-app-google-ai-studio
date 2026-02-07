
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
                // Ajustado para el ancho de 480px + gap
                const dayWidth = window.innerWidth < 768 ? window.innerWidth * 0.88 : 480 + 24; 
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
      <header className="w-full py-2.5 bg-white flex-shrink-0 z-20 px-4 md:px-8 shadow-sm border-b border-gray-100">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
                <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center text-[#0F4E0E]">
                    <CalendarDays className="w-4.5 h-4.5" />
                </div>
                <h1 className="text-xl font-[900] text-[#0F4E0E] tracking-tighter whitespace-nowrap leading-none">Mi Menú</h1>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 bg-gray-50 p-1 rounded-xl border border-gray-100 shrink-0">
                    <button 
                        disabled={!canGoBack}
                        onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} 
                        className={`p-1.5 rounded-lg transition-all ${canGoBack ? 'bg-white text-[#0F4E0E] shadow-sm active:scale-95' : 'text-gray-200'}`}
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="min-w-[90px] text-center text-[10px] font-black text-[#0F4E0E] px-1 uppercase tracking-widest truncate">
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
                        className="w-9 h-9 bg-red-50 text-red-500 rounded-xl border border-red-100 flex items-center justify-center shadow-sm hover:bg-red-500 hover:text-white transition-all active:scale-90"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => {}} 
                        className="h-9 px-4 bg-[#0F4E0E] text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg flex items-center gap-2 active:scale-95 hover:bg-[#062606] transition-all"
                    >
                        <Wand2 className="w-3.5 h-3.5 text-orange-400" />
                        <span className="hidden sm:inline">GENERAR</span>
                    </button>
                </div>
            </div>
        </div>
      </header>

      {/* VIEWPORT - ESPACIO SUPERIOR REDUCIDO PARA MÁXIMA VISIBILIDAD VERTICAL */}
      <div 
        ref={scrollContainerRef} 
        className="flex-1 overflow-x-auto no-scrollbar flex gap-6 p-4 md:pt-3 md:pb-8 md:px-8 bg-[#F8F9FA] scroll-smooth"
      >
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isToday = isSameDay(day, new Date());
          return (
            <div 
              key={dateStr} 
              className="min-w-[85vw] md:min-w-[480px] lg:min-w-[480px] flex-shrink-0 flex flex-col gap-4 h-full animate-fade-in transition-all duration-500"
            >
                {/* CABECERA DEL DÍA - MÁS COMPACTA EN VERTICAL */}
                <div className="flex items-center px-6 py-3 rounded-[1.8rem] bg-white text-[#0F4E0E] shadow-sm border border-gray-100 flex-shrink-0">
                    <span className="text-lg md:text-xl font-[900] uppercase tracking-tighter">
                        {format(day, 'EEEE d', { locale: es })}
                    </span>
                    {isToday && (
                        <div className="ml-auto flex items-center gap-2">
                            <span className="text-[8px] font-[900] text-orange-500 uppercase tracking-widest hidden md:inline">Hoy</span>
                            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(232,124,62,0.8)] animate-pulse" />
                        </div>
                    )}
                </div>
                
                {/* LISTA DE COMIDAS - 165PX */}
                <div className="flex-1 flex flex-col gap-4 pb-40 md:pb-10 overflow-y-auto no-scrollbar pr-1">
                  {(['breakfast', 'lunch', 'dinner'] as MealCategory[]).map((type) => {
                      const slot = plan.find(p => p.date === dateStr && p.type === type);
                      const recipe = slot?.recipeId ? recipes.find(r => String(r.id) === String(slot.recipeId)) : null;
                      
                      return (
                          <div 
                            key={type} 
                            onClick={() => recipe ? setSelectedRecipe(recipe) : setShowRecipeSelector({date: dateStr, type})} 
                            className={`relative w-full h-[165px] flex-shrink-0 rounded-[2.5rem] transition-all duration-700 cursor-pointer overflow-hidden group shadow-sm ${recipe ? 'bg-black' : 'bg-white border-2 border-dashed border-gray-100 hover:border-[#0F4E0E]/10'}`}
                          >
                              {recipe ? (
                                  <>
                                      {/* IMAGEN HERO */}
                                      <SmartImage 
                                        src={recipe.image_url} 
                                        alt={recipe.title} 
                                        className="absolute inset-0 w-full h-full object-cover transition-all duration-1000 group-hover:scale-105 opacity-95" 
                                      />
                                      
                                      {/* GRADIENTE COMPACTO */}
                                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-[1]" />
                                      
                                      {/* TAG SUPERIOR */}
                                      <div className="absolute top-5 left-6 z-[2] h-5 px-2.5 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/5 shadow-xl">
                                          <span className="text-[5.5px] font-[900] uppercase tracking-[0.35em] text-white leading-none translate-y-[0.5px]">
                                            {type === 'breakfast' ? 'MAÑANA' : type === 'lunch' ? 'COMIDA' : 'CENA'}
                                          </span>
                                      </div>

                                      {/* BOTÓN X */}
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); onUpdateSlot(dateStr, type, undefined); }} 
                                        className="absolute top-5 right-6 z-[2] w-6 h-6 bg-white/10 hover:bg-red-500 text-white rounded-full backdrop-blur-md transition-all active:scale-90 flex items-center justify-center border border-white/5 md:opacity-0 group-hover:opacity-100"
                                      >
                                          <X className="w-2.5 h-2.5 stroke-[4px]" />
                                      </button>

                                      {/* CONTENIDO INFERIOR */}
                                      <div className="absolute bottom-5 left-6 right-6 z-[2] flex flex-col gap-2">
                                          <h5 className="font-[900] text-base md:text-[1rem] text-white leading-[1.1] capitalize line-clamp-2 tracking-tight drop-shadow-xl">
                                            {recipe.title}
                                          </h5>
                                          
                                          {/* PILLS INFO */}
                                          <div className="flex items-center gap-1.5">
                                              <div className="flex items-center gap-1 bg-black/40 h-4.5 px-2 rounded-md backdrop-blur-3xl border border-white/5 shadow-2xl">
                                                <Clock className="w-1.5 h-1.5 text-white" />
                                                <span className="text-[5.5px] font-[900] text-white uppercase tracking-widest leading-none pt-[0.5px]">{recipe.prep_time} MIN</span>
                                              </div>
                                              <div className="flex items-center gap-1 bg-black/40 h-4.5 px-2 rounded-md backdrop-blur-3xl border border-white/5 shadow-2xl">
                                                <BarChart2 className="w-1.5 h-1.5 text-white" />
                                                <span className="text-[5.5px] font-[900] text-white uppercase tracking-widest leading-none pt-[0.5px]">{recipe.difficulty || 'EASY'}</span>
                                              </div>
                                          </div>
                                      </div>
                                  </>
                              ) : (
                                  /* SLOT VACÍO */
                                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center animate-fade-in">
                                      <div className="w-12 h-12 rounded-[1.4rem] bg-gray-50 flex items-center justify-center mb-3 border border-gray-50 group-hover:bg-[#0F4E0E] group-hover:text-white transition-all duration-700 group-hover:scale-110">
                                        <Plus className="w-5 h-5 text-[#0F4E0E] group-hover:text-white" />
                                      </div>
                                      <span className="text-[8px] font-[900] uppercase tracking-[0.4em] text-gray-300 group-hover:text-[#0F4E0E] transition-all duration-500">AÑADIR {type}</span>
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
                  <div className="bg-white w-full max-w-2xl rounded-[3rem] p-8 md:p-10 shadow-2xl relative animate-slide-up flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-3xl font-black text-[#0F4E0E] tracking-tighter uppercase leading-none">¿Qué cocinamos?</h3>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="text-[8px] font-black text-orange-500 uppercase tracking-[0.4em] bg-orange-50 px-3 py-1.5 rounded-lg">
                                    {showRecipeSelector.type}
                                </span>
                            </div>
                        </div>
                        <button onClick={() => setShowRecipeSelector(null)} className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-red-500 transition-colors"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="relative mb-6">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="Busca por nombre o ingrediente..." 
                            value={selectorSearch}
                            onChange={(e) => setSelectorSearch(e.target.value)}
                            className="w-full h-14 pl-14 pr-6 bg-gray-50 border-2 border-transparent focus:border-[#0F4E0E]/10 rounded-2xl font-bold outline-none transition-all text-[#0F4E0E] placeholder:text-gray-200 text-base"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
                        {filteredSelectorRecipes.map(recipe => (
                            <div 
                                key={recipe.id}
                                onClick={() => { onUpdateSlot(showRecipeSelector.date, showRecipeSelector.type, recipe.id); setShowRecipeSelector(null); }}
                                className="group flex items-center gap-4 p-3 bg-white border border-gray-100 rounded-2xl hover:bg-teal-50/30 transition-all cursor-pointer shadow-sm"
                            >
                                <div className="w-16 h-16 rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                                    <SmartImage src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-sm text-[#0F4E0E] leading-tight mb-1 truncate capitalize tracking-tight">{recipe.title}</h4>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[8px] font-black uppercase text-gray-400">{recipe.cuisine_type}</span>
                                        <span className="text-[8px] font-black uppercase text-orange-500">{recipe.prep_time} MIN</span>
                                    </div>
                                </div>
                                <div className="w-10 h-10 bg-[#0F4E0E] rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white flex-shrink-0 shadow-md">
                                    <Check className="w-5 h-5 stroke-[3px]" />
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
