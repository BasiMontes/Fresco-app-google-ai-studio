
import React, { useState, useMemo, useEffect } from 'react';
import { MealSlot, Recipe, MealCategory, PantryItem, UserProfile, ShoppingItem } from '../types';
import { Plus, X, Loader2, PackageCheck, ShoppingCart, ChevronLeft, ChevronRight, BrainCircuit, ChefHat, Trash2, Sunrise, Sun, Moon, Share2, Check, Calendar, Sparkles, History, ArrowLeft, Clock, Users } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, addWeeks, subWeeks, isBefore, startOfDay, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { generateSmartMenu } from '../services/geminiService';
import { RecipeDetail } from './RecipeDetail';
import { cleanName } from '../services/unitService';
import { triggerDialog } from './Dialog';

interface PlannerProps {
  user: UserProfile;
  plan: MealSlot[];
  recipes: Recipe[];
  pantry: PantryItem[];
  onUpdateSlot: (date: string, type: MealCategory, recipeId: string | undefined) => void;
  onAIPlanGenerated: (plan: MealSlot[], recipes: Recipe[]) => void;
  onClear: () => void;
  onCookFinish?: (usedIngredients: { name: string, quantity: number }[], recipeId?: string) => void;
  onAddToShoppingList?: (items: ShoppingItem[]) => void;
}

