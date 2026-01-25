
import React, { useMemo, useState, useEffect } from 'react';
import { MealSlot, Recipe, ShoppingItem, PantryItem, UserProfile } from '../types';
import { SPANISH_PRICES, SUPERMARKETS, EXPIRY_DAYS_BY_CATEGORY, PREDICTIVE_CATEGORY_RULES } from '../constants';
import { ShoppingBag, Check, TrendingUp, TrendingDown, X, Plus, Minus, EyeOff, Eye, PartyPopper, Loader2, Store, ChevronDown, CheckSquare } from 'lucide-react';
import confetti from 'canvas-confetti';
import { normalizeUnit, convertBack, cleanName } from '../services/unitService';
import { ModalPortal } from './ModalPortal';

interface ShoppingListProps {
  plan: MealSlot[];
  recipes: Recipe[];
  pantry: PantryItem[];
  user: UserProfile; 
  dbItems: ShoppingItem[]; 
  onAddShoppingItem: (items: ShoppingItem[]) => void;
  onUpdateShoppingItem: (item: ShoppingItem) => void;
  onRemoveShoppingItem: (id: string) => void;
  onFinishShopping: (items: PantryItem[]) => void;
  onOpenRecipe: (recipeTitle: string) => void;
  onSyncServings: () => void; 
}

interface TraceableShoppingItem extends ShoppingItem {
    sourceRecipes: string[];
    store?: string;
    internalValue?: number;
    internalType?: 'mass' | 'volume' | 'count';
}

const UNIT_EQUIVALENCES: Record<string, { weight: number, unit: string }> = {
  "tomate": { weight: 150, unit: "g" }, "cebolla": { weight: 130, unit: "g" },
  "ajo": { weight: 10, unit: "g" }, "huevo": { weight: 60, unit: "g" },
  "pimiento": { weight: 180, unit: "g" }, "zanahoria": { weight: 90, unit: "g" },
  "patata": { weight: 200, unit: "g" }, "aguacate": { weight: 220, unit: "g" },
  "limon": { weight: 100, unit: "g" }, "manzana": { weight: 180, unit: "g" },
  "platano": { weight: 130, unit: "g" }, "pepino": { weight: 250, unit: "g" },
  "calabacin": { weight: 300, unit: "g" }
};

const CATEGORY_LABELS: Record<string, { label: string, emoji: string, color: string }> = {
    "vegetables": { label: "Verdulería", emoji: "🥦", color: "text-green-700" },
    "fruits": { label: "Frutería", emoji: "🍎", color: "text-red-700" },
    "dairy": { label: "Lácteos y Huevos", emoji: "🧀", color: "text-yellow-700" },
    "meat": { label: "Carnicería", emoji: "🥩", color: "text-rose-700" },
    "fish": { label: "Pescadería", emoji: "🐟", color: "text-blue-700" },
    "pasta": { label: "Pasta y Arroz", emoji: "🍝", color: "text-orange-700" },
    "legumes": { label: "Legumbres", emoji: "🫘", color: "text-amber-800" },
    "broths": { label: "Caldos y Sopas", emoji: "🥣", color: "text-orange-600" },
    "bakery": { label: "Panadería", emoji: "🥖", color: "text-yellow-800" },
    "frozen": { label: "Congelados", emoji: "❄️", color: "text-cyan-600" },
    "spices": { label: "Especias", emoji: "🧂", color: "text-gray-700" },
    "drinks": { label: "Bebidas", emoji: "🥤", color: "text-blue-500" },
    "pantry": { label: "Despensa", emoji: "🥫", color: "text-slate-700" },
    "other": { label: "Varios", emoji: "🛍️", color: "text-purple-700" }
};

const SHOPPING_UNIT_OPTIONS = [
  { id: 'uds', label: 'uds' },
  { id: 'g', label: 'g' },
  { id: 'kg', label: 'kg' },
  { id: 'ml', label: 'ml' },
  { id: 'l', label: 'l' },
  { id: 'pack', label: 'pack' },
];

