
import React, { useState, useEffect, useMemo } from 'react';
import { Recipe, PantryItem, ShoppingItem, UserProfile, MealCategory } from '../types';
import { X, Clock, Users, ChefHat, Check, AlertCircle, PackageCheck, ArrowLeft, Flame, Share2, PlayCircle, BookOpen, ListFilter, Info, Sparkles, Flag, ShieldAlert, Minus, Plus, Circle, ShoppingCart, Calendar, CheckCircle } from 'lucide-react';
import { CookMode } from './CookMode';
import { SmartImage } from './SmartImage';
import { SPANISH_PRICES } from '../constants';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface RecipeDetailProps {
  recipe: Recipe;
  pantry: PantryItem[];
  userProfile?: UserProfile; 
  initialMode?: 'view' | 'plan'; 
  onClose: () => void;
  onAddToPlan?: (servings: number, date?: string, type?: MealCategory) => void;
  onCookFinish?: (usedIngredients: { name: string, quantity: number }[]) => void;
  onAddToShoppingList?: (items: ShoppingItem[]) => void;
}

export const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipe, pantry, userProfile, initialMode = 'view', onClose, onAddToPlan, onCookFinish, onAddToShoppingList }) => {
  const [isCooking, setIsCooking] = useState(false);
  // Mobile Tab State
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
    const handlePopState = (event: PopStateEvent) => {
      if (showPlanningMode && initialMode !== 'plan') setShowPlanningMode(false);
      else onClose();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showPlanningMode, initialMode]);

  const handleManualClose = () => {
    if (showPlanningMode && initialMode !== 'plan') {
        setShowPlanningMode(false);
    } else {
        if (window.history.state?.modal === 'recipe-detail') window.history.back(); 
        else onClose();
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

  // --- COMPONENTES INTERNOS ---
  const IngredientList = () => (
      <div className="space-y-2">
          {scaledIngredients.map((ing, i) => {
              const stock = checkItemStock(ing.name, ing.quantity);
              const hasEnough = stock && stock.quantity >= ing.quantity;
              return (
                  <div key={i} className={`flex justify-between items-center p-2 rounded-xl border transition-all ${
                      hasEnough ? 'bg-green-50/50 border-green-200 text-green-900' : 
                      stock ? 'bg-orange-50/50 border-orange-200 text-orange-900' : 
                      'bg-white border-gray-100 text-gray-700'
                  }`}>
                      <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${hasEnough ? 'bg-green-500' : stock ? 'bg-orange-500' : 'bg-gray-200'}`} />
                          <span className="capitalize font-bold text-xs">{ing.name}</span>
                      </div>
                      <span className="text-xs font-black">{Number.isInteger(ing.quantity) ? ing.quantity : ing.quantity.toFixed(1)} {ing.unit}</span>
                  </div>
              );
          })}
          {missingItems.length > 0 && onAddToShoppingList && (
              <button 
                  onClick={handleBuyMissing}
                  disabled={isAddedToList}
                  className={`w-full mt-2 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${
                      isAddedToList ? 'bg-green-500 text-white border-green-500' : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
                  }`}
              >
                  {isAddedToList ? <><CheckCircle className="w-3 h-3" /> ¡Añadido!</> : <><ShoppingCart className="w-3 h-3" /> Añadir faltantes</>}
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
                          isDone ? 'bg-gray-50 opacity-60' : 'hover:bg-white hover:shadow-sm hover:border-gray-100 border border-transparent'
                      }`}
                  >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0 border transition-all ${
                          isDone ? 'bg-green-100 text-green-700 border-green-200' : 'bg-teal-50 text-teal-900 border-teal-100'
                      }`}>
                          {isDone ? <Check className="w-3 h-3" /> : i + 1}
                      </div>
                      <p className={`font-medium text-xs leading-relaxed ${isDone ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{step}</p>
                  </div>
              );
          })}
      </div>
  );

  return (
    <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm animate-fade-in flex justify-center items-end md:items-center p-0 md:p-6">
        <div className="bg-[#FDFDFD] w-full h-[95vh] md:h-auto md:max-h-[85vh] md:max-w-5xl md:rounded-[2.5rem] overflow-hidden flex flex-col relative shadow-2xl animate-slide-up">
            
            {/* Header: Imagen y Título */}
            <div className="relative h-[25vh] md:h-[20vh] flex-shrink-0">
                <SmartImage src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#FDFDFD] via-black/20 to-transparent z-10" />
                <button onClick={handleManualClose} className="absolute top-6 right-6 p-2 bg-white/90 backdrop-blur-xl rounded-full text-teal-900 hover:bg-white shadow-lg z-30">
                    <X className="w-5 h-5" />
                </button>
                <div className="absolute bottom-4 left-6 right-6 z-20">
                    <h2 className="text-3xl md:text-2xl font-black text-teal-900 leading-tight tracking-tighter drop-shadow-sm bg-white/80 backdrop-blur-md px-4 py-2 rounded-xl inline-block shadow-sm">
                        {recipe.title}
                    </h2>
                </div>
            </div>
            
            {/* Contenido: Layout Dual para Desktop */}
            <div className="flex-1 overflow-y-auto px-6 md:px-8 py-4 pb-32 no-scrollbar">
                
                {/* Stats Bar */}
                <div className="flex gap-4 mb-6 items-center bg-gray-50 p-2 rounded-2xl border border-gray-100 overflow-x-auto">
                    <div className="flex items-center gap-2 px-3">
                        <Clock className="w-4 h-4 text-orange-500" />
                        <div className="flex flex-col">
                            <span className="text-xs font-black">{dynamicPrepTime}'</span>
                            <span className="text-[8px] text-gray-400 uppercase font-bold">Tiempo</span>
                        </div>
                    </div>
                    <div className="w-px h-6 bg-gray-200" />
                    <div className="flex items-center gap-2 px-3">
                        <ChefHat className="w-4 h-4 text-orange-500" />
                        <div className="flex flex-col">
                            <span className="text-xs font-black capitalize">{recipe.difficulty}</span>
                            <span className="text-[8px] text-gray-400 uppercase font-bold">Nivel</span>
                        </div>
                    </div>
                    <div className="w-px h-6 bg-gray-200" />
                    <div className="flex items-center gap-2 px-3 bg-white rounded-xl shadow-sm border border-gray-100">
                        <button onClick={() => setDesiredServings(Math.max(1, desiredServings - 1))} className="text-teal-600 hover:bg-teal-50 rounded p-1"><Minus className="w-3 h-3" /></button>
                        <span className="text-sm font-black w-4 text-center">{desiredServings}</span>
                        <button onClick={() => setDesiredServings(desiredServings + 1)} className="text-teal-600 hover:bg-teal-50 rounded p-1"><Plus className="w-3 h-3" /></button>
                        <span className="text-[8px] text-gray-400 uppercase font-bold ml-1">Pers.</span>
                    </div>
                </div>

                {/* DESKTOP: 2 COLUMNS */}
                <div className="hidden md:grid grid-cols-2 gap-8 h-full">
                    {/* Columna Izq: Ingredientes */}
                    <div className="overflow-y-auto pr-2 custom-scrollbar">
                        <h3 className="font-black text-lg text-teal-900 mb-4 flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-orange-500" /> Ingredientes
                        </h3>
                        <IngredientList />
                    </div>

                    {/* Columna Der: Pasos */}
                    <div className="overflow-y-auto pr-2 custom-scrollbar border-l border-gray-100 pl-8">
                        <h3 className="font-black text-lg text-teal-900 mb-4 flex items-center gap-2">
                            <ListFilter className="w-5 h-5 text-teal-600" /> Preparación
                        </h3>
                        <InstructionsList />
                    </div>
                </div>

                {/* MOBILE: TABS */}
                <div className="md:hidden">
                    <div className="flex p-1 bg-gray-100 rounded-xl mb-4 border border-gray-200 sticky top-0 z-30">
                        <button onClick={() => setActiveTab('ingredients')} className={`flex-1 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'ingredients' ? 'bg-white text-teal-900 shadow-sm' : 'text-gray-400'}`}>Ingredientes</button>
                        <button onClick={() => setActiveTab('steps')} className={`flex-1 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'steps' ? 'bg-white text-teal-900 shadow-sm' : 'text-gray-400'}`}>Pasos</button>
                    </div>
                    {activeTab === 'ingredients' ? <IngredientList /> : <InstructionsList />}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-gray-100 z-40 safe-pb">
                {showPlanningMode ? (
                    <div className="flex flex-col gap-3 animate-fade-in">
                        <div className="flex gap-2">
                            <button onClick={() => setPlanDate(format(new Date(), 'yyyy-MM-dd'))} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest border transition-all ${planDate === format(new Date(), 'yyyy-MM-dd') ? 'bg-teal-900 text-white border-teal-900' : 'bg-white text-gray-400 border-gray-200'}`}>Hoy</button>
                            <button onClick={() => setPlanDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'))} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest border transition-all ${planDate === format(addDays(new Date(), 1), 'yyyy-MM-dd') ? 'bg-teal-900 text-white border-teal-900' : 'bg-white text-gray-400 border-gray-200'}`}>Mañana</button>
                            <input type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} className="flex-1 p-2 border rounded-xl bg-gray-50 text-xs font-bold" />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { if (initialMode === 'plan') onClose(); else setShowPlanningMode(false); }} className="flex-1 py-3 text-gray-400 font-black text-xs uppercase tracking-widest hover:bg-gray-50 rounded-xl">Cancelar</button>
                            <button onClick={() => { if (onAddToPlan) onAddToPlan(desiredServings, planDate, planType); setIsAddedToPlan(true); setTimeout(() => { setIsAddedToPlan(false); if (initialMode === 'plan') onClose(); else setShowPlanningMode(false); }, 2000); }} className={`flex-[2] py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 ${isAddedToPlan ? 'bg-green-500 text-white' : 'bg-teal-900 text-white'}`}>
                                {isAddedToPlan ? <><CheckCircle className="w-4 h-4" /> ¡Hecho!</> : <><Check className="w-4 h-4" /> Confirmar</>}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-3 max-w-lg mx-auto">
                        <button onClick={() => setIsCooking(true)} className="flex-[2] py-4 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-orange-600 transition-all active:scale-95 flex items-center justify-center gap-3">
                            <PlayCircle className="w-5 h-5" /> Cocinar
                        </button>
                        {onAddToPlan && (
                            <button onClick={() => setShowPlanningMode(true)} className="flex-1 py-4 bg-teal-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-teal-800 transition-all active:scale-95">
                                Planificar
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
