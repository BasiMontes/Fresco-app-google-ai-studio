
import React, { useState, useMemo } from 'react';
import { MealSlot, Recipe, MealCategory, PantryItem, UserProfile, ShoppingItem } from '../types';
import { Plus, X, Loader2, ArrowRight, PackageCheck, ShoppingCart, ChevronLeft, ChevronRight, Move, Utensils, Repeat, Copy, BrainCircuit, Users2, ChefHat, AlertTriangle, CalendarDays, Sparkles } from 'lucide-react';
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

  const getIngredientStatus = (recipe: Recipe) => {
      let missingCount = 0;
      recipe.ingredients.forEach(ing => {
          const ingName = cleanName(ing.name);
          const inPantry = pantry.find(p => {
              const pName = cleanName(p.name);
              return pName === ingName || pName.includes(ingName) || ingName.includes(pName);
          });
          if (!inPantry || inPantry.quantity <= 0.1) missingCount++;
      });
      return missingCount;
  };

  const copyToClipboard = () => {
      const text = `Plan de Comidas de ${user.name}:\n` + days.map(d => {
          const lunch = getRecipe(getSlot(d, 'lunch')?.recipeId)?.title || 'Libre';
          const dinner = getRecipe(getSlot(d, 'dinner')?.recipeId)?.title || 'Libre';
          return `${format(d, 'EEEE', {locale: es})}: 🥘 ${lunch} | 🌙 ${dinner}`;
      }).join('\n');
      navigator.clipboard.writeText(text);
      alert("Copiado");
      setShowSocial(false);
  };

  // --- UI RENDERERS ---

  return (
    <div className="h-[calc(100vh-80px)] w-full flex flex-col animate-fade-in overflow-hidden">
      
      {/* HEADER: Ultra compact & functional */}
      <header className="flex-shrink-0 px-6 py-4 flex justify-between items-center bg-white/50 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl shadow-sm border border-gray-100">
                <button onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-teal-900 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                <div className="text-center w-32">
                    <span className="block text-[9px] font-black uppercase text-gray-400 tracking-widest">Semana del</span>
                    <span className="block text-sm font-black text-teal-900 leading-none">{format(currentWeekStart, 'd MMM', { locale: es })}</span>
                </div>
                <button onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-teal-900 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
            
            {moveSource && (
               <div className="bg-orange-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-lg animate-pulse">
                   <Move className="w-3 h-3" /> Moviendo plato...
               </div>
            )}
        </div>

        <div className="flex gap-2">
            {!moveSource && (
                <>
                    <button onClick={() => setShowSocial(true)} className="p-3 bg-white text-teal-900 rounded-xl hover:bg-teal-50 transition-all border border-gray-100 shadow-sm" title="Compartir">
                        <Users2 className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={openPlanWizard} 
                        disabled={isGenerating}
                        className="flex items-center gap-2 bg-teal-900 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-teal-800 transition-all shadow-lg active:scale-95"
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4 text-orange-400" />}
                        <span className="hidden md:inline">Asistente Mágico</span>
                    </button>
                </>
            )}
        </div>
      </header>

      {/* MAIN GRID: Flexible Bento Layout - NO BODY SCROLL */}
      <div className="flex-1 min-h-0 px-2 md:px-6 pb-20 md:pb-6 overflow-x-auto md:overflow-hidden overflow-y-hidden no-scrollbar snap-x snap-mandatory flex md:grid md:grid-cols-7 gap-3">
        {days.map((day) => {
          const isToday = isSameDay(day, new Date());
          const dateStr = format(day, 'yyyy-MM-dd');
          
          return (
            <div key={day.toString()} className="min-w-[85vw] md:min-w-0 snap-center h-full flex flex-col gap-2 group/day">
                
                {/* Day Header */}
                <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${
                    isToday 
                    ? 'bg-teal-900 text-white border-teal-900 shadow-md' 
                    : 'bg-white text-gray-500 border-gray-100 group-hover/day:border-teal-100'
                }`}>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">{format(day, 'EEE', { locale: es })}</span>
                        <span className="text-xl font-black leading-none">{format(day, 'd', { locale: es })}</span>
                    </div>
                    {isToday && <div className="w-2 h-2 bg-orange-500 rounded-full" />}
                </div>

                {/* Meal Slots Container - Flex Grow to fill height */}
                <div className="flex-1 flex flex-col gap-2 min-h-0">
                    {(['breakfast', 'lunch', 'dinner'] as MealCategory[]).map((type) => {
                        const slot = getSlot(day, type);
                        let recipe = null;
                        let isSpecial = false;
                        let specialType = '';
                        let missingCount = 0;

                        if (slot?.recipeId) {
                            if (slot.recipeId === SLOT_LEFTOVERS) { isSpecial = true; specialType = 'leftovers'; }
                            else if (slot.recipeId === SLOT_EAT_OUT) { isSpecial = true; specialType = 'eatout'; }
                            else {
                                recipe = getRecipe(slot.recipeId);
                                if (recipe) missingCount = getIngredientStatus(recipe);
                            }
                        }

                        const isCooked = slot?.isCooked;
                        const isMovingTarget = moveSource && !(moveSource.date === dateStr && moveSource.type === type);

                        return (
                            <div 
                                key={type}
                                onClick={() => handleSlotClick(dateStr, type, slot?.recipeId, !recipe && !!slot?.recipeId)}
                                className={`flex-1 relative rounded-2xl border transition-all cursor-pointer overflow-hidden flex flex-col ${
                                    isMovingTarget ? 'border-dashed border-orange-400 bg-orange-50 hover:bg-orange-100' :
                                    isSpecial ? 'bg-gray-50 border-gray-100' :
                                    recipe ? (isCooked ? 'bg-green-50/30 border-green-200' : 'bg-white border-gray-100 hover:border-teal-300 hover:shadow-md') :
                                    'bg-gray-50/50 border-dashed border-gray-200 hover:bg-white hover:border-teal-200'
                                }`}
                            >
                                {/* Meal Type Label (Tiny) */}
                                <div className="absolute top-2 right-2 z-10 pointer-events-none">
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${recipe ? 'bg-white/80 text-gray-400' : 'text-gray-300'}`}>
                                        {type === 'breakfast' ? 'DES' : type === 'lunch' ? 'COM' : 'CEN'}
                                    </span>
                                </div>

                                {isSpecial ? (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-1 opacity-50">
                                        {specialType === 'leftovers' ? <Repeat className="w-5 h-5 text-teal-600" /> : <Utensils className="w-5 h-5 text-orange-500" />}
                                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">{specialType === 'leftovers' ? 'Sobras' : 'Fuera'}</span>
                                    </div>
                                ) : recipe ? (
                                    <>
                                        {/* Background Image with Overlay */}
                                        <div className="absolute inset-0 z-0">
                                            <img src={recipe.image_url} className="w-full h-full object-cover opacity-10 grayscale hover:grayscale-0 transition-all duration-500" />
                                            <div className={`absolute inset-0 ${isCooked ? 'bg-green-50/80' : 'bg-gradient-to-b from-white via-white/90 to-white/40'}`} />
                                        </div>

                                        <div className="relative z-10 p-3 h-full flex flex-col justify-between">
                                            <div className="pr-6">
                                                <h4 className={`font-bold text-sm text-gray-900 leading-tight line-clamp-2 md:line-clamp-3 ${isCooked ? 'line-through opacity-50' : ''}`}>
                                                    {recipe.title}
                                                </h4>
                                            </div>
                                            
                                            <div className="flex items-end justify-between mt-2">
                                                <div className="flex gap-1">
                                                    {isCooked ? (
                                                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                                                            Hecho
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase">{recipe.cuisine_type}</span>
                                                            {missingCount > 0 && (
                                                                <span className="flex items-center gap-1 text-[9px] font-black text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded" title={`${missingCount} ingredientes faltantes`}>
                                                                    <ShoppingCart className="w-3 h-3" /> {missingCount}
                                                                </span>
                                                            )}
                                                            {missingCount === 0 && (
                                                                <span className="flex items-center gap-1 text-[9px] font-black text-green-600 bg-green-50 px-1.5 py-0.5 rounded" title="Tienes todo">
                                                                    <PackageCheck className="w-3 h-3" />
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center group-hover:bg-teal-50/50 transition-colors">
                                        <Plus className="w-5 h-5 text-gray-300 group-hover:text-teal-400 transition-colors" />
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

      {/* Modals & Overlays */}
      {showSocial && (
          <div className="fixed inset-0 z-[5000] bg-teal-900/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowSocial(false)}>
              <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 text-center shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4 text-teal-700">
                      <Copy className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-teal-900 mb-2">Compartir Menú</h3>
                  <p className="text-gray-500 text-sm mb-6">Copia el plan de esta semana al portapapeles para enviarlo por WhatsApp.</p>
                  <button onClick={copyToClipboard} className="w-full py-4 bg-teal-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-teal-800 transition-all">
                      Copiar Texto
                  </button>
              </div>
          </div>
      )}

      {showPlanWizard && (
          <div className="fixed inset-0 z-[5000] bg-teal-900/95 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative">
                  <button onClick={() => setShowPlanWizard(false)} className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full hover:bg-gray-100"><X className="w-5 h-5" /></button>
                  
                  <div className="flex items-center gap-4 mb-8">
                      <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                          <BrainCircuit className="w-8 h-8" />
                      </div>
                      <div>
                          <h3 className="text-2xl font-black text-teal-900 leading-none">Asistente Mágico</h3>
                          <p className="text-gray-500 text-sm font-medium mt-1">Rellena tu semana automáticamente</p>
                      </div>
                  </div>
                  
                  <div className="space-y-6 mb-8">
                      <div>
                          <p className="font-black text-[10px] uppercase tracking-widest text-teal-600 mb-3 ml-1">¿Qué días planificamos?</p>
                          <div className="flex flex-wrap gap-2">
                              {days.map(d => {
                                  const dStr = format(d, 'yyyy-MM-dd');
                                  const isSelected = wizardDays.includes(dStr);
                                  return (
                                      <button key={dStr} onClick={() => setWizardDays(prev => prev.includes(dStr) ? prev.filter(x => x !== dStr) : [...prev, dStr])} 
                                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${isSelected ? 'bg-teal-900 text-white border-teal-900' : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'}`}>
                                          {format(d, 'EEE', {locale: es})}
                                      </button>
                                  );
                              })}
                          </div>
                      </div>
                      <div>
                          <p className="font-black text-[10px] uppercase tracking-widest text-teal-600 mb-3 ml-1">¿Qué comidas?</p>
                          <div className="flex gap-2">
                              {['breakfast', 'lunch', 'dinner'].map(t => (
                                  <button key={t} onClick={() => setWizardTypes(prev => prev.includes(t as any) ? prev.filter(x => x !== t) : [...prev, t as any])} 
                                      className={`flex-1 py-3 rounded-xl text-xs font-bold border uppercase tracking-widest transition-all ${wizardTypes.includes(t as any) ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'}`}>
                                      {t === 'breakfast' ? 'Desayuno' : t === 'lunch' ? 'Comida' : 'Cena'}
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>

                  <button onClick={executeSmartPlan} className="w-full py-4 bg-teal-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-teal-800 active:scale-95 transition-all flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4 text-orange-400" /> Generar Menú
                  </button>
              </div>
          </div>
      )}

      {showPicker && (
          <div className="fixed inset-0 z-[5000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowPicker(null)}>
              <div className="bg-white w-full max-w-2xl h-[80vh] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white z-10">
                      <div>
                          <h3 className="text-xl font-black text-teal-900">Elige receta</h3>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Para {showPicker.type === 'breakfast' ? 'Desayuno' : showPicker.type === 'lunch' ? 'Comida' : 'Cena'}</p>
                      </div>
                      <button onClick={() => setShowPicker(null)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-6 h-6 text-gray-400"/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50">
                      <button 
                          onClick={() => { onUpdateSlot(showPicker.date, showPicker.type, SLOT_EAT_OUT); setShowPicker(null); }}
                          className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 hover:border-orange-300 hover:shadow-md transition-all group text-left"
                      >
                          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                              <Utensils className="w-6 h-6" />
                          </div>
                          <div>
                              <span className="font-bold text-gray-900 block">Comer Fuera</span>
                              <span className="text-xs text-gray-400">Marcar como no cocinado</span>
                          </div>
                      </button>
                      
                      <button 
                          onClick={() => { onUpdateSlot(showPicker.date, showPicker.type, SLOT_LEFTOVERS); setShowPicker(null); }}
                          className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 hover:border-teal-300 hover:shadow-md transition-all group text-left"
                      >
                          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform">
                              <Repeat className="w-6 h-6" />
                          </div>
                          <div>
                              <span className="font-bold text-gray-900 block">Sobras / Tupper</span>
                              <span className="text-xs text-gray-400">Reutilizar comida anterior</span>
                          </div>
                      </button>

                      {recipes.map(r => (
                          <button key={r.id} onClick={() => { onUpdateSlot(showPicker.date, showPicker.type, r.id); setShowPicker(null); }} className="flex gap-3 p-3 rounded-2xl bg-white border border-gray-100 hover:border-teal-500 hover:shadow-md transition-all text-left group">
                              <img src={r.image_url} className="w-16 h-16 rounded-xl object-cover bg-gray-200 group-hover:scale-105 transition-transform" />
                              <div className="flex-1 min-w-0">
                                  <p className="font-bold text-gray-900 text-sm truncate">{r.title}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded uppercase">{r.cuisine_type}</span>
                                      <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1"><ChefHat className="w-3 h-3" /> {r.prep_time}'</span>
                                  </div>
                              </div>
                          </button>
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
