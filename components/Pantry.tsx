
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

const UNITS_OPTIONS = ['UNITS', 'LITERS', 'PACKS', 'GRAMS', 'KILOS', 'KG'];

export const Pantry: React.FC<PantryProps> = ({ items, onRemove, onAdd, onUpdateQuantity, onAddMany, onEdit, isOnline = true }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToEdit, setItemToEdit] = useState<PantryItem | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(ITEMS_PER_PAGE);

  const getExpiryStatus = (item: PantryItem) => {
    if (!item.expires_at) return { type: 'none', label: 'Fresko', color: 'text-[#147A74]', icon: Clock };
    const today = startOfDay(new Date());
    const expiry = startOfDay(new Date(item.expires_at));
    const days = differenceInDays(expiry, today);
    
    if (days < 0) return { type: 'expired', label: 'CADUCADO', color: 'text-[#FF4D4D]', icon: AlertTriangle };
    if (days === 0) return { type: 'priority', label: 'Expires Today', color: 'text-[#FF4D4D]', icon: AlertTriangle };
    if (days <= 3) return { type: 'priority', label: `Expires in ${days} days`, color: 'text-[#E67E22]', icon: Clock };
    
    // Formato Ene 11 / Dic 12
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

  const selectChevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23cbd5e1'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`;

  return (
    <div className="space-y-12 animate-fade-in pb-48 w-full max-w-full px-4 md:px-12 bg-[#FCFCFC] h-full overflow-y-auto no-scrollbar">
      
      {/* Header Estilizado */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 pt-12">
        <div>
            <h1 className="text-[#013b33] text-[4rem] font-black tracking-[-0.06em] leading-[0.85] mb-2">Mi Stock</h1>
            <p className="text-gray-300 font-black uppercase text-[10px] tracking-[0.4em]">Inventario de alta fidelidad</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative group sm:w-80">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-200 w-5 h-5" />
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setVisibleLimit(ITEMS_PER_PAGE); }}
                    className="w-full pl-16 pr-6 py-5 bg-white border border-gray-100 rounded-[2.5rem] text-sm font-bold text-[#013b33] focus:outline-none shadow-sm transition-all"
                />
            </div>
            <div className="flex gap-3">
                <button onClick={() => setShowScanner(true)} className="flex-1 sm:flex-none px-10 py-5 bg-orange-500 text-white rounded-[2.5rem] flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-500/10 active:scale-95 transition-all">
                    <Camera className="w-5 h-5" /> Escanear
                </button>
                <button onClick={() => setShowAddModal(true)} className="flex-1 sm:flex-none px-10 py-5 bg-[#013b33] text-white rounded-[2.5rem] flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[#013b33]/10 active:scale-95 transition-all">
                    <Plus className="w-5 h-5" /> Añadir
                </button>
            </div>
        </div>
      </header>

      {/* Grid de Productos (Exactamente como en las capturas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12">
          {visibleItems.length === 0 ? (
              <div className="col-span-full py-40 text-center opacity-10 flex flex-col items-center">
                  <Package size={100} className="mb-4" />
                  <p className="fresco-h1">Vacío</p>
              </div>
          ) : (
            visibleItems.map(item => {
                const status = getExpiryStatus(item);
                const catInfo = CATEGORIES_OPTIONS.find(c => c.id === item.category) || CATEGORIES_OPTIONS[6];
                const isLowStock = item.quantity <= 1;
                const StatusIcon = status.icon;

                return (
                    <div key={item.id} className="bg-white rounded-[4rem] shadow-[0_20px_60px_rgba(0,0,0,0.02)] hover:shadow-[0_40px_100px_rgba(0,0,0,0.06)] transition-all duration-700 flex flex-col h-[480px] border border-gray-50/50 group animate-fade-in p-10">
                        
                        {/* Titulo: Satoshi Black, masivo */}
                        <div className="flex justify-between items-start mb-10 min-h-[5rem]">
                            <h3 className="text-[2.2rem] text-[#013b33] font-black leading-[0.95] tracking-tight line-clamp-2 pr-6 capitalize">
                                {item.name}
                            </h3>
                            <button onClick={() => setItemToEdit(item)} className="p-2 text-gray-100 hover:text-[#013b33] transition-colors flex-shrink-0">
                                <MoreVertical className="w-7 h-7" />
                            </button>
                        </div>

                        {/* Bloque Central: Círculo y Datos */}
                        <div className="flex items-center gap-8 flex-1">
                            <div className="w-28 h-28 rounded-full bg-[#F2F4F7] shadow-[inset_0_4px_12px_rgba(0,0,0,0.03)] border-4 border-white flex items-center justify-center text-5xl flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
                                {catInfo.emoji}
                            </div>
                            <div className="flex flex-col gap-1.5 min-w-0">
                                <div className={`flex items-center gap-2 font-black text-[15px] tracking-tight ${status.color}`}>
                                    <StatusIcon className="w-4 h-4 stroke-[3px]" />
                                    <span>{status.label}</span>
                                </div>
                                <div className="text-[#9DB2AF] font-black text-[9px] tracking-[0.4em] uppercase truncate">
                                    {catInfo.label}
                                </div>
                            </div>
                        </div>

                        {/* Cápsula inferior (Pill) - Fidelidad 1:1 */}
                        <div className={`mt-auto rounded-[3.5rem] p-2 flex items-center justify-between border-2 transition-all duration-500 ${isLowStock ? 'bg-[#FFF5F5] border-[#FFEBEB]' : 'bg-[#F9FAFB] border-[#F2F4F7]'}`}>
                            {/* Botón Minus - Círculo Blanco */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.id, -1); }} 
                                className="w-16 h-16 flex items-center justify-center bg-white rounded-full shadow-md text-gray-300 hover:text-red-500 active:scale-90 transition-all font-black text-3xl"
                            >
                                <Minus className="w-6 h-6 stroke-[3px]" />
                            </button>
                            
                            {/* Cantidad y Unidad central */}
                            <div className="flex flex-col items-center flex-1 px-4">
                                <span className={`text-[2.8rem] font-black leading-none tracking-tighter ${isLowStock ? 'text-[#FF4D4D]' : 'text-[#013b33]'}`}>
                                    {item.quantity}
                                </span>
                                <span className={`text-[9px] font-black mt-1 tracking-[0.15em] ${isLowStock ? 'text-[#FF4D4D]' : 'text-[#9DB2AF]'}`}>
                                    {isLowStock ? 'LOW STOCK' : (item.unit || 'UNITS').toUpperCase()}
                                </span>
                            </div>
                            
                            {/* Botón Plus - Círculo Verde o Rojo */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.id, 1); }} 
                                className={`w-16 h-16 flex items-center justify-center text-white rounded-full shadow-lg active:scale-90 transition-all ${isLowStock ? 'bg-[#FF4D4D]' : 'bg-[#147A74]'}`}
                            >
                                <Plus className="w-8 h-8 stroke-[4px]" />
                            </button>
                        </div>
                    </div>
                );
            })
          )}
      </div>

      {/* Paginación Capsular */}
      {visibleLimit < filteredItems.length && (
          <div className="flex justify-center pt-16">
              <button 
                onClick={() => setVisibleLimit(prev => prev + ITEMS_PER_PAGE)}
                className="group flex items-center gap-8 px-14 py-6 bg-white border border-gray-100 rounded-[3rem] shadow-xl hover:shadow-2xl transition-all"
              >
                  <div className="flex flex-col text-left">
                      <span className="text-[#013b33] font-black text-[14px] mb-1 uppercase tracking-widest">Ver más Stock</span>
                      <span className="text-[10px] font-bold text-gray-200">Total {filteredItems.length} productos</span>
                  </div>
                  <div className="w-14 h-14 bg-[#013b33] rounded-[1.8rem] flex items-center justify-center text-white group-hover:rotate-180 transition-transform duration-1000 shadow-xl">
                      <ChevronDown className="w-7 h-7" />
                  </div>
              </button>
          </div>
      )}
      
      {/* Modal - Estilo Coherente */}
      {showAddModal && (
        <div className="fixed inset-0 z-[5000] bg-[#013b33]/20 backdrop-blur-3xl flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-[4rem] p-12 shadow-2xl relative animate-slide-up">
                <button onClick={() => setShowAddModal(false)} className="absolute top-10 right-10 p-2 text-gray-200 hover:text-black transition-colors"><X className="w-8 h-8" /></button>
                <h2 className="text-[#013b33] text-4xl font-black mb-10 tracking-tighter">Añadir Stock</h2>
                <div className="space-y-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] ml-1">NOMBRE</label>
                        <input autoFocus className="w-full px-7 py-6 bg-[#F9FAFB] rounded-[2.5rem] font-black text-xl text-[#013b33] outline-none border-2 border-transparent focus:border-[#013b33]/10 transition-all" onChange={e => setSearchTerm(e.target.value)} placeholder="Ej. Tomates" />
                    </div>
                    <button onClick={() => setShowAddModal(false)} className="w-full py-6 bg-[#013b33] text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all">Añadir ahora</button>
                </div>
            </div>
        </div>
      )}

      {itemToEdit && (
        <div className="fixed inset-0 z-[5000] bg-[#013b33]/20 backdrop-blur-3xl flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-[4rem] p-12 shadow-2xl relative animate-slide-up">
                <div className="absolute top-10 right-10 flex gap-4">
                    <button onClick={() => { triggerDialog({ title: '¿Borrar producto?', message: 'Se perderá de tu stock.', type: 'confirm', onConfirm: () => { onRemove(itemToEdit.id); setItemToEdit(null); } }); }} className="p-2 text-red-200 hover:text-red-500 transition-colors"><Trash2 className="w-6 h-6" /></button>
                    <button onClick={() => setItemToEdit(null)} className="p-2 text-gray-200 hover:text-black transition-colors"><X className="w-8 h-8" /></button>
                </div>
                <h2 className="text-[#013b33] text-4xl font-black mb-10 tracking-tighter">Editar</h2>
                <div className="space-y-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] ml-1">NOMBRE</label>
                        <input className="w-full px-7 py-6 bg-[#F9FAFB] rounded-[2.5rem] font-black text-xl text-[#013b33] outline-none" value={itemToEdit.name} onChange={e => setItemToEdit({...itemToEdit, name: e.target.value})} />
                    </div>
                    <button onClick={() => { onEdit(itemToEdit); setItemToEdit(null); }} className="w-full py-6 bg-[#013b33] text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all">Guardar Cambios</button>
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
