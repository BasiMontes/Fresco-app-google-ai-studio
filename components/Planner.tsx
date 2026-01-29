
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MealSlot, Recipe, MealCategory, PantryItem, UserProfile } from '../types';
import { Plus, X, Loader2, PackageCheck, ChevronLeft, ChevronRight, BrainCircuit, Trash2, Sunrise, Sun, Moon, Sparkles, ChefHat, Search, Check } from 'lucide-react';
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

  // Auto-scroll al día actual
  useEffect(() => {
    const timer = setTimeout(() => {
        if (scrollContainerRef.current) {
            const todayIndex = days.findIndex(d => isSameDay(d, new Date()));
            if (todayIndex !== -1) {
                const dayWidth = 300; // Ancho aproximado de cada columna
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
      <header className="px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border-b border-gray-100">
        <div>
            <h1 className="text-xl font-black text-teal-900 tracking-tight leading-none mb-1">Calendario</h1>
            <p className="text-gray-400 font-bold uppercase text-[9px] tracking-widest">Planifica tu bienestar</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 flex-1 md:flex-none">
                <button onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} className="p-1 hover:bg-white rounded-lg text-gray-400"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-xs font-black text-teal-900 mx-2 uppercase tracking-widest whitespace-nowrap">{format(currentWeekStart, 'd MMM', { locale: es })}</span>
                <button onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} className="p-1 hover:bg-white rounded-lg text-gray-400"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <button onClick={() => triggerDialog({ title: 'Limpiar Plan', message: '¿Borrar todo el calendario actual?', type: 'confirm', onConfirm: onClear })} className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
            <button onClick={() => setShowPlanWizard(true)} className="flex items-center gap-2 bg-teal-900 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-teal-800 transition-all">
                <BrainCircuit className="w-4 h-4 text-orange-400" /> Generar plan
            </button>
        </div>
      </header>

      <div ref={scrollContainerRef} className="flex-1 overflow-x-auto no-scrollbar flex gap-4 p-6 bg-gray-50/30">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isToday = isSameDay(day, new Date());
          return (
            <div key={dateStr} className="min-w-[280px] max-w-[320px] flex-1 flex flex-col gap-4">
                <div className={`text-center p-4 rounded-3xl border transition-all ${isToday ? 'bg-teal-900 text-white border-teal-900 shadow-xl ring-4 ring-teal-900/10' : 'bg-white text-teal-900 border-gray-100 shadow-sm'}`}>
                    <span className={`block text-[8px] font-black uppercase tracking-[0.3em] mb-1 ${isToday ? 'text-teal-400' : 'opacity-50'}`}>{format(day, 'EEEE', { locale: es })}</span>
                    <span className="block text-2xl font-black">{format(day, 'd')}</span>
                    {isToday && <div className="mt-1 mx-auto w-1 h-1 bg-orange-500 rounded-full" />}
                </div>
                {(['breakfast', 'lunch', 'dinner'] as MealCategory[]).map((type) => {
                    const slot = plan.find(p => p.date === dateStr && p.type === type);
                    const recipe = recipes.find(r => r.id === slot?.recipeId);
                    return (
                        <div key={type} onClick={() => recipe ? setSelectedRecipe(recipe) : setShowRecipeSelector({date: dateStr, type})} className={`flex-1 min-h-[140px] rounded-3xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between group ${recipe ? 'bg-white border-white shadow-md hover:shadow-xl hover:-translate-y-1' : 'bg-transparent border-dashed border-gray-200 hover:bg-white hover:border-teal-200 hover:shadow-lg'}`}>
                            <div className="flex justify-between items-start">
                                <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full ${recipe ? 'bg-teal-50 text-teal-600' : 'bg-gray-100 text-gray-400'}`}>{type}</span>
                                {recipe ? (
                                    <button onClick={(e) => { e.stopPropagation(); onUpdateSlot(dateStr, type, undefined); }} className="p-1 opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all"><X className="w-3.5 h-3.5" /></button>
                                ) : (
                                    <Plus className="w-4 h-4 text-gray-200 group-hover:text-teal-400 transition-colors" />
                                )}
                            </div>
                            {recipe ? (
                                <div className="mt-3">
                                    <h5 className="font-black text-sm text-teal-950 line-clamp-2 leading-tight mb-2 group-hover:text-teal-700 transition-colors">{recipe.title}</h5>
                                    <div className="flex items-center gap-1.5">
                                        <PackageCheck className="w-3.5 h-3.5 text-teal-600" />
                                        <span className="text-[8px] font-black text-teal-600 uppercase tracking-widest">En Biblioteca</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center opacity-10 group-hover:opacity-30 transition-opacity">
                                    <ChefHat className="w-8 h-8 mb-1" />
                                    <span className="text-[7px] font-black uppercase">Vacio</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
          );
        })}
      </div>

      {showRecipeSelector && (
          <ModalPortal>
              <div className="fixed inset-0 z-[5000] bg-teal-900/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowRecipeSelector(null)}>
                  <div className="bg-white w-full max-w-lg rounded-[3rem] p-8 shadow-2xl relative animate-slide-up flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-2xl font-black text-teal-900">Elegir Receta</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                {showRecipeSelector.type} - {format(new Date(showRecipeSelector.date), 'd MMM', {locale: es})}
                            </p>
                        </div>
                        <button onClick={() => setShowRecipeSelector(null)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100"><X className="w-6 h-6 text-gray-400" /></button>
                    </div>

                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="Buscar en tu biblioteca..." 
                            value={selectorSearch}
                            onChange={(e) => setSelectorSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent focus:border-teal-500/10 rounded-2xl font-bold text-sm outline-none transition-all"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                        {filteredSelectorRecipes.map(recipe => (
                            <div 
                                key={recipe.id}
                                onClick={() => { onUpdateSlot(showRecipeSelector.date, showRecipeSelector.type, recipe.id); setShowRecipeSelector(null); }}
                                className="group flex items-center gap-4 p-3 bg-white border border-gray-50 rounded-2xl hover:bg-teal-50 hover:border-teal-100 transition-all cursor-pointer shadow-sm"
                            >
                                <div className="w-14 h-14 rounded-xl overflow-hidden shadow-sm">
                                    <SmartImage src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-black text-sm text-teal-950 leading-tight mb-1 group-hover:text-teal-700">{recipe.title}</h4>
                                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{recipe.cuisine_type}</span>
                                </div>
                                <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-teal-600">
                                    <Check className="w-5 h-5" />
                                </div>
                            </div>
                        ))}
                        {filteredSelectorRecipes.length === 0 && (
                            <div className="py-10 text-center opacity-20"><ChefHat className="w-10 h-10 mx-auto mb-2" /><p className="font-bold">No hay recetas</p></div>
                        )}
                    </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {showPlanWizard && (
        <ModalPortal>
          <div className="fixed inset-0 z-[5000] bg-teal-900/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowPlanWizard(false)}>
            <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative animate-slide-up" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowPlanWizard(false)} className="absolute top-8 right-8 p-2 bg-gray-50 rounded-full text-gray-400"><X className="w-6 h-6" /></button>
              <div className="mb-8">
                <h3 className="text-3xl font-black text-teal-950">Generar plan</h3>
                <p className="text-gray-400 font-medium text-sm mt-2">Personaliza tu semana con la IA Fresco.</p>
              </div>
              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-black text-teal-600 uppercase tracking-widest block mb-4">Días</label>
                  <div className="flex justify-between gap-1">
                    {days.map((day) => {
                      const dStr = format(day, 'yyyy-MM-dd');
                      const sel = selectedWizardDays.includes(dStr);
                      return (
                        <button key={dStr} onClick={() => toggleWizardDay(dStr)} className={`w-10 h-14 rounded-xl flex flex-col items-center justify-center transition-all border-2 ${sel ? 'bg-teal-900 border-teal-900 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400'}`}>
                          <span className="text-[7px] font-black uppercase mb-1">{format(day, 'EEE', { locale: es })}</span>
                          <span className="text-sm font-black">{format(day, 'd')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-teal-600 uppercase tracking-widest block mb-4">Comidas</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[{ id: 'breakfast', label: 'Desayuno', icon: Sunrise }, { id: 'lunch', label: 'Comida', icon: Sun }, { id: 'dinner', label: 'Cena', icon: Moon }].map((m) => {
                      const sel = selectedWizardTypes.includes(m.id as MealCategory);
                      return (
                        <button key={m.id} onClick={() => toggleWizardType(m.id as MealCategory)} className={`p-4 rounded-2xl flex flex-col items-center gap-3 transition-all border-2 ${sel ? 'bg-orange-500 border-orange-500 text-white shadow-lg' : 'bg-gray-50 border-transparent text-gray-400'}`}>
                          <m.icon className="w-6 h-6" />
                          <span className="text-[9px] font-black uppercase tracking-widest">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button onClick={executeSmartPlan} disabled={isGenerating} className="w-full h-16 bg-teal-900 text-white rounded-[1.8rem] font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-4 hover:bg-teal-800 transition-all">
                  {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Sparkles className="w-5 h-5 text-orange-400" /> Organizar con IA</>}
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
