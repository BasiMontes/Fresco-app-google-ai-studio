
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PantryItem } from '../types';
import { Package, Plus, Trash2, Calendar, X, Clock, Minus, Plus as PlusIcon, Camera, Pencil, WifiOff, Search, AlertCircle, CalendarDays, History, MoreHorizontal } from 'lucide-react';
import { format, differenceInDays, startOfDay, addDays } from 'date-fns';
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
    { id: 'dairy', label: 'Lácteos y Huevos', emoji: '🧀' },
    { id: 'meat', label: 'Carnes', emoji: '🥩' },
    { id: 'fish', label: 'Pescados', emoji: '🐟' },
    { id: 'pasta', label: 'Pasta y Arroz', emoji: '🍝' },
    { id: 'legumes', label: 'Legumbres', emoji: '🫘' },
    { id: 'broths', label: 'Caldos y Sopas', emoji: '🥣' },
    { id: 'bakery', label: 'Panadería', emoji: '🥖' },
    { id: 'frozen', label: 'Congelados', emoji: '❄️' },
    { id: 'pantry', label: 'Despensa', emoji: '🥫' },
    { id: 'spices', label: 'Especias', emoji: '🧂' },
    { id: 'drinks', label: 'Bebidas', emoji: '🥤' },
    { id: 'other', label: 'Otros', emoji: '🛍️' },
];

const UNITS_OPTIONS = ['uds', 'g', 'kg', 'ml', 'l', 'paquete', 'bote', 'lonchas', 'ración', 'pizca'];

