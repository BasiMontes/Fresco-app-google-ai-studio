
import React, { useState, useMemo } from 'react';
import { PantryItem } from '../types';
import { Package, Plus, Trash2, X, Camera, Search, MoreVertical, Clock, AlertTriangle, ChevronDown } from 'lucide-react';
import { differenceInDays, startOfDay, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { TicketScanner } from './TicketScanner';
import { triggerDialog } from './Dialog';

interface PantryProps {
  items: PantryItem[];
  onRemove: (id: string) => void;
  onAdd: (item: PantryItem) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onAddMany: (items: PantryItem[]) => void;
  onEdit: (item: PantryItem) => void;
  isOnline?: boolean;
}

const ITEMS_PER_PAGE = 12;

const CATEGORIES_OPTIONS = [
    { id: 'vegetables', label: 'VEGETABLES', emoji: '🥬', color: 'bg-green-100/50 text-green-700' },
    { id: 'fruits', label: 'FRUITS', emoji: '🍎', color: 'bg-red-100/50 text-red-700' },
    { id: 'dairy', label: 'DAIRY & EGGS', emoji: '🧀', color: 'bg-blue-100/50 text-blue-700' },
    { id: 'meat', label: 'MEAT', emoji: '🥩', color: 'bg-rose-100/50 text-rose-700' },
    { id: 'beverages', label: 'BEVERAGES', emoji: '🥤', color: 'bg-orange-100/50 text-orange-700' },
    { id: 'bakery', label: 'BAKERY', emoji: '🥐', color: 'bg-amber-100/50 text-amber-700' },
    { id: 'pantry', label: 'PANTRY', emoji: '🥫', color: 'bg-gray-100/50 text-gray-500' },
];

const UNITS_OPTIONS = ['UNITS', 'PACKS', 'LITERS', 'LOAF', 'GRAMS', 'KILOS'];

export const Pantry: React.FC<PantryProps> = ({ items, onRemove, onAdd, onUpdateQuantity, onAddMany, onEdit, isOnline = true }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToEdit, setItemToEdit] = useState<PantryItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'expired' | 'priority' | 'fresh'>('all');
  const [visibleLimit, setVisibleLimit] = useState(ITEMS_PER_PAGE);

  const [newItem, setNewItem] = useState({ 
    name: '', 
    quantity: 1, 
    unit: 'UNITS', 
    category: 'pantry',
    daysToExpire: 7
  });
  
  const getExpiryStatus = (item: PantryItem) => {
    if (!item.expires_at) return { type: 'none', label: 'Fresh', icon: Clock, color: 'text-green-600' };
    const today = startOfDay(new Date());
    const expiry = startOfDay(new Date(item.expires_at));
    const days = differenceInDays(expiry, today);
    
    if (days < 0) return { type: 'expired', label: 'EXPIRED', icon: AlertTriangle, color: 'text-red-500' };
    if (days === 0) return { type: 'priority', label: 'Hoy', icon: AlertTriangle, color: 'text-red-500' };
    if (days <= 3) return { type: 'priority', label: `Expires in ${days} days`, icon: Clock, color: 'text-orange-500' };
    
    return { 
        type: 'fresh', 
        label: `Ene ${format(expiry, 'd', { locale: es })}`, 
        icon: Clock, 
        color: 'text-green-600' 
    };
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

  const visibleItems = useMemo(() => filteredItems.slice(0, visibleLimit), [filteredItems, visibleLimit]);

  const selectChevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23cbd5e1'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`;

  return (
    <div className="space-y-8 animate-fade-in pb-48 w-full max-w-6xl mx-auto px-4 md:px-6">
      
      {/* Search & Actions */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pt-6">
        <div>
            <h1 className="fresco-h1 text-[#013b33] !text-[3.25rem] leading-[0.95] tracking-tighter">Despensa</h1>
            <p className="fresco-body mt-2 !text-lg opacity-40">Gestión inteligente de tu stock.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative group sm:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setVisibleLimit(ITEMS_PER_PAGE); }}
                    className="w-full pl-11 pr-4 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-black text-[#013b33] focus:outline-none focus:ring-4 focus:ring-[#013b33]/5 shadow-sm transition-all"
                />
            </div>
            <div className="flex gap-2">
                <button onClick={() => setShowScanner(true)} className="flex-1 sm:flex-none px-6 py-4 bg-orange-500 text-white rounded-2xl flex items-center justify-center gap-2 fresco-label !text-white shadow-xl shadow-orange-500/10 active:scale-95 transition-all !text-[10px]">
                    <Camera className="w-4 h-4" /> ESCANEAR
                </button>
                <button onClick={() => setShowAddModal(true)} className="flex-1 sm:flex-none px-6 py-4 bg-[#013b33] text-white rounded-2xl flex items-center justify-center gap-2 fresco-label !text-white shadow-xl shadow-[#013b33]/10 active:scale-95 transition-all !text-[10px]">
                    <Plus className="w-4 h-4" /> AÑADIR
                </button>
            </div>
        </div>
      </header>

      {/* Grid de Productos (Vertical Perfect) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {visibleItems.length === 0 ? (
              <div className="col-span-full py-40 text-center opacity-20">
                  <Package size={64} className="mx-auto mb-4" />
                  <p className="fresco-h2 text-gray-500">Vacío</p>
              </div>
          ) : (
            visibleItems.map(item => {
                const status = getExpiryStatus(item);
                const catInfo = CATEGORIES_OPTIONS.find(c => c.id === item.category) || CATEGORIES_OPTIONS[6];
                const isLowStock = item.quantity <= 1;

                return (
                    <div key={item.id} className="bg-white rounded-[3.5rem] border border-gray-50/50 p-8 shadow-[0_4px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_25px_80px_rgba(0,0,0,0.07)] transition-all duration-500 group flex flex-col h-[400px] animate-fade-in relative">
                        
                        {/* Header: Exact olive oil style */}
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="fresco-h2 !text-[1.85rem] text-[#013b33] font-black leading-[1.05] line-clamp-3 pr-6 capitalize">{item.name}</h3>
                            <button onClick={() => setItemToEdit(item)} className="p-1 text-gray-200 hover:text-[#013b33] transition-colors">
                                <MoreVertical className="w-6 h-6 opacity-20" />
                            </button>
                        </div>

                        {/* Middle: Circle + Info text side-by-side */}
                        <div className="flex-1 flex items-center gap-6">
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl shadow-inner border-2 border-white/80 ${catInfo.color.split(' ')[0]} bg-opacity-40 flex-shrink-0`}>
                                {catInfo.emoji}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <div className={`flex items-center gap-2 font-black text-[14px] ${status.color}`}>
                                    <Clock className="w-4 h-4" />
                                    <span>{status.label}</span>
                                </div>
                                <div className="fresco-label !text-[10px] !font-black !text-gray-300 tracking-[0.3em] uppercase">
                                    {catInfo.label}
                                </div>
                            </div>
                        </div>

                        {/* Bottom Pill: The dynamic low stock capsule */}
                        <div className={`mt-auto rounded-[2.75rem] p-2 flex items-center justify-between border-2 transition-all duration-500 ${isLowStock ? 'bg-[#FFF5F5] border-[#FFEBEB] shadow-inner' : 'bg-gray-50/60 border-gray-50'}`}>
                            {/* Minus Button */}
                            <button 
                                onClick={() => onUpdateQuantity(item.id, -1)} 
                                className="w-14 h-14 flex items-center justify-center bg-white rounded-full shadow-md text-gray-400 hover:text-red-500 active:scale-90 transition-all font-black text-2xl"
                            >-</button>
                            
                            {/* Center Info */}
                            <div className="flex flex-col items-center">
                                <span className={`text-[2.25rem] font-black leading-none ${isLowStock ? 'text-[#FF4D4D]' : 'text-[#013b33]'}`}>
                                    {item.quantity}
                                </span>
                                <span className={`fresco-label !text-[10px] !font-black mt-1 tracking-[0.1em] ${isLowStock ? 'text-[#FF4D4D]' : 'text-[#013b33]/20'}`}>
                                    {isLowStock ? 'LOW STOCK' : item.unit.toUpperCase()}
                                </span>
                            </div>
                            
                            {/* Plus Button */}
                            <button 
                                onClick={() => onUpdateQuantity(item.id, 1)} 
                                className="w-14 h-14 flex items-center justify-center bg-[#16a34a] text-white rounded-full shadow-lg hover:bg-green-700 active:scale-90 transition-all"
                            >
                                <Plus className="w-7 h-7 stroke-[3px]" />
                            </button>
                        </div>
                    </div>
                );
            })
          )}
      </div>

      {/* Pagination Capsular */}
      {visibleLimit < filteredItems.length && (
          <div className="flex justify-center pt-10">
              <button 
                onClick={() => setVisibleLimit(prev => prev + ITEMS_PER_PAGE)}
                className="group flex items-center gap-6 px-12 py-5 bg-white border border-gray-50 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all"
              >
                  <div className="flex flex-col text-left">
                      <span className="fresco-label !text-[#013b33] !text-[10px] mb-1">Cargar más stock</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-200">Viendo {visibleLimit} de {filteredItems.length}</span>
                  </div>
                  <div className="w-10 h-10 bg-[#013b33] rounded-2xl flex items-center justify-center text-white group-hover:rotate-180 transition-transform duration-1000">
                      <ChevronDown className="w-5 h-5" />
                  </div>
              </button>
          </div>
      )}
      
      {/* Modals - Manteniendo la estética capsular */}
      {showAddModal && (
        <div className="fixed inset-0 z-[5000] bg-[#013b33]/20 backdrop-blur-3xl flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-[4rem] p-12 shadow-2xl relative animate-slide-up">
                <button onClick={() => setShowAddModal(false)} className="absolute top-10 right-10 p-2 text-gray-300 hover:text-[#013b33] transition-colors"><X className="w-8 h-8" /></button>
                <h2 className="fresco-h1 !text-4xl text-[#013b33] mb-10">Nuevo Item</h2>
                <div className="space-y-8">
                    <div className="space-y-2">
                        <label className="fresco-label ml-1">NOMBRE</label>
                        <input autoFocus className="w-full px-6 py-5 bg-gray-50 rounded-[2rem] font-black text-xl text-[#013b33] outline-none border-4 border-transparent focus:border-green-50 placeholder-gray-200" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Ej. Brócoli" />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                            <label className="fresco-label ml-1">CANTIDAD</label>
                            <input type="number" className="w-full px-6 py-5 bg-gray-50 rounded-[2rem] font-black text-xl text-[#013b33] outline-none" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value)})} />
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="fresco-label ml-1">UNIDAD</label>
                            <select className="w-full px-6 py-5 bg-gray-50 rounded-[2rem] font-black text-xs text-[#013b33] outline-none appearance-none bg-no-repeat bg-[right_1.5rem_center]" style={{ backgroundImage: selectChevron, backgroundSize: '0.8em' }} value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})}>
                                {UNITS_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <button onClick={() => { onAdd({...newItem, id: Date.now().toString(), added_at: new Date().toISOString()}); setShowAddModal(false); }} className="w-full py-6 bg-[#013b33] text-white rounded-[2rem] fresco-label !text-white shadow-2xl mt-4 active:scale-95 transition-all">AÑADIR A MI STOCK</button>
                </div>
            </div>
        </div>
      )}

      {itemToEdit && (
        <div className="fixed inset-0 z-[5000] bg-[#013b33]/20 backdrop-blur-3xl flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-[4rem] p-12 shadow-2xl relative animate-slide-up">
                <div className="absolute top-10 right-10 flex gap-4">
                    <button onClick={() => { triggerDialog({ title: '¿Borrar?', message: 'Se perderá el registro.', type: 'confirm', onConfirm: () => { onRemove(itemToEdit.id); setItemToEdit(null); } }); }} className="p-2 text-red-200 hover:text-red-500 transition-colors"><Trash2 className="w-6 h-6" /></button>
                    <button onClick={() => setItemToEdit(null)} className="p-2 text-gray-300 hover:text-black transition-colors"><X className="w-8 h-8" /></button>
                </div>
                <h2 className="fresco-h1 !text-4xl text-[#013b33] mb-10">Editar Item</h2>
                <div className="space-y-8">
                    <div className="space-y-2">
                        <label className="fresco-label ml-1">NOMBRE</label>
                        <input className="w-full px-6 py-5 bg-gray-50 rounded-[2rem] font-black text-xl text-[#013b33] outline-none border-4 border-transparent focus:border-green-50" value={itemToEdit.name} onChange={e => setItemToEdit({...itemToEdit, name: e.target.value})} />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                            <label className="fresco-label ml-1">CANTIDAD</label>
                            <input type="number" className="w-full px-6 py-5 bg-gray-50 rounded-[2rem] font-black text-xl text-[#013b33] outline-none" value={itemToEdit.quantity} onChange={e => setItemToEdit({...itemToEdit, quantity: parseFloat(e.target.value)})} />
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="fresco-label ml-1">UNIDAD</label>
                            <select className="w-full px-6 py-5 bg-gray-50 rounded-[2rem] font-black text-xs text-[#013b33] outline-none appearance-none bg-no-repeat bg-[right_1.5rem_center]" style={{ backgroundImage: selectChevron, backgroundSize: '0.8em' }} value={itemToEdit.unit} onChange={e => setItemToEdit({...itemToEdit, unit: e.target.value})}>
                                {UNITS_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <button onClick={() => { onEdit(itemToEdit); setItemToEdit(null); }} className="w-full py-6 bg-[#013b33] text-white rounded-[2rem] fresco-label !text-white shadow-2xl mt-4 active:scale-95 transition-all">GUARDAR CAMBIOS</button>
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
