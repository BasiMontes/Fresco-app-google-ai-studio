
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PantryItem } from '../types';
import { Package, Plus, Trash2, Calendar, X, Save, AlertTriangle, Clock, Minus, Plus as PlusIcon, Camera, Sparkles, Pencil, CheckCircle2, AlertOctagon, WifiOff, Search, ChevronDown, ChevronUp, Wand2, RotateCcw, Utensils, ArrowRight, Skull, Zap, Tag } from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { TicketScanner } from './TicketScanner';
import { PREDICTIVE_CATEGORY_RULES, SPANISH_PRICES } from '../constants';

interface PantryProps {
  items: PantryItem[];
  highlightId?: string | null; 
  onRemove: (id: string) => void;
  onAdd: (item: PantryItem) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onAddMany: (items: PantryItem[]) => void;
  onEdit: (item: PantryItem) => void;
  onWaste?: (item: PantryItem, value: number) => void;
  onCook?: (itemName: string) => void; 
  isOnline?: boolean;
}

const CATEGORIES_OPTIONS = [
    { id: 'vegetables', label: 'Verduras', emoji: '🥦' },
    { id: 'fruits', label: 'Frutas', emoji: '🍎' },
    { id: 'dairy', label: 'Lácteos', emoji: '🧀' },
    { id: 'meat', label: 'Carne', emoji: '🥩' },
    { id: 'fish', label: 'Pescado', emoji: '🐟' },
    { id: 'grains', label: 'Cereales', emoji: '🥖' },
    { id: 'pantry', label: 'Despensa', emoji: '🥫' },
    { id: 'spices', label: 'Especias', emoji: '🧂' },
    { id: 'other', label: 'Otros', emoji: '🛍️' },
];

const UNITS_OPTIONS = [
    'uds', 'g', 'kg', 'ml', 'l', 'paquete', 'bote', 'lonchas', 'ración', 'pizca'
];