export const Planner: React.FC<PlannerProps> = ({ user, plan, recipes, pantry, onUpdateSlot, onAIPlanGenerated, onClear, onCookFinish, onAddToShoppingList }) => {
  const [showHistory, setShowHistory] = useState(false);
  const [showPlanWizard, setShowPlanWizard] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const [selectedWizardDays, setSelectedWizardDays] = useState<string[]>([]);
  const [selectedWizardTypes, setSelectedWizardTypes] = useState<MealCategory[]>(['lunch', 'dinner']);

  const days = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i)), [currentWeekStart]);

  // Agrupación de historial (Siempre 4 semanas atrás, incluso vacías)
  const historyWeeks = useMemo(() => {
      const weeks: { weekStart: Date; meals: MealSlot[] }[] = [];
      const today = startOfDay(new Date());
      
      for (let i = 1; i <= 4; i++) {
          const wStart = startOfWeek(subDays(today, i * 7), { weekStartsOn: 1 });
          const wEnd = addDays(wStart, 6);
          const weekMeals = plan.filter(slot => {
              const d = new Date(slot.date);
              return d >= wStart && d <= wEnd && slot.recipeId;
          });
          
          // NOTA: Se eliminó el filtro que ocultaba semanas vacías para mantener consistencia visual
          weeks.push({ weekStart: wStart, meals: weekMeals });
      }
      return weeks;
  }, [plan]);

  const executeSmartPlan = async () => {
    if (selectedWizardDays.length === 0 || selectedWizardTypes.length === 0) return;
    setIsGenerating(true);
    try {
        const result = await generateSmartMenu(user, pantry, selectedWizardDays, selectedWizardTypes, recipes);
        if (result.plan) {
            onAIPlanGenerated(result.plan, result.newRecipes);
            triggerDialog({ title: 'Plan Generado', message: `Hemos organizado ${result.plan.length} comidas para ti.`, type: 'success' });
        }
        setShowPlanWizard(false);
    } catch (e) {
        triggerDialog({ title: 'Error', message: 'No se pudo generar el menú.', type: 'alert' });
    } finally {
        setIsGenerating(false);
    }
  };

  if (showHistory) {
      return (
          <div className="h-full flex flex-col animate-fade-in bg-white safe-pt">
              <header className="p-6 flex items-start gap-4 sticky top-0 bg-white z-20 border-b border-gray-50">
                  <button onClick={() => setShowHistory(false)} className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors">
                      <ArrowLeft className="w-6 h-6 text-teal-900" />
                  </button>
                  <div>
                      <div className="flex items-center gap-2 mb-2">
                          <History className="w-6 h-6 text-teal-600" />
                          <h2 className="text-2xl font-black text-teal-900">Historial de Menús</h2>
                      </div>
                      <p className="text-gray-500 font-medium text-sm leading-relaxed">Consulta tus recetas y planes de las últimas 4 semanas.</p>
                  </div>
              </header>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar pb-40">
                  {historyWeeks.map((week, idx) => (
                      <div key={idx} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 space-y-6">
                          <div className="flex items-start justify-between">
                              <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-teal-900">
                                      <Calendar className="w-5 h-5" />
                                      <h3 className="font-black text-lg">Semana del {format(week.weekStart, "d 'de' MMMM, yyyy", { locale: es })}</h3>
                                  </div>
                                  <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${week.meals.length > 0 ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                                      {week.meals.length} {week.meals.length === 1 ? 'comida' : 'comidas'}
                                  </span>
                              </div>
                          </div>

                          <div className="space-y-3">
                              {week.meals.length === 0 ? (
                                  <div className="py-4 text-center border-2 border-dashed border-gray-50 rounded-2xl">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Sin actividad registrada</p>
                                  </div>
                              ) : (
                                  <>
                                    {week.meals.slice(0, 3).map((slot, sIdx) => {
                                        const recipe = recipes.find(r => r.id === slot.recipeId);
                                        if (!recipe) return null;
                                        return (
                                            <div key={sIdx} onClick={() => setSelectedRecipe(recipe)} className="flex items-center gap-4 p-3 bg-gray-50/50 rounded-2xl border border-transparent hover:border-teal-200 transition-all cursor-pointer">
                                                <img src={recipe.image_url} className="w-16 h-16 rounded-xl object-cover shadow-sm" alt="" />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-gray-900 text-sm truncate">{recipe.title}</h4>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider capitalize">{slot.type}</p>
                                                    <div className="flex gap-3 mt-1.5 opacity-60">
                                                        <div className="flex items-center gap-1"><Clock className="w-3 h-3" /><span className="text-[9px] font-black">{recipe.prep_time} min</span></div>
                                                        <div className="flex items-center gap-1"><Users className="w-3 h-3" /><span className="text-[9px] font-black">{slot.servings} pax</span></div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {week.meals.length > 3 && <p className="text-center text-[9px] font-black text-gray-300 uppercase tracking-widest">+ {week.meals.length - 3} platos más</p>}
                                  </>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
              
              {selectedRecipe && (
                  <RecipeDetail 
                      recipe={selectedRecipe} pantry={pantry} userProfile={user} onClose={() => setSelectedRecipe(null)} 
                      onAddToPlan={(serv, date, type) => { onUpdateSlot(date!, type!, selectedRecipe.id); setSelectedRecipe(null); }}
                  />
              )}
          </div>
      );
  }

  return (
    <div className="h-full w-full flex flex-col animate-fade-in overflow-hidden">
      <header className="flex-shrink-0 px-4 py-2 flex justify-between items-center bg-white/50 backdrop-blur-sm z-10 border-b border-gray-50">
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-lg shadow-sm border border-gray-100">
                <button onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} className="p-1 hover:bg-gray-100 rounded-md text-gray-400"><ChevronLeft className="w-3.5 h-3.5" /></button>
                <div className="text-center w-20">
                    <span className="block text-[6px] font-black uppercase text-gray-400 tracking-widest leading-none">Semana</span>
                    <span className="block text-[10px] font-black text-teal-900 leading-none">{format(currentWeekStart, 'd MMM', { locale: es })}</span>
                </div>
                <button onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} className="p-1 hover:bg-gray-100 rounded-md text-gray-400"><ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
            <button onClick={() => setShowHistory(true)} title="Historial" className="p-2 bg-white text-teal-600 rounded-lg hover:bg-teal-50 transition-all border border-gray-100 shadow-sm relative group">
                <History className="w-3.5 h-3.5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full border-2 border-white scale-0 group-hover:scale-100 transition-transform" />
            </button>
        </div>

        <div className="flex gap-2">
            <button onClick={() => triggerDialog({ title: 'Borrar Semana', message: '¿Limpiar todo el plan actual?', type: 'confirm', onConfirm: onClear })} className="p-2 bg-white text-red-400 rounded-lg hover:bg-red-50 border border-gray-100 shadow-sm"><Trash2 className="w-3.5 h-3.5" /></button>
            <button onClick={() => setShowPlanWizard(true)} className="flex items-center gap-1.5 bg-teal-900 text-white px-3 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-teal-800 transition-all shadow-lg active:scale-95">
                <BrainCircuit className="w-3 h-3 text-orange-400" /> Plan IA
            </button>
        </div>
      </header>

      {/* Tarjeta Historial (Acceso rápido tipo imagen 1) */}
      <div className="px-4 py-3 mt-2">
          <button 
            onClick={() => setShowHistory(true)}
            className="w-full bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center justify-between group hover:border-teal-200 transition-all"
          >
              <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 group-hover:bg-teal-900 group-hover:text-white transition-all">
                      <History className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                      <h4 className="text-lg font-black text-teal-950 leading-none mb-1">Historial de Menús</h4>
                      <p className="text-gray-400 font-medium text-xs">Consulta tus recetas de semanas anteriores</p>
                  </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:translate-x-1 transition-transform" />
          </button>
      </div>

      <div className="flex-1 min-h-0 px-1 md:px-4 pb-20 md:pb-4 overflow-x-auto md:overflow-hidden flex gap-2 md:gap-3 no-scrollbar mt-2">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isToday = isSameDay(day, new Date());
          return (
            <div key={day.toString()} className="min-w-[85vw] md:min-w-0 flex-1 flex flex-col gap-2">
                <div className={`flex items-center justify-center py-2 rounded-xl border transition-all ${isToday ? 'bg-teal-900 text-white border-teal-900 shadow-sm' : 'bg-white text-gray-500 border-gray-50'}`}>
                    <div className="flex flex-col items-center">
                        <span className="text-[7px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">{format(day, 'EEEE', { locale: es })}</span>
                        <span className="text-base font-black leading-none">{format(day, 'd', { locale: es })}</span>
                    </div>
                </div>
                <div className="flex-1 flex flex-col gap-2 min-h-0">
                    {(['breakfast', 'lunch', 'dinner'] as MealCategory[]).map((type) => {
                        const slot = plan.find(p => p.date === dateStr && p.type === type);
                        const recipe = recipes.find(r => r.id === slot?.recipeId);
                        return (
                            <div key={type} onClick={() => { if(recipe) setSelectedRecipe(recipe); else onUpdateSlot(dateStr, type, 'static-main-0'); }} className={`flex-1 rounded-2xl border transition-all cursor-pointer flex flex-col p-3 ${recipe ? 'bg-white border-gray-100 shadow-sm' : 'bg-gray-50/50 border-dashed border-gray-100 hover:bg-white hover:border-teal-200'}`}>
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-[7px] font-black uppercase text-gray-300 tracking-widest">{type}</span>
                                    {!recipe && <Plus className="w-3 h-3 text-gray-200" />}
                                </div>
                                {recipe ? (
                                    <div className="flex-1 min-h-0 flex flex-col">
                                        <h5 className="font-black text-[10px] text-teal-950 line-clamp-2 leading-tight">{recipe.title}</h5>
                                        <div className="mt-auto flex items-center gap-1">
                                            <PackageCheck className="w-3 h-3 text-teal-600" />
                                            <span className="text-[8px] font-black text-teal-600">En Stock</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center opacity-20"><ChefHat className="w-5 h-5" /></div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
          );
        })}
      </div>
      
      {selectedRecipe && (
        <RecipeDetail 
            recipe={selectedRecipe} pantry={pantry} userProfile={user} onClose={() => setSelectedRecipe(null)} 
            onAddToPlan={(serv, date, type) => { onUpdateSlot(date!, type!, selectedRecipe.id); setSelectedRecipe(null); }}
        />
      )}
    </div>
  );
};
