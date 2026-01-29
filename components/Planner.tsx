
import React, { useState, useMemo, useEffect } from 'react';
import { MealSlot, Recipe, MealCategory, PantryItem, UserProfile } from '../types';
import { Plus, X, Loader2, PackageCheck, ChevronLeft, ChevronRight, BrainCircuit, Trash2, Sunrise, Sun, Moon, Sparkles, ChefHat } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { generateSmartMenu } from '../services/geminiService';
import { RecipeDetail } from './RecipeDetail';
import { triggerDialog } from './Dialog';
import { ModalPortal } from './ModalPortal';

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
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const days = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i)), [currentWeekStart]);
  
  const [selectedWizardDays, setSelectedWizardDays] = useState<string[]>([]);
  const [selectedWizardTypes, setSelectedWizardTypes] = useState<MealCategory[]>(['lunch', 'dinner']);

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

  return (
    <div className="h-full w-full flex flex-col animate-fade-in overflow-hidden">
      <header className="px-6 py-4 flex justify-between items-center bg-white border-b border-gray-100">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                <button onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} className="p-1 hover:bg-white rounded-lg text-gray-400"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-xs font-black text-teal-900 mx-2 uppercase tracking-widest">{format(currentWeekStart, 'd MMM', { locale: es })}</span>
                <button onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} className="p-1 hover:bg-white rounded-lg text-gray-400"><ChevronRight className="w-4 h-4" /></button>
            </div>
        </div>
        <div className="flex gap-2">
            <button onClick={() => triggerDialog({ title: 'Limpiar Plan', message: '¿Borrar todo?', type: 'confirm', onConfirm: onClear })} className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
            <button onClick={() => setShowPlanWizard(true)} className="flex items-center gap-2 bg-teal-900 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-teal-800 transition-all">
                <BrainCircuit className="w-4 h-4 text-orange-400" /> Generar plan
            </button>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto no-scrollbar flex gap-4 p-6 bg-gray-50/30">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isToday = isSameDay(day, new Date());
          return (
            <div key={dateStr} className="min-w-[280px] flex-1 flex flex-col gap-4">
                <div className={`text-center p-4 rounded-3xl border ${isToday ? 'bg-teal-900 text-white border-teal-900 shadow-xl' : 'bg-white text-teal-900 border-gray-100 shadow-sm'}`}>
                    <span className="block text-[8px] font-black uppercase tracking-[0.3em] opacity-50 mb-1">{format(day, 'EEEE', { locale: es })}</span>
                    <span className="block text-2xl font-black">{format(day, 'd')}</span>
                </div>
                {(['breakfast', 'lunch', 'dinner'] as MealCategory[]).map((type) => {
                    const slot = plan.find(p => p.date === dateStr && p.type === type);
                    const recipe = recipes.find(r => r.id === slot?.recipeId);
                    return (
                        <div key={type} onClick={() => recipe ? setSelectedRecipe(recipe) : onUpdateSlot(dateStr, type, 'static-main-0')} className={`flex-1 rounded-3xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between ${recipe ? 'bg-white border-white shadow-md hover:shadow-xl' : 'bg-transparent border-dashed border-gray-200 hover:bg-white hover:border-teal-200 hover:shadow-lg'}`}>
                            <div className="flex justify-between items-start">
                                <span className="text-[8px] font-black uppercase text-gray-300 tracking-[0.2em]">{type}</span>
                                {!recipe && <Plus className="w-4 h-4 text-gray-200" />}
                            </div>
                            {recipe ? (
                                <div className="mt-2">
                                    <h5 className="font-black text-sm text-teal-950 line-clamp-2 leading-tight mb-2">{recipe.title}</h5>
                                    <div className="flex items-center gap-1.5">
                                        <PackageCheck className="w-3.5 h-3.5 text-teal-600" />
                                        <span className="text-[8px] font-black text-teal-600 uppercase tracking-widest">En Stock</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center opacity-10"><ChefHat className="w-8 h-8" /></div>
                            )}
                        </div>
                    );
                })}
            </div>
          );
        })}
      </div>

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
