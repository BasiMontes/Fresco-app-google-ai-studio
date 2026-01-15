
import React, { useState, useMemo } from 'react';
import { PantryItem } from '../types';
import { Package, Plus, Trash2, X, Camera, Pencil, Search, LayoutGrid, List, ChevronRight, MoreHorizontal, Sparkles } from 'lucide-react';
import { differenceInDays, startOfDay, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { TicketScanner } from './TicketScanner';
import { triggerDialog } from './Dialog';
import { SmartImage } from './SmartImage';

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
    { id: 'vegetables', label: 'Verduras', emoji: '🥦', color: 'bg-green-50' },
    { id: 'fruits', label: 'Frutas', emoji: '🍎', color: 'bg-red-50' },
    { id: 'dairy', label: 'Lácteos', emoji: '🧀', color: 'bg-yellow-50' },
    { id: 'meat', label: 'Carnes', emoji: '🥩', color: 'bg-rose-50' },
    { id: 'fish', label: 'Pescados', emoji: '🐟', color: 'bg-blue-50' },
    { id: 'pasta', label: 'Pasta y Arroz', emoji: '🍝', color: 'bg-orange-50' },
    { id: 'pantry', label: 'Despensa', emoji: '🥫', color: 'bg-gray-50' },
    { id: 'other', label: 'Otros', emoji: '🛍️', color: 'bg-purple-50' },
];

const UNITS_OPTIONS = ['uds', 'g', 'kg', 'ml', 'l', 'paquete', 'bote', 'lonchas', 'ración', 'pizca'];

