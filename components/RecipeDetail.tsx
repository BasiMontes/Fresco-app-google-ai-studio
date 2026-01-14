
import React, { useState, useMemo } from 'react';
import { Recipe, PantryItem, ShoppingItem, UserProfile, MealCategory } from '../types';
import { X, Clock, ChefHat, PlayCircle, ShoppingCart, CheckCircle, Minus, Plus, RefreshCw, Trash2, Sunrise, Sun, Moon } from 'lucide-react';
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

export const RecipeDetail: React.FC<RecipeDetailProps> = ({ 
  recipe, pantry, userProfile, initialMode = 'view', 
  onClose, onAddToPlan, onCookFinish, onAddToShoppingList, 
  onRemoveFromPlan, onChangeSlot 
}) => {
  const [isCooking, setIsCooking] = useState(false);
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
    <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm animate-fade-in flex justify-center items-center p-4 md:p-6" onClick={onClose}>
        <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-[2.5rem] overflow-hidden flex flex-col relative shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            
            <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-1 md:grid-cols-12">
                
                {/* Left Side: Image & Ingredients Card */}
                <div className="md:col-span-5 p-6 md:p-8 flex flex-col gap-6 bg-gray-50/50">
                    <div className="relative">
                        <div className="aspect-video md:aspect-square rounded-[2rem] overflow-hidden shadow-xl border-4 border-white">
                            <SmartImage src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-teal-800 shadow-sm border border-white">
                            {recipe.dietary_tags[0] || 'HEALTHY'}
                        </div>
                    </div>

                    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col">
                        <div className="flex items-center gap-2 mb-4">
                            <ShoppingCart className="w-4 h-4 text-orange-500" />
                            <h3 className="font-black text-sm text-teal-900 uppercase tracking-widest">Ingredientes</h3>
                        </div>
                        
                        <div className="space-y-3 flex-1 overflow-y-auto max-h-[30vh] pr-2 no-scrollbar">
                            {scaledIngredients.map((ing, i) => {
                                const stock = checkItemStock(ing.name, ing.quantity);
                                const hasEnough = stock && stock.quantity >= ing.quantity;
                                return (
                                    <div key={i} className="flex justify-between items-center text-xs pb-2 border-b border-gray-50 last:border-none">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${hasEnough ? 'bg-teal-500' : 'bg-gray-200'}`} />
                                            <span className={`capitalize font-bold ${hasEnough ? 'text-teal-900' : 'text-gray-400'}`}>{ing.name}</span>
                                        </div>
                                        <span className="font-black text-teal-600 tabular-nums">
                                            {Number.isInteger(ing.quantity) ? ing.quantity : ing.quantity.toFixed(1)} {ing.unit}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {missingItems.length > 0 && onAddToShoppingList && (
                            <button onClick={handleBuyMissing} disabled={isAddedToList} className="w-full mt-6 py-3 bg-teal-50 text-teal-700 rounded-xl font-black text-[10px] uppercase tracking-widest border border-teal-100 flex items-center justify-center gap-2 hover:bg-teal-100 transition-all">
                                {isAddedToList ? <CheckCircle className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                                {isAddedToList ? 'Añadido' : `Comprar Faltantes (${missingItems.length})`}
                            </button>
                        )}
                    </div>

                    {/* Servings Adjuster */}
                    <div className="bg-teal-900 text-white rounded-2xl p-4 flex items-center justify-between shadow-lg">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Raciones</span>
                        <div className="flex items-center gap-4">
                            <button onClick={() => setDesiredServings(Math.max(1, desiredServings - 1))} className="p-1 hover:bg-white/10 rounded-lg"><Minus className="w-4 h-4" /></button>
                            <span className="font-black text-xl w-6 text-center">{desiredServings}</span>
                            <button onClick={() => setDesiredServings(desiredServings + 1)} className="p-1 hover:bg-white/10 rounded-lg"><Plus className="w-4 h-4" /></button>
                        </div>
                    </div>
                </div>

                {/* Right Side: Header & Instructions */}
                <div className="md:col-span-7 p-6 md:p-10 flex flex-col">
                    <div className="flex justify-between items-start gap-4 mb-8">
                        <div className="flex-1">
                            <h2 className="text-3xl md:text-4xl font-black text-teal-900 leading-tight mb-4">{recipe.title}</h2>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 text-gray-500 font-bold text-[10px] uppercase tracking-widest">
                                    <Clock className="w-4 h-4 text-teal-600" /> {dynamicPrepTime} min
                                </div>
                                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 text-gray-500 font-bold text-[10px] uppercase tracking-widest">
                                    <ChefHat className="w-4 h-4 text-orange-500" /> {recipe.difficulty.toUpperCase()}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {onRemoveFromPlan && (
                                <button onClick={onRemoveFromPlan} title="Quitar del plan" className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all shadow-sm"><Trash2 className="w-5 h-5" /></button>
                            )}
                            {onChangeSlot && (
                                <button onClick={onChangeSlot} title="Cambiar plato" className="p-3 bg-green-50 text-green-600 rounded-2xl hover:bg-green-100 transition-all shadow-sm"><RefreshCw className="w-5 h-5" /></button>
                            )}
                            <button onClick={onClose} className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 transition-all shadow-sm"><X className="w-5 h-5" /></button>
                        </div>
                    </div>

                    <div className="flex-1 space-y-6">
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-4">
                            <Sunrise className="w-4 h-4 text-teal-600" />
                            <h3 className="font-black text-sm text-teal-900 uppercase tracking-widest">Pasos de Preparación</h3>
                        </div>
                        <div className="space-y-6 pr-4 overflow-y-auto no-scrollbar">
                            {recipe.instructions.map((step, i) => (
                                <div key={i} className="flex gap-6 group">
                                    <span className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-900 flex items-center justify-center font-black text-sm flex-shrink-0 group-hover:bg-teal-900 group-hover:text-white transition-all shadow-sm border border-teal-100/50">{i + 1}</span>
                                    <p className="text-base font-medium text-gray-600 leading-relaxed pt-1.5 flex-1">{step}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Action Bar */}
            <div className="p-6 md:p-8 bg-white border-t border-gray-100 flex flex-col md:flex-row gap-4 items-center">
                {showPlanningMode ? (
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full animate-slide-up">
                        <div className="flex-1 flex gap-3">
                            <input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)} className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none" />
                            <div className="flex bg-gray-100 p-1.5 rounded-2xl">
                                {(['breakfast', 'lunch', 'dinner'] as MealCategory[]).map(cat => (
                                    <button 
                                        key={cat} 
                                        onClick={() => setPlanType(cat)}
                                        className={`p-3 rounded-xl transition-all ${planType === cat ? 'bg-white text-teal-900 shadow-md' : 'text-gray-400'}`}
                                    >
                                        {cat === 'breakfast' ? <Sunrise className="w-5 h-5" /> : cat === 'lunch' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowPlanningMode(false)} className="px-8 py-4 font-black text-xs uppercase tracking-widest text-gray-400 hover:text-gray-600">Cancelar</button>
                            <button onClick={() => { onAddToPlan?.(desiredServings, planDate, planType); onClose(); }} className="px-12 py-4 bg-teal-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-teal-800 active:scale-95 transition-all">Confirmar Plan</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-4 w-full justify-end">
                        {onAddToPlan && (
                            <button onClick={() => setShowPlanningMode(true)} className="flex-1 md:flex-none px-8 py-4 border-2 border-teal-900 text-teal-900 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-teal-50 transition-all">
                                Planificar
                            </button>
                        )}
                        <button onClick={() => setIsCooking(true)} className="flex-1 md:flex-none px-12 py-5 bg-orange-500 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all flex items-center justify-center gap-3 active:scale-95">
                            <PlayCircle className="w-6 h-6" /> Empezar a Cocinar
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
