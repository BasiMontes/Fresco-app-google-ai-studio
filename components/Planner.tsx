
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MealSlot, Recipe, MealCategory, PantryItem, UserProfile } from '../types';
import { Plus, X, Loader2, ChevronLeft, ChevronRight, Wand2, Trash2, Sunrise, Sun, Moon, ChefHat, Search, Check } from 'lucide-react';
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

  const [selectedWizardDays, setSelectedWizardDays] = useState<string[]>([]);
  const [selectedWizardTypes, setSelectedWizardTypes] = useState<MealCategory[]>(['lunch', 'dinner']);

  useEffect(() => {
    const timer = setTimeout(() => {
        if (scrollContainerRef.current) {
            const todayIndex = days.findIndex(d => isSameDay(d, new Date()));
            if (todayIndex !== -1) {
                const dayWidth = window.innerWidth < 768 ? window.innerWidth : 340; 
                scrollContainerRef.current.scrollTo({
                    left: todayIndex * dayWidth,
                    behavior: 'smooth'
                });
            }
        }
    }, 100);
    return () => clearTimeout(timer);
  }, [currentWeekStart, days]);

  const executeSmartPlan = async () => {
    if (selectedWizardDays.length === 0 || selectedWizardTypes.length === 0) {
      triggerDialog({ title: 'Atención', message: 'Selecciona días y comidas.', type: 'alert' });
      return;
    }
    setIsGenerating(true);
    try {
        const result = await generateSmartMenu(user, pantry, selectedWizardDays, selectedWizardTypes, recipes);
        if (result && result.plan) {
            onAIPlanGenerated(result.plan, result.newRecipes);
            setShowPlanWizard(false);
        }
    } catch (e) {
        console.error("Smart Plan failed:", e);
        triggerDialog({ title: 'Error', message: 'No se pudo generar el menú semanal.', type: 'alert' });
    } finally {
        setIsGenerating(false);
    }
  };

  const filteredSelectorRecipes = useMemo(() => {
      const lower = selectorSearch.toLowerCase();
      return recipes.filter(r => 
        (r.title.toLowerCase().includes(lower) || r.cuisine_type.toLowerCase().includes(lower)) &&
        (showRecipeSelector ? (showRecipeSelector.type === 'breakfast' ? r.meal_category === 'breakfast' : r.meal_category !== 'breakfast') : true)
      ).slice(0, 15);
  }, [recipes, selectorSearch, showRecipeSelector]);

  return (
    <div className="h-full w-full flex flex-col animate-fade-in overflow-hidden bg-[#F4F4F4]">
      {/* HEADER UNIFICADO */}
      <header className="w-full py-6 md:py-8 bg-white border-b border-gray-100 flex-shrink-0 z-20 px-6 md:px-10">
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col">
                <h1 className="text-3xl md:text-4xl font-black text-[#0F4E0E] tracking-tighter leading-none">Calendario</h1>
                <p className="text-gray-300 font-black uppercase text-[9px] tracking-[0.4em] mt-2">Planificación Semanal de Fresco</p>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-2xl shadow-inner">
                    <button 
                        disabled={!canGoBack}
                        onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} 
                        className={`p-2.5 rounded-xl transition-all ${canGoBack ? 'bg-white text-[#0F4E0E] shadow-sm hover:scale-105 active:scale-95' : 'text-gray-200 cursor-not-allowed opacity-30'}`}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="min-w-[140px] text-center text-[10px] font-black text-[#0F4E0E] px-4 uppercase tracking-[0.3em]">
                        {format(currentWeekStart, 'MMMM yyyy', { locale: es })}
                    </span>
                    <button 
                        disabled={!canGoForward}
                        onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} 
                        className={`p-2.5 rounded-xl transition-all ${canGoForward ? 'bg-white text-[#0F4E0E] shadow-sm hover:scale-105 active:scale-95' : 'text-gray-200 cursor-not-allowed opacity-30'}`}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => triggerDialog({ title: 'Limpiar Plan', message: '¿Borrar todo el calendario actual?', type: 'confirm', onConfirm: onClear })} 
                        className="w-12 h-12 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all border border-red-100 flex items-center justify-center shrink-0"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setShowPlanWizard(true)} 
                        className="h-12 px-6 bg-[#0F4E0E] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-[#062606] transition-all active:scale-[0.98] flex items-center gap-3"
                    >
                        <Wand2 className="w-4 h-4 text-orange-400" />
                        <span>GENERAR PLAN IA</span>
                    </button>
                </div>
            </div>
        </div>
      </header>

      {/* ÁREA DE CONTENIDO: RESPIRACIÓN UNIFICADA */}
      <div 
        ref={scrollContainerRef} 
        className="flex-1 overflow-x-auto no-scrollbar flex gap-4 md:gap-8 p-4 md:p-10 h-full min-h-0 bg-[#FDFDFD] scroll-smooth"
      >
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isToday = isSameDay(day, new Date());
          return (
            <div key={dateStr} className="min-w-full md:min-w-[320px] max-w-[400px] flex-shrink-0 flex flex-col gap-6 h-full animate-fade-in">
                {/* DÍA HEADER - MÁS AIRE */}
                <div className={`flex items-center justify-between px-8 py-5 rounded-[2.5rem] transition-all duration-700 flex-shrink-0 ${isToday ? 'bg-[#0F4E0E] text-white shadow-2xl scale-105 z-10' : 'bg-gray-50 text-[#0F4E0E] border border-gray-100 shadow-sm'}`}>
                    <div className="flex flex-col">
                        <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isToday ? 'text-orange-400' : 'text-[#0F4E0E]/40'}`}>
                            {format(day, 'EEEE', { locale: es })}
                        </span>
                        <span className="text-2xl font-black leading-none mt-1">{format(day, 'd')}</span>
                    </div>
                    {isToday && <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />}
                </div>
                
                {/* SLOTS: TARJETAS UNIFICADAS CON RESPIRACIÓN */}
                <div className="flex-1 flex flex-col gap-4 md:gap-6 min-h-0">
                  {(['breakfast', 'lunch', 'dinner'] as MealCategory[]).map((type) => {
                      const slot = plan.find(p => p.date === dateStr && p.type === type);
                      const recipe = slot?.recipeId ? recipes.find(r => String(r.id) === String(slot.recipeId)) : null;
                      
                      return (
                          <div 
                            key={type} 
                            onClick={() => recipe ? setSelectedRecipe(recipe) : setShowRecipeSelector({date: dateStr, type})} 
                            className={`relative flex-1 rounded-[2.8rem] transition-all duration-500 cursor-pointer overflow-hidden group border-2 shadow-sm ${recipe ? 'bg-gray-900 border-transparent' : 'bg-white border-dashed border-gray-200 hover:border-teal-500 hover:bg-teal-50/20'}`}
                          >
                              {recipe ? (
                                  <div className="absolute inset-0 w-full h-full flex flex-col animate-fade-in">
                                      <SmartImage src={recipe.image_url} alt={recipe.title} className="absolute inset-0 w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 opacity-70" />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
                                      
                                      <div className="relative z-10 flex flex-col h-full justify-between p-7 md:p-8">
                                          <div className="flex justify-between items-start">
                                              <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center">
                                                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white leading-none">{type === 'breakfast' ? 'mañana' : type === 'lunch' ? 'comida' : 'cena'}</span>
                                              </div>
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); onUpdateSlot(dateStr, type, undefined); }} 
                                                className="p-2.5 bg-red-500 text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                                              >
                                                  <X className="w-4 h-4" />
                                              </button>
                                          </div>
                                          
                                          <div className="space-y-2">
                                              <h5 className="font-black text-lg md:text-xl text-white leading-tight uppercase line-clamp-2 drop-shadow-xl">{recipe.title}</h5>
                                              <div className="flex items-center gap-3">
                                                  <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">{recipe.prep_time} MIN</span>
                                                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                                  <span className="text-[9px] font-black text-white/40 uppercase tracking-widest capitalize">{recipe.difficulty}</span>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3 border border-gray-100 group-hover:bg-[#0F4E0E] group-hover:text-white transition-all duration-300">
                                        <Plus className="w-6 h-6 text-[#0F4E0E] group-hover:text-white" />
                                      </div>
                                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-300 group-hover:text-[#0F4E0E] transition-colors">{type}</span>
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

      {/* MODALES REUTILIZAN EL DISEÑO UNIFICADO */}
      {showRecipeSelector && (
          <ModalPortal>
              <div className="fixed inset-0 z-[5000] bg-[#0F4E0E]/90 backdrop-blur-2xl flex items-center justify-center p-4" onClick={() => setShowRecipeSelector(null)}>
                  <div className="bg-white w-full max-w-2xl rounded-[3.5rem] p-10 shadow-2xl relative animate-slide-up flex flex-col max-h-[85vh] border border-white/20" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h3 className="text-3xl font-black text-[#0F4E0E] tracking-tighter">Explorar Recetas</h3>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] mt-2">
                                Sugerencias para el {showRecipeSelector.type}
                            </p>
                        </div>
                        <button onClick={() => setShowRecipeSelector(null)} className="p-3 bg-gray-50 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all text-gray-400"><X className="w-6 h-6" /></button>
                    </div>

                    <div className="relative mb-8">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="Buscar en tu biblioteca de sabores..." 
                            value={selectorSearch}
                            onChange={(e) => setSelectorSearch(e.target.value)}
                            className="w-full h-16 pl-16 pr-6 bg-gray-50 border-2 border-transparent focus:border-teal-500/20 rounded-2xl font-bold text-base outline-none transition-all shadow-inner text-[#0F4E0E]"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-2">
                        {filteredSelectorRecipes.map(recipe => (
                            <div 
                                key={recipe.id}
                                onClick={() => { onUpdateSlot(showRecipeSelector.date, showRecipeSelector.type, recipe.id); setShowRecipeSelector(null); }}
                                className="group flex items-center gap-6 p-5 bg-white border border-gray-100 rounded-[2.5rem] hover:bg-teal-50 hover:border-teal-200 transition-all cursor-pointer shadow-sm hover:shadow-md"
                            >
                                <div className="w-20 h-20 rounded-[1.5rem] overflow-hidden shadow-lg flex-shrink-0">
                                    <SmartImage src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-lg text-[#0F4E0E] leading-tight mb-1 truncate">{recipe.title}</h4>
                                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{recipe.cuisine_type}</span>
                                </div>
                                <div className="w-12 h-12 bg-[#0F4E0E] rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all text-white shadow-xl">
                                    <Check className="w-6 h-6" />
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