export const ShoppingList: React.FC<ShoppingListProps> = ({ plan, recipes, pantry, user, dbItems, onAddShoppingItem, onUpdateShoppingItem, onRemoveShoppingItem, onFinishShopping, onOpenRecipe, onSyncServings }) => {
  const [adjustments, setAdjustments] = useState<Record<string, number>>(() => {
      try { return JSON.parse(localStorage.getItem('fresco_shopping_adjustments') || '{}'); } catch { return {}; }
  });
  const [customPrices, setCustomPrices] = useState<Record<string, number>>(() => {
      try { return JSON.parse(localStorage.getItem('fresco_custom_prices') || '{}'); } catch { return {}; }
  });
  
  const [showComparison, setShowComparison] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [lastSessionStats, setLastSessionStats] = useState({ count: 0, savings: 0 });
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [hidePurchased, setHidePurchased] = useState(false);
  const [newExtra, setNewExtra] = useState('');
  const [extraQty, setExtraQty] = useState(1);
  const [extraUnit, setExtraUnit] = useState('uds');
  const [reviewItemsList, setReviewItemsList] = useState<TraceableShoppingItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { localStorage.setItem('fresco_shopping_adjustments', JSON.stringify(adjustments)); }, [adjustments]);
  useEffect(() => { localStorage.setItem('fresco_custom_prices', JSON.stringify(customPrices)); }, [customPrices]);

  const addExtraItem = (e: React.FormEvent | React.MouseEvent, instantlyPurchased = false) => {
      e.preventDefault();
      if (!newExtra.trim()) return;
      const lowerName = newExtra.toLowerCase();
      const matchKey = Object.keys(PREDICTIVE_CATEGORY_RULES).find(key => lowerName.includes(key));
      const rule = matchKey ? PREDICTIVE_CATEGORY_RULES[matchKey] : { category: 'other', unit: extraUnit };
      const newItem: ShoppingItem = {
          id: `extra-${Date.now()}`,
          name: newExtra.trim(),
          quantity: extraQty,
          unit: extraUnit,
          category: rule.category,
          estimated_price: 2.0, 
          is_purchased: instantlyPurchased
      };
      onAddShoppingItem([newItem]);
      if (instantlyPurchased && navigator.vibrate) navigator.vibrate(50);
      setNewExtra('');
      setExtraQty(1);
      setExtraUnit('uds');
  };

  const handleAdjust = (itemId: string, delta: number, currentQty: number) => {
      const item = dbItems.find(i => i.id === itemId);
      if (item) {
          onUpdateShoppingItem({ ...item, quantity: Math.max(0.1, item.quantity + delta) });
      } else {
          setAdjustments(prev => {
              const currentAdj = prev[itemId] || 0;
              return { ...prev, [itemId]: currentAdj + delta };
          });
      }
  };

  const handleManualQtyChange = (itemId: string, newVal: string) => {
      const val = parseFloat(newVal);
      if (isNaN(val)) return;
      
      const item = dbItems.find(i => i.id === itemId);
      if (item) {
          onUpdateShoppingItem({ ...item, quantity: val });
      } else {
          const baseQty = shoppingData.itemsList.find(i => i.id === itemId)?.quantity || 0;
          setAdjustments(prev => ({ ...prev, [itemId]: val - baseQty + (prev[itemId] || 0) }));
      }
  };

  const checkAllCategory = (items: TraceableShoppingItem[]) => {
      const allChecked = items.every(i => i.is_purchased);
      items.forEach(i => {
          if (i.id.includes('calc')) {
              const newItem: ShoppingItem = {
                  id: `convert-${Date.now()}-${Math.random()}`,
                  name: i.name,
                  quantity: i.quantity,
                  unit: i.unit,
                  category: i.category,
                  estimated_price: i.estimated_price,
                  is_purchased: !allChecked
              };
              onAddShoppingItem([newItem]);
          } else {
              onUpdateShoppingItem({ ...i, is_purchased: !allChecked });
          }
      });
      if (!allChecked && navigator.vibrate) navigator.vibrate(20);
  };

  const shoppingData = useMemo(() => {
    const itemsMap: Record<string, TraceableShoppingItem> = {};
    const normalizeName = (str: string) => cleanName(str);

    plan.forEach(slot => {
      const recipe = recipes.find(r => r.id === slot.recipeId);
      if (!recipe) return;
      recipe.ingredients.forEach(ing => {
        const key = normalizeName(ing.name);
        const qtyNeeded = (ing.quantity / (recipe.servings || 1)) * (slot.servings || 1);
        let normalized = normalizeUnit(qtyNeeded, ing.unit);
        if (normalized.type === 'count' && UNIT_EQUIVALENCES[key]) {
            normalized = { value: qtyNeeded * UNIT_EQUIVALENCES[key].weight, type: 'mass' };
        }
        if (itemsMap[key]) {
            if (itemsMap[key].internalType === normalized.type) itemsMap[key].internalValue = (itemsMap[key].internalValue || 0) + normalized.value;
            if(!itemsMap[key].sourceRecipes.includes(recipe.title)) itemsMap[key].sourceRecipes.push(recipe.title);
        } else {
            itemsMap[key] = { id: `calc-${key}`, name: ing.name, quantity: 0, unit: '', category: ing.category || 'pantry', estimated_price: 0, is_purchased: false, sourceRecipes: [recipe.title], internalValue: normalized.value, internalType: normalized.type };
        }
      });
    });

    const activeStore = SUPERMARKETS.find(s => s.id === selectedStoreId) || null;
    let finalItemsList: TraceableShoppingItem[] = Object.values(itemsMap).map(item => {
      const normalizedName = normalizeName(item.name);
      const inPantry = pantry.find(p => { const pNorm = normalizeName(p.name); return pNorm === normalizedName || pNorm.includes(normalizedName) || normalizedName.includes(pNorm); });
      let remainingValue = item.internalValue || 0;
      if (inPantry && remainingValue > 0) {
        let pantryVal = normalizeUnit(inPantry.quantity, inPantry.unit);
        if (pantryVal.type === item.internalType) remainingValue = Math.max(0, remainingValue - pantryVal.value);
      }
      const display = convertBack(remainingValue, item.internalType || 'count');
      const adjustment = adjustments[item.id] || 0;
      const finalQty = Math.max(0, display.quantity + adjustment);
      const basePrice = customPrices[item.name] || SPANISH_PRICES[item.id] || SPANISH_PRICES[normalizedName] || SPANISH_PRICES['default'];
      const priceMultiplier = (display.unit === 'g' || display.unit === 'ml') ? 0.001 : 1;
      const itemCost = finalQty * priceMultiplier * basePrice;
      return { ...item, quantity: finalQty, unit: display.unit, estimated_price: activeStore ? itemCost * activeStore.multiplier : itemCost, store: activeStore?.name || 'Cualquiera' };
    }).filter(item => item.quantity > 0.01);

    dbItems.forEach(extra => {
        const extraKey = normalizeName(extra.name);
        const existingIdx = finalItemsList.findIndex(i => normalizeName(i.name) === extraKey);
        if (existingIdx >= 0) {
            const existing = finalItemsList[existingIdx];
            finalItemsList[existingIdx] = { ...extra, sourceRecipes: [...existing.sourceRecipes, 'Manual'] };
        } else {
            finalItemsList.push({ ...extra, sourceRecipes: ['Manual'], internalValue: 0, internalType: 'count' });
        }
    });

    finalItemsList.forEach(item => {
        const basePrice = customPrices[item.name] || SPANISH_PRICES[item.name.toLowerCase()] || SPANISH_PRICES['default'];
        const mult = (item.unit === 'g' || item.unit === 'ml') ? 0.001 : 1;
        item.estimated_price = item.quantity * mult * basePrice * (activeStore ? activeStore.multiplier : 1);
    });

    const storeComparisons = SUPERMARKETS.map(shop => {
        const total = finalItemsList.reduce((acc, item) => {
            const base = item.estimated_price / (activeStore ? activeStore.multiplier : 1);
            return acc + (base * shop.multiplier);
        }, 0);
        return { ...shop, total };
    }).sort((a, b) => a.total - b.total);

    return { 
        itemsList: finalItemsList, 
        totalEstimated: finalItemsList.reduce((acc, curr) => acc + curr.estimated_price, 0), 
        storeComparisons, 
        cheapest: storeComparisons[0], 
        maxSavings: storeComparisons[storeComparisons.length - 1].total - storeComparisons[0].total 
    };
  }, [plan, recipes, pantry, selectedStoreId, dbItems, adjustments, customPrices]);

  const groupedItems = useMemo(() => {
      const groups: Record<string, TraceableShoppingItem[]> = {};
      shoppingData.itemsList.forEach((item: any) => {
          if (hidePurchased && item.is_purchased) return;
          const cat = item.category || 'other';
          if (!groups[cat]) groups[cat] = [];
          groups[cat].push(item);
      });
      return groups;
  }, [shoppingData.itemsList, hidePurchased]);

  const progress = useMemo(() => {
    if (shoppingData.itemsList.length === 0) return 0;
    const purchasedCount = shoppingData.itemsList.filter(item => item.is_purchased).length;
    return Math.round((purchasedCount / shoppingData.itemsList.length) * 100);
  }, [shoppingData.itemsList]);

  const handleFinishClick = () => {
      setReviewItemsList(shoppingData.itemsList.filter(i => i.is_purchased).map(i => ({...i})));
      setShowReceipt(true);
  };

  const confirmFinishShopping = () => {
      if (isProcessing) return; 
      setIsProcessing(true);
      const itemsToAddToPantry = reviewItemsList.map(item => {
          const days = EXPIRY_DAYS_BY_CATEGORY[item.category] || 14;
          return {
              id: `shop-${Date.now()}-${Math.random()}`,
              name: item.name,
              quantity: parseFloat(item.quantity as any), 
              unit: item.unit,
              category: item.category,
              added_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
          };
      });
      onFinishShopping(itemsToAddToPantry);
      setLastSessionStats({ count: reviewItemsList.length, savings: shoppingData.maxSavings > 0 ? shoppingData.maxSavings : 0 });
      reviewItemsList.forEach(i => { if (!i.id.includes('calc')) onRemoveShoppingItem(i.id); });
      setShowReceipt(false);
      setShowCelebration(true);
      setIsProcessing(false);
      confetti({ particleCount: 200, spread: 120, origin: { y: 0.6 } });
  };

  const toggleItemCheck = (item: TraceableShoppingItem) => {
      if (navigator.vibrate) navigator.vibrate(15);
      if (item.id.startsWith('calc')) {
          const newItem: ShoppingItem = { id: `real-${Date.now()}-${Math.random()}`, name: item.name, quantity: item.quantity, unit: item.unit, category: item.category, estimated_price: item.estimated_price, is_purchased: true };
          onAddShoppingItem([newItem]);
      } else {
          onUpdateShoppingItem({ ...item, is_purchased: !item.is_purchased });
      }
  };

  if (showCelebration) {
      return (
          <div className="fixed inset-0 z-[5000] bg-teal-900 flex flex-col items-center justify-center p-6 animate-fade-in text-white text-center">
              <PartyPopper className="w-24 h-24 mb-6 text-yellow-400 animate-bounce" />
              <h2 className="text-4xl font-black mb-4">¡Compra Finalizada!</h2>
              <p className="text-xl opacity-80 mb-8">Has añadido {lastSessionStats.count} productos a tu despensa.</p>
              <button onClick={() => setShowCelebration(false)} className="px-8 py-4 bg-white text-teal-900 rounded-2xl font-black uppercase tracking-widest">Volver</button>
          </div>
      );
  }

  return (
    <div className="p-4 md:p-2 max-w-5xl mx-auto pb-48 safe-pt animate-fade-in">
      {/* Header Widget */}
      <div className="bg-teal-900 rounded-[3.5rem] md:rounded-3xl p-10 md:p-8 text-white shadow-2xl mb-12 md:mb-8 relative overflow-hidden">
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
                <h1 className="text-4xl md:text-3xl font-black">Lista de Compra</h1>
                <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2">
                    <TrendingUp className="text-orange-400 w-4 h-4" />
                    <span className="text-lg md:text-sm font-black">{shoppingData.totalEstimated.toFixed(2)}€</span>
                </div>
            </div>
            <div className="bg-white/10 rounded-full h-3 w-full mb-3 p-0.5">
                <div className="bg-orange-500 h-full rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-teal-300">
                <span>{progress}% Comprado</span>
                <button onClick={() => setShowComparison(true)} className="flex items-center gap-2 hover:text-white transition-all group">
                    <TrendingDown className="w-3 h-3 group-hover:scale-110 transition-transform" /> Comparar
                </button>
            </div>
        </div>
      </div>

      {/* Formulario Añadir */}
      <div className="mb-10 flex flex-col md:flex-row gap-3 max-w-2xl mx-auto items-stretch">
          <form onSubmit={addExtraItem} className="flex-[3] bg-white border-2 border-gray-100 rounded-3xl flex items-center p-1.5 shadow-sm focus-within:border-teal-500/30 transition-all h-14">
            <input 
              type="text" 
              value={newExtra} 
              onChange={(e) => setNewExtra(e.target.value)} 
              placeholder="Añadir producto..." 
              className="flex-1 px-4 bg-transparent focus:outline-none font-bold text-gray-700 placeholder-gray-300 text-sm h-full" 
            />
            
            <div className="flex items-center gap-1 bg-gray-50 rounded-2xl p-1 border border-gray-100 mr-1 h-11 px-2">
                <input 
                  type="number" 
                  step="any"
                  value={extraQty}
                  onChange={e => setExtraQty(parseFloat(e.target.value) || 0)}
                  className="w-8 bg-transparent text-center font-black text-xs outline-none text-teal-900"
                />
                <div className="h-4 w-px bg-gray-200 mx-1" />
                <div className="relative flex items-center">
                    <select 
                        value={extraUnit}
                        onChange={e => setExtraUnit(e.target.value)}
                        className="bg-transparent font-black text-[9px] uppercase outline-none cursor-pointer pr-4 appearance-none text-teal-600"
                    >
                        {SHOPPING_UNIT_OPTIONS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-0 w-2.5 h-2.5 text-teal-400 pointer-events-none" />
                </div>
            </div>

            <button type="submit" disabled={!newExtra} className="w-11 h-11 bg-teal-900 text-white rounded-2xl flex items-center justify-center hover:bg-teal-800 transition-all disabled:opacity-30 shadow-md flex-shrink-0">
                <Plus className="w-5 h-5" />
            </button>
          </form>
          
          <button onClick={() => setHidePurchased(!hidePurchased)} className={`flex-1 h-14 px-6 rounded-3xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all border-2 shadow-sm ${hidePurchased ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}>
              {hidePurchased ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="hidden lg:inline">{hidePurchased ? 'Ver todos' : 'Ocultar comprados'}</span>
          </button>
      </div>

      {/* Lista de Items */}
      {shoppingData.itemsList.length === 0 ? (
          <div className="bg-white p-12 rounded-[2.5rem] border border-gray-100 text-center space-y-4 max-w-md mx-auto opacity-40">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto text-gray-300"><ShoppingBag size={32} /></div>
              <p className="font-bold text-teal-900">Tu lista está vacía</p>
          </div>
      ) : (
        <div className="space-y-12 pb-32">
            {Object.keys(groupedItems).sort().map(catKey => {
                const info = CATEGORY_LABELS[catKey] || CATEGORY_LABELS['other'];
                const allChecked = groupedItems[catKey].every(i => i.is_purchased);
                return (
                    <div key={catKey} className="space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2 mx-2">
                            <div className={`flex items-center gap-2 ${info.color}`}>
                                <span className="text-lg">{info.emoji}</span>
                                <span className="text-xs font-black uppercase tracking-widest">{info.label}</span>
                            </div>
                            <button onClick={() => checkAllCategory(groupedItems[catKey])} className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${allChecked ? 'bg-teal-50 text-teal-600' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                                <CheckSquare className="w-3 h-3" /> {allChecked ? 'Desmarcar' : 'Todo'}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 px-1">
                        {groupedItems[catKey].map(item => (
                            <div key={item.id} className={`group flex items-center gap-4 py-2 px-3 rounded-2xl transition-all cursor-pointer select-none border border-transparent ${item.is_purchased ? 'opacity-30' : 'hover:bg-white hover:border-gray-50 hover:shadow-sm'}`} onClick={() => toggleItemCheck(item)}>
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${item.is_purchased ? 'bg-teal-600 border-teal-600 shadow-inner' : 'border-gray-200 bg-white group-hover:border-teal-400'}`}>
                                    {item.is_purchased && <Check className="w-4 h-4 text-white stroke-[3.5px]" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className={`font-bold text-[13px] text-gray-900 capitalize truncate ${item.is_purchased ? 'line-through text-gray-400' : ''}`}>{item.name}</div>
                                </div>
                                
                                {/* NUEVO STEPPER UNIFICADO - BYE BYE UX SUICIDIO */}
                                <div className="flex items-center bg-gray-50 rounded-xl p-1 gap-1" onClick={e => e.stopPropagation()}>
                                    {!item.is_purchased && (
                                        <button onClick={() => handleAdjust(item.id, (item.unit === 'kg' || item.unit === 'l') ? -0.25 : -1, item.quantity)} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors bg-white rounded-lg shadow-sm border border-gray-100"><Minus className="w-3 h-3" /></button>
                                    )}
                                    
                                    <div className="flex items-center gap-1 px-2 min-w-[45px] justify-center">
                                        <input 
                                            type="number" 
                                            step="any"
                                            className={`w-10 bg-transparent text-center font-black text-[12px] outline-none ${item.is_purchased ? 'text-gray-300' : 'text-teal-900'}`}
                                            value={item.quantity}
                                            onChange={(e) => handleManualQtyChange(item.id, e.target.value)}
                                        />
                                        <span className={`text-[9px] font-black uppercase ${item.is_purchased ? 'text-gray-300' : 'text-teal-600/50'}`}>{item.unit}</span>
                                    </div>
                                    
                                    {!item.is_purchased && (
                                        <button onClick={() => handleAdjust(item.id, (item.unit === 'kg' || item.unit === 'l') ? 0.25 : 1, item.quantity)} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-teal-600 transition-colors bg-white rounded-lg shadow-sm border border-gray-100"><Plus className="w-3 h-3" /></button>
                                    )}
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                );
            })}
        </div>
      )}
      
      {/* Botón Flotante Refinado */}
      <div className="fixed bottom-24 md:bottom-10 right-6 md:right-10 z-[100] animate-slide-up pointer-events-none">
          <button 
            onClick={handleFinishClick}
            disabled={shoppingData.itemsList.length === 0}
            className="bg-teal-900 text-white px-8 h-14 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-teal-800 transition-all active:scale-95 shadow-xl shadow-teal-900/20 pointer-events-auto border border-white/5 disabled:opacity-50 text-[10px] uppercase tracking-[0.2em]"
          >
              <Check className="w-4 h-4 stroke-[3px]" /> Terminar Compra
          </button>
      </div>
      
      {/* Modales mantenidos */}
      {showComparison && (
          <ModalPortal>
              <div className="fixed inset-0 z-[5000] bg-teal-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowComparison(false)}>
                  <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative animate-slide-up" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setShowComparison(false)} className="absolute top-8 right-8 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-teal-900 transition-colors"><X className="w-5 h-5" /></button>
                      <div className="mb-8">
                          <h3 className="text-2xl font-black text-teal-900 mb-1">Comparador IA</h3>
                          <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">Optimización de presupuesto</p>
                      </div>

                      <div className="space-y-4">
                          {shoppingData.storeComparisons.map((store, idx) => (
                              <div key={store.id} onClick={() => { setSelectedStoreId(store.id); setShowComparison(false); }} className={`p-6 rounded-[2rem] border-2 transition-all cursor-pointer flex justify-between items-center ${selectedStoreId === store.id ? 'bg-teal-50 border-teal-900' : 'bg-white border-gray-100 hover:border-teal-200'}`}>
                                  <div className="flex items-center gap-4">
                                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${idx === 0 ? 'bg-green-100 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
                                          <Store className="w-6 h-6" />
                                      </div>
                                      <div>
                                          <p className="font-black text-teal-950">{store.name}</p>
                                          {idx === 0 && <span className="text-[8px] font-black uppercase text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Más económico</span>}
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-xl font-black text-teal-900">{store.total.toFixed(2)}€</p>
                                      {idx > 0 && <p className="text-[10px] font-bold text-red-400">+{ (store.total - shoppingData.cheapest.total).toFixed(2) }€</p>}
                                  </div>
                              </div>
                          ))}
                      </div>

                      <div className="mt-8 p-5 bg-orange-50 rounded-3xl border border-orange-100">
                          <div className="flex gap-4 items-center">
                              <TrendingDown className="w-8 h-8 text-orange-500" />
                              <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-orange-600/60">Ahorro Máximo</p>
                                  <p className="text-2xl font-black text-orange-600">{shoppingData.maxSavings.toFixed(2)}€</p>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {showReceipt && (
          <div className="fixed inset-0 z-[5000] bg-teal-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-fade-in text-white">
              <div className="w-full max-w-md bg-white rounded-[2rem] p-8 text-gray-900 shadow-2xl relative">
                  <button onClick={() => setShowReceipt(false)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X className="w-5 h-5" /></button>
                  <h3 className="text-2xl font-black mb-1 text-teal-900">Confirmar Compra</h3>
                  <p className="text-gray-500 text-xs mb-6 font-medium">Los productos seleccionados se añadirán a tu Despensa automáticamente.</p>
                  
                  <div className="max-h-[50vh] overflow-y-auto space-y-2 mb-6 pr-2 no-scrollbar">
                      {reviewItemsList.map(item => (
                          <div key={item.id} className="flex justify-between items-center border-b border-gray-100 pb-2">
                              <span className="font-bold text-sm capitalize text-gray-800">{item.name}</span>
                              <span className="font-black text-xs text-teal-600 bg-teal-50 px-2 py-1 rounded-lg">{item.quantity} {item.unit}</span>
                          </div>
                      ))}
                  </div>
                  
                  <button 
                    onClick={confirmFinishShopping}
                    disabled={isProcessing}
                    className="w-full py-5 bg-teal-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-teal-800 active:scale-95 transition-all flex justify-center items-center gap-2"
                  >
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5 stroke-[3px]" /> Confirmar y Guardar</>}
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};
