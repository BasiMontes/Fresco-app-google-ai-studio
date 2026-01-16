
import React, { useState, useMemo } from 'react';
import { PantryItem } from '../types';
import { Package, Plus, Trash2, X, Camera, Search, MoreVertical, Clock, AlertTriangle, ChevronDown, Minus } from 'lucide-react';
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
    { id: 'vegetables', label: 'VEGETABLES', emoji: '🥦', color: 'bg-[#E8F5E9] text-[#2E7D32]' },
    { id: 'fruits', label: 'FRUITS', emoji: '🍎', color: 'bg-[#F1F8E9] text-[#558B2F]' },
    { id: 'dairy', label: 'DAIRY & EGGS', emoji: '🧀', color: 'bg-[#E3F2FD] text-[#1565C0]' },
    { id: 'meat', label: 'MEAT', emoji: '🥩', color: 'bg-[#FFEBEE] text-[#C62828]' },
    { id: 'beverages', label: 'BEVERAGES', emoji: '🥤', color: 'bg-[#FFF3E0] text-[#EF6C00]' },
    { id: 'bakery', label: 'BAKERY', emoji: '🥐', color: 'bg-[#FFF8E1] text-[#FF8F00]' },
    { id: 'pantry', label: 'PANTRY', emoji: '🥫', color: 'bg-[#F2F4F7] text-[#616161]' },
];

