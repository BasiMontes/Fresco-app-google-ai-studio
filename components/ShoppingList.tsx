
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { MealSlot, Recipe, ShoppingItem, PantryItem, UserProfile } from '../types';
import { SPANISH_PRICES, EXPIRY_DAYS_BY_CATEGORY } from '../constants';
import { ShoppingBag, Check, X, Plus, Minus, Loader2, PartyPopper, PlusCircle, ChevronDown, FilterX, ChevronLeft, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cleanName, subtractIngredient, autoScaleIngredient, formatQuantity, parseLocaleNumber } from '../services/unitService';
import { ModalPortal } from './ModalPortal';
import { format, addDays } from 'date-fns';

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

const CATEGORIES = [
    { id: 'vegetables', label: 'Vegetables', emoji: '🥦' },
    { id: 'fruits', label: 'Fruits', emoji: '🍎' },
    { id: 'dairy', label: 'Dairy & Eggs', emoji: '🧀' },
    { id: 'meat', label: 'Meat & Seafood', emoji: '🥩' },
    { id: 'fish', label: 'Fish', emoji: '🐟' },
    { id: 'pasta', label: 'Pasta & Grains', emoji: '🍝' },
    { id: 'legumes', label: 'Legumes', emoji: '🫘' },
    { id: 'bakery', label: 'Bakery', emoji: '🥐' },
    { id: 'beverages', label: 'Beverages', emoji: '🥤' },
    { id: 'frozen', label: 'Frozen', emoji: '❄️' },
    { id: 'pantry', label: 'Pantry', emoji: '🥫' },
    { id: 'spices', label: 'Spices', emoji: '🧂' },
    { id: 'other', label: 'Other', emoji: '📦' },
];

const FILTER_OPTIONS = [
    { id: 'all', label: 'All Categories', emoji: '🏠' },
    ...CATEGORIES
];

const UNIT_OPTIONS = [
    { id: 'uds', label: 'UDS' },
    { id: 'kg', label: 'KG' },
    { id: 'l', label: 'L' },
    { id: 'g', label: 'G' },
    { id: 'ml', label: 'ML' }
];

const formatUnitLabel = (unit: string = '') => unit.toUpperCase() || 'UDS';

