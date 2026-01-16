
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
    { id: 'vegetables', label: 'VEGETABLES', emoji: '🥦', color: 'bg-green-100/50 text-green-700' },
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
    
    // Formato exacto "Ene 11"
    const formattedDate = format(expiry, "MMM d", { locale: es }).replace(/^\w/, (c) => c.toUpperCase());
    
    return { 
        type: days <= 3 ? 'priority' : 'fresh', 
        label: formattedDate, 
        icon: Clock, 
        color: days <= 3 ? 'text-orange-500' : 'text-green-600' 
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
    <div className="space-y-12 animate-fade-in pb-48 w-full max-w-full px-2 md:px-8">
      
      {/* Header Estilizado */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 pt-8">
        <div>
            <h1 className="fresco-h1 text-[#013b33] !text-[3.5rem] tracking-[-0.05em] leading-none font-black">Despensa</h1>
            <p className="fresco-body mt-2 !text-xl text-gray-400 font-medium">Gestión inteligente de tu stock.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative group sm:w-80">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
                <input type="text" placeholder="Buscar en mi stock..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setVisibleLimit(ITEMS_PER_PAGE); }}
                    className="w-full pl-14 pr-6 py-5 bg-white border border-gray-100 rounded-[2rem] text-base font-bold text-[#013b33] focus:outline-none focus:ring-4 focus:ring-[#013b33]/5 shadow-sm transition-all"
                />
            </div>
            <div className="flex gap-3">
                <button onClick={() => isOnline && setShowScanner(true)} className="flex-1 sm:flex-none px-10 py-5 bg-orange-500 text-white rounded-[2rem] flex items-center justify-center gap-3 fresco-label !text-white shadow-xl shadow-orange-500/10 active:scale-95 transition-all">
                    <Camera className="w-5 h-5" /> ESCANEAR
                </button>
                <button onClick={() => setShowAddModal(true)} className="flex-1 sm:flex-none px-10 py-5 bg-[#013b33] text-white rounded-[2rem] flex items-center justify-center gap-3 fresco-label !text-white shadow-xl shadow-[#013b33]/10 active:scale-95 transition-all">
                    <Plus className="w-5 h-5" /> AÑADIR
                </button>
            </div>
        </div>
      </header>

      {/* Grid de Productos (Vertical Exacto) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {visibleItems.length === 0 ? (
              <div className="col-span-full py-40 text-center opacity-10 flex flex-col items-center">
                  <Package size={80} className="mb-4" />
                  <p className="fresco-h1 !text-4xl">Sin Stock</p>
              </div>
          ) : (
            visibleItems.map(item => {
                const status = getExpiryStatus(item);
                const catInfo = CATEGORIES_OPTIONS.find(c => c.id === item.category) || CATEGORIES_OPTIONS[6];
                const isLowStock = item.quantity <= 1;

                return (
                    <div key={item.id} className="bg-white rounded-[3.5rem] border border-gray-50 p-10 shadow-[0_10px_40px_rgba(0,0,0,0.02)] hover:shadow-[0_30px_90px_rgba(0,0,0,0.08)] transition-all duration-700 group flex flex-col h-[420px] animate-fade-in relative overflow-hidden">
                        
                        {/* Cabecera: Título y Menú */}
                        <div className="flex justify-between items-start mb-8">
                            <h3 className="fresco-h1 !text-[1.85rem] text-[#013b33] font-black leading-[1.1] line-clamp-2 pr-8 capitalize tracking-tight">
                                {item.name}
                            </h3>
                            <button onClick={() => setItemToEdit(item)} className="p-1 text-gray-200 hover:text-[#013b33] transition-colors flex-shrink-0">
                                <MoreVertical className="w-6 h-6 opacity-30" />
                            </button>
                        </div>

                        {/* Cuerpo: Círculo e Info Lateral */}
                        <div className="flex-1 flex items-center gap-8">
                            <div className={`w-28 h-28 rounded-full flex items-center justify-center text-5xl shadow-[inset_0_2px_10px_rgba(0,0,0,0.03)] border-4 border-white ${catInfo.color.split(' ')[0]} bg-opacity-30 flex-shrink-0`}>
                                {catInfo.emoji}
                            </div>
                            <div className="space-y-1.5 min-w-0">
                                <div className={`flex items-center gap-2 font-black text-[16px] tracking-tight ${status.color}`}>
                                    <Clock className="w-4 h-4" />
                                    <span>{status.label}</span>
                                </div>
                                <div className="fresco-label !text-[11px] !font-black !text-gray-300 tracking-[0.4em] uppercase truncate">
                                    {catInfo.label}
                                </div>
                            </div>
                        </div>

                        {/* Cápsula de Control: Dinámica */}
                        <div className={`mt-auto rounded-[3rem] p-2 flex items-center justify-between border-2 transition-all duration-500 ${isLowStock ? 'bg-[#FFF5F5] border-[#FFEBEB]' : 'bg-[#F9FAFB] border-[#F3F4F6]'}`}>
                            {/* Botón Minus */}
                            <button 
                                onClick={() => onUpdateQuantity(item.id, -1)} 
                                className="w-14 h-14 flex items-center justify-center bg-white rounded-full shadow-md text-gray-300 hover:text-red-500 active:scale-90 transition-all font-black text-2xl"
                            >-</button>
                            
                            {/* Info Central */}
                            <div className="flex flex-col items-center flex-1">
                                <span className={`text-[2.5rem] font-black leading-none ${isLowStock ? 'text-[#FF4D4D]' : 'text-[#013b33]'}`}>
                                    {item.quantity}
                                </span>
                                <span className={`fresco-label !text-[10px] !font-black mt-2 tracking-[0.1em] ${isLowStock ? 'text-[#FF4D4D]' : 'text-gray-400'}`}>
                                    {isLowStock ? 'LOW STOCK' : item.unit.toUpperCase()}
                                </span>
                            </div>
                            
                            {/* Botón Plus */}
                            <button 
                                onClick={() => onUpdateQuantity(item.id, 1)} 
                                className="w-14 h-14 flex items-center justify-center bg-[#16a34a] text-white rounded-full shadow-lg hover:bg-green-700 active:scale-90 transition-all"
                            >
                                <Plus className="w-7 h-7 stroke-[4px]" />
                            </button>
                        </div>
                    </div>
                );
            })
          )}
      </div>

      {/* Paginación Capsular */}
      {visibleLimit < filteredItems.length && (
          <div className="flex justify-center pt-12">
              <button 
                onClick={() => setVisibleLimit(prev => prev + ITEMS_PER_PAGE)}
                className="group flex items-center gap-6 px-14 py-6 bg-white border border-gray-100 rounded-[3rem] shadow-xl hover:shadow-2xl transition-all"
              >
                  <div className="flex flex-col text-left">
                      <span className="fresco-label !text-[#013b33] !text-[12px] mb-1 tracking-[0.2em]">Ver más productos</span>
                      <span className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-200">Mostrando {visibleLimit} de {filteredItems.length}</span>
                  </div>
                  <div className="w-12 h-12 bg-[#013b33] rounded-[1.5rem] flex items-center justify-center text-white group-hover:rotate-180 transition-transform duration-1000">
                      <ChevronDown className="w-6 h-6" />
                  </div>
              </button>
          </div>
      )}
      
      {/* Modales Manteniendo la Identidad */}
      {showAddModal && (
        <div className="fixed inset-0 z-[5000] bg-[#013b33]/20 backdrop-blur-3xl flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-[4rem] p-12 shadow-2xl relative animate-slide-up">
                <button onClick={() => setShowAddModal(false)} className="absolute top-10 right-10 p-2 text-gray-300 hover:text-[#013b33] transition-colors"><X className="w-8 h-8" /></button>
                <h2 className="fresco-h1 !text-4xl text-[#013b33] mb-10 tracking-tight">Añadir Stock</h2>
                <div className="space-y-8">
                    <div className="space-y-2">
                        <label className="fresco-label ml-1">NOMBRE DEL ITEM</label>
                        <input autoFocus className="w-full px-6 py-5 bg-[#F9FAFB] rounded-[2rem] font-black text-xl text-[#013b33] outline-none border-4 border-transparent focus:border-green-50 placeholder-gray-200" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Ej. Tomates" />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                            <label className="fresco-label ml-1">CANTIDAD</label>
                            <input type="number" className="w-full px-6 py-5 bg-[#F9FAFB] rounded-[2rem] font-black text-xl text-[#013b33] outline-none" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value)})} />
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="fresco-label ml-1">UNIDAD</label>
                            <select className="w-full px-6 py-5 bg-[#F9FAFB] rounded-[2rem] font-black text-xs text-[#013b33] outline-none appearance-none bg-no-repeat bg-[right_1.5rem_center]" style={{ backgroundImage: selectChevron, backgroundSize: '0.8em' }} value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})}>
                                {UNITS_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <button onClick={() => { onAdd({...newItem, id: Date.now().toString(), added_at: new Date().toISOString()}); setShowAddModal(false); }} className="w-full py-6 bg-[#013b33] text-white rounded-[2rem] fresco-label !text-white shadow-2xl mt-4 active:scale-95 transition-all">Añadir a mi despensa</button>
                </div>
            </div>
        </div>
      )}

      {itemToEdit && (
        <div className="fixed inset-0 z-[5000] bg-[#013b33]/20 backdrop-blur-3xl flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-[4rem] p-12 shadow-2xl relative animate-slide-up">
                <div className="absolute top-10 right-10 flex gap-4">
                    <button onClick={() => { triggerDialog({ title: '¿Borrar producto?', message: 'Se eliminará de tu inventario.', type: 'confirm', onConfirm: () => { onRemove(itemToEdit.id); setItemToEdit(null); } }); }} className="p-2 text-red-200 hover:text-red-500 transition-colors"><Trash2 className="w-6 h-6" /></button>
                    <button onClick={() => setItemToEdit(null)} className="p-2 text-gray-300 hover:text-black transition-colors"><X className="w-8 h-8" /></button>
                </div>
                <h2 className="fresco-h1 !text-4xl text-[#013b33] mb-10 tracking-tight">Editar Producto</h2>
                <div className="space-y-8">
                    <div className="space-y-2">
                        <label className="fresco-label ml-1">NOMBRE</label>
                        <input className="w-full px-6 py-5 bg-[#F9FAFB] rounded-[2rem] font-black text-xl text-[#013b33] outline-none border-4 border-transparent focus:border-green-50" value={itemToEdit.name} onChange={e => setItemToEdit({...itemToEdit, name: e.target.value})} />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                            <label className="fresco-label ml-1">CANTIDAD</label>
                            <input type="number" className="w-full px-6 py-5 bg-[#F9FAFB] rounded-[2rem] font-black text-xl text-[#013b33] outline-none" value={itemToEdit.quantity} onChange={e => setItemToEdit({...itemToEdit, quantity: parseFloat(e.target.value)})} />
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="fresco-label ml-1">UNIDAD</label>
                            <select className="w-full px-6 py-5 bg-[#F9FAFB] rounded-[2rem] font-black text-xs text-[#013b33] outline-none appearance-none bg-no-repeat bg-[right_1.5rem_center]" style={{ backgroundImage: selectChevron, backgroundSize: '0.8em' }} value={itemToEdit.unit} onChange={e => setItemToEdit({...itemToEdit, unit: e.target.value})}>
                                {UNITS_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <button onClick={() => { onEdit(itemToEdit); setItemToEdit(null); }} className="w-full py-6 bg-[#013b33] text-white rounded-[2rem] fresco-label !text-white shadow-2xl mt-4 active:scale-95 transition-all uppercase tracking-widest">Guardar Cambios</button>
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
