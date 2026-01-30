
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MealSlot, Recipe, MealCategory, PantryItem, UserProfile } from '../types';
import { Plus, X, Loader2, ChevronLeft, ChevronRight, BrainCircuit, Trash2, Sunrise, Sun, Moon, Sparkles, ChefHat, Search, Check } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, addWeeks, subWeeks } from 'date-fns';
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
        if (result.plan) {
            onAIPlanGenerated(result.plan, result.newRecipes);
            setShowPlanWizard(false);
        }
    } catch (e) {
        triggerDialog({ title: 'Error', message: 'No se pudo generar el menú.', type: 'alert' });
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
    <div className="h-full w-full flex flex-col animate-fade-in overflow-hidden">
      <header className="px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border-b border-gray-50">
        <div>
            <h1 className="text-2xl font-black text-teal-900 tracking-tight leading-none mb-1">Calendario</h1>
            <p className="text-gray-400 font-bold uppercase text-[9px] tracking-[0.4em]">Planifica tu bienestar</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1 bg-gray-50 px-3 py-2 rounded-2xl border border-gray-100 flex-1 md:flex-none">
                <button onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} className="p-1.5 hover:bg-white rounded-xl text-gray-400 transition-all"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-xs font-black text-teal-900 mx-3 uppercase tracking-widest whitespace-nowrap">{format(currentWeekStart, 'MMMM yyyy', { locale: es })}</span>
                <button onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} className="p-1.5 hover:bg-white rounded-xl text-gray-400 transition-all"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <button onClick={() => triggerDialog({ title: 'Limpiar Plan', message: '¿Borrar todo el calendario actual?', type: 'confirm', onConfirm: onClear })} className="p-3 text-red-400 hover:bg-red-50 rounded-2xl transition-all"><Trash2 className="w-5 h-5" /></button>
            <button onClick={() => setShowPlanWizard(true)} className="flex items-center gap-2 bg-teal-900 text-white px-6 py-3.5 rounded-[1.4rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-teal-800 transition-all active:scale-95">
                <BrainCircuit className="w-4 h-4 text-orange-400" /> Generar plan
            </button>
        </div>
      </header>

      <div ref={scrollContainerRef} className="flex-1 overflow-x-auto no-scrollbar flex gap-6 p-6 bg-gray-50/20">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isToday = isSameDay(day, new Date());
          return (
            <div key={dateStr} className="min-w-[300px] max-w-[340px] flex-1 flex flex-col gap-4">
                <div className={`text-center p-3 rounded-[2rem] border transition-all duration-500 ${isToday ? 'bg-teal-900 text-white border-teal-900 shadow-2xl scale-105 z-10' : 'bg-white text-teal-900 border-gray-100 shadow-sm'}`}>
                    <span className={`block text-[8px] font-black uppercase tracking-[0.4em] mb-1 ${isToday ? 'text-teal-400' : 'opacity-40'}`}>{format(day, 'EEEE', { locale: es })}</span>
                    <span className="block text-2xl font-black">{format(day, 'd')}</span>
                </div>
                
                <div className="flex-1 flex flex-col gap-3">
                  {(['breakfast', 'lunch', 'dinner'] as MealCategory[]).map((type) => {
                      const slot = plan.find(p => p.date === dateStr && p.type === type);
                      const recipe = recipes.find(r => r.id === slot?.recipeId);
                      return (
                          <div 
                            key={type} 
                            onClick={() => recipe ? setSelectedRecipe(recipe) : setShowRecipeSelector({date: dateStr, type})} 
                            className={`relative flex-1 min-h-[190px] rounded-[2.2rem] border-2 transition-all duration-500 cursor-pointer flex flex-col overflow-hidden group ${recipe ? 'border-white shadow-xl hover:shadow-2xl hover:-translate-y-1.5' : 'bg-white/50 border-dashed border-gray-200 hover:bg-white hover:border-teal-200 shadow-inner'}`}
                          >
                              {recipe ? (
                                  <>
                                      <SmartImage src={recipe.image_url} alt={recipe.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />
                                      <div className="relative z-10 flex flex-col justify-between h-full p-6">
                                          <div className="flex justify-between items-start">
                                              <span className="text-[8px] font-black uppercase tracking-[0.25em] px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md text-white border border-white/10 shadow-lg">{type}</span>
                                              <button onClick={(e) => { e.stopPropagation(); onUpdateSlot(dateStr, type, undefined); }} className="p-2 bg-black/40 backdrop-blur-md rounded-xl text-white/50 hover:text-white hover:bg-red-500/80 transition-all opacity-0 group-hover:opacity-100"><X className="w-4 h-4" /></button>
                                          </div>
                                          <div>
                                              <h5 className="font-black text-[15px] text-white leading-tight uppercase line-clamp-2 drop-shadow-2xl group-hover:text-teal-300 transition-colors">{recipe.title}</h5>
                                          </div>
                                      </div>
                                  </>
                              ) : (
                                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                                      <div className="flex justify-between items-center w-full mb-auto">
                                          <span className="text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-gray-100/80 text-gray-400 border border-gray-100/50">{type}</span>
                                      </div>
                                      <div className="flex-1 flex flex-col items-center justify-center transition-all duration-300 transform group-hover:scale-110">
                                          <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mb-2 group-hover:bg-teal-900 group-hover:text-white transition-all shadow-sm">
                                            <Plus className="w-6 h-6 text-teal-600 group-hover:text-white" />
                                          </div>
                                          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-300 group-hover:text-teal-900 transition-colors">Añadir Menú</span>
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

      {showRecipeSelector && (
          <ModalPortal>
              <div className="fixed inset-0 z-[5000] bg-teal-900/70 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setShowRecipeSelector(null)}>
                  <div className="bg-white w-full max-w-xl rounded-[3.5rem] p-10 shadow-2xl relative animate-slide-up flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h3 className="text-3xl font-black text-teal-950">Elegir Plato</h3>
                            <p className="text-[11px] text-gray-400 font-black uppercase tracking-[0.3em] mt-2">
                                {showRecipeSelector.type} • {format(new Date(showRecipeSelector.date), 'd MMMM', {locale: es})}
                            </p>
                        </div>
                        <button onClick={() => setShowRecipeSelector(null)} className="p-3 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all"><X className="w-7 h-7 text-gray-400" /></button>
                    </div>

                    <div className="relative mb-8">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="Buscar en tu biblioteca..." 
                            value={selectorSearch}
                            onChange={(e) => setSelectorSearch(e.target.value)}
                            className="w-full pl-14 pr-6 py-5 bg-gray-50 border-2 border-transparent focus:border-teal-500/10 rounded-2xl font-bold text-base outline-none transition-all shadow-inner"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-2">
                        {filteredSelectorRecipes.map(recipe => (
                            <div 
                                key={recipe.id}
                                onClick={() => { onUpdateSlot(showRecipeSelector.date, showRecipeSelector.type, recipe.id); setShowRecipeSelector(null); }}
                                className="group flex items-center gap-5 p-4 bg-white border border-gray-100 rounded-[2rem] hover:bg-teal-50 hover:border-teal-100 transition-all cursor-pointer shadow-sm hover:shadow-md"
                            >
                                <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md flex-shrink-0">
                                    <SmartImage src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-[15px] text-teal-950 leading-tight mb-1 truncate">{recipe.title}</h4>
                                    <span className="text-[9px] font-black uppercase text-teal-600/60 tracking-widest">{recipe.cuisine_type}</span>
                                </div>
                                <div className="w-12 h-12 bg-teal-900 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all text-white shadow-xl">
                                    <Check className="w-6 h-6" />
                                </div>
                            </div>
                        ))}
                        {filteredSelectorRecipes.length === 0 && (
                            <div className="py-20 text-center opacity-20"><ChefHat className="w-16 h-16 mx-auto mb-4" /><p className="font-black text-lg">No hay recetas</p></div>
                        )}
                    </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {showPlanWizard && (
        <ModalPortal>
          <div className="fixed inset-0 z-[5000] bg-teal-900/70 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setShowPlanWizard(false)}>
            <div className="bg-white w-full max-w-md rounded-[3.5rem] p-12 shadow-2xl relative animate-slide-up" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowPlanWizard(false)} className="absolute top-10 right-10 p-2 bg-gray-50 rounded-full text-gray-400"><X className="w-6 h-6" /></button>
              <div className="mb-10">
                <h3 className="text-4xl font-black text-teal-950 leading-none">Generar plan</h3>
                <p className="text-gray-400 font-bold text-sm mt-3 uppercase tracking-widest">Personaliza con IA Fresco</p>
              </div>
              <div className="space-y-10">
                <div>
                  <label className="text-[10px] font-black text-teal-600 uppercase tracking-[0.3em] block mb-5 ml-1">Selecciona Días</label>
                  <div className="flex justify-between gap-1.5">
                    {days.map((day) => {
                      const dStr = format(day, 'yyyy-MM-dd');
                      const sel = selectedWizardDays.includes(dStr);
                      return (
                        <button key={dStr} onClick={() => toggleWizardDay(dStr)} className={`w-11 h-16 rounded-2xl flex flex-col items-center justify-center transition-all border-2 ${sel ? 'bg-teal-900 border-teal-900 text-white shadow-xl scale-110' : 'bg-white border-gray-100 text-gray-400 hover:border-teal-100'}`}>
                          <span className="text-[7px] font-black uppercase mb-1">{format(day, 'EEE', { locale: es })}</span>
                          <span className="text-base font-black">{format(day, 'd')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-teal-600 uppercase tracking-[0.3em] block mb-5 ml-1">¿Qué comidas?</label>
                  <div className="grid grid-cols-3 gap-4">
                    {[{ id: 'breakfast', label: 'Desayuno', icon: Sunrise }, { id: 'lunch', label: 'Comida', icon: Sun }, { id: 'dinner', label: 'Cena', icon: Moon }].map((m) => {
                      const sel = selectedWizardTypes.includes(m.id as MealCategory);
                      return (
                        <button key={m.id} onClick={() => toggleWizardType(m.id as MealCategory)} className={`p-5 rounded-3xl flex flex-col items-center gap-4 transition-all border-2 ${sel ? 'bg-orange-500 border-orange-500 text-white shadow-xl scale-105' : 'bg-gray-50 border-transparent text-gray-400 hover:bg-teal-50'}`}>
                          <m.icon className="w-8 h-8" />
                          <span className="text-[9px] font-black uppercase tracking-widest">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button onClick={executeSmartPlan} disabled={isGenerating} className="w-full h-16 bg-teal-900 text-white rounded-[2rem] font-black uppercase tracking-[0.25em] shadow-2xl flex items-center justify-center gap-5 hover:bg-teal-800 transition-all active:scale-[0.98]">
                  {isGenerating ? <Loader2 className="w-7 h-7 animate-spin" /> : <><Sparkles className="w-6 h-6 text-orange-400" /> Organizar con IA</>}
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