export const ShoppingList: React.FC<ShoppingListProps> = ({ plan, recipes, pantry, dbItems, onAddShoppingItem, onUpdateShoppingItem, onRemoveShoppingItem, onFinishShopping }) => {
  const [showReceipt, setShowReceipt] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  
  const [manualItem, setManualItem] = useState({
      name: "",
      quantity: 1,
      unit: "uds",
      category: "other"
  });
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [localValue, setLocalValue] = useState("");

  // Lógica para scroll horizontal
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 5);
        setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [dbItems, plan]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
        const amount = direction === 'left' ? -200 : 200;
        scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const shoppingData = useMemo(() => {
    const calculatedNeeds: Record<string, ShoppingItem> = {};
    
    plan.forEach(slot => {
        const recipe = recipes.find(r => r.id === slot.recipeId);
        if (!recipe) return;
        recipe.ingredients.forEach(ing => {
            const key = cleanName(ing.name);
            const qty = (ing.quantity / recipe.servings) * slot.servings;
            if (calculatedNeeds[key]) {
                calculatedNeeds[key].quantity += qty;
            } else {
                calculatedNeeds[key] = { 
                    id: `calc-${key}`, 
                    name: ing.name, 
                    quantity: qty, 
                    unit: ing.unit, 
                    category: ing.category, 
                    estimated_price: 0, 
                    is_purchased: false 
                };
            }
        });
    });

    Object.keys(calculatedNeeds).forEach(key => {
        const inPantry = pantry.find(p => cleanName(p.name) === key);
        if (inPantry) {
            const result = subtractIngredient(calculatedNeeds[key].quantity, calculatedNeeds[key].unit, inPantry.quantity, inPantry.unit);
            if (result) {
                calculatedNeeds[key].quantity = result.quantity;
            } else {
                calculatedNeeds[key].quantity = Math.max(0, calculatedNeeds[key].quantity - inPantry.quantity);
            }
        }
    });

    const finalItems: ShoppingItem[] = [...dbItems];
    Object.values(calculatedNeeds).forEach(calcItem => {
        if (calcItem.quantity > 0.005) { 
            const existsInDb = dbItems.some(db => cleanName(db.name) === cleanName(calcItem.name));
            if (!existsInDb) {
                const scaled = autoScaleIngredient(calcItem.quantity, calcItem.unit);
                finalItems.push({ ...calcItem, ...scaled });
            }
        }
    });

    const total = finalItems.reduce((acc, i) => acc + (i.quantity * (SPANISH_PRICES[cleanName(i.name)] || 1.5)), 0);
    const progress = finalItems.length === 0 ? 0 : Math.round((finalItems.filter(i => i.is_purchased).length / finalItems.length) * 100);

    return { finalItems, total, progress };
  }, [plan, recipes, pantry, dbItems]);

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return shoppingData.finalItems;
    return shoppingData.finalItems.filter(item => item.category === activeFilter);
  }, [shoppingData.finalItems, activeFilter]);

  const handleAddManual = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!manualItem.name.trim()) return;
    
    const newItem: ShoppingItem = {
        id: `db-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: manualItem.name.trim(),
        quantity: manualItem.quantity,
        unit: manualItem.unit,
        category: manualItem.category,
        estimated_price: 0,
        is_purchased: false
    };
    
    onAddShoppingItem([newItem]);
    setManualItem({ name: "", quantity: 1, unit: "uds", category: "other" });
  };

  const toggleItem = (item: ShoppingItem) => {
    if (item.id.startsWith('calc-')) {
        onAddShoppingItem([{ ...item, id: `db-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, is_purchased: !item.is_purchased }]);
    } else {
        onUpdateShoppingItem({ ...item, is_purchased: !item.is_purchased });
    }
  };

  const handleAdjust = (e: React.MouseEvent, item: ShoppingItem, direction: number) => {
    e.stopPropagation();
    const unit = item.unit.toLowerCase();
    let delta = 1;
    if (['g', 'ml'].includes(unit)) delta = 100 * direction;
    else if (['kg', 'l'].includes(unit)) delta = 0.1 * direction;
    else delta = direction;

    const rawNewQty = Math.max(0, item.quantity + delta);
    const { quantity: finalQty, unit: finalUnit } = autoScaleIngredient(rawNewQty, unit);

    if (item.id.startsWith('calc-')) {
        onAddShoppingItem([{ ...item, id: `db-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, quantity: finalQty, unit: finalUnit }]);
    } else {
        onUpdateShoppingItem({ ...item, quantity: finalQty, unit: finalUnit });
    }
  };

  const startEditing = (item: ShoppingItem) => {
      setEditingId(item.id);
      setLocalValue(formatQuantity(item.quantity, item.unit).replace('.', ','));
  };

  const handleLocalChange = (val: string) => {
      const sanitized = val.replace(/[^0-9.,]/g, '');
      const parts = sanitized.split(/[.,]/);
      if (parts.length > 2) return;
      setLocalValue(sanitized);
  };

  const finishEditing = (item: ShoppingItem) => {
      const num = parseLocaleNumber(localValue);
      const { quantity: finalQty, unit: finalUnit } = autoScaleIngredient(num, item.unit);

      if (item.id.startsWith('calc-')) {
          onAddShoppingItem([{ ...item, id: `db-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, quantity: finalQty, unit: finalUnit }]);
      } else {
          onUpdateShoppingItem({ ...item, quantity: finalQty, unit: finalUnit });
      }
      setEditingId(null);
  };

  const confirmFinish = () => {
    setIsProcessing(true);
    const purchased = shoppingData.finalItems.filter(i => i.is_purchased && i.quantity > 0);
    const newPantryItems: PantryItem[] = purchased.map(i => ({
        id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        category: i.category,
        added_at: new Date().toISOString(),
        expires_at: format(addDays(new Date(), EXPIRY_DAYS_BY_CATEGORY[i.category] || 14), 'yyyy-MM-dd')
    }));
    
    onFinishShopping(newPantryItems);
    setShowReceipt(false);
    setShowCelebration(true);
    setIsProcessing(false);
    confetti({ particleCount: 150, spread: 70 });
  };

  return (
    <div className="max-w-4xl mx-auto pb-48 animate-fade-in px-1 md:px-4">
      <div className="bg-[#013b33] rounded-[2.5rem] p-6 md:p-8 text-white shadow-2xl mb-8 relative overflow-hidden">
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black">Lista de Compra</h1>
                    <p className="text-teal-400 text-[10px] font-black uppercase tracking-widest mt-1">Sincronizada con tu calendario</p>
                </div>
                <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10 text-base font-black flex flex-col items-end">
                    <span className="text-[8px] text-teal-400 uppercase leading-none mb-1">Total Estimado</span>
                    {shoppingData.total.toFixed(2)}€
                </div>
            </div>
            <div className="bg-white/10 rounded-full h-3 w-full mb-3 p-0.5">
                <div className="bg-[#e87c3e] h-full rounded-full transition-all duration-700" style={{ width: `${shoppingData.progress}%` }} />
            </div>
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-teal-300">
                <span>{shoppingData.progress}% COMPRADO</span>
                <span>{shoppingData.finalItems.filter(i => i.is_purchased).length} / {shoppingData.finalItems.length} ITEMS</span>
            </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-teal-800 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 md:p-8 mb-8 shadow-sm">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-teal-600 mb-6 flex items-center gap-2">
              <PlusCircle className="w-3 h-3" /> Añadir Producto Manualmente
          </h3>
          <form onSubmit={handleAddManual} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-6">
                      <input 
                          type="text" 
                          placeholder="Nombre del producto (ej: Leche)" 
                          className="w-full h-14 bg-gray-50 border-2 border-transparent rounded-2xl px-6 font-bold text-teal-900 outline-none focus:border-teal-500/20 transition-all"
                          value={manualItem.name}
                          onChange={(e) => setManualItem({...manualItem, name: e.target.value})}
                      />
                  </div>
                  <div className="md:col-span-3 flex bg-gray-50 rounded-2xl overflow-hidden border-2 border-transparent focus-within:border-teal-500/20">
                      <input 
                          type="number" 
                          step="0.1"
                          placeholder="Cant." 
                          className="w-1/2 h-14 bg-transparent px-4 font-black text-center text-teal-900 outline-none"
                          value={manualItem.quantity}
                          onChange={(e) => setManualItem({...manualItem, quantity: parseFloat(e.target.value) || 0})}
                      />
                      <div className="w-px h-8 bg-gray-200 self-center" />
                      <select 
                          className="w-1/2 h-14 bg-transparent px-2 font-black text-[10px] text-teal-600 outline-none appearance-none text-center cursor-pointer"
                          value={manualItem.unit}
                          onChange={(e) => setManualItem({...manualItem, unit: e.target.value})}
                      >
                          {UNIT_OPTIONS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
                      </select>
                  </div>
                  <div className="md:col-span-3 relative">
                      <select 
                          className="w-full h-14 bg-gray-50 border-2 border-transparent rounded-2xl px-5 font-black text-[10px] text-teal-900 outline-none appearance-none cursor-pointer"
                          value={manualItem.category}
                          onChange={(e) => setManualItem({...manualItem, category: e.target.value})}
                      >
                          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label.toUpperCase()}</option>)}
                      </select>
                      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                  </div>
              </div>
              <button 
                  type="submit"
                  disabled={!manualItem.name.trim()}
                  className="w-full h-14 bg-teal-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg active:scale-[0.98] transition-all hover:bg-teal-800 flex items-center justify-center gap-3 disabled:opacity-30"
              >
                  <PlusCircle className="w-4 h-4" /> AÑADIR A LA LISTA
              </button>
          </form>
      </div>

      {/* BARRA DE FILTROS CON NAVEGACIÓN ASISTIDA */}
      <div className="relative group/filters mb-8">
          {canScrollLeft && (
              <button 
                onClick={() => scroll('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white/90 backdrop-blur shadow-md rounded-full flex items-center justify-center text-[#147A74] border border-gray-100 animate-fade-in"
              >
                  <ChevronLeft className="w-5 h-5" />
              </button>
          )}

          <div 
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex overflow-x-auto no-scrollbar gap-3 pb-2 -mx-1 px-1 scroll-smooth"
          >
              {FILTER_OPTIONS.map(opt => {
                  const isActive = activeFilter === opt.id;
                  const count = opt.id === 'all' 
                    ? shoppingData.finalItems.length 
                    : shoppingData.finalItems.filter(i => i.category === opt.id).length;
                  
                  if (opt.id !== 'all' && count === 0) return null;

                  return (
                      <button 
                        key={opt.id} 
                        onClick={() => setActiveFilter(opt.id)}
                        className={`px-5 py-2.5 rounded-full font-bold text-[11px] whitespace-nowrap transition-all duration-300 border flex items-center gap-2 ${
                            isActive 
                            ? 'bg-[#e6f2f1] border-[#147A74] text-[#147A74] shadow-sm' 
                            : 'bg-[#f4f7f6] border-transparent text-[#6e8a88] hover:bg-gray-100'
                        }`}
                      >
                          <span>{opt.emoji}</span>
                          {opt.label}
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-md ${isActive ? 'bg-[#147A74] text-white' : 'bg-white/50 text-[#6e8a88]'}`}>{count}</span>
                      </button>
                  );
              })}
          </div>

          {canScrollRight && (
              <button 
                onClick={() => scroll('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white/90 backdrop-blur shadow-md rounded-full flex items-center justify-center text-[#147A74] border border-gray-100 animate-fade-in"
              >
                  <ChevronRight className="w-5 h-5" />
              </button>
          )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredItems.length === 0 ? (
              <div className="col-span-full py-20 text-center space-y-4 opacity-20">
                  {activeFilter === 'all' ? (
                      <>
                        <ShoppingBag className="w-16 h-16 mx-auto" />
                        <p className="font-black text-sm uppercase tracking-widest">Nada que comprar por ahora</p>
                      </>
                  ) : (
                      <>
                        <FilterX className="w-16 h-16 mx-auto" />
                        <p className="font-black text-sm uppercase tracking-widest">No hay productos en esta categoría</p>
                        <button onClick={() => setActiveFilter('all')} className="text-teal-600 font-bold text-xs underline">Ver todos los productos</button>
                      </>
                  )}
              </div>
          ) : (
            filteredItems.map(item => {
                const isEditing = editingId === item.id;
                const catInfo = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[0];
                const canDecrement = item.quantity > 0;
                
                return (
                    <div key={item.id} onClick={() => toggleItem(item)} className={`bg-white p-3 md:p-4 rounded-[2.2rem] flex items-center gap-3 border-2 transition-all cursor-pointer ${item.is_purchased ? 'opacity-40 border-gray-50' : 'border-white shadow-sm hover:border-teal-100 hover:shadow-md'}`}>
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${item.is_purchased ? 'bg-green-50 border-green-500' : 'border-gray-100'}`}>
                            {item.is_purchased && <Check className="w-3.5 h-3.5 stroke-[4px] text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`font-bold capitalize leading-snug text-xs ${item.is_purchased ? 'line-through text-gray-400' : 'text-teal-950'}`}>
                                <span className="mr-2 opacity-50">{catInfo.emoji}</span>
                                {item.name}
                            </p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-teal-600/30 mt-0.5 ml-6">
                                {catInfo.label}
                            </p>
                        </div>
                        <div className="flex items-center bg-gray-50 rounded-xl p-0.5 border border-gray-100 flex-shrink-0 w-[100px] h-9" onClick={e => e.stopPropagation()}>
                            <button 
                                onClick={(e) => canDecrement && handleAdjust(e, item, -1)} 
                                disabled={!canDecrement}
                                className={`w-7 h-7 flex items-center justify-center transition-colors ${canDecrement ? 'text-gray-400 hover:text-red-500' : 'text-gray-200'}`}
                            >
                                <Minus className="w-3 h-3" />
                            </button>
                            <div className="flex-1 text-center min-w-0">
                                <input 
                                    type="text"
                                    inputMode="decimal"
                                    className="w-full bg-transparent font-black text-[10px] text-teal-900 leading-none text-center outline-none border-none p-0 focus:ring-0 tracking-tighter"
                                    value={isEditing ? localValue : formatQuantity(item.quantity, item.unit).replace('.', ',')}
                                    onChange={(e) => handleLocalChange(e.target.value)}
                                    onFocus={() => startEditing(item)}
                                    onBlur={() => finishEditing(item)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                                    onClick={e => (e.target as HTMLInputElement).select()}
                                />
                                <p className="text-[5px] font-black text-teal-600/40 uppercase tracking-tighter leading-none mt-0.5">{formatUnitLabel(item.unit)}</p>
                            </div>
                            <button onClick={(e) => handleAdjust(e, item, 1)} className="w-7 h-7 flex items-center justify-center text-teal-600 hover:text-teal-800 transition-colors"><Plus className="w-3 h-3" /></button>
                        </div>
                    </div>
                );
            })
          )}
      </div>

      <div className={`fixed left-8 right-8 md:left-auto md:right-8 z-[100] transition-all duration-500 ${shoppingData.finalItems.filter(i => i.is_purchased).length > 0 ? 'bottom-28 opacity-100' : 'bottom-[-100px] opacity-0'}`}>
          <button onClick={() => setShowReceipt(true)} className="w-full md:w-auto bg-[#013b33] text-white px-10 h-14 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-teal-900 shadow-xl active:scale-95 transition-all text-xs uppercase tracking-[0.2em]">
              <Check className="w-5 h-5 stroke-[3px]" /> TERMINAR COMPRA
          </button>
      </div>

      {showReceipt && (
          <ModalPortal>
              <div className="fixed inset-0 z-[5000] bg-teal-900/90 backdrop-blur-xl flex items-center justify-center p-6" onClick={() => setShowReceipt(false)}>
                  <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative animate-slide-up" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setShowReceipt(false)} className="absolute top-8 right-8 p-2 bg-gray-50 rounded-full"><X className="w-5 h-5 text-gray-400" /></button>
                    <div className="mb-6">
                        <h3 className="text-2xl font-black text-teal-900">¿Guardar Compra?</h3>
                        <p className="text-gray-400 text-sm font-medium mt-1">Los items marcados se añadirán a tu despensa.</p>
                    </div>
                    <div className="max-h-[40vh] overflow-y-auto mb-8 space-y-3 no-scrollbar border-t border-b border-gray-50 py-4">
                        {shoppingData.finalItems.filter(i => i.is_purchased && i.quantity > 0).map(item => (
                            <div key={item.id} className="flex justify-between items-center">
                                <span className="font-bold capitalize text-teal-950 text-sm">{item.name}</span>
                                <span className="font-black text-teal-600 text-sm">{formatQuantity(item.quantity, item.unit)} {item.unit}</span>
                            </div>
                        ))}
                    </div>
                    <button onClick={confirmFinish} disabled={isProcessing} className="w-full h-14 bg-[#013b33] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-teal-800 transition-all active:scale-95">
                        {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : 'CONFIRMAR Y GUARDAR'}
                    </button>
                  </div>
              </div>
          </ModalPortal>
      )}

      {showCelebration && (
          <ModalPortal>
            <div className="fixed inset-0 z-[5001] bg-[#013b33] flex flex-col items-center justify-center p-8 text-white text-center animate-fade-in">
                <PartyPopper className="w-32 h-32 mb-8 text-orange-400 animate-bounce" />
                <h2 className="text-4xl font-black mb-4">¡Compra Lista!</h2>
                <p className="text-teal-200/60 font-medium mb-12 max-w-xs">Tu despensa ha sido actualizada automáticamente.</p>
                <button onClick={() => setShowCelebration(false)} className="px-12 h-14 bg-white text-[#013b33] rounded-2xl font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all">VOLVER AL PANEL</button>
            </div>
          </ModalPortal>
      )}
    </div>
  );
};