export const Pantry: React.FC<PantryProps> = ({ items, highlightId, onRemove, onAdd, onUpdateQuantity, onAddMany, onEdit, isOnline = true }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToEdit, setItemToEdit] = useState<PantryItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'expired' | 'priority' | 'fresh'>('all');

  const [newItem, setNewItem] = useState({ 
    name: '', 
    quantity: 1, 
    unit: 'uds', 
    category: 'pantry',
    daysToExpire: 7
  });
  
  const getExpiryStatus = (item: PantryItem) => {
    if (!item.expires_at) return { type: 'none', label: '', bg: 'bg-white', border: 'border-gray-100', dot: 'bg-gray-200', text: 'text-gray-400' };
    const today = startOfDay(new Date());
    const expiry = startOfDay(new Date(item.expires_at));
    const days = differenceInDays(expiry, today);
    if (days < 0) return { type: 'expired', label: 'Caducado', bg: 'bg-red-50/40', border: 'border-red-100', dot: 'bg-red-500', text: 'text-red-700' };
    if (days <= 3) {
        let labelText = days === 0 ? 'Caduca hoy' : days === 1 ? 'Mañana' : `En ${days} días`;
        return { type: 'priority', label: labelText, bg: 'bg-orange-50/40', border: 'border-orange-100', dot: 'bg-orange-500', text: 'text-orange-700' };
    }
    return { type: 'fresh', label: '', bg: 'bg-white', border: 'border-gray-100', dot: 'bg-green-500', text: 'text-green-700' };
  };

  const filteredItems = useMemo(() => {
      let result = items;
      if (activeFilter !== 'all') result = result.filter(item => getExpiryStatus(item).type === activeFilter);
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
    <div className="space-y-12 animate-fade-in pb-48 max-w-7xl mx-auto px-4">
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
            <h1 className="fresco-h1 text-teal-900">Despensa</h1>
            <p className="fresco-body mt-2">Control de existencias sincronizado.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative group flex-1 sm:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4 group-focus-within:text-teal-600 transition-colors" />
                <input type="text" placeholder="Filtrar por nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-teal-950 focus:outline-none focus:ring-4 focus:ring-teal-500/5 shadow-sm transition-all"
                />
            </div>
            <div className="flex gap-2">
                <button onClick={() => isOnline && setShowScanner(true)} className="flex-1 sm:flex-none px-6 py-3.5 bg-orange-500 text-white rounded-2xl flex items-center justify-center gap-2 fresco-label !text-white shadow-xl shadow-orange-500/10 active:scale-95 transition-transform">
                    <Camera className="w-4 h-4" /> Escanear
                </button>
                <button onClick={() => setShowAddModal(true)} className="flex-1 sm:flex-none px-6 py-3.5 bg-teal-900 text-white rounded-2xl flex items-center justify-center gap-2 fresco-label !text-white shadow-xl shadow-teal-900/10 active:scale-95 transition-transform">
                    <Plus className="w-4 h-4" /> Añadir
                </button>
            </div>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {['all', 'expired', 'priority', 'fresh'].map(f => (
              <button key={f} onClick={() => setActiveFilter(f as any)}
                className={`px-6 py-2.5 rounded-full fresco-label transition-all border whitespace-nowrap ${activeFilter === f ? 'bg-teal-900 border-teal-900 !text-white shadow-lg' : 'bg-white border-gray-100 !text-gray-400 hover:border-teal-200'}`}
              >
                  {f === 'all' ? 'Todo el stock' : f === 'expired' ? 'Caducados' : f === 'priority' ? 'Prioridad' : 'Óptimo'}
              </button>
          ))}
      </div>

      <div className="space-y-16">
          {Object.keys(groupedItems).length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center opacity-20">
                  <Package className="w-20 h-20 mb-4" />
                  <p className="fresco-h2">Despensa vacía</p>
              </div>
          ) : (
            Object.keys(groupedItems).sort().map(cat => (
                <div key={cat} className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl border border-gray-50 flex items-center justify-center text-2xl shadow-sm">
                            {CATEGORIES_OPTIONS.find(c => c.id === cat)?.emoji}
                        </div>
                        <h3 className="fresco-h2 !text-lg text-teal-900/80">{CATEGORIES_OPTIONS.find(c => c.id === cat)?.label || cat}</h3>
                        <div className="flex-1 h-px bg-gray-100" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {groupedItems[cat].map(item => {
                            const status = getExpiryStatus(item);
                            return (
                                <div key={item.id} className={`${status.bg} rounded-[2.5rem] border ${status.border} p-6 flex flex-col gap-6 hover:shadow-xl transition-all group relative overflow-hidden`}>
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="fresco-h2 !text-base text-teal-950 truncate capitalize" title={item.name}>{item.name}</h4>
                                            {status.label && (
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${status.dot} animate-pulse`} />
                                                    <p className={`fresco-label !text-[9px] !tracking-widest ${status.text}`}>{status.label}</p>
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => setItemToEdit(item)} className="p-2.5 bg-gray-50/80 rounded-xl text-gray-400 hover:text-teal-900 hover:bg-white transition-all shadow-sm">
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="bg-gray-50/50 rounded-3xl p-3 flex items-center justify-between border border-white/40">
                                        <button 
                                            onClick={() => onUpdateQuantity(item.id, -1)} 
                                            className="w-10 h-10 flex items-center justify-center bg-white rounded-2xl shadow-sm text-gray-400 hover:text-red-500 hover:shadow-md active:scale-90 transition-all font-black text-xl"
                                        >-</button>
                                        
                                        <div className="flex flex-col items-center">
                                            <span className="text-xl font-black text-teal-900 leading-none">{item.quantity}</span>
                                            <span className="fresco-label !text-[8px] !text-gray-400 mt-1">{item.unit}</span>
                                        </div>
                                        
                                        <button 
                                            onClick={() => onUpdateQuantity(item.id, 1)} 
                                            className="w-10 h-10 flex items-center justify-center bg-white rounded-2xl shadow-sm text-gray-400 hover:text-teal-600 hover:shadow-md active:scale-90 transition-all font-black text-xl"
                                        >+</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))
          )}
      </div>
      
      {showAddModal && (
        <div className="fixed inset-0 z-[5000] bg-teal-900/10 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-[3rem] p-10 shadow-2xl relative animate-slide-up">
                <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 p-2 text-gray-300 hover:text-gray-900 transition-colors"><X className="w-6 h-6" /></button>
                <h2 className="fresco-h2 text-teal-900 mb-8">Nuevo Producto</h2>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="fresco-label ml-1">Nombre</label>
                        <input autoFocus className="w-full px-5 py-4 bg-gray-50 rounded-[1.5rem] font-bold text-teal-900 outline-none focus:ring-2 focus:ring-teal-500 transition-shadow" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Ej. Leche de avena" />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                            <label className="fresco-label ml-1">Cantidad</label>
                            <input type="number" className="w-full px-5 py-4 bg-gray-50 rounded-[1.5rem] font-bold text-teal-900 outline-none" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value)})} />
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="fresco-label ml-1">Unidad</label>
                            <select className="w-full px-5 py-4 bg-gray-50 rounded-[1.5rem] font-bold text-teal-900 outline-none appearance-none bg-no-repeat bg-[right_1.2rem_center]" style={{ backgroundImage: selectChevron, backgroundSize: '0.8em' }} value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})}>
                                {UNITS_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <button onClick={() => { onAdd({...newItem, id: Date.now().toString(), added_at: new Date().toISOString()}); setShowAddModal(false); }} className="w-full py-5 bg-teal-900 text-white rounded-[1.5rem] fresco-label !text-white shadow-2xl shadow-teal-900/20 mt-4 active:scale-[0.98] transition-transform">Guardar en Despensa</button>
                </div>
            </div>
        </div>
      )}

      {itemToEdit && (
        <div className="fixed inset-0 z-[5000] bg-teal-900/10 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-[3rem] p-10 shadow-2xl relative animate-slide-up">
                <div className="absolute top-8 right-8 flex gap-2">
                    <button onClick={() => { triggerDialog({ title: '¿Eliminar stock?', message: 'Se quitará permanentemente.', type: 'confirm', onConfirm: () => { onRemove(itemToEdit.id); setItemToEdit(null); } }); }} className="p-2 text-red-300 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                    <button onClick={() => setItemToEdit(null)} className="p-2 text-gray-300 hover:text-gray-900 transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <h2 className="fresco-h2 text-teal-900 mb-8">Editar Item</h2>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="fresco-label ml-1">Nombre</label>
                        <input className="w-full px-5 py-4 bg-gray-50 rounded-[1.5rem] font-bold text-teal-900 outline-none" value={itemToEdit.name} onChange={e => setItemToEdit({...itemToEdit, name: e.target.value})} />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                            <label className="fresco-label ml-1">Cantidad</label>
                            <input type="number" className="w-full px-5 py-4 bg-gray-50 rounded-[1.5rem] font-bold text-teal-900 outline-none" value={itemToEdit.quantity} onChange={e => setItemToEdit({...itemToEdit, quantity: parseFloat(e.target.value)})} />
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="fresco-label ml-1">Unidad</label>
                            <select className="w-full px-5 py-4 bg-gray-50 rounded-[1.5rem] font-bold text-teal-900 outline-none appearance-none bg-no-repeat bg-[right_1.2rem_center]" style={{ backgroundImage: selectChevron, backgroundSize: '0.8em' }} value={itemToEdit.unit} onChange={e => setItemToEdit({...itemToEdit, unit: e.target.value})}>
                                {UNITS_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <button onClick={() => { onEdit(itemToEdit); setItemToEdit(null); }} className="w-full py-5 bg-teal-900 text-white rounded-[1.5rem] fresco-label !text-white shadow-2xl shadow-teal-900/20 mt-4 active:scale-[0.98] transition-transform">Actualizar Stock</button>
                </div>
            </div>
        </div>
      )}

      {showScanner && (
          <TicketScanner onClose={() => setShowScanner(false)} onAddItems={(items) => { onAddMany(items); setShowScanner(false); }} />
      )}
    </div>
  );
}
