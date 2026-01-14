
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PantryItem } from '../types';
import { Package, Plus, Trash2, Calendar, X, Clock, Minus, Plus as PlusIcon, Camera, Pencil, WifiOff, Search, AlertCircle, CalendarDays, History } from 'lucide-react';
import { format, differenceInDays, isPast, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { TicketScanner } from './TicketScanner';
import { PREDICTIVE_CATEGORY_RULES } from '../constants';
import { triggerDialog } from './Dialog';

interface PantryProps {
  items: PantryItem[];
  highlightId?: string | null; 
  onRemove: (id: string) => void;
  onAdd: (item: PantryItem) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onAddMany: (items: PantryItem[]) => void;
  onEdit: (item: PantryItem) => void;
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

const UNITS_OPTIONS = ['uds', 'g', 'kg', 'ml', 'l', 'paquete', 'bote', 'lonchas', 'ración', 'pizca'];

export const Pantry: React.FC<PantryProps> = ({ items, highlightId, onRemove, onAdd, onUpdateQuantity, onAddMany, onEdit, isOnline = true }) => {
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
    const expiryDate = addDays(new Date(), newItem.daysToExpire);
    onAdd({
      id: `manual-${Date.now()}`,
      name: newItem.name.trim(),
      quantity: Math.max(0.1, newItem.quantity),
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
    if (!item.expires_at) return { type: 'fresh', label: 'Sin fecha', color: 'bg-gray-400', text: 'text-gray-400' };
    const days = differenceInDays(new Date(item.expires_at), new Date());
    if (isPast(new Date(item.expires_at)) && days < 0) return { type: 'expired', label: 'Caducado', color: 'bg-red-500', text: 'text-red-600' };
    if (days <= 3) return { type: 'critical', label: `En ${days <= 0 ? 'hoy' : days + 'd'}`, color: 'bg-orange-500', text: 'text-orange-600' };
    return { type: 'fresh', label: 'Vigente', color: 'bg-green-500', text: 'text-green-600' };
  };

  const handleDeleteAttempt = (item: PantryItem) => {
    triggerDialog({
        title: '¿Eliminar producto?',
        message: `Vas a quitar "${item.name}" de tu inventario.`,
        type: 'confirm',
        confirmText: 'Sí, eliminar',
        onConfirm: () => {
            onRemove(item.id);
            setItemToEdit(null);
        }
    });
  };

  const handleQtyChange = (item: PantryItem, delta: number) => {
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
          handleDeleteAttempt(item);
      } else {
          onUpdateQuantity(item.id, delta);
      }
  };

  const filteredItems = useMemo(() => {
      let result = items;
      if (activeFilter !== 'all') {
          result = result.filter(item => getExpiryStatus(item).type === activeFilter);
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

  const selectChevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23cbd5e1'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`;

  return (
    <div className="space-y-6 animate-fade-in pb-48 max-w-screen-2xl mx-auto">
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-black text-teal-950 flex items-center gap-2">
                <Package className="w-6 h-6 text-teal-600" /> Despensa
            </h1>
            <p className="text-gray-400 font-bold uppercase text-[8px] tracking-[0.2em] ml-1">Inventario Profesional</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-3 h-3 group-focus-within:text-teal-600" />
                <input type="text" placeholder="Filtrar stock..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 bg-white border border-gray-100 rounded-lg font-bold text-teal-900 text-xs shadow-sm focus:outline-none focus:border-teal-500 transition-all"
                />
            </div>
            <div className="flex gap-2">
                <button onClick={() => isOnline && setShowScanner(true)} disabled={!isOnline}
                    className={`flex-1 md:flex-none px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-widest shadow-sm transition-all ${isOnline ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-gray-100 text-gray-400'}`}
                >
                    {isOnline ? <><Camera className="w-4 h-4" /> Escanear</> : <WifiOff className="w-4 h-4" />}
                </button>
                <button onClick={() => setShowAddModal(true)} 
                    className="px-4 py-2 bg-teal-900 text-white rounded-lg flex items-center justify-center gap-2 shadow-sm font-black text-[9px] uppercase tracking-widest hover:bg-teal-800"
                >
                    <Plus className="w-4 h-4" /> Nuevo
                </button>
            </div>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {['all', 'expired', 'critical', 'fresh'].map(f => {
              const isActive = activeFilter === f;
              const labels = { all: 'Todo', expired: 'Caducado', critical: 'Crítico', fresh: 'Óptimo' };
              return (
                  <button key={f} onClick={() => setActiveFilter(f as any)}
                    className={`px-3 py-1 rounded-full border font-black text-[8px] uppercase tracking-widest transition-all ${
                        isActive ? 'bg-teal-900 border-teal-900 text-white' : 'bg-white border-gray-100 text-gray-400 hover:text-teal-600'
                    }`}
                  >
                      {(labels as any)[f]}
                  </button>
              );
          })}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[30vh] border border-dashed border-gray-200 rounded-2xl bg-gray-50/10">
          <Package className="w-6 h-6 text-gray-200 mb-3" />
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Sin existencias registradas</p>
        </div>
      ) : (
        <div className="space-y-8">
            {Object.keys(groupedItems).sort().map(cat => (
                <div key={cat} className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                        <span className="text-sm">{CATEGORIES_OPTIONS.find(c => c.id === cat)?.emoji}</span>
                        <h3 className="text-[8px] font-black uppercase tracking-[0.3em] text-teal-800/40">
                            {CATEGORIES_OPTIONS.find(c => c.id === cat)?.label || cat}
                        </h3>
                        <div className="flex-1 h-[1px] bg-gray-50" />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
                        {groupedItems[cat].map(item => {
                            const status = getExpiryStatus(item);
                            const step = (item.unit === 'kg' || item.unit === 'l') ? 0.1 : 1;

                            return (
                                <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-3 flex flex-col gap-2 hover:shadow-md transition-all group">
                                    <div className="flex justify-between items-start gap-1">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-teal-950 text-[11px] truncate capitalize leading-tight">{item.name}</h4>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${status.color}`} />
                                                <span className={`text-[7px] font-black uppercase tracking-widest ${status.text}`}>{status.label}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => setItemToEdit(item)} className="p-1.5 bg-gray-50 rounded-lg text-gray-300 hover:bg-teal-900 hover:text-white transition-all">
                                            <Pencil className="w-2.5 h-2.5" />
                                        </button>
                                    </div>

                                    <div className="bg-gray-50/50 rounded-lg p-1 flex items-center justify-between mt-1">
                                        <button onClick={() => handleQtyChange(item, -step)} className="w-6 h-6 flex items-center justify-center text-gray-400 bg-white rounded-md shadow-sm hover:text-red-500 active:scale-90"><Minus className="w-3 h-3" /></button>
                                        <div className="text-center flex flex-col items-center">
                                            <span className="text-[11px] font-black text-teal-900 leading-none">{item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1)}</span>
                                            <span className="text-[6px] font-black uppercase text-gray-400 tracking-tighter">{item.unit}</span>
                                        </div>
                                        <button onClick={() => handleQtyChange(item, step)} className="w-6 h-6 flex items-center justify-center text-gray-400 bg-white rounded-md shadow-sm hover:text-teal-600 active:scale-90"><PlusIcon className="w-3 h-3" /></button>
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
        <div className="fixed inset-0 z-[5000] bg-teal-900/10 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl relative">
                <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                <h2 className="text-lg font-black text-teal-950 mb-5">Nuevo Item</h2>
                <form onSubmit={handleManualAdd} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase text-gray-400 ml-1">Nombre</label>
                        <input autoFocus type="text" placeholder="Ej. Leche Semidesnatada" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})}
                            className="w-full px-3 py-2 bg-gray-50 rounded-lg font-bold text-teal-900 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1 space-y-1">
                            <label className="text-[8px] font-black uppercase text-gray-400 ml-1">Stock</label>
                            <input type="number" step="0.1" min="0.1" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value)})}
                                className="w-full px-3 py-2 bg-gray-50 rounded-lg font-bold text-teal-900 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <label className="text-[8px] font-black uppercase text-gray-400 ml-1">Unidad</label>
                            <select value={newItem.unit} onChange={e => { setNewItem({...newItem, unit: e.target.value}); setManualOverride(prev => ({...prev, unit: true})); }}
                                className="w-full px-3 py-2 bg-gray-50 rounded-lg font-bold text-teal-900 text-sm cursor-pointer appearance-none bg-no-repeat bg-[right_0.5rem_center]" 
                                style={{ backgroundImage: selectChevron, backgroundSize: '0.8em' }}>
                                {UNITS_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase text-gray-400 ml-1">Días hasta caducar</label>
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                            <CalendarDays className="w-4 h-4 text-teal-600" />
                            <input type="number" value={newItem.daysToExpire} onChange={e => setNewItem({...newItem, daysToExpire: parseInt(e.target.value)})}
                                className="bg-transparent font-bold text-teal-900 text-sm outline-none w-full" />
                            <span className="text-[10px] font-black text-gray-400">DÍAS</span>
                        </div>
                    </div>
                    <button type="submit" className="w-full py-3 bg-teal-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 mt-2">Registrar Stock</button>
                </form>
            </div>
        </div>
      )}

      {showScanner && (
          <TicketScanner onClose={() => setShowScanner(false)} onAddItems={(items) => { onAddMany(items); setShowScanner(false); }} />
      )}

      {itemToEdit && (
        <div className="fixed inset-0 z-[5000] bg-teal-900/10 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl relative">
                <button onClick={() => setItemToEdit(null)} className="absolute top-4 right-4 p-2 text-gray-400"><X className="w-4 h-4" /></button>
                <h3 className="text-lg font-black text-teal-900 mb-5">Detalle del Producto</h3>
                <form onSubmit={(e) => { e.preventDefault(); onEdit(itemToEdit); setItemToEdit(null); }} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase text-gray-400 ml-1">Nombre</label>
                        <input className="w-full px-3 py-2 bg-gray-50 rounded-lg font-bold text-teal-900 text-sm outline-none" value={itemToEdit.name} onChange={e => setItemToEdit({...itemToEdit, name: e.target.value})} />
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1 space-y-1">
                            <label className="text-[8px] font-black uppercase text-gray-400 ml-1">Cantidad</label>
                            <input type="number" step="0.1" value={itemToEdit.quantity} onChange={e => setItemToEdit({...itemToEdit, quantity: parseFloat(e.target.value)})}
                                className="w-full px-3 py-2 bg-gray-50 rounded-lg font-bold text-teal-900 text-sm outline-none" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <label className="text-[8px] font-black uppercase text-gray-400 ml-1">Unidad</label>
                            <select value={itemToEdit.unit} onChange={e => setItemToEdit({...itemToEdit, unit: e.target.value})}
                                className="w-full px-3 py-2 bg-gray-50 rounded-lg font-bold text-teal-900 text-sm appearance-none bg-no-repeat bg-[right_0.5rem_center]"
                                style={{ backgroundImage: selectChevron, backgroundSize: '0.8em' }}>
                                {UNITS_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50 mt-2">
                        <div className="space-y-1">
                            <label className="text-[8px] font-black uppercase text-gray-400 flex items-center gap-1"><History className="w-2.5 h-2.5" /> Compra</label>
                            <p className="text-[10px] font-bold text-teal-800 bg-gray-50 p-2 rounded-lg">{format(new Date(itemToEdit.added_at), 'd MMM yyyy', { locale: es })}</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[8px] font-black uppercase text-gray-400 flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> Caducidad</label>
                            <input type="date" value={itemToEdit.expires_at ? itemToEdit.expires_at.split('T')[0] : ''} 
                                onChange={e => setItemToEdit({...itemToEdit, expires_at: new Date(e.target.value).toISOString()})}
                                className="w-full p-2 bg-teal-50 border border-teal-100 rounded-lg font-bold text-[10px] text-teal-900 outline-none" />
                        </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <button type="button" onClick={() => handleDeleteAttempt(itemToEdit)} className="w-10 h-10 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                            <Trash2 className="w-4 h-4" />
                        </button>
                        <button type="submit" className="flex-1 py-3 bg-teal-900 text-white rounded-lg font-black text-[9px] uppercase tracking-widest shadow-md hover:bg-teal-800">Actualizar Stock</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}
