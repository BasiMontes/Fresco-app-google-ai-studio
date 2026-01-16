
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
    { id: 'vegetables', label: 'VEGETABLES', emoji: '🥦', color: 'bg-green-100/40 text-green-700' },
    { id: 'fruits', label: 'FRUITS', emoji: '🍎', color: 'bg-red-100/40 text-red-700' },
    { id: 'dairy', label: 'DAIRY & EGGS', emoji: '🧀', color: 'bg-blue-100/40 text-blue-700' },
    { id: 'meat', label: 'MEAT', emoji: '🥩', color: 'bg-rose-100/40 text-rose-700' },
    { id: 'beverages', label: 'BEVERAGES', emoji: '🥤', color: 'bg-orange-100/40 text-orange-700' },
    { id: 'bakery', label: 'BAKERY', emoji: '🥐', color: 'bg-amber-100/40 text-amber-700' },
    { id: 'pantry', label: 'PANTRY', emoji: '🥫', color: 'bg-gray-100/40 text-gray-500' },
];

const UNITS_OPTIONS = ['UNITS', 'PACKS', 'LITERS', 'LOAF', 'GRAMS', 'KILOS'];

export const Pantry: React.FC<PantryProps> = ({ items, onRemove, onAdd, onUpdateQuantity, onAddMany, onEdit, isOnline = true }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToEdit, setItemToEdit] = useState<PantryItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'expired' | 'priority' | 'fresh'>('all');
  const [visibleLimit, setVisibleLimit] = useState(ITEMS_PER_PAGE);

  const getExpiryStatus = (item: PantryItem) => {
    if (!item.expires_at) return { type: 'none', label: 'Fresh', icon: Clock, color: 'text-green-600' };
    const today = startOfDay(new Date());
    const expiry = startOfDay(new Date(item.expires_at));
    const days = differenceInDays(expiry, today);
    
    if (days < 0) return { type: 'expired', label: 'EXPIRED', icon: AlertTriangle, color: 'text-red-500' };
    if (days === 0) return { type: 'priority', label: 'Today', icon: AlertTriangle, color: 'text-red-500' };
    if (days <= 3) return { type: 'priority', label: `In ${days} days`, icon: Clock, color: 'text-orange-500' };
    
    // Formato exacto "Ene 11"
    const formattedDate = format(expiry, "MMM d", { locale: es }).replace(/^\w/, (c) => c.toUpperCase());
    return { type: 'fresh', label: formattedDate, icon: Clock, color: 'text-green-600' };
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
    <div className="space-y-8 animate-fade-in pb-48 w-full max-w-full px-4 md:px-6">
      
      {/* Search Header */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pt-6">
        <div>
            <h1 className="fresco-h1 text-[#013b33] !text-4xl md:!text-5xl">Mi Stock</h1>
            <p className="fresco-body mt-1 opacity-40">Gestión de despensa profesional.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative group sm:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setVisibleLimit(ITEMS_PER_PAGE); }}
                    className="w-full pl-11 pr-4 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-[#013b33] focus:outline-none focus:ring-4 focus:ring-[#013b33]/5 shadow-sm transition-all"
                />
            </div>
            <div className="flex gap-2">
                <button onClick={() => isOnline && setShowScanner(true)} className="flex-1 sm:flex-none px-6 py-4 bg-orange-500 text-white rounded-2xl flex items-center justify-center gap-2 fresco-label !text-white shadow-xl shadow-orange-500/10 active:scale-95 transition-all !text-[10px]">
                    <Camera className="w-4 h-4" /> ESCANEAR
                </button>
                <button onClick={() => setShowAddModal(true)} className="flex-1 sm:flex-none px-6 py-4 bg-[#013b33] text-white rounded-2xl flex items-center justify-center gap-2 fresco-label !text-white shadow-xl shadow-[#013b33]/10 active:scale-95 transition-all !text-[10px]">
                    <Plus className="w-4 h-4" /> AÑADIR
                </button>
            </div>
        </div>
      </header>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {visibleItems.length === 0 ? (
              <div className="col-span-full py-40 text-center opacity-10 flex flex-col items-center">
                  <Package size={80} className="mb-4" />
                  <p className="fresco-h1">Vacio</p>
              </div>
          ) : (
            visibleItems.map(item => {
                const status = getExpiryStatus(item);
                const catInfo = CATEGORIES_OPTIONS.find(c => c.id === item.category) || CATEGORIES_OPTIONS[6];
                const isLowStock = item.quantity <= 1;

                return (
                    <div key={item.id} className="bg-white rounded-[2.5rem] border border-gray-50/50 p-7 shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.05)] transition-all duration-500 group flex flex-col h-[380px] animate-fade-in relative">
                        
                        {/* Title Section: Truncation-proof */}
                        <div className="flex justify-between items-start min-h-[4rem]">
                            <h3 className="fresco-h2 !text-[1.6rem] text-[#013b33] font-black leading-[1.1] pr-6 capitalize break-words line-clamp-2">
                                {item.name}
                            </h3>
                            <button onClick={() => setItemToEdit(item)} className="p-1 text-gray-200 hover:text-[#013b33] transition-colors flex-shrink-0">
                                <MoreVertical className="w-5 h-5 opacity-30" />
                            </button>
                        </div>

                        {/* Middle Section: Avatar + Info side-by-side */}
                        <div className="flex-1 flex items-center gap-5 my-4">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.03)] border-2 border-white ${catInfo.color.split(' ')[0]} bg-opacity-30 flex-shrink-0`}>
                                {catInfo.emoji}
                            </div>
                            <div className="flex flex-col gap-1 min-w-0">
                                <div className={`flex items-center gap-1.5 font-black text-[13px] tracking-tight whitespace-nowrap ${status.color}`}>
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{status.label}</span>
                                </div>
                                <div className="fresco-label !text-[9px] !font-black !text-gray-300 tracking-[0.3em] uppercase truncate">
                                    {catInfo.label}
                                </div>
                            </div>
                        </div>

                        {/* Quantity Pill: Bottom Fixed */}
                        <div className={`mt-auto rounded-full p-1.5 flex items-center justify-between border-2 transition-all duration-500 ${isLowStock ? 'bg-[#FFF5F5] border-[#FFEBEB]' : 'bg-[#F9FAFB] border-[#F3F4F6]'}`}>
                            <button 
                                onClick={() => onUpdateQuantity(item.id, -1)} 
                                className="w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-300 hover:text-red-500 active:scale-90 transition-all font-black text-xl"
                            >-</button>
                            
                            <div className="flex flex-col items-center flex-1 px-2">
                                <span className={`text-[1.8rem] font-black leading-none ${isLowStock ? 'text-[#FF4D4D]' : 'text-[#013b33]'}`}>
                                    {item.quantity}
                                </span>
                                <span className={`fresco-label !text-[8px] !font-black mt-1 tracking-[0.1em] ${isLowStock ? 'text-[#FF4D4D]' : 'text-gray-300'}`}>
                                    {isLowStock ? 'LOW STOCK' : item.unit.toUpperCase()}
                                </span>
                            </div>
                            
                            <button 
                                onClick={() => onUpdateQuantity(item.id, 1)} 
                                className="w-12 h-12 flex items-center justify-center bg-[#16a34a] text-white rounded-full shadow-lg hover:bg-green-700 active:scale-90 transition-all"
                            >
                                <Plus className="w-6 h-6 stroke-[3px]" />
                            </button>
                        </div>
                    </div>
                );
            })
          )}
      </div>

      {/* Pagination */}
      {visibleLimit < filteredItems.length && (
          <div className="flex justify-center pt-8">
              <button 
                onClick={() => setVisibleLimit(prev => prev + ITEMS_PER_PAGE)}
                className="group flex items-center gap-5 px-10 py-5 bg-white border border-gray-100 rounded-full shadow-lg hover:shadow-xl transition-all"
              >
                  <span className="fresco-label !text-[#013b33] !text-[9px] tracking-widest uppercase">Cargar más</span>
                  <div className="w-8 h-8 bg-[#013b33] rounded-full flex items-center justify-center text-white group-hover:rotate-180 transition-transform duration-700">
                      <ChevronDown className="w-4 h-4" />
                  </div>
              </button>
          </div>
      )}
      
      {/* Modals */}
      {showAddModal && (
        <div className="fixed inset-0 z-[5000] bg-[#013b33]/20 backdrop-blur-2xl flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-[3rem] p-10 shadow-2xl relative animate-slide-up">
                <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 p-2 text-gray-300 hover:text-gray-900 transition-colors"><X className="w-7 h-7" /></button>
                <h2 className="fresco-h1 !text-3xl text-[#013b33] mb-8">Añadir Stock</h2>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="fresco-label ml-1">NOMBRE</label>
                        <input autoFocus className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold text-[#013b33] outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Ej. Tomates" />
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-1 space-y-2">
                            <label className="fresco-label ml-1">CANTIDAD</label>
                            <input type="number" className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold text-[#013b33] outline-none" />
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="fresco-label ml-1">UNIDAD</label>
                            <select className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold text-[#013b33] outline-none appearance-none bg-no-repeat bg-[right_1.25rem_center]" style={{ backgroundImage: selectChevron, backgroundSize: '0.8em' }}>
                                {UNITS_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <button onClick={() => setShowAddModal(false)} className="w-full py-5 bg-[#013b33] text-white rounded-2xl fresco-label !text-white shadow-xl mt-4 active:scale-95 transition-all">AÑADIR A MI STOCK</button>
                </div>
            </div>
        </div>
      )}

      {itemToEdit && (
        <div className="fixed inset-0 z-[5000] bg-[#013b33]/20 backdrop-blur-2xl flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-[3rem] p-10 shadow-2xl relative animate-slide-up">
                <div className="absolute top-8 right-8 flex gap-4">
                    <button onClick={() => { triggerDialog({ title: '¿Borrar?', message: 'Se perderá el registro.', type: 'confirm', onConfirm: () => { onRemove(itemToEdit.id); setItemToEdit(null); } }); }} className="p-2 text-red-200 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                    <button onClick={() => setItemToEdit(null)} className="p-2 text-gray-300 hover:text-black transition-colors"><X className="w-7 h-7" /></button>
                </div>
                <h2 className="fresco-h1 !text-3xl text-[#013b33] mb-8">Editar</h2>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="fresco-label ml-1">NOMBRE</label>
                        <input className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold text-[#013b33] outline-none" value={itemToEdit.name} onChange={e => setItemToEdit({...itemToEdit, name: e.target.value})} />
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-1 space-y-2">
                            <label className="fresco-label ml-1">CANTIDAD</label>
                            <input type="number" className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold text-[#013b33] outline-none" value={itemToEdit.quantity} onChange={e => setItemToEdit({...itemToEdit, quantity: parseFloat(e.target.value)})} />
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="fresco-label ml-1">UNIDAD</label>
                            <select className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold text-[#013b33] outline-none appearance-none bg-no-repeat bg-[right_1.25rem_center]" style={{ backgroundImage: selectChevron, backgroundSize: '0.8em' }} value={itemToEdit.unit} onChange={e => setItemToEdit({...itemToEdit, unit: e.target.value})}>
                                {UNITS_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <button onClick={() => { onEdit(itemToEdit); setItemToEdit(null); }} className="w-full py-5 bg-[#013b33] text-white rounded-2xl fresco-label !text-white shadow-xl mt-4 active:scale-95 transition-all">GUARDAR CAMBIOS</button>
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