export const Pantry: React.FC<PantryProps> = ({ items, highlightId, onRemove, onAdd, onUpdateQuantity, onAddMany, onEdit, isOnline = true }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemToEdit, setItemToEdit] = useState<PantryItem | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeFilter, setActiveFilter] = useState<'all' | 'expired' | 'priority' | 'fresh'>('all');

  const [newItem, setNewItem] = useState({ 
    name: '', 
    quantity: 1, 
    unit: 'uds', 
    category: 'pantry',
    daysToExpire: 7
  });
  
  const getExpiryStatus = (item: PantryItem) => {
    if (!item.expires_at) return { type: 'none', label: '', dot: 'bg-gray-200', text: 'text-gray-400', progressColor: 'bg-gray-100' };
    const today = startOfDay(new Date());
    const expiry = startOfDay(new Date(item.expires_at));
    const days = differenceInDays(expiry, today);
    if (days < 0) return { type: 'expired', label: 'CADUCADO', dot: 'bg-red-500', text: 'text-red-600', progressColor: 'bg-red-500' };
    if (days <= 3) {
        let labelText = days === 0 ? 'CADUCA HOY' : `EN ${days} DÍAS`;
        return { type: 'priority', label: labelText, dot: 'bg-orange-500', text: 'text-orange-600', progressColor: 'bg-orange-500' };
    }
    return { type: 'fresh', label: 'ÓPTIMO', dot: 'bg-green-500', text: 'text-green-600', progressColor: 'bg-teal-500' };
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
    <div className="space-y-12 animate-fade-in pb-48 max-w-7xl mx-auto px-4">
      
      {/* Search & Actions Header */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pt-4">
        <div>
            <h1 className="fresco-h1 text-teal-950">Despensa</h1>
            <p className="fresco-body mt-1">Tu cocina inteligente, bajo control.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative group flex-1 sm:w-64 lg:w-80">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4 group-focus-within:text-teal-600 transition-colors" />
                <input type="text" placeholder="Buscar en mi stock..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-5 py-4 bg-white border border-gray-100 rounded-[1.5rem] text-sm font-bold text-teal-950 focus:outline-none focus:ring-4 focus:ring-teal-500/5 shadow-sm transition-all"
                />
            </div>
            <div className="flex gap-2">
                <button onClick={() => isOnline && setShowScanner(true)} className="flex-1 sm:flex-none px-7 py-4 bg-orange-500 text-white rounded-[1.5rem] flex items-center justify-center gap-3 fresco-label !text-white shadow-xl shadow-orange-500/20 active:scale-95 transition-all">
                    <Camera className="w-5 h-5" /> ESCANEAR
                </button>
                <button onClick={() => setShowAddModal(true)} className="flex-1 sm:flex-none px-7 py-4 bg-teal-900 text-white rounded-[1.5rem] flex items-center justify-center gap-3 fresco-label !text-white shadow-xl shadow-teal-900/20 active:scale-95 transition-all">
                    <Plus className="w-5 h-5" /> AÑADIR
                </button>
            </div>
        </div>
      </header>

      {/* Tabs / Filters */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex gap-3 overflow-x-auto no-scrollbar w-full md:w-auto pb-1">
              {[
                { id: 'all', label: 'TODO EL STOCK' },
                { id: 'expired', label: 'CADUCADOS' },
                { id: 'priority', label: 'PRIORITARIOS' },
                { id: 'fresh', label: 'EN BUEN ESTADO' }
              ].map(f => (
                  <button key={f.id} onClick={() => setActiveFilter(f.id as any)}
                    className={`px-8 py-3.5 rounded-full fresco-label transition-all border-2 whitespace-nowrap ${activeFilter === f.id ? 'bg-teal-900 border-teal-900 !text-white shadow-lg' : 'bg-white border-gray-50 !text-gray-400 hover:border-teal-100'}`}
                  >
                      {f.label}
                  </button>
              ))}
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                <div className="flex bg-gray-100/50 p-1.5 rounded-[1.25rem] border border-gray-100">
                    <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-teal-900 shadow-sm border border-gray-100' : 'text-gray-400'}`}>
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-teal-900 shadow-sm border border-gray-100' : 'text-gray-400'}`}>
                        <List className="w-4 h-4" />
                    </button>
                </div>
          </div>
      </div>

      {/* Main Content Grid */}
      <div className="space-y-16">
          {Object.keys(groupedItems).length === 0 ? (
              <div className="py-32 text-center flex flex-col items-center opacity-30">
                  <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center mb-6 text-gray-200"><Package size={48} /></div>
                  <p className="fresco-h2 text-gray-400">Despensa vacía</p>
                  <button onClick={() => { setSearchTerm(''); setActiveFilter('all'); }} className="mt-4 fresco-label !text-teal-600 hover:underline">Limpiar filtros</button>
              </div>
          ) : (
            Object.keys(groupedItems).sort().map(cat => {
                const catInfo = CATEGORIES_OPTIONS.find(c => c.id === cat) || CATEGORIES_OPTIONS[7];
                return (
                    <div key={cat} className="space-y-10">
                        <div className="flex items-center gap-5">
                            <div className={`w-14 h-14 ${catInfo.color} rounded-[1.5rem] flex items-center justify-center text-3xl shadow-sm border border-white`}>
                                {catInfo.emoji}
                            </div>
                            <div>
                                <h3 className="fresco-h2 !text-3xl text-teal-950 capitalize">{catInfo.label}</h3>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">{groupedItems[cat].length} PRODUCTOS ALMACENADOS</p>
                            </div>
                            <div className="flex-1 h-px bg-gray-100" />
                        </div>

                        <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10" : "space-y-4"}>
                            {groupedItems[cat].map(item => {
                                const status = getExpiryStatus(item);
                                if (viewMode === 'grid') {
                                    return (
                                        <div key={item.id} className="bg-white rounded-[2.5rem] border border-gray-100 p-8 flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_50px_rgb(0,0,0,0.06)] hover:-translate-y-1.5 transition-all duration-500 group relative">
                                            
                                            {/* Header: Photo and Status */}
                                            <div className="flex justify-between items-start gap-5 mb-10">
                                                <div className="w-28 h-28 rounded-[2rem] bg-gray-50 overflow-hidden flex-shrink-0 border-4 border-white shadow-inner">
                                                    <SmartImage 
                                                        src={`https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300&sig=${item.id}`} 
                                                        alt={item.name} 
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0 pt-3 text-right">
                                                    <div className="flex items-center justify-end gap-2 mb-2">
                                                        <span className={`fresco-label !text-[10px] !tracking-widest ${status.text}`}>{status.label || 'ÓPTIMO'}</span>
                                                        <div className={`w-3 h-3 rounded-full ${status.dot} shadow-sm`} />
                                                    </div>
                                                    <h4 className="fresco-h2 !text-2xl text-teal-950 truncate capitalize leading-tight" title={item.name}>{item.name}</h4>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300 mt-2">FRESCO ORIGINAL.</p>
                                                </div>
                                            </div>

                                            {/* Stock Indicator: Progress Bar Styled */}
                                            <div className="mb-10 space-y-4">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">STOCK</span>
                                                    <span className="text-[11px] font-black text-teal-900">{Math.min(100, Math.floor(item.quantity * 25))}%</span>
                                                </div>
                                                <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                                                    <div className={`h-full rounded-full transition-all duration-1000 ${status.progressColor}`} style={{ width: `${Math.min(100, item.quantity * 25)}%` }} />
                                                </div>
                                            </div>

                                            {/* Bottom: Pill Controls */}
                                            <div className="mt-auto flex items-center justify-between gap-5">
                                                <div className="bg-gray-50/80 rounded-[2rem] p-2 flex items-center justify-between flex-1 border border-gray-100 shadow-inner">
                                                    <button onClick={() => onUpdateQuantity(item.id, -1)} className="w-14 h-14 flex items-center justify-center bg-white rounded-2xl shadow-sm text-gray-400 hover:text-red-500 hover:shadow-md active:scale-90 transition-all font-black text-3xl">-</button>
                                                    <div className="flex flex-col items-center px-4">
                                                        <span className="text-2xl font-black text-teal-950 leading-none">{item.quantity}</span>
                                                        <span className="fresco-label !text-[10px] !text-gray-400 mt-2">{item.unit.toUpperCase()}</span>
                                                    </div>
                                                    <button onClick={() => onUpdateQuantity(item.id, 1)} className="w-14 h-14 flex items-center justify-center bg-white rounded-2xl shadow-sm text-gray-400 hover:text-teal-600 hover:shadow-md active:scale-90 transition-all font-black text-3xl">+</button>
                                                </div>
                                                <button onClick={() => setItemToEdit(item)} className="w-16 h-16 bg-white border-2 border-gray-50 rounded-[1.75rem] flex items-center justify-center text-gray-200 hover:text-teal-900 hover:shadow-xl hover:border-teal-50 transition-all group/edit">
                                                    <Pencil className="w-6 h-6 group-hover/edit:scale-110 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                } else {
                                    {/* List View - Also Refined */}
                                    return (
                                        <div key={item.id} onClick={() => setItemToEdit(item)} className="bg-white rounded-[2rem] p-6 flex items-center justify-between border border-gray-50 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                                            <div className="flex items-center gap-6">
                                                <div className="w-16 h-16 rounded-2xl bg-gray-50 overflow-hidden shadow-inner">
                                                    <SmartImage src={`https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=150&sig=${item.id}`} className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <h4 className="fresco-h2 !text-xl text-teal-950 capitalize">{item.name}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className={`w-2 h-2 rounded-full ${status.dot}`} />
                                                        <span className={`fresco-label !text-[8px] ${status.text}`}>{status.label || 'ESTADO ÓPTIMO'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-8">
                                                <div className="hidden md:block w-32">
                                                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                                        <div className={`h-full ${status.progressColor}`} style={{ width: `${Math.min(100, item.quantity * 25)}%` }} />
                                                    </div>
                                                </div>
                                                <div className="flex items-center bg-gray-50 rounded-2xl p-1.5">
                                                    <button onClick={e => { e.stopPropagation(); onUpdateQuantity(item.id, -1); }} className="w-10 h-10 bg-white rounded-xl shadow-sm text-gray-400 hover:text-red-500 font-black text-xl">-</button>
                                                    <div className="px-5 text-center min-w-[70px]">
                                                        <span className="font-black text-teal-950 text-lg">{item.quantity}</span>
                                                        <span className="text-[10px] font-bold text-gray-300 ml-2 uppercase">{item.unit}</span>
                                                    </div>
                                                    <button onClick={e => { e.stopPropagation(); onUpdateQuantity(item.id, 1); }} className="w-10 h-10 bg-white rounded-xl shadow-sm text-gray-400 hover:text-teal-600 font-black text-xl">+</button>
                                                </div>
                                                <ChevronRight className="w-6 h-6 text-gray-200 group-hover:text-teal-900 transition-all" />
                                            </div>
                                        </div>
                                    );
                                }
                            })}
                        </div>
                    </div>
                );
            })
          )}
      </div>
      
      {/* Premium Modals */}
      {showAddModal && (
        <div className="fixed inset-0 z-[5000] bg-teal-950/20 backdrop-blur-2xl flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-[3rem] p-12 shadow-2xl relative animate-slide-up">
                <button onClick={() => setShowAddModal(false)} className="absolute top-10 right-10 p-2 text-gray-300 hover:text-gray-900 transition-colors"><X className="w-7 h-7" /></button>
                <div className="w-20 h-20 bg-teal-50 rounded-[2rem] flex items-center justify-center mb-8 text-teal-600 shadow-inner">
                    <Plus className="w-10 h-10" />
                </div>
                <h2 className="fresco-h1 !text-4xl text-teal-950 mb-10">Nuevo Producto</h2>
                <div className="space-y-8">
                    <div className="space-y-3">
                        <label className="fresco-label ml-1">NOMBRE DEL PRODUCTO</label>
                        <input autoFocus className="w-full px-6 py-5 bg-gray-50 rounded-[1.5rem] font-bold text-teal-950 outline-none focus:ring-4 focus:ring-teal-500/10 transition-all border-2 border-transparent focus:border-teal-100 placeholder-gray-300" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Ej. Tomate Cherry" />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-3">
                            <label className="fresco-label ml-1">CANTIDAD</label>
                            <input type="number" className="w-full px-6 py-5 bg-gray-50 rounded-[1.5rem] font-bold text-teal-950 outline-none focus:ring-4 focus:ring-teal-500/10 border-2 border-transparent focus:border-teal-100" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value)})} />
                        </div>
                        <div className="flex-1 space-y-3">
                            <label className="fresco-label ml-1">UNIDAD</label>
                            <select className="w-full px-6 py-5 bg-gray-50 rounded-[1.5rem] font-bold text-teal-950 outline-none appearance-none bg-no-repeat bg-[right_1.5rem_center] border-2 border-transparent focus:border-teal-100" style={{ backgroundImage: selectChevron, backgroundSize: '0.8em' }} value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})}>
                                {UNITS_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <button onClick={() => { onAdd({...newItem, id: Date.now().toString(), added_at: new Date().toISOString()}); setShowAddModal(false); }} className="w-full py-6 bg-teal-900 text-white rounded-[1.5rem] fresco-label !text-white shadow-2xl shadow-teal-900/20 mt-6 active:scale-[0.98] transition-all">AÑADIR A DESPENSA</button>
                </div>
            </div>
        </div>
      )}

      {itemToEdit && (
        <div className="fixed inset-0 z-[5000] bg-teal-950/20 backdrop-blur-2xl flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-[3rem] p-12 shadow-2xl relative animate-slide-up">
                <div className="absolute top-10 right-10 flex gap-3">
                    <button onClick={() => { triggerDialog({ title: '¿Eliminar producto?', message: 'Se borrará de forma permanente.', type: 'confirm', onConfirm: () => { onRemove(itemToEdit.id); setItemToEdit(null); } }); }} className="p-3 text-red-300 hover:text-red-500 transition-colors bg-red-50/0 hover:bg-red-50 rounded-2xl"><Trash2 className="w-6 h-6" /></button>
                    <button onClick={() => setItemToEdit(null)} className="p-3 text-gray-300 hover:text-gray-950 transition-colors bg-gray-50/0 hover:bg-gray-50 rounded-2xl"><X className="w-6 h-6" /></button>
                </div>
                <div className="w-20 h-20 bg-orange-50 rounded-[2rem] flex items-center justify-center mb-8 text-orange-600 shadow-inner">
                    <Pencil className="w-10 h-10" />
                </div>
                <h2 className="fresco-h1 !text-4xl text-teal-950 mb-10">Editar Stock</h2>
                <div className="space-y-8">
                    <div className="space-y-3">
                        <label className="fresco-label ml-1">NOMBRE</label>
                        <input className="w-full px-6 py-5 bg-gray-50 rounded-[1.5rem] font-bold text-teal-950 outline-none border-2 border-transparent focus:border-teal-100" value={itemToEdit.name} onChange={e => setItemToEdit({...itemToEdit, name: e.target.value})} />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-3">
                            <label className="fresco-label ml-1">CANTIDAD</label>
                            <input type="number" className="w-full px-6 py-5 bg-gray-50 rounded-[1.5rem] font-bold text-teal-950 outline-none border-2 border-transparent focus:border-teal-100" value={itemToEdit.quantity} onChange={e => setItemToEdit({...itemToEdit, quantity: parseFloat(e.target.value)})} />
                        </div>
                        <div className="flex-1 space-y-3">
                            <label className="fresco-label ml-1">UNIDAD</label>
                            <select className="w-full px-6 py-5 bg-gray-50 rounded-[1.5rem] font-bold text-teal-950 outline-none appearance-none bg-no-repeat bg-[right_1.5rem_center] border-2 border-transparent focus:border-teal-100" style={{ backgroundImage: selectChevron, backgroundSize: '0.8em' }} value={itemToEdit.unit} onChange={e => setItemToEdit({...itemToEdit, unit: e.target.value})}>
                                {UNITS_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <button onClick={() => { onEdit(itemToEdit); setItemToEdit(null); }} className="w-full py-6 bg-teal-900 text-white rounded-[1.5rem] fresco-label !text-white shadow-2xl shadow-teal-900/20 mt-6 active:scale-[0.98] transition-all">ACTUALIZAR INFORMACIÓN</button>
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
