
import React, { useMemo, useState } from 'react';
import { MealSlot, Recipe, ShoppingItem, PantryItem, UserProfile } from '../types';
import { SPANISH_PRICES, SUPERMARKETS, EXPIRY_DAYS_BY_CATEGORY } from '../constants';
import { ShoppingBag, Check, TrendingDown, X, Plus, Minus, Eye, PartyPopper, Loader2, CheckSquare } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cleanName } from '../services/unitService';
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

const formatUnitLabel = (unit: string = '') => unit.toUpperCase() || 'UDS';

export const ShoppingList: React.FC<ShoppingListProps> = ({ plan, recipes, pantry, user, dbItems, onAddShoppingItem, onUpdateShoppingItem, onRemoveShoppingItem, onFinishShopping }) => {
  const [showReceipt, setShowReceipt] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [hidePurchased, setHidePurchased] = useState(false);
  const [newExtra, setNewExtra] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const shoppingData = useMemo(() => {
    // Lógica simple de combinación de necesidades
    const needs: Record<string, ShoppingItem> = {};
    
    // 1. Necesidades del plan
    plan.forEach(slot => {
        const recipe = recipes.find(r => r.id === slot.recipeId);
        if (!recipe) return;
        recipe.ingredients.forEach(ing => {
            const key = cleanName(ing.name);
            const qty = (ing.quantity / recipe.servings) * slot.servings;
            if (needs[key]) needs[key].quantity += qty;
            else needs[key] = { id: `calc-${key}`, name: ing.name, quantity: qty, unit: ing.unit, category: ing.category, estimated_price: 0, is_purchased: false };
        });
    });

    // 2. Restar lo que hay en despensa (Lógica simplificada)
    Object.keys(needs).forEach(key => {
        const inPantry = pantry.find(p => cleanName(p.name).includes(key));
        if (inPantry) needs[key].quantity = Math.max(0, needs[key].quantity - inPantry.quantity);
    });

    // 3. Fusionar con ítems manuales en DB
    const finalItems = [...dbItems];
    Object.values(needs).forEach(item => {
        if (item.quantity > 0.1 && !dbItems.some(db => cleanName(db.name) === cleanName(item.name))) {
            finalItems.push(item);
        }
    });

    const total = finalItems.reduce((acc, i) => acc + (i.quantity * (SPANISH_PRICES[cleanName(i.name)] || 1.5)), 0);
    const progress = finalItems.length === 0 ? 0 : Math.round((finalItems.filter(i => i.is_purchased).length / finalItems.length) * 100);

    return { finalItems, total, progress };
  }, [plan, recipes, pantry, dbItems]);

  const toggleItem = (item: ShoppingItem) => {
    if (item.id.startsWith('calc-')) {
        onAddShoppingItem([{ ...item, id: `db-${Date.now()}`, is_purchased: true }]);
    } else {
        onUpdateShoppingItem({ ...item, is_purchased: !item.is_purchased });
    }
  };

  const handleAdjust = (e: React.MouseEvent, item: ShoppingItem, delta: number) => {
    e.stopPropagation();
    const newQty = Math.max(0, item.quantity + delta);
    if (item.id.startsWith('calc-')) {
        onAddShoppingItem([{ ...item, id: `db-${Date.now()}`, quantity: newQty }]);
    } else {
        onUpdateShoppingItem({ ...item, quantity: newQty });
    }
  };

  const confirmFinish = () => {
    setIsProcessing(true);
    const purchased = shoppingData.finalItems.filter(i => i.is_purchased);
    const newPantryItems: PantryItem[] = purchased.map(i => ({
        id: `p-${Date.now()}-${Math.random()}`,
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        category: i.category,
        added_at: new Date().toISOString()
    }));
    onFinishShopping(newPantryItems);
    setShowReceipt(false);
    setShowCelebration(true);
    setIsProcessing(false);
    confetti({ particleCount: 150, spread: 70 });
  };

  return (
    <div className="max-w-4xl mx-auto pb-48 animate-fade-in px-4">
      <div className="bg-[#013b33] rounded-[2.5rem] p-8 text-white shadow-2xl mb-8 relative">
        <div className="flex justify-between items-start mb-6">
            <h1 className="text-3xl font-black">Lista de Compra</h1>
            <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10 text-base font-black">
                {shoppingData.total.toFixed(2)}€
            </div>
        </div>
        <div className="bg-white/10 rounded-full h-3 w-full mb-3 p-0.5">
            <div className="bg-[#e87c3e] h-full rounded-full transition-all duration-700" style={{ width: `${shoppingData.progress}%` }} />
        </div>
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-teal-300">
            <span>{shoppingData.progress}% COMPRADO</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shoppingData.finalItems.map(item => (
              <div key={item.id} onClick={() => toggleItem(item)} className={`bg-white p-5 rounded-[2rem] flex items-center gap-4 border-2 transition-all cursor-pointer ${item.is_purchased ? 'opacity-40 border-gray-50' : 'border-white shadow-sm hover:border-teal-100 hover:shadow-md'}`}>
                  <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${item.is_purchased ? 'bg-green-500 border-green-500 text-white' : 'border-gray-100'}`}>
                      {item.is_purchased && <Check className="w-5 h-5 stroke-[4px]" />}
                  </div>
                  <div className="flex-1">
                      <p className={`font-bold capitalize ${item.is_purchased ? 'line-through text-gray-400' : 'text-teal-950'}`}>{item.name}</p>
                  </div>
                  <div className="flex items-center bg-gray-50 rounded-2xl p-1 border border-gray-100" onClick={e => e.stopPropagation()}>
                      <button onClick={(e) => handleAdjust(e, item, -1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"><Minus className="w-4 h-4" /></button>
                      <div className="px-3 text-center min-w-[50px]">
                          <p className="font-black text-sm text-teal-900 leading-none">{item.quantity}</p>
                          <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">{formatUnitLabel(item.unit)}</p>
                      </div>
                      <button onClick={(e) => handleAdjust(e, item, 1)} className="w-8 h-8 flex items-center justify-center text-teal-600 hover:text-teal-800 transition-colors"><Plus className="w-4 h-4" /></button>
                  </div>
              </div>
          ))}
      </div>

      <div className="fixed bottom-32 right-8 z-[100]">
          <button onClick={() => setShowReceipt(true)} disabled={shoppingData.finalItems.length === 0} className="bg-[#013b33] text-white px-8 h-16 rounded-full font-black flex items-center justify-center gap-3 hover:bg-teal-900 shadow-2xl active:scale-95 transition-all text-xs uppercase tracking-[0.2em] disabled:opacity-50">
              <Check className="w-5 h-5 stroke-[4px]" /> TERMINAR COMPRA
          </button>
      </div>

      {showReceipt && (
          <div className="fixed inset-0 z-[5000] bg-teal-900/90 backdrop-blur-xl flex items-center justify-center p-6" onClick={() => setShowReceipt(false)}>
              <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                  <h3 className="text-2xl font-black text-teal-900 mb-6">Confirmar Compra</h3>
                  <div className="max-h-[40vh] overflow-y-auto mb-8 space-y-3 no-scrollbar">
                      {shoppingData.finalItems.filter(i => i.is_purchased).map(item => (
                          <div key={item.id} className="flex justify-between border-b border-gray-50 pb-2">
                              <span className="font-bold capitalize">{item.name}</span>
                              <span className="font-black text-teal-600">{item.quantity} {item.unit}</span>
                          </div>
                      ))}
                  </div>
                  <button onClick={confirmFinish} disabled={isProcessing} className="w-full py-5 bg-[#013b33] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
                      {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : 'CONFIRMAR Y GUARDAR'}
                  </button>
              </div>
          </div>
      )}

      {showCelebration && (
          <div className="fixed inset-0 z-[5001] bg-[#013b33] flex flex-col items-center justify-center p-8 text-white text-center">
              <PartyPopper className="w-32 h-32 mb-8 text-yellow-400 animate-bounce" />
              <h2 className="text-4xl font-black mb-12">¡Compra Lista!</h2>
              <button onClick={() => setShowCelebration(false)} className="px-12 py-5 bg-white text-[#013b33] rounded-full font-black uppercase tracking-widest shadow-2xl">VOLVER AL PANEL</button>
          </div>
      )}
    </div>
  );
};
