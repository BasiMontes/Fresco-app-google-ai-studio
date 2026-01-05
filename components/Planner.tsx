
import React, { useState, useMemo } from 'react';
import { MealSlot, Recipe, MealCategory, PantryItem, UserProfile, ShoppingItem } from '../types';
import { Plus, Trash2, Calendar, Wand2, X, Eye, Trash, ChefHat, Check, AlertCircle, Sparkles, Loader2, ArrowLeft, ArrowRight, PackageCheck, Clock, Users, Share2, Users2, CheckCircle2, WifiOff, ShoppingCart, ChevronLeft, ChevronRight, Move, AlertOctagon, Utensils, Repeat, AlertTriangle, CheckSquare, Square } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, addWeeks, subWeeks, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { generateWeeklyPlanAI } from '../services/geminiService';
import { RecipeDetail } from './RecipeDetail';

interface PlannerProps {
  user: UserProfile;
  plan: MealSlot[];
  recipes: Recipe[];
  pantry: PantryItem[];
  onUpdateSlot: (date: string, type: MealCategory, recipeId: string | undefined) => void;
  onAIPlanGenerated: (plan: MealSlot[], recipes: Recipe[]) => void;
  onClear: () => void;
  onCookFinish?: (usedIngredients: { name: string, quantity: number }[], recipeId?: string) => void;
  onAddToPlan?: (recipe: Recipe, servings?: number) => void;
  onAddToShoppingList?: (items: ShoppingItem[]) => void;
  isOnline?: boolean;
}

const SLOT_LEFTOVERS = 'SPECIAL_LEFTOVERS';
const SLOT_EAT_OUT = 'SPECIAL_EAT_OUT';

