
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
    { id: 'vegetables', label: 'Verduras', emoji: '🥦', color: 'bg-green-50/50' },
    { id: 'fruits', label: 'Frutas', emoji: '🍎', color: 'bg-red-50/50' },
    { id: 'dairy', label: 'Lácteos', emoji: '🧀', color: 'bg-yellow-50/50' },
    { id: 'meat', label: 'Carnes', emoji: '🥩', color: 'bg-rose-50/50' },
    { id: 'fish', label: 'Pescados', emoji: '🐟', color: 'bg-blue-50/50' },
    { id: 'pasta', label: 'Pasta y Arroz', emoji: '🍝', color: 'bg-orange-50/50' },
    { id: 'pantry', label: 'Despensa', emoji: '🥫', color: 'bg-gray-50/50' },
    { id: 'other', label: 'Otros', emoji: '🛍️', color: 'bg-purple-50/50' },
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
    if (!item.expires_at) return { type: 'none', label: 'ESTADO ÓPTIMO', dot: 'bg-green-500', text: 'text-teal-600', progressColor: 'bg-teal-500' };
    const today = startOfDay(new Date());
    const expiry = startOfDay(new Date(item.expires_at));
    const days = differenceInDays(expiry, today);
    if (days < 0) return { type: 'expired', label: 'CADUCADO', dot: 'bg-red-500', text: 'text-red-600', progressColor: 'bg-red-500' };
    if (days <= 3) {
        let labelText = days === 0 ? 'CADUCA HOY' : `EN ${days} DÍAS`;
        return { type: 'priority', label: labelText, dot: 'bg-orange-500', text: 'text-orange-600', progressColor: 'bg-orange-500' };
    }
    return { type: 'fresh', label: 'ESTADO ÓPTIMO', dot: 'bg-green-500', text: 'text-teal-600', progressColor: 'bg-teal-500' };
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
    <div className="space-y-16 animate-fade-in pb-48 max-w-7xl mx-auto px-4 md:px-8">
      
      {/* Header con Buscador Premium */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 pt-6">
        <div>
            <h1 className="fresco-h1 text-teal-950 !text-5xl">Despensa</h1>
            <p className="fresco-body mt-2 !text-lg">Tu cocina inteligente, bajo control.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative group flex-1 sm:w-72 lg:w-96">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 group-focus-within:text-teal-600 transition-colors" />
                <input type="text" placeholder="Buscar en mi stock..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 bg-white border border-gray-100 rounded-[1.75rem] text-base font-bold text-teal-950 focus:outline-none focus:ring-4 focus:ring-teal-500/5 shadow-sm transition-all"
                />
            </div>
            <div className="flex gap-3">
                <button onClick={() => isOnline && setShowScanner(true)} className="flex-1 sm:flex-none px-8 py-5 bg-orange-500 text-white rounded-[1.75rem] flex items-center justify-center gap-3 fresco-label !text-white !tracking-[0.1em] shadow-xl shadow-orange-500/20 active:scale-95 transition-all">
                    <Camera className="w-5 h-5" /> ESCANEAR
                </button>
                <button onClick={() => setShowAddModal(true)} className="flex-1 sm:flex-none px-8 py-5 bg-teal-900 text-white rounded-[1.75rem] flex items-center justify-center gap-3 fresco-label !text-white !tracking-[0.1em] shadow-xl shadow-teal-900/20 active:scale-95 transition-all">
                    <Plus className="w-5 h-5" /> AÑADIR
                </button>
            </div>
        </div>
      </header>

      {/* Filtros en Cápsula */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex gap-3 overflow-x-auto no-scrollbar w-full md:w-auto pb-2">
              {[
                { id: 'all', label: 'TODO EL STOCK' },
                { id: 'expired', label: 'CADUCADOS' },
                { id: 'priority', label: 'PRIORITARIOS' },
                { id: 'fresh', label: 'EN BUEN ESTADO' }
              ].map(f => (
                  <button key={f.id} onClick={() => setActiveFilter(f.id as any)}
                    className={`px-10 py-4 rounded-full fresco-label transition-all border-2 whitespace-nowrap !tracking-[0.15em] ${activeFilter === f.id ? 'bg-teal-900 border-teal-900 !text-white shadow-xl' : 'bg-white border-gray-50 !text-gray-400 hover:border-teal-100'}`}
                  >
                      {f.label}
                  </button>
              ))}
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                <div className="flex bg-gray-100/50 p-2 rounded-[1.5rem] border border-gray-100">
                    <button onClick={() => setViewMode('grid')} className={`p-3 rounded-2xl transition-all ${viewMode === 'grid' ? 'bg-white text-teal-900 shadow-sm border border-gray-100' : 'text-gray-400'}`}>
                        <LayoutGrid className="w-5 h-5" />
                    </button>
                    <button onClick={() => setViewMode('list')} className={`p-3 rounded-2xl transition-all ${viewMode === 'list' ? 'bg-white text-teal-900 shadow-sm border border-gray-100' : 'text-gray-400'}`}>
                        <List className="w-5 h-5" />
                    </button>
                </div>
          </div>
      </div>

      {/* Grid de Productos con Diseño "Apple Gold" */}
      <div className="space-y-24">
          {Object.keys(groupedItems).length === 0 ? (
              <div className="py-40 text-center flex flex-col items-center opacity-30">
                  <div className="w-32 h-32 bg-gray-50 rounded-[3rem] flex items-center justify-center mb-8 text-gray-200"><Package size={64} /></div>
                  <p className="fresco-h2 !text-3xl text-gray-400">Sin existencias registradas</p>
                  <button onClick={() => { setSearchTerm(''); setActiveFilter('all'); }} className="mt-6 fresco-label !text-teal-600 hover:underline !text-sm">Limpiar todos los filtros</button>
              </div>
          ) : (
            Object.keys(groupedItems).sort().map(cat => {
                const catInfo = CATEGORIES_OPTIONS.find(c => c.id === cat) || CATEGORIES_OPTIONS[7];
                return (
                    <div key={cat} className="space-y-12">
                        <div className="flex items-center gap-6">
                            <div className={`w-16 h-16 ${catInfo.color} rounded-[1.75rem] flex items-center justify-center text-4xl shadow-sm border border-white`}>
                                {catInfo.emoji}
                            </div>
                            <div>
                                <h3 className="fresco-h2 !text-4xl text-teal-950 capitalize">{catInfo.label}</h3>
                                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-300">{groupedItems[cat].length} PRODUCTOS EN INVENTARIO</p>
                            </div>
                            <div className="flex-1 h-px bg-gray-100" />
                        </div>

                        <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10" : "space-y-6"}>
                            {groupedItems[cat].map(item => {
                                const status = getExpiryStatus(item);
                                if (viewMode === 'grid') {
                                    return (
                                        <div key={item.id} className="bg-white rounded-[2.5rem] border border-gray-100 p-10 flex flex-col shadow-[0_15px_45px_rgb(0,0,0,0.04)] hover:shadow-[0_30px_70px_rgb(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden">
                                            
                                            {/* Foto y Estado Superior */}
                                            <div className="flex items-start gap-6 mb-10">
                                                <div className="w-28 h-28 rounded-[2.25rem] bg-gray-100 overflow-hidden flex-shrink-0 border-4 border-white shadow-inner">
                                                    <SmartImage 
                                                        src={`https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400&sig=${item.id}`} 
                                                        alt={item.name} 
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0 pt-2 text-right">
                                                    <div className="flex items-center justify-end gap-2.5 mb-3">
                                                        <span className={`fresco-label !text-[10px] !font-black !tracking-[0.2em] ${status.text}`}>{status.label}</span>
                                                        <div className={`w-3.5 h-3.5 rounded-full ${status.dot} shadow-[0_0_10px_rgba(0,0,0,0.1)]`} />
                                                    </div>
                                                    <h4 className="fresco-h2 !text-2xl text-teal-950 capitalize leading-[1.1] mb-2" title={item.name}>{item.name}</h4>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-300">FRESCO ORIGINAL.</p>
                                                </div>
                                            </div>

                                            {/* Barra de Stock Minimalista */}
                                            <div className="mb-12 space-y-4">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400">STOCK</span>
                                                    <span className="text-sm font-black text-teal-900 tracking-tight">{Math.min(100, Math.floor(item.quantity * 25))}%</span>
                                                </div>
                                                <div className="h-3 w-full bg-gray-100/80 rounded-full overflow-hidden p-0.5 shadow-inner">
                                                    <div className={`h-full rounded-full transition-all duration-1000 ${status.progressColor} shadow-[0_0_15px_rgba(0,0,0,0.1)]`} style={{ width: `${Math.min(100, item.quantity * 25)}%` }} />
                                                </div>
                                            </div>

                                            {/* Controles de Cantidad en Pastilla Gigante */}
                                            <div className="mt-auto flex items-center justify-between gap-6">
                                                <div className="bg-gray-50/80 rounded-[2.25rem] p-2 flex items-center justify-between flex-1 border border-gray-100 shadow-inner">
                                                    <button onClick={() => onUpdateQuantity(item.id, -1)} className="w-16 h-16 flex items-center justify-center bg-white rounded-[1.5rem] shadow-sm text-gray-400 hover:text-red-500 hover:shadow-lg active:scale-90 transition-all font-black text-3xl border border-gray-50">-</button>
                                                    <div className="flex flex-col items-center px-4">
                                                        <span className="text-3xl font-black text-teal-950 leading-none">{item.quantity}</span>
                                                        <span className="fresco-label !text-[11px] !text-gray-300 mt-2 !tracking-[0.1em]">{item.unit.toUpperCase()}</span>
                                                    </div>
                                                    <button onClick={() => onUpdateQuantity(item.id, 1)} className="w-16 h-16 flex items-center justify-center bg-white rounded-[1.5rem] shadow-sm text-gray-400 hover:text-teal-600 hover:shadow-lg active:scale-90 transition-all font-black text-3xl border border-gray-50">+</button>
                                                </div>
                                                <button onClick={() => setItemToEdit(item)} className="w-16 h-16 bg-white border-2 border-gray-50 rounded-[1.75rem] flex items-center justify-center text-gray-200 hover:text-teal-950 hover:shadow-xl hover:border-teal-100 transition-all group/edit">
                                                    <Pencil className="w-6 h-6 group-hover/edit:scale-110 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                } else {
                                    {/* List View - Refinada */}
                                    return (
                                        <div key={item.id} onClick={() => setItemToEdit(item)} className="bg-white rounded-[2.5rem] p-8 flex items-center justify-between border border-gray-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group">
                                            <div className="flex items-center gap-8">
                                                <div className="w-20 h-20 rounded-[1.5rem] bg-gray-50 overflow-hidden shadow-inner border-2 border-white">
                                                    <SmartImage src={`https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200&sig=${item.id}`} className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <h4 className="fresco-h2 !text-2xl text-teal-950 capitalize mb-2">{item.name}</h4>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-2.5 h-2.5 rounded-full ${status.dot}`} />
                                                        <span className={`fresco-label !text-[9px] !tracking-[0.2em] ${status.text}`}>{status.label}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-12">
                                                <div className="hidden lg:block w-48">
                                                    <div className="flex justify-between text-[10px] font-black mb-2 text-gray-300 tracking-widest"><span>NIVEL</span><span>{Math.min(100, Math.floor(item.quantity * 25))}%</span></div>
                                                    <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden shadow-inner">
                                                        <div className={`h-full rounded-full ${status.progressColor}`} style={{ width: `${Math.min(100, item.quantity * 25)}%` }} />
                                                    </div>
                                                </div>
                                                <div className="flex items-center bg-gray-50 rounded-[1.75rem] p-2 border border-gray-100">
                                                    <button onClick={e => { e.stopPropagation(); onUpdateQuantity(item.id, -1); }} className="w-12 h-12 bg-white rounded-2xl shadow-sm text-gray-400 hover:text-red-500 font-black text-2xl">-</button>
                                                    <div className="px-8 text-center min-w-[100px]">
                                                        <span className="font-black text-teal-950 text-2xl">{item.quantity}</span>
                                                        <span className="text-[11px] font-black text-gray-300 ml-3 uppercase tracking-tighter">{item.unit}</span>
                                                    </div>
                                                    <button onClick={e => { e.stopPropagation(); onUpdateQuantity(item.id, 1); }} className="w-12 h-12 bg-white rounded-2xl shadow-sm text-gray-400 hover:text-teal-600 font-black text-2xl">+</button>
                                                </div>
                                                <ChevronRight className="w-8 h-8 text-gray-200 group-hover:text-teal-950 group-hover:translate-x-1 transition-all" />
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
      
      {/* Modales con Estilo Coherente */}
      {showAddModal && (
        <div className="fixed inset-0 z-[5000] bg-teal-950/20 backdrop-blur-3xl flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-[3.5rem] p-16 shadow-2xl relative animate-slide-up">
                <button onClick={() => setShowAddModal(false)} className="absolute top-12 right-12 p-3 text-gray-300 hover:text-gray-900 transition-colors"><X className="w-8 h-8" /></button>
                <div className="w-24 h-24 bg-teal-50 rounded-[2.5rem] flex items-center justify-center mb-10 text-teal-600 shadow-inner">
                    <Plus className="w-12 h-12" />
                </div>
                <h2 className="fresco-h1 !text-5xl text-teal-950 mb-12">Nuevo Producto</h2>
                <div className="space-y-10">
                    <div className="space-y-4">
                        <label className="fresco-label !text-xs !tracking-[0.2em] ml-1">NOMBRE DEL PRODUCTO</label>
                        <input autoFocus className="w-full px-8 py-6 bg-gray-50 rounded-[2rem] font-black text-xl text-teal-950 outline-none focus:ring-4 focus:ring-teal-500/10 transition-all border-2 border-transparent focus:border-teal-100 placeholder-gray-300" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Ej. Tomate Cherry" />
                    </div>
                    <div className="flex gap-6">
                        <div className="flex-1 space-y-4">
                            <label className="fresco-label !text-xs !tracking-[0.2em] ml-1">CANTIDAD</label>
                            <input type="number" className="w-full px-8 py-6 bg-gray-50 rounded-[2rem] font-black text-xl text-teal-950 outline-none border-2 border-transparent focus:border-teal-100" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value)})} />
                        </div>
                        <div className="flex-1 space-y-4">
                            <label className="fresco-label !text-xs !tracking-[0.2em] ml-1">UNIDAD</label>
                            <select className="w-full px-8 py-6 bg-gray-50 rounded-[2rem] font-black text-lg text-teal-950 outline-none appearance-none bg-no-repeat bg-[right_2rem_center] border-2 border-transparent focus:border-teal-100" style={{ backgroundImage: selectChevron, backgroundSize: '0.8em' }} value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})}>
                                {UNITS_OPTIONS.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
                            </select>
                        </div>
                    </div>
                    <button onClick={() => { onAdd({...newItem, id: Date.now().toString(), added_at: new Date().toISOString()}); setShowAddModal(false); }} className="w-full py-7 bg-teal-900 text-white rounded-[2rem] fresco-label !text-lg !text-white shadow-2xl shadow-teal-900/20 mt-8 active:scale-[0.98] transition-all">AÑADIR A MI STOCK</button>
                </div>
            </div>
        </div>
      )}

      {itemToEdit && (
        <div className="fixed inset-0 z-[5000] bg-teal-950/20 backdrop-blur-3xl flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-[3.5rem] p-16 shadow-2xl relative animate-slide-up">
                <div className="absolute top-12 right-12 flex gap-4">
                    <button onClick={() => { triggerDialog({ title: '¿Eliminar producto?', message: 'Se borrará de forma permanente.', type: 'confirm', onConfirm: () => { onRemove(itemToEdit.id); setItemToEdit(null); } }); }} className="p-4 text-red-300 hover:text-red-500 transition-colors bg-red-50/0 hover:bg-red-50 rounded-[1.5rem]"><Trash2 className="w-7 h-7" /></button>
                    <button onClick={() => setItemToEdit(null)} className="p-4 text-gray-300 hover:text-gray-950 transition-colors bg-gray-50/0 hover:bg-gray-50 rounded-[1.5rem]"><X className="w-7 h-7" /></button>
                </div>
                <div className="w-24 h-24 bg-orange-50 rounded-[2.5rem] flex items-center justify-center mb-10 text-orange-600 shadow-inner">
                    <Pencil className="w-12 h-12" />
                </div>
                <h2 className="fresco-h1 !text-5xl text-teal-950 mb-12">Editar Stock</h2>
                <div className="space-y-10">
                    <div className="space-y-4">
                        <label className="fresco-label !text-xs !tracking-[0.2em] ml-1">NOMBRE</label>
                        <input className="w-full px-8 py-6 bg-gray-50 rounded-[2rem] font-black text-xl text-teal-950 outline-none border-2 border-transparent focus:border-teal-100" value={itemToEdit.name} onChange={e => setItemToEdit({...itemToEdit, name: e.target.value})} />
                    </div>
                    <div className="flex gap-6">
                        <div className="flex-1 space-y-4">
                            <label className="fresco-label !text-xs !tracking-[0.2em] ml-1">CANTIDAD</label>
                            <input type="number" className="w-full px-8 py-6 bg-gray-50 rounded-[2rem] font-black text-xl text-teal-950 outline-none border-2 border-transparent focus:border-teal-100" value={itemToEdit.quantity} onChange={e => setItemToEdit({...itemToEdit, quantity: parseFloat(e.target.value)})} />
                        </div>
                        <div className="flex-1 space-y-4">
                            <label className="fresco-label !text-xs !tracking-[0.2em] ml-1">UNIDAD</label>
                            <select className="w-full px-8 py-6 bg-gray-50 rounded-[2rem] font-black text-lg text-teal-950 outline-none appearance-none bg-no-repeat bg-[right_2rem_center] border-2 border-transparent focus:border-teal-100" style={{ backgroundImage: selectChevron, backgroundSize: '0.8em' }} value={itemToEdit.unit} onChange={e => setItemToEdit({...itemToEdit, unit: e.target.value})}>
                                {UNITS_OPTIONS.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
                            </select>
                        </div>
                    </div>
                    <button onClick={() => { onEdit(itemToEdit); setItemToEdit(null); }} className="w-full py-7 bg-teal-900 text-white rounded-[2rem] fresco-label !text-lg !text-white shadow-2xl shadow-teal-900/20 mt-8 active:scale-[0.98] transition-all">ACTUALIZAR INFORMACIÓN</button>
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
