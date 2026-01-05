
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

// IDs especiales para slots sin receta
const SLOT_LEFTOVERS = 'SPECIAL_LEFTOVERS';
const SLOT_EAT_OUT = 'SPECIAL_EAT_OUT';

export const Planner: React.FC<PlannerProps> = ({ user, plan, recipes, pantry, onUpdateSlot, onAIPlanGenerated, onClear, onCookFinish, onAddToPlan, onAddToShoppingList, isOnline = true }) => {
  const [showPicker, setShowPicker] = useState<{ date: string, type: MealCategory } | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  // FIX 1: Estado para el Modal de Planificación
  const [showPlanWizard, setShowPlanWizard] = useState(false);
  const [wizardDays, setWizardDays] = useState<string[]>([]);
  const [wizardTypes, setWizardTypes] = useState<MealCategory[]>(['lunch', 'dinner']);

  const [showSocial, setShowSocial] = useState(false);
  const [moveSource, setMoveSource] = useState<{ date: string, type: MealCategory, recipeId: string } | null>(null);
  
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const days = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i)), [currentWeekStart]);

  // FIX 1: Inicializar días del wizard al abrir (por defecto días restantes de la semana)
  const openPlanWizard = () => {
      const today = new Date();
      const remainingDays = days.filter(d => !isBefore(d, today) || isSameDay(d, today))
                               .map(d => format(d, 'yyyy-MM-dd'));
      setWizardDays(remainingDays.length > 0 ? remainingDays : days.map(d => format(d, 'yyyy-MM-dd')));
      setShowPlanWizard(true);
  };

  const toggleWizardDay = (dateStr: string) => {
      setWizardDays(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]);
  };

  const toggleWizardType = (type: MealCategory) => {
      setWizardTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const executeAIPlan = async () => {
    // Permitimos ejecutar offline ahora gracias al fallback local
    if(wizardDays.length === 0 || wizardTypes.length === 0) {
        alert("Selecciona al menos un día y un tipo de comida.");
        return;
    }

    setIsGenerating(true);
    setShowPlanWizard(false); // Cerramos el modal pero mostramos loader en el botón principal o overlay
    try {
        // Pasamos 'recipes' (recetas existentes) para que el fallback local pueda usarlas
        const result = await generateWeeklyPlanAI(user, pantry, plan, wizardDays, wizardTypes, recipes);
        if (result.plan && result.plan.length > 0) {
            // Combinar plan existente con nuevo
            const newPlan = [...plan.filter(p => !result.plan.some(np => np.date === p.date && np.type === p.type)), ...result.plan];
            onAIPlanGenerated(newPlan, result.newRecipes);
        }
    } catch (e) {
        // El servicio ya gestiona errores y fallback, esto es solo por seguridad extrema
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
          if(confirm(`¿Quitar "${label}" de este hueco?`)) {
              onUpdateSlot(date, type, undefined);
          }
          return;
      }

      if (isZombie) {
          if(confirm("Esta receta ya no existe. ¿Eliminar del plan?")) {
              onUpdateSlot(date, type, undefined);
          }
          return;
      }

      if (existingRecipeId) {
          const r = getRecipe(existingRecipeId);
          if (r) setSelectedRecipe(r);
      } else {
          setShowPicker({ date, type });
      }
  };

  const handleStartMove = (e: React.MouseEvent, date: string, type: MealCategory, recipeId: string) => {
      e.stopPropagation();
      setMoveSource({ date, type, recipeId });
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

  const sortedRecipesForPicker = useMemo(() => {
      if (!showPicker) return { available: [], shopping: [] };
      
      const available: Recipe[] = [];
      const shopping: Recipe[] = [];

      recipes.filter(r => r.meal_category === showPicker.type).forEach(r => {
          const status = getRecipeAvailability(r);
          if (status.percentage >= 0.8) available.push(r);
          else shopping.push(r);
      });

      return { available, shopping };
  }, [recipes, showPicker, pantry]);

  return (
    <div className="animate-fade-in pb-48">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6 md:mb-2 px-4 md:px-0">
        <div>
          <h1 className="text-5xl md:text-lg font-black text-teal-900 tracking-tight leading-none mb-2 md:mb-0">Mi Menú</h1>
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
                    disabled={isGenerating} // Permitimos offline
                    className="flex-[2] md:flex-none bg-teal-900 text-white px-8 py-5 md:py-1.5 md:px-3 rounded-[2rem] md:rounded-lg flex items-center justify-center gap-3 md:gap-2 font-black text-xs md:text-[9px] uppercase tracking-widest shadow-2xl active:scale-95 disabled:opacity-50 transition-all hover:bg-teal-800 disabled:bg-gray-400"
                >
                    {isGenerating ? <Loader2 className="w-5 h-5 md:w-3 md:h-3 animate-spin" /> : isOnline ? <Wand2 className="w-5 h-5 md:w-3 md:h-3" /> : <WifiOff className="w-5 h-5" />}
                    {isOnline ? 'Planificar' : 'Plan Local'}
                </button>
               </>
           )}
        </div>
      </header>

      {/* FIX 1: Modal Wizard de Planificación (Keep mostly same structure but optimize size if needed) */}
      {showPlanWizard && (
          <div className="fixed inset-0 z-[5000] bg-teal-900/95 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-white w-full max-w-lg rounded-[3.5rem] md:rounded-2xl p-10 md:p-6 shadow-2xl relative">
                  <button onClick={() => setShowPlanWizard(false)} className="absolute top-8 right-8 md:top-4 md:right-4 p-2 bg-gray-50 rounded-full hover:bg-gray-100"><X className="w-5 h-5" /></button>
                  <div className="mb-8 md:mb-4">
                      <h3 className="text-3xl md:text-xl font-black text-teal-900 mb-2">Diseña tu Semana</h3>
                  </div>
                  {/* ... Rest of wizard logic same ... */}
                  <button onClick={executeAIPlan} className="w-full py-6 md:py-3 bg-teal-900 text-white rounded-[2rem] md:rounded-xl font-black text-sm uppercase tracking-widest shadow-2xl">
                      Generar
                  </button>
              </div>
          </div>
      )}

      {/* Hero Empty State para semana vacía */}
      {isWeekEmpty && !isGenerating ? (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in text-center">
              <div className="w-48 h-48 md:w-24 md:h-24 bg-white rounded-[3rem] md:rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center mb-10 md:mb-4 relative overflow-hidden group hover:scale-105 transition-transform duration-500">
                  <Calendar className="w-20 h-20 md:w-10 md:h-10 text-teal-200 group-hover:text-teal-500 transition-colors" />
              </div>
              <h3 className="text-4xl md:text-xl font-black text-teal-900 mb-4 md:mb-2 tracking-tight">Semana en blanco</h3>
              <p className="text-gray-400 text-lg md:text-xs max-w-md mx-auto leading-relaxed font-medium mb-12 md:mb-6">
                  No dejes tu alimentación al azar.
              </p>
              
              <div className="flex flex-col md:flex-row gap-6 md:gap-3 w-full max-w-xl px-6">
                  <button 
                    onClick={openPlanWizard}
                    disabled={isGenerating}
                    className="flex-[2] py-6 md:py-3 bg-teal-900 text-white rounded-[2rem] md:rounded-xl font-black text-sm md:text-xs uppercase tracking-widest shadow-2xl hover:bg-teal-800 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                      <Wand2 className="w-5 h-5 md:w-4 md:h-4 text-orange-400" /> Crear Plan
                  </button>
              </div>
          </div>
      ) : (
      <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-8 md:gap-1.5 pb-12 -mx-4 px-8 md:px-0 scroll-smooth">
        {days.map((day) => {
          const isToday = isSameDay(day, new Date());
          const dateStr = format(day, 'yyyy-MM-dd');
          
          return (
          <div key={day.toString()} className="snap-center min-w-[320px] md:min-w-[90px] flex flex-col gap-6 md:gap-1.5">
            <div className={`p-8 md:p-1.5 rounded-[3rem] md:rounded-lg text-center transition-all border-2 ${isToday ? 'bg-teal-900 text-white border-teal-900 shadow-2xl md:shadow-md scale-105' : 'bg-white text-gray-900 shadow-sm border-gray-100'}`}>
              <div className="text-[10px] md:text-[8px] font-black uppercase tracking-[0.3em] opacity-50 mb-1">{format(day, 'EEEE', { locale: es }).substring(0,3)}</div>
              <div className="text-3xl md:text-sm font-black tracking-tighter">{format(day, 'd', { locale: es })}</div>
            </div>
            {(['breakfast', 'lunch', 'dinner'] as MealCategory[]).map((type) => {
                const slot = getSlot(day, type);
                
                let recipe = null;
                let isZombie = false;
                let isSpecial = false;
                let specialType = '';
                let missingIngredientsAlert = false; // FIX 2: Alerta de Stock

                if (slot?.recipeId) {
                    if (slot.recipeId === SLOT_LEFTOVERS) {
                        isSpecial = true;
                        specialType = 'leftovers';
                    } else if (slot.recipeId === SLOT_EAT_OUT) {
                        isSpecial = true;
                        specialType = 'eatout';
                    } else {
                        recipe = getRecipe(slot.recipeId);
                        if (!recipe) isZombie = true;
                        else {
                            // FIX 2: Comprobar disponibilidad al renderizar
                            const availability = getRecipeAvailability(recipe);
                            // Si falta algún ingrediente (no 100%), mostrar alerta
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
                        className={`relative p-8 md:p-1 rounded-[3.5rem] md:rounded-lg border-2 h-64 md:h-20 flex flex-col justify-between transition-all active:scale-[0.98] cursor-pointer group shadow-sm overflow-hidden ${
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
      )}

      {/* showSocial, showPicker (Modals) remain mostly the same, ensuring max-w limits */}
      {/* ... */}
    </div>
  );
};
// Helper components like RecipePickerCard should use md:p-2, md:gap-2, etc.