export const Pantry: React.FC<PantryProps> = ({ items, onRemove, onAdd, onUpdateQuantity, onAddMany, onEdit, isOnline = true }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToEdit, setItemToEdit] = useState<PantryItem | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(ITEMS_PER_PAGE);

  const getExpiryStatus = (item: PantryItem) => {
    if (!item.expires_at) return { type: 'none', label: 'Fresco', color: 'text-[#548481]', icon: Clock };
    const today = startOfDay(new Date());
    const expiry = startOfDay(new Date(item.expires_at));
    const days = differenceInDays(expiry, today);
    
    if (days < 0) return { type: 'expired', label: 'Expires Today', color: 'text-[#E74C3C]', icon: AlertTriangle };
    if (days === 0) return { type: 'priority', label: 'Expires Today', color: 'text-[#E74C3C]', icon: AlertTriangle };
    if (days <= 3) return { type: 'priority', label: `Expires in ${days} days`, color: 'text-[#E67E22]', icon: Clock };
    
    const formattedDate = format(expiry, "MMM d", { locale: es }).replace(/^\w/, (c) => c.toUpperCase());
    return { type: 'fresh', label: `Expires ${formattedDate}`, color: 'text-[#548481]', icon: Clock };
  };

  const filteredItems = useMemo(() => {
      let result = items;
      if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          result = result.filter(item => item.name.toLowerCase().includes(lower));
      }
      return result;
  }, [items, searchTerm]);

  const visibleItems = useMemo(() => filteredItems.slice(0, visibleLimit), [filteredItems, visibleLimit]);

  return (
    <div className="space-y-6 animate-fade-in pb-48 w-full max-w-full px-4 md:px-8 bg-[#FCFCFC] h-full overflow-y-auto no-scrollbar">
      
      {/* Header Compacto */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-8">
        <div>
            <h1 className="text-[#013b33] text-[2.4rem] font-black tracking-[-0.04em] leading-tight">Despensa</h1>
            <p className="text-gray-300 font-black uppercase text-[8px] tracking-[0.3em]">Stock Inteligente</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-200 w-4 h-4" />
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-[#013b33] focus:outline-none shadow-sm"
                />
            </div>
            <button onClick={() => setShowScanner(true)} className="p-3 bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-500/10 active:scale-95 transition-all">
                <Camera className="w-5 h-5" />
            </button>
            <button onClick={() => setShowAddModal(true)} className="p-3 bg-[#013b33] text-white rounded-2xl shadow-lg active:scale-95 transition-all">
                <Plus className="w-5 h-5" />
            </button>
        </div>
      </header>

      {/* Grid de Productos (Compacto - Píxel Perfect) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {visibleItems.length === 0 ? (
              <div className="col-span-full py-20 text-center opacity-10 flex flex-col items-center">
                  <Package size={60} className="mb-4" />
                  <p className="font-black text-xl">Vacio</p>
              </div>
          ) : (
            visibleItems.map(item => {
                const status = getExpiryStatus(item);
                const catInfo = CATEGORIES_OPTIONS.find(c => c.id === item.category) || CATEGORIES_OPTIONS[6];
                const isLowStock = item.quantity <= 1;
                const StatusIcon = status.icon;

                return (
                    <div key={item.id} className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_15px_45px_rgba(0,0,0,0.05)] transition-all duration-500 flex flex-col h-[280px] border border-gray-50/50 group animate-fade-in relative">
                        
                        {/* Title Row */}
                        <div className="flex justify-between items-start px-6 pt-6 pb-2">
                            <h3 className="text-[1.1rem] text-[#013b33] font-black leading-tight line-clamp-2 pr-4">
                                {item.name}
                            </h3>
                            <button onClick={() => setItemToEdit(item)} className="p-1 flex-shrink-0 text-gray-100 hover:text-[#013b33]">
                                <MoreVertical className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Content Body: Avatar and Text aligned */}
                        <div className="px-6 flex items-center gap-4 flex-1">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-sm border-2 border-white ${catInfo.id === 'dairy' ? 'bg-[#E3F2FD]' : catInfo.id === 'fruits' ? 'bg-[#F1F8E9]' : catInfo.id === 'vegetables' ? 'bg-[#E8F5E9]' : 'bg-[#F2F4F7]'}`}>
                                {catInfo.emoji}
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <div className={`flex items-center gap-1.5 font-bold text-[10px] ${status.color}`}>
                                    <StatusIcon className="w-3.5 h-3.5" />
                                    <span>{status.label}</span>
                                </div>
                                <div className="text-[#9DB2AF] font-black text-[8px] tracking-[0.15em] uppercase truncate">
                                    {catInfo.label}
                                </div>
                            </div>
                        </div>

                        {/* Bottom Pill - Exact Copy from screenshot */}
                        <div className="px-5 pb-5 mt-auto">
                            <div className={`rounded-full p-1 flex items-center justify-between border-2 transition-all duration-500 ${isLowStock || status.type === 'expired' ? 'bg-[#FFF5F5] border-[#FFEBEB]' : 'bg-[#F9FAFB] border-[#F2F4F7]'}`}>
                                {/* Minus Button */}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.id, -1); }} 
                                    className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-300 hover:text-red-500 active:scale-90 transition-all font-bold"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                
                                {/* Qty & Unit */}
                                <div className="flex flex-col items-center flex-1">
                                    <span className={`text-[1.6rem] font-black leading-none ${isLowStock || status.type === 'expired' ? 'text-[#E74C3C]' : 'text-[#013b33]'}`}>
                                        {item.quantity}
                                    </span>
                                    <span className={`text-[7px] font-black mt-0.5 tracking-[0.1em] ${isLowStock || status.type === 'expired' ? 'text-[#E74C3C]' : 'text-[#9DB2AF]'}`}>
                                        {isLowStock ? 'LOW STOCK' : (item.unit || 'UNITS').toUpperCase()}
                                    </span>
                                </div>
                                
                                {/* Plus Button */}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.id, 1); }} 
                                    className={`w-10 h-10 flex items-center justify-center text-white rounded-full shadow-lg active:scale-90 transition-all ${isLowStock || status.type === 'expired' ? 'bg-[#E74C3C]' : 'bg-[#147A74]'}`}
                                >
                                    <Plus className="w-5 h-5 stroke-[3px]" />
                                </button>
                            </div>
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
                className="group flex items-center gap-4 px-8 py-4 bg-white border border-gray-100 rounded-2xl shadow-md hover:shadow-lg transition-all"
              >
                  <div className="text-left">
                      <span className="text-[#013b33] font-black text-[10px] mb-0.5 block uppercase tracking-wider">Cargar más</span>
                      <span className="text-[8px] font-bold text-gray-200">Total {filteredItems.length}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-teal-900 group-hover:translate-y-0.5 transition-transform" />
              </button>
          </div>
      )}
      
      {/* Modals */}
      {showAddModal && (
        <div className="fixed inset-0 z-[5000] bg-[#013b33]/10 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-xs bg-white rounded-[2.5rem] p-8 shadow-2xl relative animate-slide-up">
                <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 p-2 text-gray-200 hover:text-black transition-colors"><X className="w-5 h-5" /></button>
                <h2 className="text-[#013b33] text-2xl font-black mb-6">Añadir</h2>
                <div className="space-y-4">
                    <input autoFocus className="w-full px-5 py-3 bg-gray-50 rounded-xl font-bold text-sm outline-none" placeholder="Nombre..." onChange={e => setSearchTerm(e.target.value)} />
                    <button onClick={() => setShowAddModal(false)} className="w-full py-4 bg-[#013b33] text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl">Añadir Stock</button>
                </div>
            </div>
        </div>
      )}

      {itemToEdit && (
        <div className="fixed inset-0 z-[5000] bg-[#013b33]/10 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-xs bg-white rounded-[2.5rem] p-8 shadow-2xl relative animate-slide-up">
                <div className="absolute top-6 right-6 flex gap-2">
                    <button onClick={() => { triggerDialog({ title: '¿Borrar?', message: 'Se perderá el stock.', type: 'confirm', onConfirm: () => { onRemove(itemToEdit.id); setItemToEdit(null); } }); }} className="p-2 text-red-200 hover:text-red-500"><Trash2 className="w-5 h-5" /></button>
                    <button onClick={() => setItemToEdit(null)} className="p-2 text-gray-200"><X className="w-5 h-5" /></button>
                </div>
                <h2 className="text-[#013b33] text-2xl font-black mb-6">Editar</h2>
                <div className="space-y-4">
                    <input className="w-full px-5 py-3 bg-gray-50 rounded-xl font-bold text-sm outline-none" value={itemToEdit.name} onChange={e => setItemToEdit({...itemToEdit, name: e.target.value})} />
                    <button onClick={() => { onEdit(itemToEdit); setItemToEdit(null); }} className="w-full py-4 bg-[#013b33] text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl">Guardar</button>
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
