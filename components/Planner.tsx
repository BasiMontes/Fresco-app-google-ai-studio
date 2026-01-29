
import React, { useState, useMemo, useEffect } from 'react';
import { MealSlot, Recipe, MealCategory, PantryItem, UserProfile, ShoppingItem } from '../types';
import { Plus, X, Loader2, PackageCheck, ShoppingCart, ChevronLeft, ChevronRight, BrainCircuit, ChefHat, Trash2, Sunrise, Sun, Moon, Share2, Check, Calendar, Sparkles, History, ArrowLeft, Clock, Users, CalendarCheck, CheckCircle2 } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, addWeeks, subWeeks, isBefore, startOfDay, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { generateSmartMenu } from '../services/geminiService';
import { RecipeDetail } from './RecipeDetail';
import { cleanName } from '../services/unitService';
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
  onCookFinish?: (usedIngredients: { name: string, quantity: number }[], recipeId?: string) => void;
  onAddToShoppingList?: (items: ShoppingItem[]) => void;
}

export const Planner: React.FC<PlannerProps> = ({ user, plan, recipes, pantry, onUpdateSlot, onAIPlanGenerated, onClear, onCookFinish, onAddToShoppingList }) => {
  const [showHistory, setShowHistory] = useState(false);
  const [showPlanWizard, setShowPlanWizard] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const days = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i)), [currentWeekStart]);
  
  const [selectedWizardDays, setSelectedWizardDays] = useState<string[]>([]);
  const [selectedWizardTypes, setSelectedWizardTypes] = useState<MealCategory[]>(['lunch', 'dinner']);

  // Inicializar selección por defecto al abrir el wizard
  useEffect(() => {
    if (showPlanWizard) {
      setSelectedWizardDays(days.map(d => format(d, 'yyyy-MM-dd')));
    }
  }, [showPlanWizard, days]);

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
          weeks.push({ weekStart: wStart, meals: weekMeals });
      }
      return weeks;
  }, [plan]);

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
      triggerDialog({ title: 'Atención', message: 'Selecciona al menos un día y un tipo de comida.', type: 'alert' });
      return;
    }
    setIsGenerating(true);
    try {
        const result = await generateSmartMenu(user, pantry, selectedWizardDays, selectedWizardTypes, recipes);
        if (result.plan) {
            onAIPlanGenerated(result.plan, result.newRecipes);
            triggerDialog({ title: 'Plan Generado', message: `Hemos organizado ${result.plan.length} comidas para ti.`, type: 'success' });
        }
        setShowPlanWizard(false);
    } catch (e) {
        triggerDialog({ title: 'Error', message: 'No se pudo generar el menú inteligente.', type: 'alert' });
    } finally {
        setIsGenerating(false);
    }
  };

  if (showHistory) {
      return (
          <div className="h-full flex flex-col animate-fade-in bg-white safe-pt">
              <header className="p-6 flex items-start gap-4 sticky top-0 bg-white z-20 border-b border-gray-50">
                  <button onClick={() => setShowHistory(false)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
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
                          <div className="flex items-center gap-2 text-teal-900">
                              <Calendar className="w-5 h-5" />
                              <h3 className="font-black text-lg">Semana del {format(week.weekStart, "d 'de' MMMM", { locale: es })}</h3>
                          </div>
                          <div className="space-y-3">
                              {week.meals.length === 0 ? (
                                  <div className="py-4 text-center border-2 border-dashed border-gray-50 rounded-2xl opacity-30">
                                      <p className="text-[10px] font-black uppercase tracking-widest">Sin actividad</p>
                                  </div>
                              ) : (
                                  week.meals.slice(0, 3).map((slot, sIdx) => {
                                      const recipe = recipes.find(r => r.id === slot.recipeId);
                                      if (!recipe) return null;
                                      return (
                                          <div key={sIdx} onClick={() => setSelectedRecipe(recipe)} className="flex items-center gap-4 p-3 bg-gray-50/50 rounded-2xl border border-transparent hover:border-teal-200 transition-all cursor-pointer">
                                              <img src={recipe.image_url} className="w-12 h-12 rounded-xl object-cover shadow-sm" alt="" />
                                              <div className="flex-1 min-w-0">
                                                  <h4 className="font-bold text-gray-900 text-sm truncate">{recipe.title}</h4>
                                                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider capitalize">{slot.type}</p>
                                              </div>
                                          </div>
                                      );
                                  })
                              )}
                          </div>
                      </div>
                  ))}
              </div>
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
        </div>

        <div className="flex gap-2">
            <button onClick={() => triggerDialog({ title: 'Borrar Semana', message: '¿Limpiar todo el plan actual?', type: 'confirm', onConfirm: onClear })} className="p-2 bg-white text-red-400 rounded-lg hover:bg-red-50 border border-gray-100 shadow-sm"><Trash2 className="w-3.5 h-3.5" /></button>
            <button onClick={() => setShowPlanWizard(true)} className="flex items-center gap-1.5 bg-teal-900 text-white px-3 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-teal-800 transition-all shadow-lg active:scale-95">
                <BrainCircuit className="w-3 h-3 text-orange-400" /> Generar plan
            </button>
        </div>
      </header>

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

      {/* PLAN WIZARD MODAL RESTAURADO */}
      {showPlanWizard && (
        <ModalPortal>
          <div className="fixed inset-0 z-[5000] bg-teal-900/60 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowPlanWizard(false)}>
            <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative animate-slide-up" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowPlanWizard(false)} className="absolute top-8 right-8 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-black transition-colors"><X className="w-6 h-6" /></button>
              
              <div className="mb-8">
                <div className="w-16 h-16 bg-teal-900 rounded-2xl flex items-center justify-center text-orange-400 mb-6 shadow-xl">
                  <BrainCircuit className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-black text-teal-950 leading-tight">Generar plan</h3>
                <p className="text-gray-400 font-medium text-sm mt-2">Dime qué huecos quieres que la IA Fresco rellene por ti.</p>
              </div>

              <div className="space-y-8">
                {/* Selección de Días */}
                <div>
                  <label className="text-[10px] font-black text-teal-600 uppercase tracking-widest block mb-4 ml-1">Días a planificar</label>
                  <div className="flex justify-between gap-1">
                    {days.map((day) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const isSelected = selectedWizardDays.includes(dateStr);
                      return (
                        <button 
                          key={dateStr}
                          onClick={() => toggleWizardDay(dateStr)}
                          className={`w-10 h-14 rounded-xl flex flex-col items-center justify-center transition-all border-2 ${isSelected ? 'bg-teal-900 border-teal-900 text-white shadow-lg' : 'bg-white border-gray-50 text-gray-400'}`}
                        >
                          <span className="text-[7px] font-black uppercase mb-1">{format(day, 'EEE', { locale: es })}</span>
                          <span className="text-sm font-black">{format(day, 'd')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selección de Comidas */}
                <div>
                  <label className="text-[10px] font-black text-teal-600 uppercase tracking-widest block mb-4 ml-1">Momento del día</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'breakfast', label: 'Desayuno', icon: Sunrise },
                      { id: 'lunch', label: 'Comida', icon: Sun },
                      { id: 'dinner', label: 'Cena', icon: Moon }
                    ].map((m) => {
                      const isSelected = selectedWizardTypes.includes(m.id as MealCategory);
                      return (
                        <button 
                          key={m.id}
                          onClick={() => toggleWizardType(m.id as MealCategory)}
                          className={`p-4 rounded-2xl flex flex-col items-center gap-3 transition-all border-2 ${isSelected ? 'bg-orange-500 border-orange-500 text-white shadow-lg scale-[1.02]' : 'bg-gray-50 border-transparent text-gray-400'}`}
                        >
                          <m.icon className="w-6 h-6" />
                          <span className="text-[9px] font-black uppercase tracking-widest">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button 
                  onClick={executeSmartPlan}
                  disabled={isGenerating}
                  className="w-full h-16 bg-teal-900 text-white rounded-[1.8rem] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-4 hover:bg-teal-800 active:scale-95 transition-all"
                >
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