export const Planner: React.FC<PlannerProps> = ({ user, plan, recipes, pantry, onUpdateSlot, onAIPlanGenerated, onClear, onCookFinish, onAddToPlan, onAddToShoppingList, isOnline = true }) => {
  const [showPicker, setShowPicker] = useState<{ date: string, type: MealCategory } | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPlanWizard, setShowPlanWizard] = useState(false);
  const [wizardDays, setWizardDays] = useState<string[]>([]);
  const [wizardTypes, setWizardTypes] = useState<MealCategory[]>(['lunch', 'dinner']);

  const [showSocial, setShowSocial] = useState(false);
  const [moveSource, setMoveSource] = useState<{ date: string, type: MealCategory, recipeId: string } | null>(null);
  
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const days = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i)), [currentWeekStart]);

  const openPlanWizard = () => {
      const today = new Date();
      const remainingDays = days.filter(d => !isBefore(d, today) || isSameDay(d, today))
                               .map(d => format(d, 'yyyy-MM-dd'));
      setWizardDays(remainingDays.length > 0 ? remainingDays : days.map(d => format(d, 'yyyy-MM-dd')));
      setShowPlanWizard(true);
  };

  const executeAIPlan = async () => {
    if(wizardDays.length === 0 || wizardTypes.length === 0) {
        alert("Selecciona al menos un día y un tipo de comida.");
        return;
    }
    setIsGenerating(true);
    setShowPlanWizard(false); 
    try {
        const result = await generateWeeklyPlanAI(user, pantry, plan, wizardDays, wizardTypes, recipes);
        if (result.plan && result.plan.length > 0) {
            const newPlan = [...plan.filter(p => !result.plan.some(np => np.date === p.date && np.type === p.type)), ...result.plan];
            onAIPlanGenerated(newPlan, result.newRecipes);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setIsGenerating(false);
    }
  };

  const getSlot = (date: Date, type: MealCategory) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return plan.find(p => p.date === dateStr && p.type === type);
  };

  const isWeekEmpty = useMemo(() => {
      return !days.some(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          return plan.some(p => p.date === dateStr);
      });
  }, [days, plan]);

  const getRecipe = (id?: string) => recipes.find(r => r.id === id);

  const handleSlotClick = (date: string, type: MealCategory, existingRecipeId?: string, isZombie?: boolean) => {
      if (moveSource) {
          if (moveSource.date === date && moveSource.type === type) {
              setMoveSource(null);
              return;
          }
          onUpdateSlot(moveSource.date, moveSource.type, undefined);
          if (existingRecipeId && !isZombie) {
              onUpdateSlot(moveSource.date, moveSource.type, existingRecipeId);
          }
          onUpdateSlot(date, type, moveSource.recipeId);
          setMoveSource(null);
          return;
      }
      if (existingRecipeId === SLOT_LEFTOVERS || existingRecipeId === SLOT_EAT_OUT) {
          const label = existingRecipeId === SLOT_LEFTOVERS ? 'Sobras / Tupper' : 'Comer Fuera';
          if(confirm(`¿Quitar "${label}" de este hueco?`)) onUpdateSlot(date, type, undefined);
          return;
      }
      if (isZombie) {
          if(confirm("Esta receta ya no existe. ¿Eliminar del plan?")) onUpdateSlot(date, type, undefined);
          return;
      }
      if (existingRecipeId) {
          const r = getRecipe(existingRecipeId);
          if (r) setSelectedRecipe(r);
      } else {
          setShowPicker({ date, type });
      }
  };

  const getRecipeAvailability = (recipe: Recipe) => {
      const normalize = (s: string) => s.toLowerCase().trim().replace(/s$/, '').replace(/es$/, '');
      const totalIngredients = recipe.ingredients.length;
      let availableCount = 0;
      recipe.ingredients.forEach(ing => {
          const normIng = normalize(ing.name);
          const inPantry = pantry.find(p => {
              const normP = normalize(p.name);
              return normP === normIng || normP.includes(normIng) || normIng.includes(normP);
          });
          if (inPantry && inPantry.quantity > 0) availableCount++;
      });
      return { available: availableCount, total: totalIngredients, percentage: totalIngredients > 0 ? availableCount / totalIngredients : 0 };
  };

  return (
    <div className="animate-fade-in pb-48">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6 md:mb-4 px-4 md:px-0">
        <div>
          <h1 className="text-5xl md:text-xl font-black text-teal-900 tracking-tight leading-none mb-2 md:mb-0">Mi Menú</h1>
          <div className="flex items-center gap-4 mt-2 md:mt-1">
              <button onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} className="p-1 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-all"><ChevronLeft className="w-4 h-4 text-gray-500" /></button>
              <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest min-w-[120px] text-center">
                  Semana {format(currentWeekStart, 'd MMM', { locale: es })}
              </p>
              <button onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} className="p-1 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-all"><ChevronRight className="w-4 h-4 text-gray-500" /></button>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           {moveSource && (
               <div className="flex-1 bg-orange-500 text-white px-6 py-5 md:py-1.5 md:px-3 rounded-[2rem] md:rounded-lg flex items-center justify-center gap-3 font-black text-xs md:text-[9px] uppercase tracking-widest shadow-2xl animate-pulse">
                   <Move className="w-5 h-5 md:w-3 md:h-3" /> Destino
               </div>
           )}
           {!moveSource && (
               <>
                <button 
                    onClick={() => setShowSocial(true)}
                    className="flex-1 md:flex-none bg-white text-teal-900 px-6 py-5 md:py-1.5 md:px-3 rounded-[2rem] md:rounded-lg flex items-center justify-center gap-3 md:gap-2 font-black text-xs md:text-[9px] uppercase tracking-widest border border-gray-100 shadow-sm active:scale-95 transition-all hover:bg-teal-50"
                >
                    <Users2 className="w-5 h-5 md:w-3 md:h-3" /> Social
                </button>
                <button 
                    onClick={openPlanWizard} 
                    disabled={isGenerating} 
                    className="flex-[2] md:flex-none bg-teal-900 text-white px-8 py-5 md:py-1.5 md:px-3 rounded-[2rem] md:rounded-lg flex items-center justify-center gap-3 md:gap-2 font-black text-xs md:text-[9px] uppercase tracking-widest shadow-2xl active:scale-95 disabled:opacity-50 transition-all hover:bg-teal-800 disabled:bg-gray-400"
                >
                    {isGenerating ? <Loader2 className="w-5 h-5 md:w-3 md:h-3 animate-spin" /> : isOnline ? <Sparkles className="w-5 h-5 md:w-3 md:h-3 text-orange-400" /> : <WifiOff className="w-5 h-5" />}
                    {isOnline ? 'Asistente Mágico' : 'Plan Local'}
                </button>
               </>
           )}
        </div>
      </header>

      {/* Modal Wizard de Planificación */}
      {showPlanWizard && (
          <div className="fixed inset-0 z-[5000] bg-teal-900/95 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-white w-full max-w-lg rounded-[3.5rem] md:rounded-2xl p-10 md:p-6 shadow-2xl relative">
                  <button onClick={() => setShowPlanWizard(false)} className="absolute top-8 right-8 md:top-4 md:right-4 p-2 bg-gray-50 rounded-full hover:bg-gray-100"><X className="w-5 h-5" /></button>
                  <div className="mb-8 md:mb-4">
                      <h3 className="text-3xl md:text-xl font-black text-teal-900 mb-2">Diseña tu Semana</h3>
                      <p className="text-gray-500 text-sm">La IA rellenará los huecos seleccionados.</p>
                  </div>
                  
                  <div className="space-y-6 mb-8">
                      <div>
                          <p className="font-black text-xs uppercase tracking-widest text-teal-600 mb-2">Días</p>
                          <div className="flex flex-wrap gap-2">
                              {days.map(d => {
                                  const dStr = format(d, 'yyyy-MM-dd');
                                  const isSelected = wizardDays.includes(dStr);
                                  return (
                                      <button key={dStr} onClick={() => {
                                          setWizardDays(prev => prev.includes(dStr) ? prev.filter(x => x !== dStr) : [...prev, dStr]);
                                      }} className={`px-4 py-2 rounded-lg text-xs font-bold border ${isSelected ? 'bg-teal-900 text-white border-teal-900' : 'bg-white text-gray-400 border-gray-200'}`}>
                                          {format(d, 'EEE', {locale: es})}
                                      </button>
                                  );
                              })}
                          </div>
                      </div>
                      <div>
                          <p className="font-black text-xs uppercase tracking-widest text-teal-600 mb-2">Comidas</p>
                          <div className="flex gap-2">
                              {['lunch', 'dinner'].map(t => (
                                  <button key={t} onClick={() => {
                                      setWizardTypes(prev => prev.includes(t as any) ? prev.filter(x => x !== t) : [...prev, t as any]);
                                  }} className={`flex-1 py-3 rounded-lg text-xs font-bold border uppercase tracking-widest ${wizardTypes.includes(t as any) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-400 border-gray-200'}`}>
                                      {t === 'lunch' ? 'Comidas' : 'Cenas'}
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>

                  <button onClick={executeAIPlan} className="w-full py-6 md:py-3 bg-teal-900 text-white rounded-[2rem] md:rounded-xl font-black text-sm uppercase tracking-widest shadow-2xl">
                      Generar Menú
                  </button>
              </div>
          </div>
      )}

      {/* Grid del Planner */}
      <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-8 md:gap-2 pb-12 -mx-4 px-8 md:px-0 scroll-smooth">
        {days.map((day) => {
          const isToday = isSameDay(day, new Date());
          const dateStr = format(day, 'yyyy-MM-dd');
          
          return (
          <div key={day.toString()} className="snap-center min-w-[320px] md:min-w-[90px] flex flex-col gap-6 md:gap-2">
            <div className={`p-8 md:p-2 rounded-[3rem] md:rounded-lg text-center transition-all border-2 ${isToday ? 'bg-teal-900 text-white border-teal-900 shadow-2xl md:shadow-md scale-105' : 'bg-white text-gray-900 shadow-sm border-gray-100'}`}>
              <div className="text-[10px] md:text-[8px] font-black uppercase tracking-[0.3em] opacity-50 mb-1">{format(day, 'EEEE', { locale: es }).substring(0,3)}</div>
              <div className="text-3xl md:text-sm font-black tracking-tighter">{format(day, 'd', { locale: es })}</div>
            </div>
            {(['breakfast', 'lunch', 'dinner'] as MealCategory[]).map((type) => {
                const slot = getSlot(day, type);
                let recipe = null;
                let isZombie = false;
                let isSpecial = false;
                let specialType = '';
                let missingIngredientsAlert = false;

                if (slot?.recipeId) {
                    if (slot.recipeId === SLOT_LEFTOVERS) { isSpecial = true; specialType = 'leftovers'; }
                    else if (slot.recipeId === SLOT_EAT_OUT) { isSpecial = true; specialType = 'eatout'; }
                    else {
                        recipe = getRecipe(slot.recipeId);
                        if (!recipe) isZombie = true;
                        else {
                            const availability = getRecipeAvailability(recipe);
                            if (availability.percentage < 1) missingIngredientsAlert = true;
                        }
                    }
                }

                const isCooked = slot?.isCooked;
                const isMovingSource = moveSource?.date === dateStr && moveSource?.type === type;
                const isMovingTarget = moveSource && !isMovingSource;

                return (
                    <div 
                        key={type} 
                        onClick={() => handleSlotClick(dateStr, type, slot?.recipeId, isZombie)}
                        className={`relative p-8 md:p-2 rounded-[3.5rem] md:rounded-lg border-2 h-64 md:h-20 flex flex-col justify-between transition-all active:scale-[0.98] cursor-pointer group shadow-sm overflow-hidden ${
                            isMovingSource ? 'bg-orange-50 border-orange-500 scale-95 opacity-50 ring-4 ring-orange-200' :
                            isMovingTarget ? 'bg-orange-50 border-dashed border-orange-300 hover:bg-orange-100 hover:scale-105' :
                            isZombie ? 'bg-red-50 border-red-200' :
                            isSpecial ? 'bg-gray-50 border-gray-200' :
                            recipe ? (isCooked ? 'bg-green-50/50 border-green-200' : 'bg-white border-transparent hover:border-teal-500 hover:shadow-md') : 'bg-gray-50/50 border-dashed border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                        {isCooked && !isSpecial && (
                            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
                                <div className="bg-green-500 text-white px-2 py-1 rounded-lg font-black text-[8px] uppercase tracking-widest shadow-xl flex items-center gap-1 transform rotate-[-5deg] border border-white">
                                    <CheckCircle2 className="w-3 h-3 md:w-2 md:h-2" />
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-400 tracking-widest relative z-0 md:hidden">
                            <span>{type === 'breakfast' ? '🍳' : type === 'lunch' ? '🥘' : '🌙'}</span>
                        </div>
                        
                        {isSpecial ? (
                            <div className="flex-1 flex flex-col justify-center items-center gap-1 opacity-60">
                                {specialType === 'leftovers' ? <Repeat className="w-10 h-10 md:w-4 md:h-4 text-teal-600" /> : <Utensils className="w-10 h-10 md:w-4 md:h-4 text-orange-500" />}
                                <span className="font-black text-sm md:text-[8px] uppercase tracking-widest text-gray-600 text-center leading-tight hidden md:block">
                                    {specialType === 'leftovers' ? 'Sobras' : 'Fuera'}
                                </span>
                            </div>
                        ) : isZombie ? (
                            <div className="flex-1 flex flex-col justify-center items-center gap-2 text-red-400 animate-pulse">
                                <AlertOctagon className="w-8 h-8 md:w-4 md:h-4" />
                            </div>
                        ) : recipe ? (
                            <div className="flex-1 flex flex-col justify-center gap-1 relative z-0 h-full">
                                {missingIngredientsAlert && !isCooked && (
                                    <div className="absolute top-0 right-0 text-red-500 bg-red-50 rounded-full p-0.5 animate-pulse z-20">
                                        <AlertTriangle className="w-3 h-3 md:w-2 md:h-2" />
                                    </div>
                                )}
                                <div className={`font-black text-gray-900 text-xl md:text-[9px] line-clamp-3 leading-tight transition-colors ${!isCooked && 'group-hover:text-teal-700'}`}>{recipe.title}</div>
                                <div className="flex items-center justify-between mt-auto md:hidden">
                                    <img src={recipe.image_url} className="w-16 h-16 rounded-[1.5rem] object-cover shadow-lg border-2 border-white" />
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-teal-600/20 gap-3 relative z-0 h-full">
                                {isMovingTarget ? (
                                    <Move className="w-12 h-12 stroke-[3px] animate-bounce text-orange-400" />
                                ) : (
                                    <Plus className="w-12 h-12 md:w-4 md:h-4 stroke-[3px] group-hover:scale-110 group-hover:text-teal-600/40 transition-all" />
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
          </div>
        )})}
      </div>

      {showPicker && (
          <div className="fixed inset-0 z-[5000] bg-teal-900/95 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowPicker(null)}>
              <div className="bg-white w-full max-w-lg rounded-[3rem] md:rounded-2xl p-8 md:p-4 shadow-2xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                  <h3 className="text-2xl font-black text-teal-900 mb-6">Elige una receta</h3>
                  <div className="flex-1 overflow-y-auto space-y-4">
                      {recipes.map(r => (
                          <div key={r.id} onClick={() => { onUpdateSlot(showPicker.date, showPicker.type, r.id); setShowPicker(null); }} className="flex gap-4 p-3 rounded-2xl hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200">
                              <img src={r.image_url} className="w-16 h-16 rounded-xl object-cover bg-gray-200" />
                              <div>
                                  <p className="font-bold text-gray-900">{r.title}</p>
                                  <p className="text-xs text-gray-500">{r.prep_time} min</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {selectedRecipe && (
        <RecipeDetail 
            recipe={selectedRecipe} 
            pantry={pantry}
            onClose={() => setSelectedRecipe(null)} 
            onCookFinish={(used) => onCookFinish && onCookFinish(used, selectedRecipe.id)}
            onAddToShoppingList={onAddToShoppingList}
        />
      )}
    </div>
  );
};
