
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
    isCalculated?: boolean;
    internalType?: 'mass' | 'volume' | 'count';
    internalValue?: number;
}

const formatUnitLabel = (unit: string = '') => {
  const u = unit.toLowerCase().trim();
  if (['uds', 'unidad', 'unidades', 'ud', 'u', 'unid'].includes(u)) return 'UDS';
  return u.toUpperCase();
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
  { id: 'uds', label: 'UDS' },
  { id: 'g', label: 'G' },
  { id: 'kg', label: 'KG' },
  { id: 'ml', label: 'ML' },
  { id: 'l', label: 'L' },
];

export const ShoppingList: React.FC<ShoppingListProps> = ({ plan, recipes, pantry, user, dbItems, onAddShoppingItem, onUpdateShoppingItem, onRemoveShoppingItem, onFinishShopping, onOpenRecipe, onSyncServings }) => {
  const [showComparison, setShowComparison] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [lastSessionStats, setLastSessionStats] = useState({ count: 0, savings: 0 });
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [hidePurchased, setHidePurchased] = useState(false);
  
  // States for the new item form
  const [newExtra, setNewExtra] = useState('');
  const [extraQty, setExtraQty] = useState(1);
  const [extraUnit, setExtraUnit] = useState('uds');
  
  const [isProcessing, setIsProcessing] = useState(false);

  // Logic to build the final list merging calculated needs and manual items
  const shoppingData = useMemo(() => {
    const itemsMap: Record<string, TraceableShoppingItem> = {};
    const normalizeName = (str: string) => cleanName(str);

    // 1. Process plan needs
    plan.forEach(slot => {
      const recipe = recipes.find(r => r.id === slot.recipeId);
      if (!recipe) return;
      recipe.ingredients.forEach(ing => {
        const key = normalizeName(ing.name);
        const qtyNeeded = (ing.quantity / (recipe.servings || 1)) * (slot.servings || 1);
        let normalized = normalizeUnit(qtyNeeded, ing.unit);
        
        if (itemsMap[key]) {
            if (itemsMap[key].internalType === normalized.type) {
              itemsMap[key].internalValue = (itemsMap[key].internalValue || 0) + normalized.value;
            }
            if(!itemsMap[key].sourceRecipes.includes(recipe.title)) itemsMap[key].sourceRecipes.push(recipe.title);
        } else {
            itemsMap[key] = { 
              id: `calc-${key}`, 
              name: ing.name, 
              quantity: 0, 
              unit: '', 
              category: ing.category || 'pantry', 
              estimated_price: 0, 
              is_purchased: false, 
              sourceRecipes: [recipe.title], 
              internalValue: normalized.value, 
              internalType: normalized.type,
              isCalculated: true
            };
        }
      });
    });

    // 2. Subtract pantry items from needs
    Object.keys(itemsMap).forEach(key => {
      const item = itemsMap[key];
      const inPantry = pantry.find(p => cleanName(p.name).includes(key) || key.includes(cleanName(p.name)));
      if (inPantry && item.internalValue) {
        let pantryVal = normalizeUnit(inPantry.quantity, inPantry.unit);
        if (pantryVal.type === item.internalType) {
          item.internalValue = Math.max(0, item.internalValue - pantryVal.value);
        }
      }
      
      const display = convertBack(item.internalValue || 0, item.internalType || 'count');
      item.quantity = display.quantity;
      item.unit = display.unit;
    });

    // 3. Merge with DB items (Manual items or persisted ones)
    // Map of manual items by name for quick merging
    const manualMap: Record<string, ShoppingItem> = {};
    dbItems.forEach(dbItem => {
        manualMap[normalizeName(dbItem.name)] = dbItem;
    });

    const finalItemsList: TraceableShoppingItem[] = [];

    // Combine Calculated + Manual
    const processedKeys = new Set<string>();

    Object.keys(itemsMap).forEach(key => {
      const calcItem = itemsMap[key];
      if (calcItem.quantity <= 0.01 && !manualMap[key]) return; // Skip if nothing needed and no manual override

      if (manualMap[key]) {
        // Item is both calculated and has a DB record (user interacted with it)
        finalItemsList.push({
          ...manualMap[key],
          sourceRecipes: calcItem.sourceRecipes,
          isCalculated: false // It's "Real" now
        });
      } else {
        // Just a virtual item
        finalItemsList.push(calcItem);
      }
      processedKeys.add(key);
    });

    // Add manual items that are NOT in the calculated plan
    dbItems.forEach(dbItem => {
      const key = normalizeName(dbItem.name);
      if (!processedKeys.has(key)) {
        finalItemsList.push({
          ...dbItem,
          sourceRecipes: ['Manual'],
          isCalculated: false
        });
      }
    });

    // 4. Pricing and stores
    const activeStore = SUPERMARKETS.find(s => s.id === selectedStoreId) || null;
    const itemsWithPrices = finalItemsList.map(item => {
      const normalizedName = normalizeName(item.name);
      const basePrice = SPANISH_PRICES[normalizedName] || SPANISH_PRICES['default'];
      const priceMultiplier = (item.unit === 'g' || item.unit === 'ml') ? 0.001 : 1;
      const itemCost = item.quantity * priceMultiplier * basePrice;
      return { ...item, estimated_price: activeStore ? itemCost * activeStore.multiplier : itemCost };
    });

    const storeComparisons = SUPERMARKETS.map(shop => {
        const total = itemsWithPrices.reduce((acc, item) => {
            const normalizedName = normalizeName(item.name);
            const basePrice = SPANISH_PRICES[normalizedName] || SPANISH_PRICES['default'];
            const priceMultiplier = (item.unit === 'g' || item.unit === 'ml') ? 0.001 : 1;
            const shopItemCost = item.quantity * priceMultiplier * basePrice * shop.multiplier;
            return acc + shopItemCost;
        }, 0);
        return { ...shop, total };
    }).sort((a, b) => a.total - b.total);

    return { 
        itemsList: itemsWithPrices, 
        totalEstimated: itemsWithPrices.reduce((acc, curr) => acc + curr.estimated_price, 0), 
        storeComparisons, 
        cheapest: storeComparisons[0], 
        maxSavings: storeComparisons[storeComparisons.length - 1].total - storeComparisons[0].total 
    };
  }, [plan, recipes, pantry, selectedStoreId, dbItems]);

  const groupedItems = useMemo(() => {
      const groups: Record<string, TraceableShoppingItem[]> = {};
      shoppingData.itemsList.forEach((item) => {
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

  // Handlers
  const toggleItemCheck = (item: TraceableShoppingItem) => {
    if (navigator.vibrate) navigator.vibrate(15);
    
    if (item.isCalculated) {
      // Virtual item becomes real item in DB
      const newItem: ShoppingItem = {
        id: `db-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        estimated_price: item.estimated_price,
        is_purchased: true
      };
      onAddShoppingItem([newItem]);
    } else {
      // Already a DB item, just update it
      onUpdateShoppingItem({ ...item, is_purchased: !item.is_purchased });
    }
  };

  const handleAdjust = (e: React.MouseEvent, item: TraceableShoppingItem, delta: number) => {
    e.stopPropagation();
    const newQty = Math.max(0, item.quantity + delta);
    
    if (item.isCalculated) {
      // Create new DB item to override calculation
      const newItem: ShoppingItem = {
        id: `db-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: item.name,
        quantity: newQty,
        unit: item.unit,
        category: item.category,
        estimated_price: item.estimated_price,
        is_purchased: item.is_purchased
      };
      onAddShoppingItem([newItem]);
    } else {
      onUpdateShoppingItem({ ...item, quantity: newQty });
    }
  };

  const handleManualQtyChange = (item: TraceableShoppingItem, newVal: string) => {
    const val = parseFloat(newVal);
    if (isNaN(val)) return;
    
    if (item.isCalculated) {
      const newItem: ShoppingItem = {
        id: `db-${Date.now()}`,
        name: item.name,
        quantity: val,
        unit: item.unit,
        category: item.category,
        estimated_price: item.estimated_price,
        is_purchased: item.is_purchased
      };
      onAddShoppingItem([newItem]);
    } else {
      onUpdateShoppingItem({ ...item, quantity: val });
    }
  };

  const addExtraItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExtra.trim()) return;
    
    const lowerName = newExtra.toLowerCase();
    const matchKey = Object.keys(PREDICTIVE_CATEGORY_RULES).find(key => lowerName.includes(key));
    const rule = matchKey ? PREDICTIVE_CATEGORY_RULES[matchKey] : { category: 'other', unit: extraUnit };
    
    const newItem: ShoppingItem = {
        id: `extra-${Date.now()}`,
        name: newExtra.trim(),
        quantity: extraQty,
        unit: rule.unit || extraUnit,
        category: rule.category,
        estimated_price: 2.0, 
        is_purchased: false
    };
    onAddShoppingItem([newItem]);
    setNewExtra('');
    setExtraQty(1);
    setExtraUnit('uds');
  };

  const toggleCategoryItems = (items: TraceableShoppingItem[], forceChecked: boolean) => {
    items.forEach(i => {
      if (i.is_purchased !== forceChecked) {
        toggleItemCheck(i);
      }
    });
  };

  const confirmFinishShopping = () => {
    setIsProcessing(true);
    const purchasedItems = shoppingData.itemsList.filter(i => i.is_purchased);
    const pantryItems: PantryItem[] = purchasedItems.map(item => {
        const days = EXPIRY_DAYS_BY_CATEGORY[item.category] || 14;
        return {
            id: `shop-${Date.now()}-${Math.random()}`,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
            added_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
        };
    });
    onFinishShopping(pantryItems);
    
    // Clear manual items from DB
    dbItems.forEach(i => { if (i.is_purchased) onRemoveShoppingItem(i.id); });
    
    setShowReceipt(false);
    setShowCelebration(true);
    setIsProcessing(false);
    confetti({ particleCount: 200, spread: 120, origin: { y: 0.6 } });
  };

  return (
    <div className="md:p-2 max-w-5xl mx-auto pb-48 animate-fade-in">
      {/* Header Teal Box (Image Match) */}
      <div className="bg-[#013b33] rounded-[2.5rem] p-8 text-white shadow-2xl mb-8 relative overflow-hidden">
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
                <h1 className="text-3xl font-black">Lista de Compra</h1>
                <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2">
                    <span className="text-base font-black">{shoppingData.totalEstimated.toFixed(2)}€</span>
                </div>
            </div>
            <div className="bg-white/10 rounded-full h-3 w-full mb-3 p-0.5">
                <div className="bg-[#e87c3e] h-full rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-teal-300">
                <span>{progress}% COMPRADO</span>
                <button onClick={() => setShowComparison(true)} className="flex items-center gap-2 hover:text-white transition-all group">
                    <TrendingDown className="w-3 h-3 group-hover:scale-110 transition-transform" /> COMPARAR
                </button>
            </div>
        </div>
      </div>

      {/* Input Bar (Image Match) */}
      <div className="mb-8 flex flex-col md:flex-row gap-3 w-full items-stretch">
          <form onSubmit={addExtraItem} className="flex-[4] bg-white border-2 border-gray-100 rounded-3xl flex items-center p-1.5 shadow-sm focus-within:border-teal-500/30 transition-all h-16">
            <input 
              type="text" 
              value={newExtra} 
              onChange={(e) => setNewExtra(e.target.value)} 
              placeholder="Añadir producto..." 
              className="flex-1 px-4 bg-transparent focus:outline-none font-bold text-gray-700 placeholder-gray-300 text-sm h-full" 
            />
            
            <div className="flex items-center gap-1 bg-gray-50 rounded-2xl p-1 border border-gray-100 mr-1 h-12 px-3">
                <input 
                  type="number" 
                  step="any"
                  value={extraQty}
                  onChange={e => setExtraQty(parseFloat(e.target.value) || 0)}
                  className="w-10 bg-transparent text-center font-black text-xs outline-none text-[#013b33]"
                />
                <div className="h-4 w-px bg-gray-200 mx-2" />
                <div className="relative flex items-center min-w-[50px]">
                    <select 
                        value={extraUnit}
                        onChange={e => setExtraUnit(e.target.value)}
                        className="bg-transparent font-black text-[9px] uppercase outline-none cursor-pointer pr-4 appearance-none text-teal-600 w-full"
                    >
                        {SHOPPING_UNIT_OPTIONS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-0 w-2.5 h-2.5 text-teal-400 pointer-events-none" />
                </div>
            </div>

            <button type="submit" disabled={!newExtra} className="w-12 h-12 bg-gray-300 text-white rounded-full flex items-center justify-center hover:bg-teal-900 transition-all disabled:opacity-30 shadow-md flex-shrink-0">
                <Plus className="w-6 h-6" />
            </button>
          </form>
          
          <button onClick={() => setHidePurchased(!hidePurchased)} className="flex-1 h-16 px-6 rounded-3xl bg-white border-2 border-gray-100 flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest text-gray-400 hover:border-gray-200 transition-all shadow-sm">
              <Eye className="w-4 h-4" />
              <span>{hidePurchased ? 'MOSTRAR' : 'OCULTAR'}</span>
          </button>
      </div>

      {/* List content */}
      <div className="space-y-12">
        {Object.keys(groupedItems).length === 0 ? (
          <div className="bg-white p-12 rounded-[2.5rem] border border-gray-100 text-center space-y-4 max-w-md mx-auto opacity-40">
            <ShoppingBag size={32} className="mx-auto text-gray-300" />
            <p className="font-bold text-[#013b33]">Tu lista está vacía</p>
          </div>
        ) : (
          Object.keys(groupedItems).sort().map(catKey => {
            const info = CATEGORY_LABELS[catKey] || CATEGORY_LABELS['other'];
            const allChecked = groupedItems[catKey].every(i => i.is_purchased);
            return (
              <div key={catKey} className="animate-fade-in">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 px-1 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{info.emoji}</span>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#013b33]">{info.label}</span>
                  </div>
                  <button 
                    onClick={() => toggleCategoryItems(groupedItems[catKey], !allChecked)}
                    className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${allChecked ? 'bg-green-50 border-green-100 text-green-600' : 'bg-white border-gray-100 text-gray-400'}`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    {allChecked ? 'DESMARCAR' : 'TODO'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groupedItems[catKey].map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => toggleItemCheck(item)}
                      className={`group bg-white p-4 rounded-[1.8rem] flex items-center gap-4 transition-all cursor-pointer border border-transparent shadow-sm hover:shadow-md hover:border-gray-50 ${item.is_purchased ? 'opacity-40' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${item.is_purchased ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200 bg-gray-50 group-hover:border-teal-400'}`}>
                        {item.is_purchased && <Check className="w-5 h-5 stroke-[4px]" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-base capitalize truncate ${item.is_purchased ? 'line-through text-gray-400' : 'text-[#013b33]'}`}>
                          {item.name}
                        </p>
                      </div>

                      {/* Item Stepper */}
                      <div className="flex items-center bg-gray-50 rounded-2xl p-1 h-12 border border-gray-100" onClick={e => e.stopPropagation()}>
                        {!item.is_purchased && (
                          <button 
                            onClick={(e) => handleAdjust(e, item, -1)}
                            className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors bg-white rounded-lg shadow-sm border border-gray-50"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        )}
                        
                        <div className="flex flex-col items-center justify-center px-3 min-w-[50px]">
                           <span className={`font-black text-sm leading-none ${item.is_purchased ? 'text-gray-300' : 'text-[#013b33]'}`}>
                             {item.quantity}
                           </span>
                           <span className="text-[7px] font-black text-gray-300 uppercase tracking-widest mt-0.5">
                             {formatUnitLabel(item.unit)}
                           </span>
                        </div>

                        {!item.is_purchased && (
                          <button 
                            onClick={(e) => handleAdjust(e, item, 1)}
                            className="w-8 h-8 flex items-center justify-center text-[#147A74] hover:bg-teal-50 transition-colors bg-white rounded-lg shadow-sm border border-gray-50"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Finish Purchase FAB */}
      <div className="fixed bottom-32 right-8 z-[100] animate-slide-up">
          <button 
            onClick={() => setShowReceipt(true)}
            disabled={shoppingData.itemsList.length === 0 || progress === 0}
            className="bg-[#013b33] text-white px-8 h-16 rounded-full font-black flex items-center justify-center gap-3 hover:bg-teal-900 transition-all active:scale-95 shadow-2xl disabled:opacity-50 text-xs uppercase tracking-[0.2em]"
          >
              <Check className="w-5 h-5 stroke-[4px]" /> TERMINAR COMPRA
          </button>
      </div>

      {/* Confirm Receipt Modal */}
      {showReceipt && (
          <div className="fixed inset-0 z-[5000] bg-[#013b33]/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fade-in text-white">
              <div className="w-full max-w-md bg-white rounded-[3rem] p-10 text-gray-900 shadow-2xl relative animate-slide-up">
                  <button onClick={() => setShowReceipt(false)} className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-all"><X className="w-6 h-6 text-gray-400" /></button>
                  <h3 className="text-2xl font-black mb-2 text-[#013b33]">Finalizar Compra</h3>
                  <p className="text-gray-500 text-sm mb-8 font-medium">Se añadirán los productos seleccionados a tu stock automáticamente.</p>
                  
                  <div className="max-h-[40vh] overflow-y-auto space-y-3 mb-8 pr-2 no-scrollbar">
                      {shoppingData.itemsList.filter(i => i.is_purchased).map(item => (
                          <div key={item.id} className="flex justify-between items-center border-b border-gray-50 pb-3">
                              <span className="font-bold text-base capitalize text-gray-800">{item.name}</span>
                              <span className="font-black text-xs text-teal-600 bg-teal-50 px-3 py-1.5 rounded-xl">{item.quantity} {formatUnitLabel(item.unit)}</span>
                          </div>
                      ))}
                  </div>
                  
                  <button 
                    onClick={confirmFinishShopping}
                    disabled={isProcessing}
                    className="w-full py-5 bg-[#013b33] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-teal-900 active:scale-95 transition-all flex justify-center items-center gap-3"
                  >
                      {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Check className="w-6 h-6 stroke-[4px]" /> CONFIRMAR Y GUARDAR</>}
                  </button>
              </div>
          </div>
      )}

      {/* Comparison Modal */}
      {showComparison && (
          <ModalPortal>
              <div className="fixed inset-0 z-[5000] bg-[#013b33]/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowComparison(false)}>
                  <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative animate-slide-up" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setShowComparison(false)} className="absolute top-8 right-8 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-[#013b33] transition-colors"><X className="w-6 h-6" /></button>
                      <div className="mb-8">
                          <h3 className="text-2xl font-black text-[#013b33] mb-1">Comparador IA</h3>
                          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Ahorro detectado</p>
                      </div>

                      <div className="space-y-4">
                          {shoppingData.storeComparisons.map((store, idx) => (
                              <div key={store.id} onClick={() => { setSelectedStoreId(store.id); setShowComparison(false); }} className={`p-5 rounded-[2rem] border-2 transition-all cursor-pointer flex justify-between items-center ${selectedStoreId === store.id ? 'bg-teal-50 border-[#013b33]' : 'bg-white border-gray-50 hover:border-teal-100'}`}>
                                  <div className="flex items-center gap-4">
                                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${idx === 0 ? 'bg-green-100 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
                                          <Store className="w-6 h-6" />
                                      </div>
                                      <div>
                                          <p className="font-black text-[#013b33] text-base">{store.name}</p>
                                          {idx === 0 && <span className="text-[8px] font-black uppercase text-green-600 bg-green-50 px-2 py-0.5 rounded-full">EL MÁS BARATO</span>}
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-lg font-black text-[#013b33]">{store.total.toFixed(2)}€</p>
                                      {idx > 0 && <p className="text-[10px] font-black text-red-400">+{ (store.total - shoppingData.cheapest.total).toFixed(2) }€</p>}
                                  </div>
                              </div>
                          ))}
                      </div>

                      <div className="mt-8 p-6 bg-orange-50 rounded-[2rem] border border-orange-100 flex items-center gap-5">
                          <TrendingDown className="w-8 h-8 text-[#e87c3e]" />
                          <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-[#e87c3e]/60">AHORRO POTENCIAL</p>
                              <p className="text-2xl font-black text-[#e87c3e]">{shoppingData.maxSavings.toFixed(2)}€</p>
                          </div>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {showCelebration && (
          <div className="fixed inset-0 z-[5001] bg-[#013b33] flex flex-col items-center justify-center p-8 animate-fade-in text-white text-center">
              <PartyPopper className="w-32 h-32 mb-8 text-yellow-400 animate-bounce" />
              <h2 className="text-5xl font-black mb-6">¡Compra Lista!</h2>
              <p className="text-xl opacity-80 mb-12 max-w-sm">Hemos actualizado tu despensa con los nuevos productos. ¡A cocinar!</p>
              <button onClick={() => setShowCelebration(false)} className="px-12 py-5 bg-white text-[#013b33] rounded-full font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all">VOLVER AL PANEL</button>
          </div>
      )}
    </div>
  );
};
