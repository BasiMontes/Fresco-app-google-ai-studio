
import React, { useState, useMemo } from 'react';
import { Recipe, PantryItem, ShoppingItem, UserProfile, MealCategory } from '../types';
import { X, Clock, ChefHat, PlayCircle, ShoppingCart, CheckCircle, Minus, Plus, RefreshCw, Trash2, Sunrise, Sun, Moon, AlertTriangle, ListChecks, UtensilsCrossed } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'ingredients' | 'prep'>(initialMode === 'plan' ? 'ingredients' : 'prep');
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
            
            <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-1 md:grid-cols-12 h-full">
                
                {/* Left Side: Photo & Hero Header */}
                <div className="md:col-span-5 p-6 md:p-10 flex flex-col gap-8 bg-gray-50/50">
                    <div className="relative group">
                        <div className="aspect-square rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white transition-transform duration-700 group-hover:scale-[1.02]">
                            <SmartImage src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute top-6 left-6 bg-teal-900 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl border border-white/10">
                            {recipe.dietary_tags[0] || 'RECETA'}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex flex-wrap gap-4">
                            <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
                                <Clock className="w-5 h-5 text-teal-600" />
                                <div>
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Preparación</p>
                                    <p className="text-sm font-black text-teal-900">{dynamicPrepTime} min</p>
                                </div>
                            </div>
                            <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
                                <ChefHat className="w-5 h-5 text-orange-500" />
                                <div>
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Dificultad</p>
                                    <p className="text-sm font-black text-teal-900 capitalize">{recipe.difficulty}</p>
                                </div>
                            </div>
                        </div>

                        {/* Servings Adjuster */}
                        <div className="bg-teal-900 text-white rounded-[2rem] p-6 flex items-center justify-between shadow-xl">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-teal-400">Raciones</p>
                                <p className="text-xs font-medium text-teal-100">Adaptación IA</p>
                            </div>
                            <div className="flex items-center gap-6">
                                <button onClick={() => setDesiredServings(Math.max(1, desiredServings - 1))} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"><Minus className="w-5 h-5" /></button>
                                <span className="font-black text-3xl tabular-nums">{desiredServings}</span>
                                <button onClick={() => setDesiredServings(desiredServings + 1)} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"><Plus className="w-5 h-5" /></button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Navigation & Tabs Content */}
                <div className="md:col-span-7 p-6 md:p-12 flex flex-col h-full bg-white">
                    <div className="flex justify-between items-start gap-4 mb-10">
                        <div className="flex-1">
                            <h2 className="text-3xl md:text-5xl font-black text-teal-900 leading-tight">{recipe.title}</h2>
                        </div>
                        <div className="flex gap-2">
                            {onRemoveFromPlan && (
                                <button onClick={onRemoveFromPlan} title="Borrar plato" className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm"><Trash2 className="w-5 h-5" /></button>
                            )}
                            {onChangeSlot && (
                                <button onClick={onChangeSlot} title="Cambiar por otro plato" className="p-4 bg-green-50 text-green-600 rounded-2xl hover:bg-green-500 hover:text-white transition-all shadow-sm"><RefreshCw className="w-5 h-5" /></button>
                            )}
                            <button onClick={onClose} className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 transition-all shadow-sm"><X className="w-5 h-5" /></button>
                        </div>
                    </div>

                    {/* TABS SELECTOR */}
                    <div className="flex p-1.5 bg-gray-50 rounded-2xl mb-8 self-start border border-gray-100">
                        <button 
                            onClick={() => setActiveTab('prep')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'prep' ? 'bg-white text-teal-900 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <UtensilsCrossed className="w-4 h-4" /> Preparación
                        </button>
                        <button 
                            onClick={() => setActiveTab('ingredients')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'ingredients' ? 'bg-white text-teal-900 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <ListChecks className="w-4 h-4" /> Ingredientes
                            {missingItems.length > 0 && <span className="w-2 h-2 rounded-full bg-orange-500 ml-1" />}
                        </button>
                    </div>

                    {/* TABS CONTENT */}
                    <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                        {activeTab === 'prep' ? (
                            <div className="space-y-8 animate-fade-in">
                                {recipe.instructions.map((step, i) => (
                                    <div key={i} className="flex gap-6 group">
                                        <div className="relative flex-shrink-0">
                                            <span className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-900 flex items-center justify-center font-black text-lg group-hover:bg-teal-900 group-hover:text-white transition-all border border-teal-100">
                                                {i + 1}
                                            </span>
                                            {i < recipe.instructions.length - 1 && (
                                                <div className="absolute top-12 left-6 w-0.5 h-full bg-gray-100 -ml-[1px]" />
                                            )}
                                        </div>
                                        <p className="text-lg font-medium text-gray-700 leading-relaxed pt-2 flex-1">{step}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-6 animate-fade-in">
                                {missingItems.length > 0 && (
                                    <div className="bg-orange-50 border border-orange-100 p-6 rounded-3xl flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 text-orange-700">
                                            <AlertTriangle className="w-6 h-6" />
                                            <div>
                                                <p className="font-black text-sm leading-tight">Faltan ingredientes</p>
                                                <p className="text-xs opacity-80 font-medium">Hay {missingItems.length} productos fuera de stock</p>
                                            </div>
                                        </div>
                                        {onAddToShoppingList && (
                                            <button 
                                                onClick={handleBuyMissing} 
                                                disabled={isAddedToList}
                                                className="bg-orange-500 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-orange-600 transition-all flex items-center gap-2"
                                            >
                                                {isAddedToList ? <CheckCircle className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                                                {isAddedToList ? 'Añadido' : 'Comprar todos'}
                                            </button>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-3">
                                    {scaledIngredients.map((ing, i) => {
                                        const stock = checkItemStock(ing.name, ing.quantity);
                                        const hasEnough = stock && stock.quantity >= ing.quantity;
                                        return (
                                            <div key={i} className={`flex items-center justify-between p-5 rounded-[1.5rem] border transition-all ${hasEnough ? 'bg-teal-50/30 border-teal-100/50' : 'bg-orange-50/40 border-orange-100/50'}`}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-3 h-3 rounded-full ${hasEnough ? 'bg-teal-500 shadow-teal-200' : 'bg-orange-500 shadow-orange-200'} shadow-lg`} />
                                                    <div>
                                                        <span className={`font-black text-base capitalize ${hasEnough ? 'text-teal-900' : 'text-orange-900'}`}>{ing.name}</span>
                                                        {!hasEnough && <span className="block text-[8px] font-black uppercase text-orange-400 mt-0.5 tracking-widest">Sin stock en despensa</span>}
                                                    </div>
                                                </div>
                                                <span className={`font-black text-lg tabular-nums ${hasEnough ? 'text-teal-600' : 'text-orange-600'}`}>
                                                    {Number.isInteger(ing.quantity) ? ing.quantity : ing.quantity.toFixed(1)} {ing.unit}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="p-6 md:p-10 bg-white border-t border-gray-100 flex flex-col md:flex-row gap-6 items-center">
                {showPlanningMode ? (
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full animate-slide-up">
                        <div className="flex-1 flex gap-3">
                            <input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)} className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-black focus:ring-2 focus:ring-teal-500 outline-none text-teal-900 shadow-inner" />
                            <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200 shadow-inner">
                                {(['breakfast', 'lunch', 'dinner'] as MealCategory[]).map(cat => (
                                    <button 
                                        key={cat} 
                                        onClick={() => setPlanType(cat)}
                                        className={`px-5 rounded-xl transition-all ${planType === cat ? 'bg-white text-teal-900 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        {cat === 'breakfast' ? <Sunrise className="w-5 h-5" /> : cat === 'lunch' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowPlanningMode(false)} className="px-8 py-4 font-black text-[10px] uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">Cancelar</button>
                            <button onClick={() => { onAddToPlan?.(desiredServings, planDate, planType); onClose(); }} className="px-12 py-5 bg-teal-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-teal-800 active:scale-95 transition-all">Confirmar Plan</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-4 w-full">
                        {onAddToPlan && (
                            <button onClick={() => setShowPlanningMode(true)} className="flex-1 md:flex-none px-10 py-5 border-2 border-teal-900 text-teal-900 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-teal-50 transition-all active:scale-95">
                                Planificar
                            </button>
                        )}
                        <button onClick={() => setIsCooking(true)} className="flex-[2] md:flex-1 px-12 py-6 bg-orange-500 text-white rounded-[2.5rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-orange-500/30 hover:bg-orange-600 transition-all flex items-center justify-center gap-4 active:scale-95">
                            <PlayCircle className="w-8 h-8" /> Empezar a Cocinar
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
