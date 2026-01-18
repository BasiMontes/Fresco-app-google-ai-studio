
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
    if (!item.expires_at) return { type: 'none', label: 'Fresco', color: 'text-[#147A74]', icon: Clock };
    const today = startOfDay(new Date());
    const expiry = startOfDay(new Date(item.expires_at));
    const days = differenceInDays(expiry, today);
    
    if (days < 0) return { type: 'expired', label: 'EXPIRED', color: 'text-[#FF4D4D]', icon: AlertTriangle };
    if (days === 0) return { type: 'priority', label: 'Expires Today', color: 'text-[#FF4D4D]', icon: AlertTriangle };
    if (days <= 3) return { type: 'priority', label: `Expires in ${days} days`, color: 'text-[#E67E22]', icon: Clock };
    
    const formattedDate = format(expiry, "MMM d", { locale: es }).replace(/^\w/, (c) => c.toUpperCase());
    return { type: 'fresh', label: `Expires ${formattedDate}`, color: 'text-[#147A74]', icon: Clock };
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
    <div className="space-y-4 animate-fade-in pb-48 w-full max-w-full px-4 md:px-8 bg-[#FCFCFC] h-full overflow-y-auto no-scrollbar">
      
      {/* Header Minimalista */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-6">
        <div>
            <h1 className="text-[#013b33] text-[2rem] font-black tracking-[-0.05em] leading-[0.9]">Mi Stock</h1>
            <p className="text-gray-300 font-black uppercase text-[7px] tracking-[0.4em]">Densidad Alta</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-200 w-3.5 h-3.5" />
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setVisibleLimit(ITEMS_PER_PAGE); }}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl text-[11px] font-bold text-[#013b33] focus:outline-none shadow-sm transition-all"
                />
            </div>
            <button onClick={() => setShowScanner(true)} className="p-2.5 bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-500/10 active:scale-95 transition-all">
                <Camera className="w-4 h-4" />
            </button>
            <button onClick={() => setShowAddModal(true)} className="p-2.5 bg-[#013b33] text-white rounded-xl shadow-lg active:scale-95 transition-all">
                <Plus className="w-4 h-4" />
            </button>
        </div>
      </header>

      {/* Grid de Productos Ultra-Compacto (H=215px) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {visibleItems.length === 0 ? (
              <div className="col-span-full py-16 text-center opacity-10 flex flex-col items-center">
                  <Package size={40} className="mb-2" />
                  <p className="font-black text-sm">Vacío</p>
              </div>
          ) : (
            visibleItems.map(item => {
                const status = getExpiryStatus(item);
                const catInfo = CATEGORIES_OPTIONS.find(c => c.id === item.category) || CATEGORIES_OPTIONS[6];
                const isLowStock = item.quantity <= 1;
                const StatusIcon = status.icon;

                return (
                    <div key={item.id} className="bg-white rounded-[1.8rem] shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-all duration-500 flex flex-col h-[215px] border border-gray-50 group animate-fade-in p-4 relative">
                        
                        {/* Fila Título - Compacta */}
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-[0.95rem] text-[#013b33] font-black leading-[1.1] tracking-tight line-clamp-1 pr-2 capitalize">
                                {item.name}
                            </h3>
                            <button onClick={() => setItemToEdit(item)} className="p-0.5 text-gray-100 hover:text-[#013b33] flex-shrink-0">
                                <MoreVertical className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Bloque Central - Avatar Mini y Status */}
                        <div className="flex items-center gap-3 flex-1 min-h-0">
                            <div className="w-12 h-12 rounded-full bg-[#F2F4F7] shadow-inner border border-white flex items-center justify-center text-2xl flex-shrink-0">
                                {catInfo.emoji}
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-0">
                                <div className={`flex items-center gap-1 font-black text-[9px] tracking-tight ${status.color}`}>
                                    <StatusIcon className="w-3 h-3 stroke-[2.5px]" />
                                    <span className="truncate">{status.label}</span>
                                </div>
                                <div className="text-[#9DB2AF] font-black text-[7px] tracking-[0.2em] uppercase truncate">
                                    {catInfo.label}
                                </div>
                            </div>
                        </div>

                        {/* Cápsula de Control Mini (Pill) */}
                        <div className={`mt-2 rounded-[1.5rem] p-0.5 flex items-center justify-between border transition-all duration-500 ${isLowStock ? 'bg-[#FFF5F5] border-[#FFEBEB]' : 'bg-[#F9FAFB] border-[#F2F4F7]'}`}>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.id, -1); }} 
                                className="w-9 h-9 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-300 hover:text-red-500 active:scale-90 transition-all"
                            >
                                <Minus className="w-4 h-4 stroke-[2.5px]" />
                            </button>
                            
                            <div className="flex flex-col items-center flex-1 px-1">
                                <span className={`text-xl font-black leading-none tracking-tighter ${isLowStock ? 'text-[#FF4D4D]' : 'text-[#013b33]'}`}>
                                    {item.quantity}
                                </span>
                                <span className={`text-[6px] font-black mt-0.5 tracking-[0.1em] ${isLowStock ? 'text-[#FF4D4D]' : 'text-[#9DB2AF]'}`}>
                                    {isLowStock ? 'LOW STOCK' : (item.unit || 'UNITS').toUpperCase()}
                                </span>
                            </div>
                            
                            <button 
                                onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.id, 1); }} 
                                className={`w-9 h-9 flex items-center justify-center text-white rounded-full shadow-md active:scale-90 transition-all ${isLowStock ? 'bg-[#FF4D4D]' : 'bg-[#147A74]'}`}
                            >
                                <Plus className="w-5 h-5 stroke-[3px]" />
                            </button>
                        </div>
                    </div>
                );
            })
          )}
      </div>

      {/* Botón Cargar Más Compacto */}
      {visibleLimit < filteredItems.length && (
          <div className="flex justify-center pt-6">
              <button 
                onClick={() => setVisibleLimit(prev => prev + ITEMS_PER_PAGE)}
                className="group flex items-center gap-3 px-6 py-2.5 bg-white border border-gray-100 rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                  <span className="text-[#013b33] font-black text-[10px] uppercase tracking-widest">Cargar más</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-300 group-hover:translate-y-0.5 transition-transform" />
              </button>
          </div>
      )}
      
      {/* Modals Compactos */}
      {showAddModal && (
        <div className="fixed inset-0 z-[5000] bg-[#013b33]/10 backdrop-blur-lg flex items-center justify-center p-4">
            <div className="w-full max-w-[280px] bg-white rounded-[2rem] p-6 shadow-2xl relative animate-slide-up">
                <button onClick={() => setShowAddModal(false)} className="absolute top-5 right-5 p-1.5 text-gray-200 hover:text-black transition-colors"><X className="w-5 h-5" /></button>
                <h2 className="text-[#013b33] text-xl font-black mb-4 tracking-tight">Nuevo Item</h2>
                <div className="space-y-4">
                    <input autoFocus className="w-full px-4 py-3 bg-[#F9FAFB] rounded-xl font-bold text-sm text-[#013b33] outline-none" placeholder="Nombre..." onChange={e => setSearchTerm(e.target.value)} />
                    <button onClick={() => setShowAddModal(false)} className="w-full py-3.5 bg-[#013b33] text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg">Añadir</button>
                </div>
            </div>
        </div>
      )}

      {itemToEdit && (
        <div className="fixed inset-0 z-[5000] bg-[#013b33]/10 backdrop-blur-lg flex items-center justify-center p-4">
            <div className="w-full max-w-[280px] bg-white rounded-[2rem] p-6 shadow-2xl relative animate-slide-up">
                <div className="absolute top-5 right-5 flex gap-2">
                    <button onClick={() => { triggerDialog({ title: '¿Borrar?', message: 'Se perderá el stock.', type: 'confirm', onConfirm: () => { onRemove(itemToEdit.id); setItemToEdit(null); } }); }} className="p-1.5 text-red-200 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    <button onClick={() => setItemToEdit(null)} className="p-1.5 text-gray-200 hover:text-black"><X className="w-5 h-5" /></button>
                </div>
                <h2 className="text-[#013b33] text-xl font-black mb-4 tracking-tight">Editar</h2>
                <div className="space-y-4">
                    <input className="w-full px-4 py-3 bg-[#F9FAFB] rounded-xl font-bold text-sm text-[#013b33] outline-none" value={itemToEdit.name} onChange={e => setItemToEdit({...itemToEdit, name: e.target.value})} />
                    <button onClick={() => { onEdit(itemToEdit); setItemToEdit(null); }} className="w-full py-3.5 bg-[#013b33] text-white rounded-xl font-black text-[9px] uppercase tracking-widest">Guardar</button>
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
