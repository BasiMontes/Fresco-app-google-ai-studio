
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MealSlot, Recipe, MealCategory, PantryItem, UserProfile } from '../types';
import { Plus, X, Loader2, ChevronLeft, ChevronRight, BrainCircuit, Trash2, Sunrise, Sun, Moon, Sparkles, ChefHat, Search, Check } from 'lucide-react';
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
                const dayWidth = 320; 
                scrollContainerRef.current.scrollTo({
                    left: todayIndex * dayWidth,
                    behavior: 'smooth'
                });
            }
        }
    }, 100);
    return () => clearTimeout(timer);
  }, [currentWeekStart, days]);

  useEffect(() => {
    if (showPlanWizard) {
      setSelectedWizardDays(days.map(d => format(d, 'yyyy-MM-dd')));
    }
  }, [showPlanWizard, days]);

  const toggleWizardDay = (dateStr: string) => {
    setSelectedWizardDays(prev => 
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    );
  };

  const toggleWizardType = (type: MealCategory) => {
    setSelectedWizardTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

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
        } else {
            throw new Error("Invalid structure returned");
        }
    } catch (e) {
        console.error("Smart Plan failed:", e);
        triggerDialog({ title: 'Error', message: 'No se pudo generar el menú semanal. Inténtalo de nuevo en unos segundos.', type: 'alert' });
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
    <div className="h-full w-full flex flex-col animate-fade-in overflow-hidden bg-[#FDFDFD]">
      {/* HEADER COMPACTADO */}
      <header className="px-5 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border-b border-gray-100 flex-shrink-0 z-20">
        <div className="flex justify-between items-center md:items-start md:w-1/4">
            <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-black text-[#0F4E0E] tracking-tight leading-none mb-1">Calendario</h1>
                <p className="text-[#0F4E0E]/30 font-black uppercase text-[8px] md:text-[9px] tracking-[0.4em] hidden md:block">Planificación Semanal</p>
            </div>
            
            {/* Botones rápidos móvil */}
            <div className="flex md:hidden items-center gap-2">
                <button 
                  onClick={() => triggerDialog({ title: 'Limpiar Plan', message: '¿Borrar todo el calendario actual?', type: 'confirm', onConfirm: onClear })} 
                  className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => setShowPlanWizard(true)} 
                    className="h-10 px-4 bg-[#0F4E0E] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
                >
                    <BrainCircuit className="w-4 h-4 text-orange-400" />
                    <span>Generar</span>
                </button>
            </div>
        </div>

        {/* NAVEGADOR SEMANAL CENTRADO */}
        <div className="flex items-center gap-1 bg-gray-50/80 p-1 rounded-2xl border border-gray-100 w-full md:w-auto justify-between md:justify-center">
            <button 
                disabled={!canGoBack}
                onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} 
                className={`p-2 md:p-2.5 rounded-xl transition-all ${canGoBack ? 'bg-white text-[#0F4E0E] shadow-sm hover:scale-105 active:scale-95' : 'text-gray-200 cursor-not-allowed opacity-30'}`}
            >
                <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            
            <span className="text-[10px] md:text-xs font-black text-[#0F4E0E] px-6 uppercase tracking-[0.3em] whitespace-nowrap text-center min-w-[140px] md:min-w-[180px]">
                {format(currentWeekStart, 'MMMM yyyy', { locale: es })}
            </span>
            
            <button 
                disabled={!canGoForward}
                onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} 
                className={`p-2 md:p-2.5 rounded-xl transition-all ${canGoForward ? 'bg-white text-[#0F4E0E] shadow-sm hover:scale-105 active:scale-95' : 'text-gray-200 cursor-not-allowed opacity-30'}`}
            >
                <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
            </button>
        </div>

        {/* ACCIONES DERECHA (DESKTOP) */}
        <div className="hidden md:flex items-center gap-3 md:w-1/4 md:justify-end">
            <button 
                onClick={() => triggerDialog({ title: 'Limpiar Plan', message: '¿Borrar todo el calendario actual?', type: 'confirm', onConfirm: onClear })} 
                className="w-12 h-12 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-sm flex items-center justify-center group"
            >
                <Trash2 className="w-5 h-5" />
            </button>
            <button 
                onClick={() => setShowPlanWizard(true)} 
                className="h-12 px-6 bg-[#0F4E0E] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] shadow-xl hover:bg-[#062606] transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
                <BrainCircuit className="w-5 h-5 text-orange-400" />
                <span>Generar</span>
            </button>
        </div>
      </header>

      {/* Grid de días con padding reducido */}
      <div ref={scrollContainerRef} className="flex-1 overflow-x-auto no-scrollbar flex gap-4 p-4 h-full min-h-0">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isToday = isSameDay(day, new Date());
          return (
            <div key={dateStr} className="min-w-[280px] max-w-[340px] flex-1 flex flex-col gap-3 h-full">
                {/* Header de Día Compacto */}
                <div className={`flex items-center justify-center gap-3 py-2 px-4 rounded-[2rem] border transition-all duration-700 flex-shrink-0 ${isToday ? 'bg-[#0F4E0E] text-white border-[#0F4E0E] shadow-2xl scale-[1.02]' : 'bg-white text-[#0F4E0E] border-gray-100 shadow-sm'}`}>
                    <span className={`text-[10px] font-black uppercase tracking-[0.3em] whitespace-nowrap ${isToday ? 'text-orange-400' : 'text-[#0F4E0E]/30'}`}>{format(day, 'EEEE', { locale: es })}</span>
                    <span className="text-xl font-black leading-none">{format(day, 'd')}</span>
                </div>
                
                {/* Contenedor de Comidas con gap reducido */}
                <div className="flex-1 flex flex-col gap-3 min-h-0">
                  {(['breakfast', 'lunch', 'dinner'] as MealCategory[]).map((type) => {
                      const slot = plan.find(p => p.date === dateStr && p.type === type);
                      const recipe = recipes.find(r => r.id === slot?.recipeId);
                      return (
                          <div 
                            key={type} 
                            onClick={() => recipe ? setSelectedRecipe(recipe) : setShowRecipeSelector({date: dateStr, type})} 
                            className={`relative flex-1 rounded-[2.5rem] transition-all duration-700 cursor-pointer flex flex-col overflow-hidden group shadow-sm border-2 ${recipe ? 'border-white hover:shadow-2xl hover:-translate-y-1' : 'bg-white border-dashed border-gray-100 hover:border-teal-200 hover:bg-teal-50/20'}`}
                          >
                              {recipe ? (
                                  <div className="absolute inset-0 w-full h-full">
                                      <SmartImage 
                                        src={recipe.image_url} 
                                        alt={recipe.title} 
                                        className="absolute inset-0 w-full h-full object-cover transition-all duration-1000 group-hover:scale-105 group-hover:saturate-[1.1]" 
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent transition-opacity duration-700" />
                                      <div className="absolute inset-0 flex flex-col justify-between p-5 z-10">
                                          <div className="flex justify-between items-start">
                                              <div className="px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 shadow-sm flex items-center">
                                                  <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/90 leading-none">{type}</span>
                                              </div>
                                              <button onClick={(e) => { e.stopPropagation(); onUpdateSlot(dateStr, type, undefined); }} className="p-2 bg-white/10 backdrop-blur-md rounded-xl text-white/60 hover:text-white hover:bg-red-500/80 transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100">
                                                  <X className="w-3.5 h-3.5" />
                                              </button>
                                          </div>
                                          <div className="space-y-1 pb-1">
                                              <h5 className="font-black text-[14px] text-white leading-tight uppercase line-clamp-2 transition-all drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">
                                                  {recipe.title}
                                              </h5>
                                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-700 translate-y-2 group-hover:translate-y-0">
                                                  <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest">{recipe.prep_time} MIN</span>
                                                  <div className="w-1 h-1 rounded-full bg-white/20" />
                                                  <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">{recipe.difficulty}</span>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                                      <div className="flex justify-between items-center w-full mb-auto">
                                          <span className="text-[7px] font-black uppercase tracking-[0.3em] px-2 py-1 rounded-lg bg-gray-50 text-gray-400 border border-gray-100 leading-none">{type}</span>
                                      </div>
                                      <div className="flex-1 flex flex-col items-center justify-center transition-all duration-500 transform group-hover:scale-110">
                                          <div className="w-10 h-10 rounded-[1.2rem] bg-teal-50 flex items-center justify-center mb-4 group-hover:bg-[#0F4E0E] group-hover:text-white transition-all border border-teal-100/50 shadow-inner">
                                            <Plus className="w-5 h-5 text-[#0F4E0E] group-hover:text-white" />
                                          </div>
                                          <span className="text-[9px] font-black uppercase tracking-[0.5em] text-gray-300 group-hover:text-[#0F4E0E] transition-colors mt-2">Añadir</span>
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

      {/* Modales existentes */}
      {showRecipeSelector && (
          <ModalPortal>
              <div className="fixed inset-0 z-[5000] bg-[#0F4E0E]/90 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setShowRecipeSelector(null)}>
                  <div className="bg-white w-full max-w-xl rounded-[3.5rem] p-10 shadow-2xl relative animate-slide-up flex flex-col max-h-[85vh] border border-white/20" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h3 className="text-3xl font-black text-[#0F4E0E] tracking-tighter">Elegir Plato</h3>
                            <p className="text-[11px] text-[#0F4E0E]/40 font-black uppercase tracking-[0.3em] mt-2">
                                {showRecipeSelector.type} • {format(new Date(showRecipeSelector.date), 'd MMMM', {locale: es})}
                            </p>
                        </div>
                        <button onClick={() => setShowRecipeSelector(null)} className="p-3 bg-gray-50 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all text-gray-400"><X className="w-7 h-7" /></button>
                    </div>

                    <div className="relative mb-8">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="Buscar en tu biblioteca..." 
                            value={selectorSearch}
                            onChange={(e) => setSelectorSearch(e.target.value)}
                            className="w-full h-16 pl-14 pr-6 bg-gray-50 border-2 border-transparent focus:border-teal-500/10 rounded-2xl font-bold text-base outline-none transition-all shadow-inner text-[#0F4E0E]"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-2">
                        {filteredSelectorRecipes.map(recipe => (
                            <div 
                                key={recipe.id}
                                onClick={() => { onUpdateSlot(showRecipeSelector.date, showRecipeSelector.type, recipe.id); setShowRecipeSelector(null); }}
                                className="group flex items-center gap-5 p-4 bg-white border border-gray-100 rounded-[2.2rem] hover:bg-teal-50 hover:border-teal-200 transition-all cursor-pointer shadow-sm hover:shadow-md"
                            >
                                <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md flex-shrink-0">
                                    <SmartImage src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-[15px] text-[#0F4E0E] font-black leading-tight mb-1 truncate">{recipe.title}</h4>
                                    <span className="text-[9px] font-black uppercase text-[#0F4E0E]/60 tracking-widest">{recipe.cuisine_type}</span>
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

      {showPlanWizard && (
        <ModalPortal>
          <div className="fixed inset-0 z-[5000] bg-[#0F4E0E]/90 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setShowPlanWizard(false)}>
            <div className="bg-white w-full max-w-md rounded-[3.5rem] p-10 shadow-2xl relative animate-slide-up border border-white/20" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowPlanWizard(false)} className="absolute top-8 right-8 p-3 bg-gray-50 rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"><X className="w-6 h-6" /></button>
              <div className="mb-8">
                <h3 className="text-3xl font-black text-[#0F4E0E] leading-none tracking-tighter">Plan IA</h3>
                <p className="text-[#0F4E0E]/40 font-bold text-xs mt-2 uppercase tracking-[0.2em]">Sugerencia personalizada</p>
              </div>
              <div className="space-y-8">
                <div>
                  <label className="text-[9px] font-black text-[#0F4E0E] uppercase tracking-[0.3em] block mb-4 ml-1">Selecciona Días</label>
                  <div className="flex justify-between gap-1">
                    {days.map((day) => {
                      const dStr = format(day, 'yyyy-MM-dd');
                      const sel = selectedWizardDays.includes(dStr);
                      return (
                        <button key={dStr} onClick={() => toggleWizardDay(dStr)} className={`w-10 h-14 rounded-xl flex flex-col items-center justify-center transition-all border-2 ${sel ? 'bg-[#0F4E0E] border-[#0F4E0E] text-white shadow-xl scale-110' : 'bg-white border-gray-100 text-gray-400 hover:border-teal-200'}`}>
                          <span className="text-[7px] font-black uppercase mb-1">{format(day, 'EEE', { locale: es })}</span>
                          <span className="text-sm font-black">{format(day, 'd')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black text-[#0F4E0E] uppercase tracking-[0.3em] block mb-4 ml-1">Tipo de Comida</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[{ id: 'breakfast', label: 'Mañana', icon: Sunrise }, { id: 'lunch', label: 'Tarde', icon: Sun }, { id: 'dinner', label: 'Noche', icon: Moon }].map((m) => {
                      const sel = selectedWizardTypes.includes(m.id as MealCategory);
                      return (
                        <button key={m.id} onClick={() => toggleWizardType(m.id as MealCategory)} className={`p-4 rounded-2xl flex flex-col items-center gap-3 transition-all border-2 ${sel ? 'bg-orange-500 border-orange-500 text-white shadow-xl scale-105' : 'bg-gray-50 border-transparent text-gray-400 hover:bg-teal-50'}`}>
                          <m.icon className="w-6 h-6" />
                          <span className="text-[8px] font-black uppercase tracking-widest">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button onClick={executeSmartPlan} disabled={isGenerating} className="w-full h-16 bg-[#0F4E0E] text-white rounded-[1.8rem] font-black uppercase tracking-[0.25em] shadow-2xl flex items-center justify-center gap-4 hover:bg-[#062606] transition-all active:scale-[0.97] hover:-translate-y-1">
                  {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Sparkles className="w-5 h-5 text-orange-400" /> Generar</>}
                </button>
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
