
import React, { useState, useMemo } from 'react';
import { MealSlot, Recipe, MealCategory, PantryItem, UserProfile, ShoppingItem } from '../types';
import { Plus, X, Loader2, PackageCheck, ShoppingCart, ChevronLeft, ChevronRight, Utensils, BrainCircuit, Users2, ChefHat, CalendarDays, Sparkles, Trash2, Sunrise, Sun, Moon } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, addWeeks, subWeeks } from 'date-fns';
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
  isOnline?: boolean;
}

const SLOT_LEFTOVERS = 'SPECIAL_LEFTOVERS';
const SLOT_EAT_OUT = 'SPECIAL_EAT_OUT';

// Componente para la Celda Individual para mejor rendimiento
const PlannerCell = React.memo(({ 
    type, 
    day, 
    slot, 
    recipe, 
    onClick,
    missingCount 
}: { 
    type: MealCategory, 
    day: Date, 
    slot?: MealSlot, 
    recipe?: Recipe, 
    onClick: () => void,
    missingCount: number
}) => {
    const isSpecial = slot?.recipeId === SLOT_LEFTOVERS || slot?.recipeId === SLOT_EAT_OUT;
    const isCooked = slot?.isCooked;

    return (
        <div 
            onClick={onClick}
            className={`flex-1 relative rounded-2xl border transition-all cursor-pointer overflow-hidden flex flex-col group/cell ${
                isSpecial ? 'bg-gray-50 border-gray-100' :
                recipe ? (isCooked ? 'bg-green-50/30 border-green-200' : 'bg-white border-gray-100 hover:border-teal-300 hover:shadow-lg') :
                'bg-gray-50/50 border-dashed border-gray-200 hover:bg-white hover:border-teal-200'
            }`}
        >
            {recipe ? (
                <>
                    <div className="absolute inset-0 z-0">
                        <img src={recipe.image_url} className="w-full h-full object-cover opacity-10 grayscale hover:grayscale-0 transition-all duration-700" alt="" />
                        <div className={`absolute inset-0 ${isCooked ? 'bg-green-50/80' : 'bg-gradient-to-b from-white via-white/95 to-white/60'}`} />
                    </div>

                    <div className="relative z-10 p-3 h-full flex flex-col justify-between">
                        <h4 className={`font-bold text-xs text-teal-900 leading-tight line-clamp-2 md:line-clamp-3 ${isCooked ? 'line-through opacity-50' : ''}`}>
                            {recipe.title}
                        </h4>
                        
                        <div className="flex items-center justify-between mt-2">
                            {isCooked ? (
                                <span className="text-[8px] font-black uppercase text-green-600 bg-green-100 px-1.5 py-0.5 rounded">Hecho</span>
                            ) : (
                                <div className="flex gap-1">
                                    {missingCount > 0 ? (
                                        <span className="flex items-center gap-1 text-[8px] font-black text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">
                                            <ShoppingCart className="w-2.5 h-2.5" /> {missingCount}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-[8px] font-black text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                            <PackageCheck className="w-2.5 h-2.5" /> Todo
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : isSpecial ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-1 opacity-40">
                    <Sunrise className="w-4 h-4 text-teal-600" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">
                        {slot?.recipeId === SLOT_LEFTOVERS ? 'Sobras' : 'Fuera'}
                    </span>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity">
                    <Plus className="w-5 h-5 text-teal-300" />
                </div>
            )}
        </div>
    );
});

export const Planner: React.FC<PlannerProps> = ({ user, plan, recipes, pantry, onUpdateSlot, onAIPlanGenerated, onClear, onCookFinish, onAddToShoppingList, isOnline = true }) => {
  const [showPicker, setShowPicker] = useState<{ date: string, type: MealCategory } | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPlanWizard, setShowPlanWizard] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const days = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i)), [currentWeekStart]);

  const executeSmartPlan = async () => {
    setIsGenerating(true);
    try {
        const allDays = days.map(d => format(d, 'yyyy-MM-dd'));
        const result = await generateSmartMenu(user, pantry, allDays, ['breakfast', 'lunch', 'dinner'], recipes);
        if (result.plan) onAIPlanGenerated(result.plan, result.newRecipes);
        setShowPlanWizard(false);
    } catch (e) {
        triggerDialog({ title: 'Error', message: 'No se pudo generar el menú. Revisa tu conexión.', type: 'alert' });
    } finally {
        setIsGenerating(false);
    }
  };

  const getSlot = (date: Date, type: MealCategory) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return plan.find(p => p.date === dateStr && p.type === type);
  };

  const getMissingCount = (recipe: Recipe) => {
      let missing = 0;
      recipe.ingredients.forEach(ing => {
          const ingName = cleanName(ing.name);
          const inPantry = pantry.find(p => cleanName(p.name).includes(ingName));
          if (!inPantry || inPantry.quantity <= 0.1) missing++;
      });
      return missing;
  };

  const handleSlotClick = (date: string, type: MealCategory, slot?: MealSlot) => {
      if (slot?.recipeId) {
          if (slot.recipeId === SLOT_LEFTOVERS || slot.recipeId === SLOT_EAT_OUT) {
              triggerDialog({
                  title: 'Quitar asignación',
                  message: '¿Quieres limpiar este hueco?',
                  type: 'confirm',
                  onConfirm: () => onUpdateSlot(date, type, undefined)
              });
              return;
          }
          const r = recipes.find(x => x.id === slot.recipeId);
          if (r) setSelectedRecipe(r);
      } else {
          setShowPicker({ date, type });
      }
  };

  // Filtrar recetas para el selector por categoría
  const filteredRecipesForPicker = useMemo(() => {
    if (!showPicker) return [];
    return recipes.filter(r => r.meal_category === showPicker.type);
  }, [recipes, showPicker]);

  return (
    <div className="h-[calc(100vh-80px)] w-full flex flex-col animate-fade-in overflow-hidden">
      <header className="flex-shrink-0 px-6 py-4 flex justify-between items-center bg-white/50 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl shadow-sm border border-gray-100">
                <button onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><ChevronLeft className="w-4 h-4" /></button>
                <div className="text-center w-32">
                    <span className="block text-[9px] font-black uppercase text-gray-400 tracking-widest">Semana del</span>
                    <span className="block text-sm font-black text-teal-900 leading-none">{format(currentWeekStart, 'd MMM', { locale: es })}</span>
                </div>
                <button onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><ChevronRight className="w-4 h-4" /></button>
            </div>
        </div>

        <div className="flex gap-2">
            <button onClick={() => triggerDialog({ 
                title: 'Borrar Semana', 
                message: '¿Estás seguro de que quieres limpiar toda la semana?', 
                type: 'confirm', 
                onConfirm: onClear 
            })} className="p-3 bg-white text-red-500 rounded-xl hover:bg-red-50 transition-all border border-gray-100 shadow-sm"><Trash2 className="w-4 h-4" /></button>
            <button onClick={executeSmartPlan} disabled={isGenerating} className="flex items-center gap-2 bg-teal-900 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-teal-800 transition-all shadow-lg active:scale-95">
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4 text-orange-400" />}
                <span className="hidden md:inline">Plan Mágico</span>
            </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 px-2 md:px-6 pb-20 md:pb-6 overflow-x-auto md:overflow-hidden flex gap-3">
        {/* Etiquetas Laterales (Desktop) */}
        <div className="hidden md:flex flex-col gap-2 pt-14 w-12 text-center">
            <div className="flex-1 flex flex-col items-center justify-center text-teal-600/30 font-black text-[10px] uppercase tracking-widest [writing-mode:vertical-lr] rotate-180">Desayuno</div>
            <div className="flex-1 flex flex-col items-center justify-center text-orange-600/30 font-black text-[10px] uppercase tracking-widest [writing-mode:vertical-lr] rotate-180">Comida</div>
            <div className="flex-1 flex flex-col items-center justify-center text-teal-600/30 font-black text-[10px] uppercase tracking-widest [writing-mode:vertical-lr] rotate-180">Cena</div>
        </div>

        {days.map((day) => {
          const isToday = isSameDay(day, new Date());
          const dateStr = format(day, 'yyyy-MM-dd');
          return (
            <div key={day.toString()} className="min-w-[80vw] md:min-w-0 flex-1 flex flex-col gap-2">
                <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${isToday ? 'bg-teal-900 text-white border-teal-900 shadow-md' : 'bg-white text-gray-500 border-gray-100'}`}>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">{format(day, 'EEE', { locale: es })}</span>
                        <span className="text-xl font-black leading-none">{format(day, 'd', { locale: es })}</span>
                    </div>
                    {!isToday && <div className="md:hidden flex gap-1"><Sunrise className="w-3 h-3"/><Sun className="w-3 h-3"/><Moon className="w-3 h-3"/></div>}
                </div>

                <div className="flex-1 flex flex-col gap-2 min-h-0">
                    {(['breakfast', 'lunch', 'dinner'] as MealCategory[]).map((type) => {
                        const slot = getSlot(day, type);
                        const recipe = recipes.find(r => r.id === slot?.recipeId);
                        return (
                            <PlannerCell 
                                key={type} 
                                type={type} 
                                day={day} 
                                slot={slot} 
                                recipe={recipe} 
                                missingCount={recipe ? getMissingCount(recipe) : 0}
                                onClick={() => handleSlotClick(dateStr, type, slot)} 
                            />
                        );
                    })}
                </div>
            </div>
          );
        })}
      </div>

      {showPicker && (
          <div className="fixed inset-0 z-[5000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowPicker(null)}>
              <div className="bg-white w-full max-w-2xl h-[80vh] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white z-10">
                      <div>
                          <h3 className="text-xl font-black text-teal-900 capitalize">Elegir {showPicker.type === 'breakfast' ? 'Desayuno' : showPicker.type === 'lunch' ? 'Comida' : 'Cena'}</h3>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Solo se muestran recetas de esta categoría</p>
                      </div>
                      <button onClick={() => setShowPicker(null)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-6 h-6 text-gray-400"/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 no-scrollbar">
                      <button onClick={() => { onUpdateSlot(showPicker.date, showPicker.type, SLOT_EAT_OUT); setShowPicker(null); }} className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 hover:border-orange-300 transition-all text-left">
                          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500"><Sun className="w-6 h-6" /></div>
                          <div><span className="font-bold text-gray-900 block">Comer Fuera</span><span className="text-xs text-gray-400">Sin stock gastado</span></div>
                      </button>
                      <button onClick={() => { onUpdateSlot(showPicker.date, showPicker.type, SLOT_LEFTOVERS); setShowPicker(null); }} className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 hover:border-teal-300 transition-all text-left">
                          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600"><Sunrise className="w-6 h-6" /></div>
                          <div><span className="font-bold text-gray-900 block">Sobras</span><span className="text-xs text-gray-400">Reciclaje de stock</span></div>
                      </button>

                      {filteredRecipesForPicker.length > 0 ? filteredRecipesForPicker.map(r => (
                          <button key={r.id} onClick={() => { onUpdateSlot(showPicker.date, showPicker.type, r.id); setShowPicker(null); }} className="flex gap-3 p-3 rounded-2xl bg-white border border-gray-100 hover:border-teal-500 transition-all text-left group">
                              <img src={r.image_url} className="w-16 h-16 rounded-xl object-cover bg-gray-200" alt="" />
                              <div className="flex-1 min-w-0">
                                  <p className="font-bold text-gray-900 text-sm truncate">{r.title}</p>
                                  <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded uppercase">{r.cuisine_type}</span>
                              </div>
                          </button>
                      )) : (
                        <div className="col-span-full py-20 text-center opacity-40 flex flex-col items-center">
                            <ChefHat className="w-12 h-12 mb-2" />
                            <p className="font-bold text-sm">No tienes recetas de esta categoría</p>
                        </div>
                      )}
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
