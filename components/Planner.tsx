
import React, { useState, useMemo } from 'react';
import { MealSlot, Recipe, MealCategory, PantryItem, UserProfile, ShoppingItem } from '../types';
import { Plus, Trash2, Calendar, Wand2, X, Eye, Trash, ChefHat, Check, AlertCircle, Sparkles, Loader2, ArrowLeft, ArrowRight, PackageCheck, Clock, Users, Share2, Users2, CheckCircle2, WifiOff, ShoppingCart, ChevronLeft, ChevronRight, Move, AlertOctagon, Utensils, Repeat, AlertTriangle, CheckSquare, Square, Copy, Smartphone, BrainCircuit } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, addWeeks, subWeeks, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { generateSmartMenu } from '../services/geminiService';
import { RecipeDetail } from './RecipeDetail';
import { cleanName } from '../services/unitService';

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

  const executeSmartPlan = async () => {
    if(wizardDays.length === 0 || wizardTypes.length === 0) {
        alert("Selecciona al menos un día y un tipo de comida.");
        return;
    }
    setIsGenerating(true);
    setShowPlanWizard(false); 
    try {
        const result = await generateSmartMenu(user, pantry, wizardDays, wizardTypes, recipes);
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
      // If zombie, treating it as empty slot click effectively, or we can prompt to clear.
      // But user said "no more zombie errors", so we just treat it as a re-pick.
      if (isZombie) {
          setShowPicker({ date, type });
          return;
      }
      if (existingRecipeId) {
          const r = getRecipe(existingRecipeId);
          if (r) setSelectedRecipe(r);
      } else {
          setShowPicker({ date, type });
      }
  };

  // Helper para calcular estado de inventario para una receta
  const getIngredientStatus = (recipe: Recipe) => {
      let missingCount = 0;
      recipe.ingredients.forEach(ing => {
          const ingName = cleanName(ing.name);
          // Buscar coincidencia laxa en despensa
          const inPantry = pantry.find(p => {
              const pName = cleanName(p.name);
              return pName === ingName || pName.includes(ingName) || ingName.includes(pName);
          });
          
          // Si no está, o la cantidad es muy baja (heurística simple: < 10% de lo requerido si las unidades coinciden, o 0)
          // Para simplificar UI "faltan", asumimos que si no hay nada o cantidad es 0, falta.
          // Una lógica más compleja de unidades requeriría normalización, aquí hacemos check básico de existencia.
          if (!inPantry || inPantry.quantity <= 0.1) {
              missingCount++;
          }
      });
      return missingCount;
  };

  const copyToClipboard = () => {
      const text = `Plan de Comidas de ${user.name}:\n` + days.map(d => {
          const dStr = format(d, 'yyyy-MM-dd');
          const lunch = getRecipe(getSlot(d, 'lunch')?.recipeId)?.title || 'Libre';
          const dinner = getRecipe(getSlot(d, 'dinner')?.recipeId)?.title || 'Libre';
          return `${format(d, 'EEEE', {locale: es})}: 🥘 ${lunch} | 🌙 ${dinner}`;
      }).join('\n');
      navigator.clipboard.writeText(text);
      alert("Menú copiado al portapapeles");
      setShowSocial(false);
  };

  return (
    <div className="animate-fade-in pb-48 w-full max-w-full">
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
                    {isGenerating ? <Loader2 className="w-5 h-5 md:w-3 md:h-3 animate-spin" /> : <BrainCircuit className="w-5 h-5 md:w-3 md:h-3 text-orange-400" />}
                    Asistente Mágico
                </button>
               </>
           )}
        </div>
      </header>

      {/* Social Modal */}
      {showSocial && (
          <div className="fixed inset-0 z-[5000] bg-teal-900/95 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowSocial(false)}>
              <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 text-center shadow-2xl" onClick={e => e.stopPropagation()}>
                  <h3 className="text-2xl font-black text-teal-900 mb-2">Compartir Menú</h3>
                  <p className="text-gray-500 text-sm mb-8">Envía tu planificación a familiares o amigos.</p>
                  <button onClick={copyToClipboard} className="w-full py-4 bg-teal-50 text-teal-900 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-teal-100 transition-all">
                      <Copy className="w-4 h-4" /> Copiar Texto
                  </button>
              </div>
          </div>
      )}

      {/* Modal Wizard de Planificación */}
      {showPlanWizard && (
          <div className="fixed inset-0 z-[5000] bg-teal-900/95 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-white w-full max-w-lg rounded-[3.5rem] md:rounded-2xl p-10 md:p-6 shadow-2xl relative">
                  <button onClick={() => setShowPlanWizard(false)} className="absolute top-8 right-8 md:top-4 md:right-4 p-2 bg-gray-50 rounded-full hover:bg-gray-100"><X className="w-5 h-5" /></button>
                  <div className="mb-8 md:mb-4">
                      <h3 className="text-3xl md:text-xl font-black text-teal-900 mb-2">Diseña tu Semana</h3>
                      <p className="text-gray-500 text-sm">Rellenaremos los huecos con tus recetas.</p>
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
                              {['breakfast', 'lunch', 'dinner'].map(t => (
                                  <button key={t} onClick={() => {
                                      setWizardTypes(prev => prev.includes(t as any) ? prev.filter(x => x !== t) : [...prev, t as any]);
                                  }} className={`flex-1 py-3 rounded-lg text-xs font-bold border uppercase tracking-widest ${wizardTypes.includes(t as any) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-400 border-gray-200'}`}>
                                      {t === 'breakfast' ? 'Desayuno' : t === 'lunch' ? 'Comida' : 'Cena'}
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>

                  <button onClick={executeSmartPlan} className="w-full py-6 md:py-3 bg-teal-900 text-white rounded-[2rem] md:rounded-xl font-black text-sm uppercase tracking-widest shadow-2xl">
                      Generar Automáticamente
                  </button>
              </div>
          </div>
      )}

      {/* Grid del Planner */}
      <div className="flex flex-col md:grid md:grid-cols-7 gap-8 md:gap-4 pb-12 w-full">
        {days.map((day) => {
          const isToday = isSameDay(day, new Date());
          const dateStr = format(day, 'yyyy-MM-dd');
          
          return (
          <div key={day.toString()} className="flex flex-col gap-6 md:gap-3 md:h-full w-full">
            {/* Header del Día */}
            <div className={`p-8 md:p-4 rounded-[3rem] md:rounded-xl text-center transition-all border-2 ${isToday ? 'bg-teal-900 text-white border-teal-900 shadow-2xl md:shadow-md' : 'bg-white text-gray-900 shadow-sm border-gray-100'}`}>
              <div className="text-[10px] md:text-[9px] font-black uppercase tracking-[0.3em] opacity-50 mb-1">{format(day, 'EEEE', { locale: es }).substring(0,3)}</div>
              <div className="text-3xl md:text-xl font-black tracking-tighter">{format(day, 'd', { locale: es })}</div>
            </div>
            
            <div className="flex flex-col gap-4 md:gap-3 md:flex-1">
                {(['breakfast', 'lunch', 'dinner'] as MealCategory[]).map((type) => {
                    const slot = getSlot(day, type);
                    let recipe = null;
                    let isZombie = false;
                    let isSpecial = false;
                    let specialType = '';
                    let missingCount = 0;

                    if (slot?.recipeId) {
                        if (slot.recipeId === SLOT_LEFTOVERS) { isSpecial = true; specialType = 'leftovers'; }
                        else if (slot.recipeId === SLOT_EAT_OUT) { isSpecial = true; specialType = 'eatout'; }
                        else {
                            recipe = getRecipe(slot.recipeId);
                            if (!recipe) {
                                isZombie = true; 
                                // Silent fallback: Don't show scary error, just treat as empty-ish slot
                            } else {
                                missingCount = getIngredientStatus(recipe);
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
                            // Increased Height: h-64 for desktop (md:h-64) to allow vertical breathing room
                            className={`relative p-6 md:p-4 rounded-[3rem] md:rounded-xl border-2 h-auto md:h-48 md:min-h-[180px] flex flex-col justify-between transition-all active:scale-[0.98] cursor-pointer group shadow-sm overflow-hidden ${
                                isMovingSource ? 'bg-orange-50 border-orange-500 scale-95 opacity-50 ring-4 ring-orange-200' :
                                isMovingTarget ? 'bg-orange-50 border-dashed border-orange-300 hover:bg-orange-100 hover:scale-105' :
                                isZombie ? 'bg-white border-dashed border-gray-200' : // Subtle Zombie
                                isSpecial ? 'bg-gray-50 border-gray-200' :
                                recipe ? (isCooked ? 'bg-green-50/50 border-green-200' : 'bg-white border-transparent hover:border-teal-200 hover:shadow-lg') : 'bg-gray-50/30 border-dashed border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {/* Icono de tipo de comida pequeño */}
                            <div className="absolute top-4 right-4 md:top-3 md:right-3 opacity-20">
                                {type === 'breakfast' ? '🍳' : type === 'lunch' ? '🥘' : '🌙'}
                            </div>

                            {/* Contenido Principal */}
                            {isSpecial ? (
                                <div className="flex flex-col justify-center items-center gap-2 h-full opacity-60">
                                    {specialType === 'leftovers' ? <Repeat className="w-8 h-8 text-teal-600" /> : <Utensils className="w-8 h-8 text-orange-500" />}
                                    <span className="font-black text-xs uppercase tracking-widest text-gray-600 text-center leading-tight">
                                        {specialType === 'leftovers' ? 'Sobras' : 'Comer Fuera'}
                                    </span>
                                </div>
                            ) : recipe ? (
                                <>
                                    <div className="flex flex-col gap-2 relative z-10 pt-2">
                                        <div className={`font-black text-gray-900 text-xl md:text-sm line-clamp-3 leading-tight ${isCooked && 'opacity-50 line-through'}`}>
                                            {recipe.title}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md uppercase tracking-wider md:text-[8px]">
                                                {recipe.cuisine_type}
                                            </span>
                                        </div>
                                    </div>

                                    {/* FOOTER: Semáforo de ingredientes */}
                                    <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                                        {isCooked ? (
                                            <span className="text-[10px] font-black uppercase tracking-widest text-green-600 flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> Hecho
                                            </span>
                                        ) : missingCount === 0 ? (
                                            <span className="text-[10px] font-black uppercase tracking-widest text-green-600 flex items-center gap-1 bg-green-50 px-2 py-1 rounded-full">
                                                <PackageCheck className="w-3 h-3" /> Tienes todo
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-full">
                                                <ShoppingCart className="w-3 h-3" /> Faltan {missingCount}
                                            </span>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-teal-600/20 gap-3 h-full">
                                    {isMovingTarget ? (
                                        <Move className="w-8 h-8 stroke-[3px] animate-bounce text-orange-400" />
                                    ) : (
                                        <Plus className="w-8 h-8 md:w-5 md:h-5 stroke-[3px] group-hover:scale-110 group-hover:text-teal-600/40 transition-all" />
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
          </div>
        )})}
      </div>

      {showPicker && (
          <div className="fixed inset-0 z-[5000] bg-teal-900/95 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowPicker(null)}>
              <div className="bg-white w-full max-w-lg rounded-[3rem] md:rounded-2xl p-8 md:p-4 shadow-2xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-black text-teal-900">Elige una receta</h3>
                      <button onClick={() => setShowPicker(null)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-400"/></button>
                  </div>
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
