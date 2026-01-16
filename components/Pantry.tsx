
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
    { id: 'pantry', label: 'PANTRY', emoji: '🥫', color: 'bg-[#F5F5F5] text-[#616161]' },
];

const UNITS_OPTIONS = ['UNITS', 'LITERS', 'PACKS', 'GRAMS', 'KILOS'];

export const Pantry: React.FC<PantryProps> = ({ items, onRemove, onAdd, onUpdateQuantity, onAddMany, onEdit, isOnline = true }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToEdit, setItemToEdit] = useState<PantryItem | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(ITEMS_PER_PAGE);

  const getExpiryStatus = (item: PantryItem) => {
    if (!item.expires_at) return { type: 'none', label: 'Fresko', color: 'text-teal-600', icon: Clock };
    const today = startOfDay(new Date());
    const expiry = startOfDay(new Date(item.expires_at));
    const days = differenceInDays(expiry, today);
    
    if (days < 0) return { type: 'expired', label: 'EXPIRED', color: 'text-red-500', icon: AlertTriangle };
    if (days === 0) return { type: 'priority', label: 'Expires Today', color: 'text-red-500', icon: AlertTriangle };
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

  const selectChevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23cbd5e1'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`;

  return (
    <div className="space-y-12 animate-fade-in pb-48 w-full max-w-full px-4 md:px-10 bg-[#FCFCFC] h-full overflow-y-auto no-scrollbar">
      
      {/* Header Minimalista */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 pt-10">
        <div>
            <h1 className="text-[#013b33] text-[3.2rem] font-black tracking-[-0.05em] leading-[0.9] mb-2">Mi Stock</h1>
            <p className="text-gray-300 font-bold uppercase text-[10px] tracking-[0.4em]">Gestión de despensa profesional</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative group sm:w-72">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-200 w-5 h-5" />
                <input type="text" placeholder="Buscar producto..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setVisibleLimit(ITEMS_PER_PAGE); }}
                    className="w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-[2rem] text-sm font-bold text-[#013b33] focus:outline-none shadow-sm transition-all"
                />
            </div>
            <div className="flex gap-3">
                <button onClick={() => setShowScanner(true)} className="flex-1 sm:flex-none px-8 py-4 bg-orange-500 text-white rounded-[2rem] flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-500/10 active:scale-95 transition-all">
                    <Camera className="w-5 h-5" /> Escanear
                </button>
                <button onClick={() => setShowAddModal(true)} className="flex-1 sm:flex-none px-8 py-4 bg-[#013b33] text-white rounded-[2rem] flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[#013b33]/10 active:scale-95 transition-all">
                    <Plus className="w-5 h-5" /> Añadir
                </button>
            </div>
        </div>
      </header>

      {/* Grid de Productos (Pixel Perfect) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {visibleItems.length === 0 ? (
              <div className="col-span-full py-40 text-center opacity-10 flex flex-col items-center">
                  <Package size={80} className="mb-4" />
                  <p className="fresco-h1">Vacío</p>
              </div>
          ) : (
            visibleItems.map(item => {
                const status = getExpiryStatus(item);
                const catInfo = CATEGORIES_OPTIONS.find(c => c.id === item.category) || CATEGORIES_OPTIONS[6];
                const isLowStock = item.quantity <= 1;
                const StatusIcon = status.icon;

                return (
                    <div key={item.id} className="bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.06)] transition-all duration-500 flex flex-col h-[320px] border border-gray-50/50 group animate-fade-in">
                        
                        {/* Header: Titulo e Icono More */}
                        <div className="flex justify-between items-start px-7 pt-7 pb-4">
                            <h3 className="text-xl md:text-lg text-[#013b33] font-black leading-tight line-clamp-2 pr-4">
                                {item.name}
                            </h3>
                            <button onClick={() => setItemToEdit(item)} className="p-1 flex-shrink-0 text-gray-200 hover:text-[#013b33] transition-colors">
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Contenido Central: Avatar e Info lateral */}
                        <div className="px-7 flex items-center gap-5 flex-1">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-sm ${catInfo.color.split(' ')[0]} border-2 border-white`}>
                                {catInfo.emoji}
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-0">
                                <div className={`flex items-center gap-1.5 font-bold text-xs ${status.color}`}>
                                    <StatusIcon className="w-4 h-4" />
                                    <span>{status.label}</span>
                                </div>
                                <div className="text-[#9DB2AF] font-black text-[9px] tracking-[0.2em] uppercase truncate">
                                    {catInfo.label}
                                </div>
                            </div>
                        </div>

                        {/* Cápsula de Control (Pill) */}
                        <div className="px-6 pb-6 mt-auto">
                            <div className={`rounded-full p-1.5 flex items-center justify-between border-2 transition-all duration-500 ${isLowStock ? 'bg-[#FFF5F5] border-[#FFEBEB]' : 'bg-[#F9FAFB] border-[#F2F4F7]'}`}>
                                {/* Botón Minus */}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.id, -1); }} 
                                    className="w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-400 hover:text-red-500 active:scale-90 transition-all font-bold text-xl"
                                >
                                    <Minus className="w-5 h-5" />
                                </button>
                                
                                {/* Cantidad y Unidad */}
                                <div className="flex flex-col items-center flex-1">
                                    <span className={`text-[1.8rem] font-black leading-none ${isLowStock ? 'text-[#FF4D4D]' : 'text-[#013b33]'}`}>
                                        {item.quantity}
                                    </span>
                                    <span className={`text-[8px] font-black mt-0.5 tracking-[0.1em] ${isLowStock ? 'text-[#FF4D4D]' : 'text-[#9DB2AF]'}`}>
                                        {isLowStock ? 'LOW STOCK' : item.unit.toUpperCase()}
                                    </span>
                                </div>
                                
                                {/* Botón Plus */}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.id, 1); }} 
                                    className={`w-12 h-12 flex items-center justify-center text-white rounded-full shadow-lg active:scale-90 transition-all ${isLowStock ? 'bg-[#FF4D4D]' : 'bg-[#147A74]'}`}
                                >
                                    <Plus className="w-6 h-6 stroke-[3px]" />
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })
          )}
      </div>

      {/* Pagination Capsular */}
      {visibleLimit < filteredItems.length && (
          <div className="flex justify-center pt-12">
              <button 
                onClick={() => setVisibleLimit(prev => prev + ITEMS_PER_PAGE)}
                className="group flex items-center gap-6 px-12 py-5 bg-white border border-gray-100 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all"
              >
                  <div className="flex flex-col text-left">
                      <span className="text-[#013b33] font-black text-[12px] mb-1 uppercase tracking-widest">Cargar más productos</span>
                      <span className="text-[10px] font-bold text-gray-200">Viendo {visibleLimit} de {filteredItems.length}</span>
                  </div>
                  <div className="w-10 h-10 bg-[#013b33] rounded-2xl flex items-center justify-center text-white group-hover:rotate-180 transition-transform duration-700">
                      <ChevronDown className="w-5 h-5" />
                  </div>
              </button>
          </div>
      )}
      
      {/* Modals */}
      {showAddModal && (
        <div className="fixed inset-0 z-[5000] bg-[#013b33]/20 backdrop-blur-2xl flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-[3rem] p-10 shadow-2xl relative animate-slide-up">
                <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 p-2 text-gray-200 hover:text-black transition-colors"><X className="w-7 h-7" /></button>
                <h2 className="text-[#013b33] text-3xl font-black mb-8 tracking-tight">Nuevo Item</h2>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest ml-1">NOMBRE</label>
                        <input autoFocus className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold text-[#013b33] outline-none" onChange={e => setSearchTerm(e.target.value)} placeholder="Ej. Tomates" />
                    </div>
                    <button onClick={() => setShowAddModal(false)} className="w-full py-5 bg-[#013b33] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl mt-4 active:scale-95 transition-all">Añadir Stock</button>
                </div>
            </div>
        </div>
      )}

      {itemToEdit && (
        <div className="fixed inset-0 z-[5000] bg-[#013b33]/20 backdrop-blur-2xl flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-[3rem] p-10 shadow-2xl relative animate-slide-up">
                <div className="absolute top-8 right-8 flex gap-4">
                    <button onClick={() => { triggerDialog({ title: '¿Borrar producto?', message: 'Se perderá de tu stock.', type: 'confirm', onConfirm: () => { onRemove(itemToEdit.id); setItemToEdit(null); } }); }} className="p-2 text-red-200 hover:text-red-500 transition-colors"><Trash2 className="w-6 h-6" /></button>
                    <button onClick={() => setItemToEdit(null)} className="p-2 text-gray-200 hover:text-black transition-colors"><X className="w-7 h-7" /></button>
                </div>
                <h2 className="text-[#013b33] text-3xl font-black mb-8 tracking-tight">Editar</h2>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest ml-1">NOMBRE</label>
                        <input className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold text-[#013b33] outline-none" value={itemToEdit.name} onChange={e => setItemToEdit({...itemToEdit, name: e.target.value})} />
                    </div>
                    <button onClick={() => { onEdit(itemToEdit); setItemToEdit(null); }} className="w-full py-5 bg-[#013b33] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl mt-4 active:scale-95 transition-all">Guardar Cambios</button>
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
