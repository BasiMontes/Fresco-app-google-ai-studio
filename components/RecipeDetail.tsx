
import React, { useState, useEffect, useMemo } from 'react';
import { Recipe, PantryItem, ShoppingItem, UserProfile, MealCategory } from '../types';
import { X, Clock, ChefHat, Check, ArrowLeft, PlayCircle, ShoppingCart, Calendar, CheckCircle, Minus, Plus, ListFilter, Users, RefreshCw, Trash2, Sunrise, Sun, Moon } from 'lucide-react';
import { CookMode } from './CookMode';
import { SmartImage } from './SmartImage';
import { SPANISH_PRICES } from '../constants';
import { format } from 'date-fns';

interface RecipeDetailProps {
  recipe: Recipe;
  pantry: PantryItem[];
  userProfile?: UserProfile; 
  initialMode?: 'view' | 'plan'; 
  onClose: () => void;
  onAddToPlan?: (servings: number, date?: string, type?: MealCategory) => void;
  onCookFinish?: (usedIngredients: { name: string, quantity: number }[]) => void;
  onAddToShoppingList?: (items: ShoppingItem[]) => void;
  onRemoveFromPlan?: () => void;
  onChangeSlot?: () => void;
}

export const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipe, pantry, userProfile, initialMode = 'view', onClose, onAddToPlan, onCookFinish, onAddToShoppingList, onRemoveFromPlan, onChangeSlot }) => {
  const [isCooking, setIsCooking] = useState(false);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'steps'>(initialMode === 'plan' ? 'ingredients' : 'steps'); 
  const [completedSteps, setCompletedSteps] = useState<number[]>([]); 
  
  const [showPlanningMode, setShowPlanningMode] = useState(initialMode === 'plan');
  const [planDate, setPlanDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [planType, setPlanType] = useState<MealCategory>(recipe.meal_category || 'lunch');
  const [isAddedToList, setIsAddedToList] = useState(false);

  const [desiredServings, setDesiredServings] = useState(() => {
      if (userProfile && userProfile.household_size > 0) return userProfile.household_size;
      return recipe.servings;
  });

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
          return { ...ing, missingQty: Math.max(0, ing.quantity - currentQty) };
      });
  }, [scaledIngredients, pantry]);

  const handleBuyMissing = () => {
      if(!onAddToShoppingList) return;
      const shoppingItems: ShoppingItem[] = missingItems.map(m => ({
          id: `shop-${Date.now()}-${Math.random()}`,
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

  return (
    <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm animate-fade-in flex justify-center items-end md:items-center p-0 md:p-6" onClick={onClose}>
        <div className="bg-[#FDFDFD] w-full h-[95vh] md:h-[85vh] md:max-w-5xl md:rounded-[2.5rem] overflow-hidden flex flex-col relative shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            
            {/* Header / Title */}
            <div className="flex-shrink-0 p-6 md:p-8 flex justify-between items-start bg-white z-20">
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl md:text-3xl font-black text-teal-900 leading-tight truncate">{recipe.title}</h2>
                    <div className="flex gap-4 mt-2">
                        <div className="flex items-center gap-1.5 text-gray-400 font-bold text-[10px] uppercase tracking-widest">
                            <Clock className="w-3.5 h-3.5" /> {dynamicPrepTime} min
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400 font-bold text-[10px] uppercase tracking-widest">
                            <ChefHat className="w-3.5 h-3.5" /> {recipe.difficulty}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    {onRemoveFromPlan && (
                        <button onClick={onRemoveFromPlan} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all"><Trash2 className="w-5 h-5" /></button>
                    )}
                    {onChangeSlot && (
                        <button onClick={onChangeSlot} className="p-3 bg-teal-50 text-teal-600 rounded-2xl hover:bg-teal-100 transition-all"><RefreshCw className="w-5 h-5" /></button>
                    )}
                    <button onClick={onClose} className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 transition-all"><X className="w-5 h-5" /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-32 no-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Media & Ingredients */}
                    <div className="space-y-6">
                        <div className="aspect-video md:aspect-[4/3] rounded-[2rem] overflow-hidden shadow-md">
                            <SmartImage src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
                        </div>

                        <div className="bg-white rounded-[2rem] p-6 border border-gray-100">
                             <div className="flex justify-between items-center mb-4">
                                <h3 className="font-black text-sm text-teal-900 uppercase tracking-widest">Ingredientes</h3>
                                <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                                    <button onClick={() => setDesiredServings(Math.max(1, desiredServings - 1))} className="text-gray-400"><Minus className="w-4 h-4" /></button>
                                    <span className="font-black text-xs w-4 text-center">{desiredServings}</span>
                                    <button onClick={() => setDesiredServings(desiredServings + 1)} className="text-gray-400"><Plus className="w-4 h-4" /></button>
                                </div>
                             </div>
                             <div className="space-y-2">
                                {scaledIngredients.map((ing, i) => {
                                    const stock = checkItemStock(ing.name, ing.quantity);
                                    const hasEnough = stock && stock.quantity >= ing.quantity;
                                    return (
                                        <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-gray-50 last:border-none">
                                            <span className={`capitalize font-bold ${hasEnough ? 'text-teal-900' : 'text-gray-400'}`}>{ing.name}</span>
                                            <span className="font-black text-teal-600">{Number.isInteger(ing.quantity) ? ing.quantity : ing.quantity.toFixed(1)} {ing.unit}</span>
                                        </div>
                                    );
                                })}
                             </div>
                             {missingItems.length > 0 && onAddToShoppingList && (
                                <button onClick={handleBuyMissing} disabled={isAddedToList} className="w-full mt-4 py-3 bg-teal-50 text-teal-700 rounded-xl font-black text-[10px] uppercase tracking-widest border border-teal-100 flex items-center justify-center gap-2">
                                    {isAddedToList ? <CheckCircle className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                                    {isAddedToList ? 'Añadido' : `Comprar Faltantes (${missingItems.length})`}
                                </button>
                             )}
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="space-y-4">
                        <h3 className="font-black text-sm text-teal-900 uppercase tracking-widest mb-4">Instrucciones</h3>
                        {recipe.instructions.map((step, i) => (
                            <div key={i} className="flex gap-4 group">
                                <span className="w-8 h-8 rounded-xl bg-teal-50 text-teal-900 flex items-center justify-center font-black text-xs flex-shrink-0 group-hover:bg-teal-900 group-hover:text-white transition-all">{i + 1}</span>
                                <p className="text-sm font-medium text-gray-600 leading-relaxed pt-1.5">{step}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur-md border-t border-gray-100 flex flex-col md:flex-row gap-3 z-30">
                {showPlanningMode ? (
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full animate-slide-up">
                        <div className="flex-1 flex gap-2">
                            <input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold" />
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                {(['breakfast', 'lunch', 'dinner'] as MealCategory[]).map(cat => (
                                    <button 
                                        key={cat} 
                                        onClick={() => setPlanType(cat)}
                                        className={`p-2 rounded-lg transition-all ${planType === cat ? 'bg-white text-teal-900 shadow-sm' : 'text-gray-400'}`}
                                    >
                                        {cat === 'breakfast' ? <Sunrise className="w-4 h-4" /> : cat === 'lunch' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setShowPlanningMode(false)} className="px-6 py-3 font-black text-[10px] uppercase tracking-widest text-gray-400">Cancelar</button>
                            <button onClick={() => { onAddToPlan?.(desiredServings, planDate, planType); onClose(); }} className="flex-1 md:flex-none px-10 py-4 bg-teal-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">Confirmar</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-3 w-full">
                        {onAddToPlan && (
                            <button onClick={() => setShowPlanningMode(true)} className="flex-1 py-4 border-2 border-teal-900 text-teal-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-teal-50 transition-all">
                                Planificar
                            </button>
                        )}
                        <button onClick={() => setIsCooking(true)} className="flex-[2] py-4 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-orange-600 transition-all flex items-center justify-center gap-2">
                            <PlayCircle className="w-5 h-5" /> Empezar a Cocinar
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
