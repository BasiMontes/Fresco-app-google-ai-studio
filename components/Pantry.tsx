
import React, { useState, useMemo } from 'react';
import { PantryItem } from '../types';
import { Package, Plus, Trash2, X, Camera, Pencil, Search, LayoutGrid, List, ChevronRight, AlertCircle, MoreHorizontal } from 'lucide-react';
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
    if (!item.expires_at) return { type: 'none', label: '', bg: 'bg-white', border: 'border-gray-100', dot: 'bg-gray-200', text: 'text-gray-400', progressColor: 'bg-gray-200' };
    const today = startOfDay(new Date());
    const expiry = startOfDay(new Date(item.expires_at));
    const days = differenceInDays(expiry, today);
    if (days < 0) return { type: 'expired', label: 'Caducado', bg: 'bg-red-50/30', border: 'border-red-100', dot: 'bg-red-500', text: 'text-red-700', progressColor: 'bg-red-500' };
    if (days <= 3) {
        let labelText = days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `En ${days}d`;
        return { type: 'priority', label: labelText, bg: 'bg-orange-50/30', border: 'border-orange-100', dot: 'bg-orange-500', text: 'text-orange-700', progressColor: 'bg-orange-500' };
    }
    return { type: 'fresh', label: 'Óptimo', bg: 'bg-white', border: 'border-gray-100', dot: 'bg-green-500', text: 'text-green-700', progressColor: 'bg-teal-500' };
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
    <div className="space-y-10 animate-fade-in pb-48 max-w-7xl mx-auto px-2 md:px-4">
      
      {/* Header - Search, Scan, Add */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
            <h1 className="fresco-h1 text-teal-950">Despensa</h1>
            <p className="fresco-body mt-1">Control de inventario inteligente.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative group flex-1 sm:w-64 lg:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4 group-focus-within:text-teal-600 transition-colors" />
                <input type="text" placeholder="Buscar producto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-100 rounded-[1.25rem] text-sm font-bold text-teal-950 focus:outline-none focus:ring-4 focus:ring-teal-500/5 shadow-sm transition-all"
                />
            </div>
            <div className="flex gap-2">
                <button onClick={() => isOnline && setShowScanner(true)} className="flex-1 sm:flex-none px-6 py-3.5 bg-orange-500 text-white rounded-[1.25rem] flex items-center justify-center gap-2 fresco-label !text-white shadow-xl shadow-orange-500/10 active:scale-95 transition-all">
                    <Camera className="w-5 h-5" /> Escanear
                </button>
                <button onClick={() => setShowAddModal(true)} className="flex-1 sm:flex-none px-6 py-3.5 bg-teal-900 text-white rounded-[1.25rem] flex items-center justify-center gap-2 fresco-label !text-white shadow-xl shadow-teal-900/10 active:scale-95 transition-all">
                    <Plus className="w-5 h-5" /> Añadir
                </button>
            </div>
        </div>
      </header>

      {/* Tabs / Filters and View Selector */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-gray-100 pb-6">
          <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-1">
              {[
                { id: 'all', label: 'Todo el Stock' },
                { id: 'expired', label: 'Caducados' },
                { id: 'priority', label: 'Cerca de Caducar' },
                { id: 'fresh', label: 'En Temporada' }
              ].map(f => (
                  <button key={f.id} onClick={() => setActiveFilter(f.id as any)}
                    className={`px-6 py-2.5 rounded-full fresco-label transition-all border whitespace-nowrap ${activeFilter === f.id ? 'bg-teal-900 border-teal-900 !text-white shadow-lg' : 'bg-gray-50 border-transparent !text-gray-400 hover:bg-gray-100'}`}
                  >
                      {f.label}
                  </button>
              ))}
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                    <span className="uppercase tracking-tighter">Vista:</span>
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-teal-900 shadow-sm' : 'text-gray-400'}`}>
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-teal-900 shadow-sm' : 'text-gray-400'}`}>
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
          </div>
      </div>

      {/* Grid / List Content */}
      <div className="space-y-16">
          {Object.keys(groupedItems).length === 0 ? (
              <div className="py-24 text-center flex flex-col items-center opacity-30">
                  <Package className="w-20 h-20 mb-6 text-gray-200" />
                  <p className="fresco-h2 text-gray-400">Despensa vacía</p>
                  <button onClick={() => { setSearchTerm(''); setActiveFilter('all'); }} className="mt-4 text-teal-600 font-bold hover:underline">Limpiar filtros</button>
              </div>
          ) : (
            Object.keys(groupedItems).sort().map(cat => {
                const catInfo = CATEGORIES_OPTIONS.find(c => c.id === cat) || CATEGORIES_OPTIONS[7];
                return (
                    <div key={cat} className="space-y-8">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 ${catInfo.color} rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-white/50`}>
                                {catInfo.emoji}
                            </div>
                            <div>
                                <h3 className="fresco-h2 !text-xl text-teal-950 capitalize">{catInfo.label}</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">{groupedItems[cat].length} productos</p>
                            </div>
                            <div className="flex-1 h-px bg-gray-100" />
                        </div>

                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                                {groupedItems[cat].map(item => {
                                    const status = getExpiryStatus(item);
                                    return (
                                        <div key={item.id} className="bg-white rounded-[2.5rem] border border-gray-100 p-6 flex flex-col shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden">
                                            {/* Status Dot */}
                                            <div className="absolute top-6 right-6 flex items-center gap-2">
                                                <div className={`w-2.5 h-2.5 rounded-full ${status.dot} ${status.type === 'priority' || status.type === 'expired' ? 'animate-pulse' : ''}`} />
                                            </div>

                                            <div className="flex gap-5 mb-8">
                                                <div className="w-24 h-24 rounded-[1.5rem] bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-50">
                                                    <SmartImage 
                                                        src={`https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200&sig=${item.id}`} 
                                                        alt={item.name} 
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                    <h4 className="fresco-h3 text-teal-950 truncate capitalize mb-1" title={item.name}>{item.name}</h4>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Fresco Original</p>
                                                    {status.label && (
                                                        <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${status.bg} border border-white/50 w-fit`}>
                                                            <span className={`fresco-label !text-[9px] ${status.text}`}>{status.label}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Stock Meter */}
                                            <div className="mb-6 space-y-2">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Stock</span>
                                                    <span className="text-[10px] font-black text-teal-900">{Math.min(100, item.quantity * 25)}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all duration-1000 ${status.progressColor}`} style={{ width: `${Math.min(100, item.quantity * 25)}%` }} />
                                                </div>
                                            </div>

                                            <div className="mt-auto flex items-center justify-between gap-4">
                                                <div className="bg-gray-50/80 rounded-2xl p-1.5 flex items-center justify-between flex-1 border border-gray-100/50">
                                                    <button onClick={() => onUpdateQuantity(item.id, -1)} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-gray-400 hover:text-red-500 active:scale-90 transition-all font-black text-xl">-</button>
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-base font-black text-teal-950 leading-none">{item.quantity}</span>
                                                        <span className="fresco-label !text-[8px] !text-gray-400 mt-1">{item.unit}</span>
                                                    </div>
                                                    <button onClick={() => onUpdateQuantity(item.id, 1)} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-gray-400 hover:text-teal-600 active:scale-90 transition-all font-black text-xl">+</button>
                                                </div>
                                                <button onClick={() => setItemToEdit(item)} className="p-3.5 bg-white border border-gray-100 rounded-2xl text-gray-300 hover:text-teal-900 hover:shadow-md transition-all">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="text-left fresco-label !text-gray-400 border-b border-gray-50">
                                            <th className="px-8 py-5 font-black">Producto</th>
                                            <th className="px-4 py-5 font-black hidden md:table-cell">Estado</th>
                                            <th className="px-4 py-5 font-black hidden lg:table-cell">Caducidad</th>
                                            <th className="px-8 py-5 font-black text-right">Cantidad</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {groupedItems[cat].map((item) => {
                                            const status = getExpiryStatus(item);
                                            return (
                                                <tr key={item.id} className="group hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setItemToEdit(item)}>
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-xl bg-gray-50 overflow-hidden flex-shrink-0">
                                                                <SmartImage src={`https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200&sig=${item.id}`} className="w-full h-full object-cover" />
                                                            </div>
                                                            <div>
                                                                <span className="font-bold text-teal-950 text-base block capitalize">{item.name}</span>
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{catInfo.label} • Almacén</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-5 hidden md:table-cell">
                                                        <div className="w-32">
                                                            <div className="flex justify-between text-[9px] font-black uppercase mb-1.5 text-gray-300 tracking-widest">
                                                                <span>Nivel</span>
                                                                <span>{Math.min(100, item.quantity * 25)}%</span>
                                                            </div>
                                                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                                                <div className={`h-full rounded-full ${status.progressColor}`} style={{ width: `${Math.min(100, item.quantity * 25)}%` }} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-5 hidden lg:table-cell">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${status.dot}`} />
                                                            <span className={`text-sm font-bold ${status.type === 'expired' || status.type === 'priority' ? 'text-orange-600' : 'text-gray-500'}`}>
                                                                {status.label || (item.expires_at ? format(new Date(item.expires_at), 'dd MMM yyyy', { locale: es }) : '--')}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5" onClick={e => e.stopPropagation()}>
                                                        <div className="flex items-center justify-end gap-6">
                                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                                <button onClick={() => onUpdateQuantity(item.id, -1)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-white text-gray-400 shadow-sm transition-all">-</button>
                                                                <button onClick={() => onUpdateQuantity(item.id, 1)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-white text-gray-400 shadow-sm transition-all">+</button>
                                                            </div>
                                                            <div className="text-right min-w-[4ch]">
                                                                <span className="text-xl font-black text-teal-950 tabular-nums">{item.quantity}</span>
                                                                <span className="fresco-label !text-[9px] !text-gray-400 ml-1.5">{item.unit}</span>
                                                            </div>
                                                            <ChevronRight className="w-5 h-5 text-gray-200 group-hover:text-teal-900 group-hover:translate-x-1 transition-all" />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );
            })
          )}
      </div>
      
      {/* Modals for Adding and Editing - Redesigned for consistency */}
      {showAddModal && (
        <div className="fixed inset-0 z-[5000] bg-teal-950/20 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-[3rem] p-10 shadow-2xl relative animate-slide-up">
                <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 p-2 text-gray-300 hover:text-gray-900 transition-colors"><X className="w-6 h-6" /></button>
                <h2 className="fresco-h1 !text-3xl text-teal-950 mb-8">Añadir Stock</h2>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="fresco-label ml-1">Nombre</label>
                        <input autoFocus className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold text-teal-950 outline-none focus:ring-4 focus:ring-teal-500/10 transition-all border border-transparent focus:border-teal-100" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Ej. Tomates" />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                            <label className="fresco-label ml-1">Cantidad</label>
                            <input type="number" className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold text-teal-950 outline-none" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value)})} />
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="fresco-label ml-1">Unidad</label>
                            <select className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold text-teal-950 outline-none appearance-none bg-no-repeat bg-[right_1.2rem_center]" style={{ backgroundImage: selectChevron, backgroundSize: '0.8em' }} value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})}>
                                {UNITS_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="fresco-label ml-1">Categoría</label>
                        <select className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold text-teal-950 outline-none appearance-none bg-no-repeat bg-[right_1.2rem_center]" style={{ backgroundImage: selectChevron, backgroundSize: '0.8em' }} value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                            {CATEGORIES_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                        </select>
                    </div>
                    <button onClick={() => { onAdd({...newItem, id: Date.now().toString(), added_at: new Date().toISOString()}); setShowAddModal(false); }} className="w-full py-5 bg-teal-900 text-white rounded-2xl fresco-label !text-white shadow-2xl shadow-teal-900/20 mt-4 active:scale-[0.98] transition-all">Guardar Producto</button>
                </div>
            </div>
        </div>
      )}

      {itemToEdit && (
        <div className="fixed inset-0 z-[5000] bg-teal-950/20 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-[3rem] p-10 shadow-2xl relative animate-slide-up">
                <div className="absolute top-8 right-8 flex gap-2">
                    <button onClick={() => { triggerDialog({ title: '¿Eliminar producto?', message: 'Se quitará permanentemente.', type: 'confirm', onConfirm: () => { onRemove(itemToEdit.id); setItemToEdit(null); } }); }} className="p-2 text-red-300 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                    <button onClick={() => setItemToEdit(null)} className="p-2 text-gray-300 hover:text-gray-950 transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <h2 className="fresco-h1 !text-3xl text-teal-950 mb-8">Editar Producto</h2>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="fresco-label ml-1">Nombre</label>
                        <input className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold text-teal-950 outline-none" value={itemToEdit.name} onChange={e => setItemToEdit({...itemToEdit, name: e.target.value})} />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                            <label className="fresco-label ml-1">Cantidad</label>
                            <input type="number" className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold text-teal-950 outline-none" value={itemToEdit.quantity} onChange={e => setItemToEdit({...itemToEdit, quantity: parseFloat(e.target.value)})} />
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="fresco-label ml-1">Unidad</label>
                            <select className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold text-teal-950 outline-none appearance-none bg-no-repeat bg-[right_1.2rem_center]" style={{ backgroundImage: selectChevron, backgroundSize: '0.8em' }} value={itemToEdit.unit} onChange={e => setItemToEdit({...itemToEdit, unit: e.target.value})}>
                                {UNITS_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="fresco-label ml-1">Categoría</label>
                        <select className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold text-teal-950 outline-none appearance-none bg-no-repeat bg-[right_1.2rem_center]" style={{ backgroundImage: selectChevron, backgroundSize: '0.8em' }} value={itemToEdit.category} onChange={e => setItemToEdit({...itemToEdit, category: e.target.value})}>
                            {CATEGORIES_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                        </select>
                    </div>
                    <button onClick={() => { onEdit(itemToEdit); setItemToEdit(null); }} className="w-full py-5 bg-teal-900 text-white rounded-2xl fresco-label !text-white shadow-2xl shadow-teal-900/20 mt-4 active:scale-[0.98] transition-all">Actualizar Información</button>
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
