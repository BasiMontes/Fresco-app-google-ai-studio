
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PantryItem } from '../types';
import { Package, Plus, Trash2, Calendar, X, Clock, Minus, Plus as PlusIcon, Camera, Pencil, WifiOff, Search, AlertCircle, CalendarDays, History } from 'lucide-react';
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
  
  const [manualOverride, setManualOverride] = useState({ category: false, unit: false });
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const getExpiryStatus = (item: PantryItem) => {
    if (!item.expires_at) return { type: 'none', label: '', bg: 'bg-white', border: 'border-gray-100', dot: 'bg-gray-200', text: 'text-gray-400' };
    const today = startOfDay(new Date());
    const expiry = startOfDay(new Date(item.expires_at));
    const days = differenceInDays(expiry, today);
    if (days < 0) return { type: 'expired', label: 'Caducado', bg: 'bg-red-50/70', border: 'border-red-200', dot: 'bg-red-500', text: 'text-red-700' };
    if (days <= 3) {
        let labelText = days === 0 ? 'Caduca hoy' : days === 1 ? 'Mañana' : `En ${days} días`;
        return { type: 'priority', label: labelText, bg: 'bg-orange-50/70', border: 'border-orange-200', dot: 'bg-orange-500', text: 'text-orange-700' };
    }
    return { type: 'fresh', label: '', bg: 'bg-white', border: 'border-gray-50', dot: 'bg-green-500', text: 'text-green-700' };
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
    <div className="space-y-8 animate-fade-in pb-48 max-w-screen-2xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
            <h1 className="fresco-h1 text-teal-900 flex items-center gap-3">
                <Package className="w-8 h-8 text-teal-600" /> Despensa
            </h1>
            <p className="fresco-body mt-1">Inventario profesional sincronizado.</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                <input type="text" placeholder="Buscar stock..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-teal-950 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
                />
            </div>
            <div className="flex gap-2">
                <button onClick={() => isOnline && setShowScanner(true)} className="flex-1 md:flex-none px-6 py-3 bg-orange-500 text-white rounded-2xl flex items-center justify-center gap-2 fresco-label !text-white shadow-lg">
                    <Camera className="w-4 h-4" /> Escanear
                </button>
                <button onClick={() => setShowAddModal(true)} className="flex-1 md:flex-none px-6 py-3 bg-teal-900 text-white rounded-2xl flex items-center justify-center gap-2 fresco-label !text-white shadow-lg">
                    <Plus className="w-4 h-4" /> Añadir
                </button>
            </div>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {['all', 'expired', 'priority', 'fresh'].map(f => (
              <button key={f} onClick={() => setActiveFilter(f as any)}
                className={`px-4 py-2 rounded-full fresco-label transition-all border ${activeFilter === f ? 'bg-teal-900 border-teal-900 !text-white shadow-md' : 'bg-white border-gray-100 !text-gray-400'}`}
              >
                  {f === 'all' ? 'Todo' : f === 'expired' ? 'Caducado' : f === 'priority' ? 'Prioridad' : 'Óptimo'}
              </button>
          ))}
      </div>

      {Object.keys(groupedItems).sort().map(cat => (
          <div key={cat} className="space-y-4">
              <div className="flex items-center gap-3">
                  <span className="text-xl">{CATEGORIES_OPTIONS.find(c => c.id === cat)?.emoji}</span>
                  <h3 className="fresco-label !text-teal-900/50">{CATEGORIES_OPTIONS.find(c => c.id === cat)?.label || cat}</h3>
                  <div className="flex-1 h-px bg-gray-100" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {groupedItems[cat].map(item => {
                      const status = getExpiryStatus(item);
                      return (
                          <div key={item.id} className={`${status.bg} rounded-[2rem] border ${status.border} p-5 flex flex-col gap-4 hover:shadow-md transition-all group`}>
                              <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                      <h4 className="fresco-h2 !text-sm text-teal-950 truncate capitalize leading-tight">{item.name}</h4>
                                      {status.label && <p className={`fresco-label !text-[8px] mt-1 ${status.text}`}>{status.label}</p>}
                                  </div>
                                  <button onClick={() => setItemToEdit(item)} className="p-2 bg-gray-50/50 rounded-xl text-gray-400 hover:text-teal-900 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                              </div>
                              <div className="bg-gray-50/50 rounded-2xl p-2 flex items-center justify-between">
                                  <button onClick={() => onUpdateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-gray-400 hover:text-red-500">-</button>
                                  <div className="text-center">
                                      <span className="text-sm font-black text-teal-900">{item.quantity}</span>
                                      <span className="fresco-label !text-[8px] !text-gray-400 ml-1">{item.unit}</span>
                                  </div>
                                  <button onClick={() => onUpdateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-gray-400 hover:text-teal-600">+</button>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      ))}
      
      {showAddModal && (
        <div className="fixed inset-0 z-[5000] bg-teal-900/10 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl relative animate-slide-up">
                <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 p-2 text-gray-300"><X className="w-6 h-6" /></button>
                <h2 className="fresco-h1 !text-2xl text-teal-900 mb-8">Nuevo Producto</h2>
                <div className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="fresco-label">Nombre</label>
                        <input className="w-full px-4 py-3 bg-gray-50 rounded-2xl font-bold text-teal-900 outline-none focus:ring-2 focus:ring-teal-500" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-1 space-y-1.5">
                            <label className="fresco-label">Cantidad</label>
                            <input type="number" className="w-full px-4 py-3 bg-gray-50 rounded-2xl font-bold text-teal-900 outline-none" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value)})} />
                        </div>
                        <div className="flex-1 space-y-1.5">
                            <label className="fresco-label">Unidad</label>
                            <select className="w-full px-4 py-3 bg-gray-50 rounded-2xl font-bold text-teal-900 outline-none appearance-none bg-no-repeat bg-[right_1rem_center]" style={{ backgroundImage: selectChevron, backgroundSize: '0.8em' }} value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})}>
                                {UNITS_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <button onClick={() => { onAdd({...newItem, id: Date.now().toString(), added_at: new Date().toISOString()}); setShowAddModal(false); }} className="w-full py-4 bg-teal-900 text-white rounded-2xl fresco-label !text-white shadow-xl mt-4">Guardar en Despensa</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
