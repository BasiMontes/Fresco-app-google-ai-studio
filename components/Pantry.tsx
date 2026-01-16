
import React, { useState, useMemo } from 'react';
import { PantryItem } from '../types';
import { Package, Plus, Trash2, X, Camera, Pencil, Search, MoreVertical, Clock, AlertTriangle, ChevronDown } from 'lucide-react';
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
    { id: 'vegetables', label: 'VEGETABLES', emoji: '🥦', color: 'bg-green-100 text-green-700' },
    { id: 'fruits', label: 'FRUITS', emoji: '🍎', color: 'bg-red-100 text-red-700' },
    { id: 'dairy', label: 'DAIRY & EGGS', emoji: '🧀', color: 'bg-blue-100 text-blue-700' },
    { id: 'meat', label: 'MEAT', emoji: '🥩', color: 'bg-rose-100 text-rose-700' },
    { id: 'beverages', label: 'BEVERAGES', emoji: '🥤', color: 'bg-orange-100 text-orange-700' },
    { id: 'bakery', label: 'BAKERY', emoji: '🥐', color: 'bg-amber-100 text-amber-700' },
    { id: 'pantry', label: 'PANTRY', emoji: '🥫', color: 'bg-gray-100 text-gray-700' },
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
    if (!item.expires_at) return { type: 'none', label: 'FRESH', icon: Clock, color: 'text-[#013b33]' };
    const today = startOfDay(new Date());
    const expiry = startOfDay(new Date(item.expires_at));
    const days = differenceInDays(expiry, today);
    
    if (days < 0) return { type: 'expired', label: 'EXPIRED', icon: AlertTriangle, color: 'text-red-600' };
    if (days === 0) return { type: 'priority', label: 'Expires Today', icon: AlertTriangle, color: 'text-red-600' };
    if (days <= 3) return { type: 'priority', label: `Expires in ${days} days`, icon: Clock, color: 'text-orange-500' };
    
    return { 
        type: 'fresh', 
        label: `Expires ${format(expiry, 'MMM d', { locale: es })}`, 
        icon: Clock, 
        color: 'text-[#16a34a]' 
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

  const visibleItems = useMemo(() => {
      return filteredItems.slice(0, visibleLimit);
  }, [filteredItems, visibleLimit]);

  const selectChevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23cbd5e1'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`;

  return (
    <div className="space-y-10 animate-fade-in pb-48 max-w-6xl mx-auto px-4 md:px-8">
      
      {/* Header compactado */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pt-4">
        <div>
            <h1 className="fresco-h1 text-[#013b33] !text-5xl">Despensa</h1>
            <p className="fresco-body mt-2 !text-lg opacity-60">Tu cocina inteligente, bajo control.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative group sm:w-72">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
                <input type="text" placeholder="Buscar en mi stock..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setVisibleLimit(ITEMS_PER_PAGE); }}
                    className="w-full pl-14 pr-6 py-4.5 bg-white border border-gray-100 rounded-[1.5rem] text-base font-bold text-[#013b33] focus:outline-none focus:ring-4 focus:ring-[#013b33]/5 shadow-sm transition-all"
                />
            </div>
            <div className="flex gap-3">
                <button onClick={() => isOnline && setShowScanner(true)} className="flex-1 sm:flex-none px-8 py-4.5 bg-orange-500 text-white rounded-[1.5rem] flex items-center justify-center gap-3 fresco-label !text-white shadow-xl shadow-orange-500/10 active:scale-95 transition-all">
                    <Camera className="w-5 h-5" /> ESCANEAR
                </button>
                <button onClick={() => setShowAddModal(true)} className="flex-1 sm:flex-none px-8 py-4.5 bg-[#013b33] text-white rounded-[1.5rem] flex items-center justify-center gap-3 fresco-label !text-white shadow-xl shadow-[#013b33]/10 active:scale-95 transition-all">
                    <Plus className="w-5 h-5" /> AÑADIR
                </button>
            </div>
        </div>
      </header>

      {/* Filtros */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {[{id:'all',l:'TODO EL STOCK'},{id:'expired',l:'CADUCADOS'},{id:'priority',l:'PRIORITARIOS'},{id:'fresh',l:'EN BUEN ESTADO'}].map(f => (
              <button key={f.id} onClick={() => { setActiveFilter(f.id as any); setVisibleLimit(ITEMS_PER_PAGE); }}
                className={`px-8 py-4 rounded-[1.25rem] fresco-label transition-all border-2 whitespace-nowrap !text-[10px] ${activeFilter === f.id ? 'bg-[#013b33] border-[#013b33] !text-white shadow-lg' : 'bg-white border-gray-50 !text-gray-400 hover:border-teal-900/10'}`}
              >
                  {f.l}
              </button>
          ))}
      </div>

      {/* Grid de productos ajustado para evitar scroll */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {visibleItems.length === 0 ? (
              <div className="col-span-full py-32 text-center opacity-30 flex flex-col items-center">
                  <Package size={56} className="text-gray-200 mb-6" />
                  <p className="fresco-h2 !text-3xl text-gray-400">Sin productos a la vista</p>
              </div>
          ) : (
            visibleItems.map(item => {
                const status = getExpiryStatus(item);
                const catInfo = CATEGORIES_OPTIONS.find(c => c.id === item.category) || CATEGORIES_OPTIONS[6];
                const isLowStock = item.quantity <= 1;

                return (
                    <div key={item.id} className="bg-white rounded-[3rem] border border-gray-50 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_60px_rgb(0,0,0,0.06)] transition-all duration-500 group flex flex-col h-[380px] animate-fade-in relative overflow-hidden">
                        
                        {/* Cabecera idéntica a la referencia */}
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="fresco-h2 !text-[1.5rem] text-[#013b33] font-black leading-[1.1] line-clamp-2 pr-8">{item.name}</h3>
                            <button onClick={() => setItemToEdit(item)} className="absolute top-8 right-8 p-1 text-gray-200 hover:text-[#013b33] transition-colors">
                                <MoreVertical className="w-5 h-5 opacity-30" />
                            </button>
                        </div>

                        {/* Cuerpo Central: Icono + Status */}
                        <div className="flex-1 flex items-center gap-6">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-inner border border-white/50 ${catInfo.color.split(' ')[0]} bg-opacity-30 flex-shrink-0`}>
                                {catInfo.emoji}
                            </div>
                            <div className="space-y-1">
                                <div className={`flex items-center gap-2 font-black text-sm tracking-tight ${status.color}`}>
                                    <status.icon className="w-4 h-4" />
                                    <span>{status.label}</span>
                                </div>
                                <div className="fresco-label !text-[10px] !font-black !text-teal-900/30 tracking-[0.3em] uppercase">
                                    {catInfo.label}
                                </div>
                            </div>
                        </div>

                        {/* Cápsula de Cantidad: Ajustada a la referencia exacto */}
                        <div className={`mt-auto rounded-[2.5rem] p-2 flex items-center justify-between border transition-all duration-300 ${isLowStock ? 'bg-[#FFF5F5] border-[#FFEBEB]' : 'bg-gray-50/80 border-gray-100'}`}>
                            <button onClick={() => onUpdateQuantity(item.id, -1)} className="w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-400 hover:text-red-500 active:scale-90 transition-all font-black text-2xl border border-gray-100/50">-</button>
                            
                            <div className="flex flex-col items-center">
                                <span className={`text-2xl font-black leading-none ${isLowStock ? 'text-red-600' : 'text-[#013b33]'}`}>{item.quantity}</span>
                                <span className={`fresco-label !text-[9px] !font-black mt-2 tracking-[0.1em] ${isLowStock ? 'text-red-400' : 'text-teal-800/30'}`}>
                                    {isLowStock ? 'LOW STOCK' : item.unit.toUpperCase()}
                                </span>
                            </div>
                            
                            <button onClick={() => onUpdateQuantity(item.id, 1)} className="w-12 h-12 flex items-center justify-center bg-teal-600 text-white rounded-full shadow-lg hover:bg-teal-700 active:scale-90 transition-all font-black text-2xl">
                                <Plus className="w-6 h-6 stroke-[3px]" />
                            </button>
                        </div>
                    </div>
                );
            })
          )}
      </div>

      {/* Paginación con estilo capsular */}
      {visibleLimit < filteredItems.length && (
          <div className="flex justify-center pt-10 animate-fade-in">
              <button 
                onClick={() => setVisibleLimit(prev => prev + ITEMS_PER_PAGE)}
                className="group flex items-center gap-6 px-10 py-5 bg-white border border-gray-100 rounded-[2.5rem] shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
              >
                  <div className="flex flex-col text-left">
                      <span className="fresco-label !text-[#013b33] !text-[10px] mb-1">Cargar más stock</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Viendo {visibleLimit} de {filteredItems.length}</span>
                  </div>
                  <div className="w-11 h-11 bg-[#013b33] rounded-2xl flex items-center justify-center text-white group-hover:rotate-180 transition-transform duration-700">
                      <ChevronDown className="w-6 h-6" />
                  </div>
              </button>
          </div>
      )}
      
      {/* Modales de Añadir/Editar */}
      {showAddModal && (
        <div className="fixed inset-0 z-[5000] bg-[#013b33]/20 backdrop-blur-3xl flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-[4rem] p-12 shadow-2xl relative animate-slide-up">
                <button onClick={() => setShowAddModal(false)} className="absolute top-10 right-10 p-2 text-gray-300 hover:text-gray-900 transition-colors"><X className="w-8 h-8" /></button>
                <h2 className="fresco-h1 !text-4xl text-[#013b33] mb-10">Nuevo Producto</h2>
                <div className="space-y-8">
                    <div className="space-y-3">
                        <label className="fresco-label ml-1">NOMBRE</label>
                        <input autoFocus className="w-full px-6 py-5 bg-gray-50 rounded-[2rem] font-bold text-[#013b33] outline-none border-2 border-transparent focus:border-teal-100 placeholder-gray-300" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Ej. Tomate" />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-3">
                            <label className="fresco-label ml-1">CANTIDAD</label>
                            <input type="number" className="w-full px-6 py-5 bg-gray-50 rounded-[2rem] font-bold text-[#013b33] outline-none border-2 border-transparent" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value)})} />
                        </div>
                        <div className="flex-1 space-y-3">
                            <label className="fresco-label ml-1">UNIDAD</label>
                            <select className="w-full px-6 py-5 bg-gray-50 rounded-[2rem] font-bold text-[#013b33] outline-none appearance-none bg-no-repeat bg-[right_1.5rem_center] border-2 border-transparent" style={{ backgroundImage: selectChevron, backgroundSize: '0.8em' }} value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})}>
                                {UNITS_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <button onClick={() => { onAdd({...newItem, id: Date.now().toString(), added_at: new Date().toISOString()}); setShowAddModal(false); }} className="w-full py-6 bg-[#013b33] text-white rounded-[2rem] fresco-label !text-white shadow-2xl shadow-[#013b33]/20 mt-6 active:scale-95 transition-all">AÑADIR A MI STOCK</button>
                </div>
            </div>
        </div>
      )}

      {itemToEdit && (
        <div className="fixed inset-0 z-[5000] bg-[#013b33]/20 backdrop-blur-3xl flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-[4rem] p-12 shadow-2xl relative animate-slide-up">
                <div className="absolute top-10 right-10 flex gap-3">
                    <button onClick={() => { triggerDialog({ title: '¿Eliminar?', message: 'Se borrará permanentemente.', type: 'confirm', onConfirm: () => { onRemove(itemToEdit.id); setItemToEdit(null); } }); }} className="p-2 text-red-300 hover:text-red-500 transition-colors"><Trash2 className="w-6 h-6" /></button>
                    <button onClick={() => setItemToEdit(null)} className="p-2 text-gray-300 hover:text-gray-950 transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <h2 className="fresco-h1 !text-4xl text-[#013b33] mb-10">Editar Item</h2>
                <div className="space-y-8">
                    <div className="space-y-3">
                        <label className="fresco-label ml-1">NOMBRE</label>
                        <input className="w-full px-6 py-5 bg-gray-50 rounded-[2rem] font-bold text-[#013b33] border-2 border-transparent focus:border-teal-100 outline-none" value={itemToEdit.name} onChange={e => setItemToEdit({...itemToEdit, name: e.target.value})} />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-3">
                            <label className="fresco-label ml-1">CANTIDAD</label>
                            <input type="number" className="w-full px-6 py-5 bg-gray-50 rounded-[2rem] font-bold text-[#013b33] border-2 border-transparent outline-none" value={itemToEdit.quantity} onChange={e => setItemToEdit({...itemToEdit, quantity: parseFloat(e.target.value)})} />
                        </div>
                        <div className="flex-1 space-y-3">
                            <label className="fresco-label ml-1">UNIDAD</label>
                            <select className="w-full px-6 py-5 bg-gray-50 rounded-[2rem] font-bold text-[#013b33] outline-none appearance-none bg-no-repeat bg-[right_1.5rem_center] border-2 border-transparent" style={{ backgroundImage: selectChevron, backgroundSize: '0.8em' }} value={itemToEdit.unit} onChange={e => setItemToEdit({...itemToEdit, unit: e.target.value})}>
                                {UNITS_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <button onClick={() => { onEdit(itemToEdit); setItemToEdit(null); }} className="w-full py-6 bg-[#013b33] text-white rounded-[2rem] fresco-label !text-white shadow-xl mt-6 active:scale-95 transition-all">GUARDAR CAMBIOS</button>
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
