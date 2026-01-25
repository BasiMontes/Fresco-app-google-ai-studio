
import React, { useState, useMemo } from 'react';
import { Recipe, PantryItem, ShoppingItem, UserProfile, MealCategory } from '../types';
import { X, Clock, ChefHat, PlayCircle, ShoppingCart, CheckCircle, Minus, Plus, RefreshCw, Trash2, Sunrise, Sun, Moon, AlertTriangle, ListChecks, UtensilsCrossed, Heart, Calendar } from 'lucide-react';
import { CookMode } from './CookMode';
import { SmartImage } from './SmartImage';
import { SPANISH_PRICES } from '../constants';
import { format } from 'date-fns';
import { ModalPortal } from './ModalPortal';

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
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export const RecipeDetail: React.FC<RecipeDetailProps> = ({ 
  recipe, pantry, userProfile, initialMode = 'view', 
  onClose, onAddToPlan, onCookFinish, onAddToShoppingList, 
  onRemoveFromPlan, onChangeSlot, isFavorite, onToggleFavorite
}) => {
  const [isCooking, setIsCooking] = useState(false);
  const [activeTab, setActiveTab] = useState<'prep' | 'ingredients'>(initialMode === 'plan' ? 'ingredients' : 'prep');
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
    <ModalPortal>
      <div className="fixed inset-0 z-[2000] bg-black/40 backdrop-blur-md animate-fade-in flex justify-center items-center p-3 md:p-6" onClick={onClose}>
          {/* Planning Overlay */}
          {showPlanningMode && (
              <div className="fixed inset-0 z-[3000] bg-teal-900/10 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in" onClick={(e) => { e.stopPropagation(); setShowPlanningMode(false); }}>
                  <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-teal-50 space-y-8 animate-slide-up" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-between items-center">
                          <div>
                              <h3 className="text-2xl font-black text-teal-900 tracking-tight">Planificar Comida</h3>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">¿Cuándo vas a cocinar esto?</p>
                          </div>
                          <button onClick={() => setShowPlanningMode(false)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-all"><X className="w-5 h-5 text-gray-400" /></button>
                      </div>

                      <div className="space-y-6">
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] ml-1">Fecha (AAAA-MM-DD)</label>
                              <div className="relative h-[64px] bg-gray-50 rounded-2xl border-2 border-transparent focus-within:border-teal-500/20 transition-all">
                                  <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-600 pointer-events-none z-10" />
                                  <input 
                                      type="text" 
                                      placeholder="2024-05-24"
                                      value={planDate} 
                                      onChange={e => setPlanDate(e.target.value)} 
                                      className="w-full h-full pl-14 pr-5 bg-transparent font-black text-teal-900 outline-none placeholder:text-gray-300"
                                  />
                                  <input 
                                      type="date" 
                                      className="absolute inset-0 opacity-0 cursor-pointer"
                                      onChange={e => setPlanDate(e.target.value)}
                                      value={planDate}
                                  />
                              </div>
                          </div>

                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] ml-1">Momento del día</label>
                              <div className="grid grid-cols-3 gap-2 bg-gray-50 p-1.5 rounded-2xl">
                                  {(['breakfast', 'lunch', 'dinner'] as MealCategory[]).map(cat => (
                                      <button 
                                          key={cat} 
                                          onClick={() => setPlanType(cat)} 
                                          className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl transition-all ${planType === cat ? 'bg-white text-teal-900 shadow-md scale-[1.02]' : 'text-gray-400 hover:text-teal-600'}`}
                                      >
                                          {cat === 'breakfast' ? <Sunrise className="w-5 h-5" /> : cat === 'lunch' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                                          <span className="text-[8px] font-black uppercase tracking-widest">{cat === 'breakfast' ? 'Desayuno' : cat === 'lunch' ? 'Comida' : 'Cena'}</span>
                                      </button>
                                  ))}
                              </div>
                          </div>
                      </div>

                      <button 
                          onClick={() => { onAddToPlan?.(desiredServings, planDate, planType); onClose(); }} 
                          className="w-full py-5 bg-teal-900 text-white rounded-[1.4rem] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-teal-800 active:scale-95 transition-all"
                      >
                          Confirmar en mi Plan
                      </button>
                  </div>
              </div>
          )}

          <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-[3rem] overflow-hidden flex flex-col relative shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
              <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-1 md:grid-cols-12 h-full">
                  {/* Left Side: Photo & Quick Info */}
                  <div className="md:col-span-4 p-5 md:p-8 flex flex-col gap-6 bg-gray-50/50 border-r border-gray-100">
                      <div className="relative group">
                          <div className="aspect-square rounded-[2rem] overflow-hidden shadow-xl border-4 border-white">
                              <SmartImage src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
                          </div>
                          <div className="absolute top-4 left-4 bg-teal-900 text-white px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg">
                              {recipe.dietary_tags[0] || 'RECETA'}
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-1">
                              <Clock className="w-5 h-5 text-teal-600" />
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Tiempo</p>
                              <p className="text-base font-black text-teal-900">{dynamicPrepTime}'</p>
                          </div>
                          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-1">
                              <ChefHat className="w-5 h-5 text-orange-500" />
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Nivel</p>
                              <p className="text-base font-black text-teal-900 capitalize">{recipe.difficulty}</p>
                          </div>
                      </div>

                      <div className="bg-teal-900 text-white rounded-3xl p-5 flex items-center justify-between shadow-lg">
                          <div className="flex flex-col">
                              <p className="text-[8px] font-black uppercase tracking-widest text-teal-400">Comensales</p>
                              <span className="text-2xl font-black tabular-nums">{desiredServings}</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <button onClick={() => setDesiredServings(Math.max(1, desiredServings - 1))} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"><Minus className="w-4 h-4" /></button>
                              <button onClick={() => setDesiredServings(desiredServings + 1)} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"><Plus className="w-4 h-4" /></button>
                          </div>
                      </div>
                  </div>

                  {/* Right Side: Navigation & Content */}
                  <div className="md:col-span-8 p-6 md:p-10 flex flex-col h-full bg-white">
                      <div className="flex justify-between items-start gap-4 mb-6">
                          <h2 className="text-2xl md:text-3xl font-black text-teal-900 leading-tight flex-1">{recipe.title}</h2>
                          <div className="flex gap-2">
                              {onToggleFavorite && (
                                  <button 
                                      onClick={() => onToggleFavorite(recipe.id)} 
                                      className={`p-3 rounded-xl transition-all shadow-sm border ${isFavorite ? 'bg-red-50 border-red-100 text-red-500' : 'bg-gray-50 border-gray-100 text-gray-400 hover:text-red-400'}`}
                                  >
                                      <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                                  </button>
                              )}
                              {onRemoveFromPlan && <button onClick={onRemoveFromPlan} className="p-3 bg-red-50 text-red-500 border border-red-100 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"><Trash2 className="w-5 h-5" /></button>}
                              {onChangeSlot && <button onClick={onChangeSlot} className="p-3 bg-green-50 text-green-600 border border-green-100 rounded-xl hover:bg-green-500 hover:text-white transition-all shadow-sm"><RefreshCw className="w-5 h-5" /></button>}
                              <button onClick={onClose} className="p-3 bg-gray-50 text-gray-400 border border-gray-100 rounded-xl hover:bg-gray-100 transition-all"><X className="w-5 h-5" /></button>
                          </div>
                      </div>

                      <div className="flex p-1 bg-gray-100 rounded-xl mb-6 self-start border border-gray-200">
                          <button 
                              onClick={() => setActiveTab('prep')}
                              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'prep' ? 'bg-white text-teal-900 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                              <UtensilsCrossed className="w-3.5 h-3.5" /> Preparación
                          </button>
                          <button 
                              onClick={() => setActiveTab('ingredients')}
                              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'ingredients' ? 'bg-white text-teal-900 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                              <ListChecks className="w-3.5 h-3.5" /> Ingredientes
                              {missingItems.length > 0 && <span className="w-2 h-2 rounded-full bg-orange-500 ml-1" />}
                          </button>
                      </div>

                      <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
                          {activeTab === 'prep' ? (
                              <div className="space-y-6 animate-fade-in">
                                  {recipe.instructions.map((step, i) => (
                                      <div key={i} className="flex gap-4 group">
                                          <div className="relative flex-shrink-0">
                                              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-900 flex items-center justify-center font-black text-base group-hover:bg-teal-900 group-hover:text-white transition-all border border-teal-100">
                                                  {i + 1}
                                              </div>
                                              {i < recipe.instructions.length - 1 && (
                                                  <div className="absolute top-10 left-5 w-0.5 h-full bg-gray-50 -ml-[1px]" />
                                              )}
                                          </div>
                                          <p className="text-base md:text-lg font-medium text-gray-700 leading-relaxed pt-1.5 flex-1">{step}</p>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="space-y-5 animate-fade-in">
                                  {missingItems.length > 0 && (
                                      <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-sm mb-4">
                                          <div className="flex items-center gap-3 text-orange-700">
                                              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                                              <div>
                                                  <p className="font-black text-[10px] uppercase tracking-wide">Faltan {missingItems.length} ingredientes</p>
                                                  <p className="text-[9px] opacity-70 font-bold uppercase">Detectada rotura de stock</p>
                                              </div>
                                          </div>
                                          {onAddToShoppingList && (
                                              <button onClick={handleBuyMissing} disabled={isAddedToList} className="bg-orange-500 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md hover:bg-orange-600 transition-all flex items-center gap-2">
                                                  {isAddedToList ? <CheckCircle className="w-3.5 h-3.5" /> : <ShoppingCart className="w-3.5 h-3.5" />}
                                                  {isAddedToList ? 'Añadido' : 'Comprar'}
                                              </button>
                                          )}
                                      </div>
                                  )}

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {scaledIngredients.map((ing, i) => {
                                          const stock = checkItemStock(ing.name, ing.quantity);
                                          const hasEnough = stock && stock.quantity >= ing.quantity;
                                          return (
                                              <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${hasEnough ? 'bg-teal-50/10 border-teal-50' : 'bg-orange-50/20 border-orange-100'}`}>
                                                  <div className="flex items-center gap-3 min-w-0">
                                                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${hasEnough ? 'bg-teal-500' : 'bg-orange-500'}`} />
                                                      <div className="min-w-0">
                                                          <span className={`font-bold text-sm capitalize block truncate ${hasEnough ? 'text-teal-900 opacity-60' : 'text-orange-900'}`}>{ing.name}</span>
                                                          {!hasEnough && <span className="text-[8px] font-black uppercase text-orange-400 tracking-tighter">Pendiente</span>}
                                                      </div>
                                                  </div>
                                                  <div className="text-right flex-shrink-0 ml-2">
                                                      <span className={`font-black text-base tabular-nums ${hasEnough ? 'text-teal-600 opacity-60' : 'text-orange-600'}`}>
                                                          {Number.isInteger(ing.quantity) ? ing.quantity : ing.quantity.toFixed(1)} <span className="text-[10px] uppercase">{ing.unit}</span>
                                                      </span>
                                                  </div>
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              {/* Bottom Floating Bar */}
              <div className="px-8 py-5 bg-white border-t border-gray-100 flex flex-col md:flex-row gap-4 items-center">
                  <div className="flex gap-3 w-full">
                      {onAddToPlan && (
                          <button onClick={() => setShowPlanningMode(true)} className="flex-1 md:flex-none px-10 py-4 border-2 border-teal-900 text-teal-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-teal-50 transition-all active:scale-95">
                              Planificar
                          </button>
                      )}
                      <button onClick={() => setIsCooking(true)} className="flex-[2] md:flex-1 px-10 py-4 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all flex items-center justify-center gap-3 active:scale-95">
                          <PlayCircle className="w-6 h-6" /> Empezar a Cocinar
                      </button>
                  </div>
              </div>
          </div>
      </div>
    </ModalPortal>
  );
};