export const Pantry: React.FC<PantryProps> = ({ items, highlightId, onRemove, onAdd, onUpdateQuantity, onAddMany, onEdit, onWaste, onCook, isOnline = true }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToEdit, setItemToEdit] = useState<PantryItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'expired' | 'critical' | 'fresh'>('all');

  const [newItem, setNewItem] = useState({ 
    name: '', 
    quantity: 1, 
    unit: 'uds', 
    category: 'pantry',
    daysToExpire: 7
  });
  
  const [manualOverride, setManualOverride] = useState({ category: false, unit: false });
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
      if (highlightId && itemRefs.current[String(highlightId)]) {
          setTimeout(() => {
              itemRefs.current[String(highlightId)]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
      }
  }, [highlightId, items]);

  useEffect(() => {
      if (!newItem.name) return;
      const lowerName = newItem.name.toLowerCase();
      const matchKey = Object.keys(PREDICTIVE_CATEGORY_RULES).find(key => lowerName.includes(key));
      
      if (matchKey) {
          const rule = PREDICTIVE_CATEGORY_RULES[matchKey];
          setNewItem(prev => ({
              ...prev,
              category: manualOverride.category ? prev.category : rule.category,
              unit: manualOverride.unit ? prev.unit : rule.unit
          }));
      }
  }, [newItem.name, manualOverride]);

  const handleManualAdd = (e?: React.FormEvent) => {
    if(e) e.preventDefault();
    if (!newItem.name.trim()) return;
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + newItem.daysToExpire);

    onAdd({
      id: `manual-${Date.now()}`,
      name: newItem.name.trim(),
      quantity: Math.max(0, newItem.quantity),
      unit: newItem.unit,
      category: newItem.category,
      added_at: new Date().toISOString(),
      expires_at: expiryDate.toISOString()
    });
    setNewItem({ name: '', quantity: 1, unit: 'uds', category: 'pantry', daysToExpire: 7 });
    setManualOverride({ category: false, unit: false });
    setShowAddModal(false);
  };

  const getExpiryStatus = (item: PantryItem) => {
    if (!item.expires_at) return null;
    const days = differenceInDays(new Date(item.expires_at), new Date());
    if (isPast(new Date(item.expires_at)) && days < 0) return { type: 'expired', label: 'Caducado', color: 'bg-red-500', text: 'text-red-500' };
    if (days <= 2) return { type: 'critical', label: `${days === 0 ? 'Hoy' : days + 'd'}`, color: 'bg-orange-500', text: 'text-orange-500' };
    return { type: 'fresh', label: 'OK', color: 'bg-teal-500', text: 'text-teal-500' };
  };

  const getSmartStep = (unit: string) => {
      const u = (unit || '').toLowerCase().trim();
      if (u === 'g' || u === 'ml') return 50; 
      if (u === 'kg' || u === 'l') return 0.1;
      return 1;
  };

  const filteredItems = useMemo<PantryItem[]>(() => {
      let result = items;
      if (activeFilter !== 'all') {
          result = result.filter(item => {
              const status = getExpiryStatus(item);
              return status?.type === activeFilter;
          });
      }
      if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          result = result.filter(item => item.name.toLowerCase().includes(lower));
      }
      return result;
  }, [items, activeFilter, searchTerm]);

  const groupedItems = useMemo(() => {
      const grouped: Record<string, PantryItem[]> = {};
      filteredItems.forEach(item => {
          const cat = item.category || 'other';
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(item);
      });
      return grouped;
  }, [filteredItems]);

  const handleQtyChange = (id: string, current: number, delta: number) => {
      if (current + delta < 0) return;
      onUpdateQuantity(id, delta);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-48 px-1 md:px-0 max-w-screen-2xl mx-auto">
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-0.5">
            <h1 className="text-3xl font-black text-teal-950 tracking-tight flex items-center gap-3">
                <Package className="w-8 h-8 text-teal-600" /> Despensa
            </h1>
            <p className="text-gray-400 font-bold uppercase text-[9px] tracking-[0.2em] pl-1 opacity-60">Control de stock inteligente</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <div className="relative group min-w-[240px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 w-3.5 h-3.5 group-focus-within:text-teal-600 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Buscar en el inventario..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl font-bold text-teal-900 text-xs shadow-sm focus:outline-none focus:border-teal-500 focus:shadow-md transition-all placeholder-gray-300"
                />
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => { if(isOnline) setShowScanner(true); }}
                    disabled={!isOnline}
                    className={`px-5 py-2.5 rounded-xl flex items-center justify-center gap-2.5 font-black text-[10px] uppercase tracking-widest shadow-sm transition-all ${isOnline ? 'bg-orange-500 text-white hover:bg-orange-600 active:scale-95' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                >
                    {isOnline ? <><Camera className="w-4 h-4" /> Escanear</> : <WifiOff className="w-4 h-4" />}
                </button>
                <button 
                    onClick={() => setShowAddModal(true)} 
                    className="px-5 py-2.5 bg-teal-900 text-white rounded-xl flex items-center justify-center gap-2.5 shadow-sm hover:bg-teal-800 active:scale-95 transition-all font-black text-[10px] uppercase tracking-widest"
                >
                    <Plus className="w-4 h-4" /> Nuevo
                </button>
            </div>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {['all', 'expired', 'critical', 'fresh'].map(f => {
              const isActive = activeFilter === f;
              const labels = { all: 'Todo', expired: 'Caducado', critical: 'Próximo', fresh: 'Vigente' };
              return (
                  <button 
                    key={f}
                    onClick={() => setActiveFilter(f as any)}
                    className={`px-4 py-1.5 rounded-full border-2 font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${
                        isActive ? 'bg-teal-900 border-teal-900 text-white shadow-sm' : 'bg-white border-gray-100 text-gray-400 hover:border-teal-200 hover:text-teal-900'
                    }`}
                  >
                      {(labels as any)[f]}
                  </button>
              );
          })}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[40vh] text-center px-12 border-2 border-dashed border-gray-100 rounded-[2.5rem] bg-gray-50/20">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center mb-6 animate-float">
            <Package className="w-8 h-8 text-teal-200" />
          </div>
          <h2 className="text-xl font-black text-teal-950 mb-2">Tu despensa está vacía</h2>
          <p className="text-gray-400 text-xs font-medium max-w-xs mx-auto mb-8 leading-relaxed">
            Escanea un ticket o añade productos para empezar a ahorrar tiempo y dinero.
          </p>
          <button 
            onClick={() => setShowAddModal(true)} 
            className="px-8 py-3.5 bg-teal-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
          >
            Añadir Producto
          </button>
        </div>
      ) : (
        <div className="space-y-12">
            {Object.keys(groupedItems).sort().map(cat => (
                <div key={cat} className="space-y-4">
                    <div className="flex items-center gap-3 px-1">
                        <span className="text-xl">{CATEGORIES_OPTIONS.find(c => c.id === cat)?.emoji}</span>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-800/50">
                            {CATEGORIES_OPTIONS.find(c => c.id === cat)?.label || cat}
                        </h3>
                        <div className="flex-1 h-[1px] bg-gray-100" />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4">
                        {groupedItems[cat].map(item => {
                            const status = getExpiryStatus(item);
                            const step = getSmartStep(item.unit);
                            const displayQty = Math.max(0, item.quantity);

                            return (
                                <div 
                                    key={item.id}
                                    className="bg-white rounded-2xl border border-gray-100 p-4 relative group transition-all duration-300 hover:shadow-xl hover:border-teal-100"
                                >
                                    <div className="flex flex-col h-full gap-3">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-teal-950 text-sm truncate capitalize leading-tight mb-0.5">
                                                    {item.name}
                                                </h4>
                                                {status && (
                                                    <div className={`flex items-center gap-1 ${status.text} text-[8px] font-black uppercase tracking-widest`}>
                                                        <Clock className="w-2.5 h-2.5" /> {status.label}
                                                    </div>
                                                )}
                                            </div>
                                            <button 
                                                onClick={() => setItemToEdit(item)}
                                                className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-300 hover:bg-teal-900 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <div className="mt-auto bg-gray-50/50 rounded-xl p-1.5 flex items-center justify-between border border-transparent group-hover:bg-teal-50/30 transition-all">
                                            <button 
                                                onClick={() => handleQtyChange(item.id, item.quantity, -step)}
                                                disabled={displayQty <= 0}
                                                className="w-8 h-8 flex items-center justify-center text-gray-400 bg-white rounded-lg shadow-sm hover:text-red-500 hover:shadow active:scale-90 transition-all disabled:opacity-20"
                                            ><Minus className="w-4 h-4" /></button>
                                            
                                            <div className="text-center flex flex-col items-center px-1">
                                                <span className="text-sm font-black text-teal-950 tabular-nums leading-none">
                                                    {Number.isInteger(displayQty) ? displayQty : displayQty.toFixed(1)}
                                                </span>
                                                <span className="text-[8px] font-black uppercase text-gray-400 tracking-tighter mt-0.5">{item.unit}</span>
                                            </div>

                                            <button 
                                                onClick={() => handleQtyChange(item.id, item.quantity, step)}
                                                className="w-8 h-8 flex items-center justify-center text-gray-400 bg-white rounded-lg shadow-sm hover:text-teal-600 hover:shadow active:scale-90 transition-all"
                                            ><PlusIcon className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[5000] bg-teal-950/20 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
            <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl relative">
                <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"><X className="w-4 h-4 text-gray-400" /></button>
                <h2 className="text-xl font-black text-teal-950 mb-6 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-teal-600" /> Nuevo Producto
                </h2>
                
                <form onSubmit={handleManualAdd} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Nombre</label>
                        <input autoFocus type="text" placeholder="Ej. Tomates Cherry" className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold text-teal-900 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                    </div>
                    
                    <div className="flex gap-3">
                        <div className="flex-[0.6] space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Cantidad</label>
                            <input type="number" step="0.1" min="0" className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold text-teal-900 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value)})} />
                        </div>
                        <div className="flex-1 space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Unidad</label>
                            <select 
                                className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold text-teal-900 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer appearance-none bg-no-repeat bg-[right_1rem_center]" 
                                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23cbd5e1'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1em' }}
                                value={newItem.unit} 
                                onChange={e => { setNewItem({...newItem, unit: e.target.value}); setManualOverride(prev => ({...prev, unit: true})); }}
                            >
                                {UNITS_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Categoría</label>
                        <select 
                            className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold text-teal-900 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer appearance-none" 
                            value={newItem.category} 
                            onChange={e => { setNewItem({...newItem, category: e.target.value}); setManualOverride(prev => ({...prev, category: true})); }}
                        >
                            {CATEGORIES_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                        </select>
                    </div>

                    <button type="submit" className="w-full py-4 bg-teal-900 text-white rounded-xl font-black uppercase tracking-[0.1em] text-[10px] shadow-lg active:scale-95 transition-all mt-2 hover:bg-teal-800">Añadir a Despensa</button>
                </form>
            </div>
        </div>
      )}

      {showScanner && (
          <TicketScanner 
              onClose={() => setShowScanner(false)}
              onAddItems={(items) => {
                  onAddMany(items);
                  setShowScanner(false);
              }}
          />
      )}

      {itemToEdit && (
        <div className="fixed inset-0 z-[5000] bg-teal-950/20 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
            <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl relative">
                <button onClick={() => setItemToEdit(null)} className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"><X className="w-4 h-4 text-gray-400" /></button>
                <h3 className="text-xl font-black text-teal-900 mb-6">Editar Producto</h3>
                <form onSubmit={(e) => { e.preventDefault(); onEdit(itemToEdit); setItemToEdit(null); }} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-gray-400">Nombre</label>
                        <input className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold text-teal-900 text-sm focus:ring-1 focus:ring-teal-500 outline-none" value={itemToEdit.name} onChange={e => setItemToEdit({...itemToEdit, name: e.target.value})} />
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-[0.6] space-y-1">
                            <label className="text-[9px] font-black uppercase text-gray-400">Cantidad</label>
                            <input type="number" step="0.1" min="0" className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold text-teal-900 text-sm focus:ring-1 focus:ring-teal-500 outline-none" value={itemToEdit.quantity} onChange={e => setItemToEdit({...itemToEdit, quantity: parseFloat(e.target.value)})} />
                        </div>
                        <div className="flex-1 space-y-1">
                            <label className="text-[9px] font-black uppercase text-gray-400">Unidad</label>
                            <select 
                                className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold text-teal-900 text-sm focus:ring-1 focus:ring-teal-500 outline-none cursor-pointer appearance-none" 
                                value={itemToEdit.unit} 
                                onChange={e => setItemToEdit({...itemToEdit, unit: e.target.value})}
                            >
                                {UNITS_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-2 pt-4">
                        <button type="button" onClick={() => onRemove(itemToEdit.id)} className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                        <button type="submit" className="flex-1 py-3 bg-teal-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-teal-800 transition-all">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}
