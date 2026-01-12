
import React, { useState, useEffect, useMemo } from 'react';
import { Recipe, PantryItem, ShoppingItem, UserProfile, MealCategory } from '../types';
import { X, Clock, ChefHat, Check, ArrowLeft, PlayCircle, ShoppingCart, Calendar, CheckCircle, Minus, Plus, ListFilter, Users, RefreshCw, Trash2 } from 'lucide-react';
import { CookMode } from './CookMode';
import { SmartImage } from './SmartImage';
import { SPANISH_PRICES } from '../constants';
import { format, addDays } from 'date-fns';

interface RecipeDetailProps {
  recipe: Recipe;
  pantry: PantryItem[];
  userProfile?: UserProfile; 
  initialMode?: 'view' | 'plan'; 
  onClose: () => void;
  onAddToPlan?: (servings: number, date?: string, type?: MealCategory) => void;
  onCookFinish?: (usedIngredients: { name: string, quantity: number }[]) => void;
  onAddToShoppingList?: (items: ShoppingItem[]) => void;
  // New props for planner management
  onRemoveFromPlan?: () => void;
  onChangeSlot?: () => void;
}

export const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipe, pantry, userProfile, initialMode = 'view', onClose, onAddToPlan, onCookFinish, onAddToShoppingList, onRemoveFromPlan, onChangeSlot }) => {
  const [isCooking, setIsCooking] = useState(false);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'steps'>('ingredients'); 
  const [completedSteps, setCompletedSteps] = useState<number[]>([]); 
  
  const [showPlanningMode, setShowPlanningMode] = useState(initialMode === 'plan');
  const [planDate, setPlanDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [planType, setPlanType] = useState<MealCategory>(recipe.meal_category);
  const [isAddedToPlan, setIsAddedToPlan] = useState(false);
  const [isAddedToList, setIsAddedToList] = useState(false);

  const [desiredServings, setDesiredServings] = useState(() => {
      if (userProfile && userProfile.household_size > 0) return userProfile.household_size;
      return recipe.servings;
  });

  useEffect(() => {
    window.history.pushState({ modal: 'recipe-detail' }, '', window.location.href);
    const handlePopState = () => {
      if (showPlanningMode && initialMode !== 'plan') setShowPlanningMode(false);
      else onClose();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showPlanningMode, initialMode, onClose]);

  const handleManualClose = () => {
    if (window.history.state?.modal === 'recipe-detail') {
        window.history.back();
    } else {
        onClose();
    }
  };

  const toggleStep = (index: number) => {
      setCompletedSteps(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  };

  const ingredientMultiplier = useMemo(() => desiredServings / recipe.servings, [desiredServings, recipe.servings]);

  const dynamicPrepTime = useMemo(() => {
      if (desiredServings <= recipe.servings) return recipe.prep_time;
      const scaleFactor = desiredServings / recipe.servings;
      return Math.round(recipe.prep_time * (1 + 0.3 * (scaleFactor - 1)));
  }, [desiredServings, recipe.prep_time, recipe.servings]);

  const scaledIngredients = useMemo(() => {
      return recipe.ingredients.map(ing => ({
          ...ing,
          quantity: ing.quantity * ingredientMultiplier
      }));
  }, [recipe.ingredients, ingredientMultiplier]);

  const checkItemStock = (name: string, requiredQty: number) => {
    const normalize = (s: string) => s.toLowerCase().trim().replace(/s$/, '').replace(/es$/, '');
    const normName = normalize(name);
    return pantry.find(p => {
        const pNorm = normalize(p.name);
        return pNorm === normName || pNorm.includes(normName) || normName.includes(pNorm);
    });
  };

  const missingItems = useMemo(() => {
      return scaledIngredients.filter(ing => {
          const stock = checkItemStock(ing.name, ing.quantity);
          return !stock || stock.quantity < ing.quantity;
      }).map(ing => {
          const stock = checkItemStock(ing.name, ing.quantity);
          const currentQty = stock ? stock.quantity : 0;
          return {
              ...ing,
              missingQty: Math.max(0, ing.quantity - currentQty)
          };
      });
  }, [scaledIngredients, pantry]);

  const handleBuyMissing = () => {
      if(!onAddToShoppingList) return;
      const shoppingItems: ShoppingItem[] = missingItems.map(m => ({
          id: '',
          name: m.name,
          quantity: m.missingQty,
          unit: m.unit,
          category: m.category || 'other',
          estimated_price: (SPANISH_PRICES[m.name.toLowerCase()] || 1.50),
          is_purchased: false
      }));
      onAddToShoppingList(shoppingItems);
      setIsAddedToList(true);
      setTimeout(() => setIsAddedToList(false), 2000);
  };

  if (isCooking && onCookFinish) {
      return (
          <CookMode 
            recipe={{...recipe, ingredients: scaledIngredients}} 
            pantry={pantry} 
            onClose={() => setIsCooking(false)} 
            onFinish={(used) => { onCookFinish(used); setIsCooking(false); onClose(); }} 
          />
      );
  }

  // --- SUBCOMPONENTS ---
  const IngredientList = () => (
      <div className="space-y-2">
          {scaledIngredients.map((ing, i) => {
              const stock = checkItemStock(ing.name, ing.quantity);
              const hasEnough = stock && stock.quantity >= ing.quantity;
              return (
                  <div key={i} className={`flex justify-between items-center p-2 rounded-xl border transition-all text-xs ${
                      hasEnough ? 'bg-green-50/50 border-green-200 text-green-900' : 
                      stock ? 'bg-orange-50/50 border-orange-200 text-orange-900' : 
                      'bg-white border-gray-100 text-gray-700'
                  }`}>
                      <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${hasEnough ? 'bg-green-500' : stock ? 'bg-orange-500' : 'bg-gray-200'}`} />
                          <span className="capitalize font-bold">{ing.name}</span>
                      </div>
                      <span className="font-black">{Number.isInteger(ing.quantity) ? ing.quantity : ing.quantity.toFixed(1)} {ing.unit}</span>
                  </div>
              );
          })}
          {missingItems.length > 0 && onAddToShoppingList && (
              <button 
                  onClick={handleBuyMissing}
                  disabled={isAddedToList}
                  className={`w-full mt-2 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${
                      isAddedToList ? 'bg-green-500 text-white border-green-500' : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
                  }`}
              >
                  {isAddedToList ? <><CheckCircle className="w-3 h-3" /> ¡Añadido!</> : <><ShoppingCart className="w-3 h-3" /> Comprar Faltantes ({missingItems.length})</>}
              </button>
          )}
      </div>
  );

  const InstructionsList = () => (
      <div className="space-y-3">
          {recipe.instructions.map((step, i) => {
              const isDone = completedSteps.includes(i);
              return (
                  <div 
                      key={i} 
                      onClick={() => toggleStep(i)}
                      className={`flex gap-3 group p-3 rounded-2xl transition-all cursor-pointer ${
                          isDone ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50 hover:border-gray-200 border border-transparent'
                      }`}
                  >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0 transition-all ${
                          isDone ? 'bg-green-100 text-green-700' : 'bg-teal-50 text-teal-900 border border-teal-100'
                      }`}>
                          {isDone ? <Check className="w-3 h-3" /> : i + 1}
                      </div>
                      <p className={`font-medium text-sm leading-relaxed ${isDone ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{step}</p>
                  </div>
              );
          })}
      </div>
  );

  return (
    <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm animate-fade-in flex justify-center items-end md:items-center p-0 md:p-6">
        <div className="bg-[#FDFDFD] w-full h-[95vh] md:h-[85vh] md:max-w-5xl md:rounded-[2.5rem] overflow-hidden flex flex-col relative shadow-2xl animate-slide-up">
            
            {/* DESKTOP LAYOUT (Split) */}
            <div className="hidden md:flex h-full">
                {/* LEFT: Image & Ingredients */}
                <div className="w-5/12 bg-gray-50 border-r border-gray-100 flex flex-col h-full relative">
                    <div className="h-64 relative flex-shrink-0">
                        <SmartImage src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-50 to-transparent opacity-80" />
                        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                            <span className="px-2 py-1 bg-white/90 rounded-md text-[9px] font-black uppercase tracking-widest text-teal-900 shadow-sm">{recipe.cuisine_type}</span>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar -mt-10 relative z-10">
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
                            <h3 className="font-black text-sm text-teal-900 mb-3 flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4 text-orange-500" /> Ingredientes
                            </h3>
                            <IngredientList />
                        </div>
                        
                        <div className="bg-teal-900 text-white rounded-2xl p-4 shadow-lg text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Raciones</p>
                            <div className="flex items-center justify-center gap-4">
                                <button onClick={() => setDesiredServings(Math.max(1, desiredServings - 1))} className="p-1 hover:bg-white/20 rounded"><Minus className="w-4 h-4" /></button>
                                <span className="text-2xl font-black">{desiredServings}</span>
                                <button onClick={() => setDesiredServings(desiredServings + 1)} className="p-1 hover:bg-white/20 rounded"><Plus className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Title, Stats & Steps */}
                <div className="w-7/12 flex flex-col h-full bg-white relative">
                    <button onClick={handleManualClose} className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-all z-20">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>

                    <div className="p-8 pb-4 flex-shrink-0">
                        <div className="flex justify-between items-start">
                            <h2 className="text-3xl font-black text-teal-900 leading-tight mb-4 pr-10">{recipe.title}</h2>
                            {onRemoveFromPlan && (
                                <button onClick={onRemoveFromPlan} className="mr-10 p-2 text-red-400 hover:bg-red-50 rounded-full transition-all" title="Eliminar del plan">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2 text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                <Clock className="w-4 h-4 text-teal-600" />
                                <span className="text-xs font-bold">{dynamicPrepTime} min</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                <ChefHat className="w-4 h-4 text-orange-500" />
                                <span className="text-xs font-bold capitalize">{recipe.difficulty}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-8 pb-32 custom-scrollbar">
                        <h3 className="font-black text-sm text-teal-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                            <ListFilter className="w-4 h-4 text-teal-600" /> Pasos de Preparación
                        </h3>
                        <InstructionsList />
                    </div>

                    {/* Footer Actions Desktop */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-md border-t border-gray-100 flex justify-end gap-3">
                        {showPlanningMode ? (
                            <div className="flex items-center gap-3 w-full animate-slide-up">
                                <input type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold" />
                                <button onClick={() => { if (initialMode === 'plan') onClose(); else setShowPlanningMode(false); }} className="px-6 py-3 rounded-xl text-gray-500 font-bold text-xs hover:bg-gray-50">Cancelar</button>
                                <button onClick={() => { onAddToPlan?.(desiredServings, planDate, planType); setIsAddedToPlan(true); setTimeout(() => { setIsAddedToPlan(false); onClose(); }, 1500); }} className="flex-1 bg-teal-900 text-white rounded-xl py-3 font-black text-xs uppercase tracking-widest hover:bg-teal-800 flex items-center justify-center gap-2">
                                    {isAddedToPlan ? <><CheckCircle className="w-4 h-4" /> Hecho</> : 'Confirmar Plan'}
                                </button>
                            </div>
                        ) : (
                            <>
                                {onChangeSlot ? (
                                    <button onClick={onChangeSlot} className="px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-teal-900 text-teal-900 hover:bg-teal-50 transition-all flex items-center gap-2">
                                        <RefreshCw className="w-4 h-4" /> Cambiar
                                    </button>
                                ) : onAddToPlan && (
                                    <button onClick={() => setShowPlanningMode(true)} className="px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-teal-900 text-teal-900 hover:bg-teal-50 transition-all">
                                        Planificar
                                    </button>
                                )}
                                <button onClick={() => setIsCooking(true)} className="px-10 py-4 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-orange-600 transition-all flex items-center gap-2">
                                    <PlayCircle className="w-5 h-5" /> Cocinar
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* MOBILE LAYOUT (Tabs) */}
            <div className="md:hidden flex flex-col h-full bg-white">
                <div className="h-48 relative flex-shrink-0">
                    <SmartImage src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
                    <button onClick={handleManualClose} className="absolute top-4 right-4 p-2 bg-white/90 rounded-full shadow-md z-10"><X className="w-5 h-5" /></button>
                    {onRemoveFromPlan && (
                        <button onClick={onRemoveFromPlan} className="absolute top-4 left-4 p-2 bg-red-100 rounded-full shadow-md z-10 text-red-500">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                    <div className="absolute bottom-4 left-4 right-4">
                        <h2 className="text-2xl font-black text-white drop-shadow-md truncate">{recipe.title}</h2>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 pb-32">
                    <div className="flex gap-4 mb-6">
                        <div className="bg-gray-50 px-3 py-2 rounded-xl flex flex-col items-center flex-1">
                            <Clock className="w-4 h-4 text-teal-600 mb-1" />
                            <span className="text-xs font-bold">{dynamicPrepTime}'</span>
                        </div>
                        <div className="bg-gray-50 px-3 py-2 rounded-xl flex flex-col items-center flex-1">
                            <Users className="w-4 h-4 text-orange-500 mb-1" />
                            <span className="text-xs font-bold">{desiredServings} P.</span>
                        </div>
                    </div>

                    <div className="flex p-1 bg-gray-100 rounded-xl mb-6 sticky top-0 z-10 shadow-sm">
                        <button onClick={() => setActiveTab('ingredients')} className={`flex-1 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'ingredients' ? 'bg-white text-teal-900 shadow-sm' : 'text-gray-400'}`}>Ingredientes</button>
                        <button onClick={() => setActiveTab('steps')} className={`flex-1 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'steps' ? 'bg-white text-teal-900 shadow-sm' : 'text-gray-400'}`}>Pasos</button>
                    </div>

                    {activeTab === 'ingredients' ? (
                        <>
                            <div className="flex justify-center mb-4">
                                <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-xl">
                                    <button onClick={() => setDesiredServings(Math.max(1, desiredServings - 1))} className="p-2 bg-white rounded-lg shadow-sm"><Minus className="w-4 h-4" /></button>
                                    <span className="font-black text-lg">{desiredServings}</span>
                                    <button onClick={() => setDesiredServings(desiredServings + 1)} className="p-2 bg-white rounded-lg shadow-sm"><Plus className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <IngredientList />
                        </>
                    ) : <InstructionsList />}
                </div>

                {/* Mobile Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 flex gap-2">
                    {showPlanningMode ? (
                        <div className="flex flex-col w-full gap-2">
                            <div className="flex gap-2">
                                <input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold" />
                                <button onClick={() => setShowPlanningMode(false)} className="px-4 bg-gray-100 rounded-xl text-xs font-bold">Cancelar</button>
                            </div>
                            <button onClick={() => { onAddToPlan?.(desiredServings, planDate, planType); onClose(); }} className="w-full bg-teal-900 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest">Confirmar</button>
                        </div>
                    ) : (
                        <>
                            {onChangeSlot ? (
                                <button onClick={onChangeSlot} className="flex-1 py-3 border-2 border-teal-900 text-teal-900 rounded-xl font-black text-xs uppercase tracking-widest">Cambiar</button>
                            ) : (
                                <button onClick={() => setShowPlanningMode(true)} className="flex-1 py-3 border-2 border-teal-900 text-teal-900 rounded-xl font-black text-xs uppercase tracking-widest">Planificar</button>
                            )}
                            <button onClick={() => setIsCooking(true)} className="flex-[2] py-3 bg-orange-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2">
                                <PlayCircle className="w-5 h-5" /> Cocinar
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
