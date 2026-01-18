
import React, { useState, useMemo } from 'react';
import { PantryItem } from '../types';
import { Package, Plus, Trash2, X, Camera, Search, MoreVertical, Clock, AlertTriangle, ChevronDown, Minus, Calendar, Scale } from 'lucide-react';
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

const UNIT_OPTIONS = [
    { id: 'uds', label: 'Unidades' },
    { id: 'kg', label: 'Kilogramos' },
    { id: 'l', label: 'Litros' },
    { id: 'pack', label: 'Packs' },
    { id: 'g', label: 'Gramos' },
    { id: 'ml', label: 'Mililitros' }
];

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
    
    if (days < 0) return { type: 'expired', label: 'CADUCADO', color: 'text-[#FF4D4D]', icon: AlertTriangle };
    if (days === 0) return { type: 'priority', label: 'Caduca Hoy', color: 'text-[#FF4D4D]', icon: AlertTriangle };
    if (days <= 3) return { type: 'priority', label: `Caduca en ${days}d`, color: 'text-[#E67E22]', icon: Clock };
    
    const formattedDate = format(expiry, "d MMM", { locale: es });
    return { type: 'fresh', label: `Hasta ${formattedDate}`, color: 'text-[#147A74]', icon: Clock };
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
    <div className="animate-fade-in pb-48 w-full max-w-full px-4 md:px-8 bg-[#FCFCFC] h-full overflow-y-auto no-scrollbar">
      
      {/* Header Compacto con Estilo Fresco */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-6 mb-8">
        <div>
            <h1 className="text-[#013b33] text-[1.8rem] font-black tracking-[-0.05em] leading-[0.9]">Inventario</h1>
            <p className="text-gray-300 font-black uppercase text-[7px] tracking-[0.4em]">Control de Stock</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-200 w-3.5 h-3.5" />
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setVisibleLimit(ITEMS_PER_PAGE); }}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl text-[11px] font-bold text-[#013b33] focus:outline-none shadow-sm"
                />
            </div>
            <button onClick={() => setShowScanner(true)} className="p-2.5 bg-orange-500 text-white rounded-xl shadow-lg active:scale-95 transition-all">
                <Camera className="w-4 h-4" />
            </button>
            <button onClick={() => setShowAddModal(true)} className="p-2.5 bg-[#013b33] text-white rounded-xl shadow-lg active:scale-95 transition-all">
                <Plus className="w-4 h-4" />
            </button>
        </div>
      </header>

      {/* Grid Ajustado: Máximo 4 columnas en Desktop (xl:grid-cols-4) */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {visibleItems.length === 0 ? (
              <div className="col-span-full py-20 text-center opacity-10 flex flex-col items-center">
                  <Package size={40} className="mb-2" />
                  <p className="font-black text-sm uppercase">Stock Vacío</p>
              </div>
          ) : (
            visibleItems.map(item => {
                const status = getExpiryStatus(item);
                const catInfo = CATEGORIES_OPTIONS.find(c => c.id === item.category) || CATEGORIES_OPTIONS[6];
                const isLowStock = item.quantity <= 1;
                const StatusIcon = status.icon;

                return (
                    <div key={item.id} className="bg-white rounded-[1.8rem] shadow-[0_2px_15px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-all duration-500 flex flex-col h-[190px] border border-gray-50 group animate-fade-in p-4 relative">
                        
                        {/* Fila Título - Puntos en Verde Marca (#013b33) */}
                        <div className="flex justify-between items-start mb-1">
                            <h3 className="text-[1rem] text-[#013b33] font-black leading-[1.1] tracking-tight line-clamp-1 pr-2 capitalize">
                                {item.name}
                            </h3>
                            <button onClick={() => setItemToEdit(item)} className="p-1 text-[#013b33] hover:opacity-50 transition-opacity flex-shrink-0">
                                <MoreVertical className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Bloque Central - Sin texto "Pantry" */}
                        <div className="flex items-center gap-3 flex-1 min-h-0">
                            <div className="w-11 h-11 rounded-full bg-[#F2F4F7] shadow-inner border border-white flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-105 transition-transform">
                                {catInfo.emoji}
                            </div>
                            <div className="flex flex-col gap-0 min-w-0">
                                <div className={`flex items-center gap-1 font-black text-[10px] tracking-tight ${status.color}`}>
                                    <StatusIcon className="w-3 h-3 stroke-[2.5px]" />
                                    <span className="truncate">{status.label}</span>
                                </div>
                            </div>
                        </div>

                        {/* Cápsula de Control Mini (Pill) */}
                        <div className={`mt-2 rounded-[1.5rem] p-0.5 flex items-center justify-between border transition-all duration-500 ${isLowStock ? 'bg-[#FFF5F5] border-[#FFEBEB]' : 'bg-[#F9FAFB] border-[#F2F4F7]'}`}>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.id, -1); }} 
                                className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-300 hover:text-red-500 active:scale-90 transition-all"
                            >
                                <Minus className="w-4 h-4 stroke-[2.5px]" />
                            </button>
                            
                            <div className="flex flex-col items-center flex-1 px-1">
                                <span className={`text-xl font-black leading-none tracking-tighter ${isLowStock ? 'text-[#FF4D4D]' : 'text-[#013b33]'}`}>
                                    {item.quantity}
                                </span>
                                <span className={`text-[6px] font-black mt-0.5 tracking-[0.1em] ${isLowStock ? 'text-[#FF4D4D]' : 'text-[#9DB2AF]'}`}>
                                    {isLowStock ? 'LOW STOCK' : (item.unit || 'uds').toUpperCase()}
                                </span>
                            </div>
                            
                            <button 
                                onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.id, 1); }} 
                                className={`w-8 h-8 flex items-center justify-center text-white rounded-full shadow-md active:scale-90 transition-all ${isLowStock ? 'bg-[#FF4D4D]' : 'bg-[#147A74]'}`}
                            >
                                <Plus className="w-5 h-5 stroke-[3px]" />
                            </button>
                        </div>
                    </div>
                );
            })
          )}
      </div>

      {/* Modal de Edición Detallado */}
      {itemToEdit && (
        <div className="fixed inset-0 z-[5000] bg-[#013b33]/15 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="w-full max-w-[340px] bg-white rounded-[2.5rem] p-8 shadow-2xl relative animate-slide-up">
                <div className="flex justify-between items-start mb-6">
                    <h2 className="text-[#013b33] text-2xl font-black tracking-tight">Editar Stock</h2>
                    <div className="flex gap-1">
                        <button onClick={() => { triggerDialog({ title: '¿Eliminar?', message: 'Se borrará del stock.', type: 'confirm', onConfirm: () => { onRemove(itemToEdit.id); setItemToEdit(null); } }); }} className="p-2 text-red-200 hover:text-red-500 transition-colors">
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button onClick={() => setItemToEdit(null)} className="p-2 text-gray-200 hover:text-[#013b33] transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="space-y-5">
                    {/* Nombre editable */}
                    <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-gray-300 uppercase tracking-widest ml-1">NOMBRE DEL PRODUCTO</label>
                        <input className="w-full px-5 py-3 bg-[#F9FAFB] rounded-xl font-bold text-sm text-[#013b33] border border-transparent focus:border-[#013b33]/10 outline-none" value={itemToEdit.name} onChange={e => setItemToEdit({...itemToEdit, name: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* Fecha de Compra (Bloqueada) */}
                        <div className="space-y-1.5 opacity-60">
                            <label className="text-[8px] font-black text-gray-300 uppercase tracking-widest ml-1 flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> COMPRA</label>
                            <div className="w-full px-4 py-3 bg-[#F2F4F7] rounded-xl font-bold text-[10px] text-gray-500">
                                {itemToEdit.added_at ? format(new Date(itemToEdit.added_at), "d MMM yyyy", { locale: es }) : 'N/A'}
                            </div>
                        </div>
                        {/* Fecha de Caducidad */}
                        <div className="space-y-1.5">
                            <label className="text-[8px] font-black text-gray-300 uppercase tracking-widest ml-1 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> CADUCIDAD</label>
                            <input 
                                type="date"
                                className="w-full px-4 py-3 bg-[#F9FAFB] rounded-xl font-bold text-[10px] text-[#013b33] outline-none border border-transparent focus:border-[#013b33]/10" 
                                value={itemToEdit.expires_at ? format(new Date(itemToEdit.expires_at), "yyyy-MM-dd") : ""}
                                onChange={e => setItemToEdit({...itemToEdit, expires_at: new Date(e.target.value).toISOString()})} 
                            />
                        </div>
                    </div>

                    {/* Selector de Unidades */}
                    <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-gray-300 uppercase tracking-widest ml-1 flex items-center gap-1"><Scale className="w-2.5 h-2.5" /> UNIDAD DE MEDIDA</label>
                        <select 
                            className="w-full px-5 py-3 bg-[#F9FAFB] rounded-xl font-bold text-xs text-[#013b33] border border-transparent focus:border-[#013b33]/10 outline-none appearance-none cursor-pointer"
                            value={itemToEdit.unit || 'uds'}
                            onChange={e => setItemToEdit({...itemToEdit, unit: e.target.value})}
                        >
                            {UNIT_OPTIONS.map(u => <option key={u.id} value={u.id}>{u.label.toUpperCase()}</option>)}
                        </select>
                    </div>

                    <button 
                        onClick={() => { onEdit(itemToEdit); setItemToEdit(null); }} 
                        className="w-full py-4 mt-2 bg-[#013b33] text-white rounded-xl font-black text-[9px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
                    >
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[5000] bg-[#013b33]/10 backdrop-blur-lg flex items-center justify-center p-4">
            <div className="w-full max-w-[300px] bg-white rounded-[2.5rem] p-8 shadow-2xl relative animate-slide-up">
                <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 p-2 text-gray-200 hover:text-black transition-colors"><X className="w-5 h-5" /></button>
                <h2 className="text-[#013b33] text-xl font-black mb-6 tracking-tight">Nuevo Item</h2>
                <div className="space-y-4">
                    <input autoFocus className="w-full px-5 py-4 bg-[#F9FAFB] rounded-xl font-bold text-sm text-[#013b33] outline-none" placeholder="Nombre del producto..." />
                    <button onClick={() => setShowAddModal(false)} className="w-full py-4 bg-[#013b33] text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl">Añadir</button>
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
