
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { PantryItem } from '../types';
import { Package, Plus, Trash2, X, Camera, Search, MoreVertical, Clock, AlertTriangle, ChevronDown, Minus, Calendar, Scale, ArrowUpDown, CalendarClock, Check, Tag, ChevronLeft, ChevronRight, FilterX } from 'lucide-react';
import { differenceInDays, startOfDay, format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { TicketScanner } from './TicketScanner';
import { triggerDialog } from './Dialog';
import { ModalPortal } from './ModalPortal';
import { autoScaleIngredient, formatQuantity, parseLocaleNumber } from '../services/unitService';

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

const CATEGORIES_LIST = [
    { id: 'vegetables', label: 'Vegetables', emoji: '🥦' },
    { id: 'fruits', label: 'Fruits', emoji: '🍎' },
    { id: 'dairy', label: 'Dairy & Eggs', emoji: '🧀' },
    { id: 'meat', label: 'Meat & Seafood', emoji: '🥩' },
    { id: 'fish', label: 'Fish', emoji: '🐟' },
    { id: 'pasta', label: 'Pasta & Grains', emoji: '🍝' },
    { id: 'legumes', label: 'Legumes', emoji: '🫘' },
    { id: 'bakery', label: 'Bakery', emoji: '🥐' },
    { id: 'beverages', label: 'Beverages', emoji: '🥤' },
    { id: 'frozen', label: 'Frozen', emoji: '❄️' },
    { id: 'pantry', label: 'Pantry', emoji: '🥫' },
    { id: 'spices', label: 'Spices', emoji: '🧂' },
    { id: 'other', label: 'Other', emoji: '📦' },
];

const FILTER_OPTIONS = [
    { id: 'all', label: 'All Categories', emoji: '🏠' },
    ...CATEGORIES_LIST
];

type SortOption = 'name' | 'expiry' | 'quantity';

const MODAL_INPUT_CLASSES = "w-full h-[62px] px-6 bg-[#F9FAFB] rounded-[1.4rem] font-black text-[11px] text-[#013b33] uppercase tracking-widest outline-none border-none transition-all focus:bg-gray-100 appearance-none flex items-center";

export const Pantry: React.FC<PantryProps> = ({ items, onRemove, onAdd, onUpdateQuantity, onAddMany, onEdit, isOnline = true }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterExpiring, setFilterExpiring] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<PantryItem | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(ITEMS_PER_PAGE);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [localValue, setLocalValue] = useState("");

  const [newItem, setNewItem] = useState<Partial<PantryItem>>({
    name: '',
    category: 'pantry',
    quantity: 1,
    unit: 'uds',
    added_at: format(new Date(), 'yyyy-MM-dd'),
    expires_at: ''
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 5);
        setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [items, selectedCategory]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
        const amount = direction === 'left' ? -200 : 200;
        scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const getExpiryStatus = (item: PantryItem) => {
    if (!item.expires_at) return { type: 'none', label: 'Fresco', color: 'text-[#147A74]', icon: Clock };
    const today = startOfDay(new Date());
    const expiryDate = startOfDay(new Date(item.expires_at));
    const days = differenceInDays(expiryDate, today);
    if (days < 0) return { type: 'expired', label: 'CADUCADO', color: 'text-[#FF4D4D]', icon: AlertTriangle };
    if (days === 0) return { type: 'Hoy', label: 'Hoy', color: 'text-[#FF4D4D]', icon: AlertTriangle };
    if (days <= 3) return { type: 'priority', label: `${days}d`, color: 'text-[#E67E22]', icon: Clock };
    return { type: 'fresh', label: format(expiryDate, "d MMM", { locale: es }), color: 'text-[#147A74]', icon: Clock };
  };

  const filteredItems = useMemo(() => {
      let result = [...items];
      if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          result = result.filter(item => item.name.toLowerCase().includes(lower));
      }
      if (selectedCategory !== 'all') {
          result = result.filter(item => item.category === selectedCategory);
      }
      if (filterExpiring) {
          const today = startOfDay(new Date());
          const limitDate = addDays(today, 5);
          result = result.filter(item => {
              if (!item.expires_at) return false;
              const itemExpiry = startOfDay(new Date(item.expires_at));
              return itemExpiry.getTime() <= limitDate.getTime();
          });
      }
      result.sort((a, b) => {
          let comparison = 0;
          if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
          else if (sortBy === 'expiry') {
              const timeA = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
              const timeB = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
              comparison = timeA - timeB;
          } else if (sortBy === 'quantity') comparison = a.quantity - b.quantity;
          return sortDirection === 'asc' ? comparison : -comparison;
      });
      return result;
  }, [items, searchTerm, selectedCategory, sortBy, sortDirection, filterExpiring]);

  const visibleItems = useMemo(() => filteredItems.slice(0, visibleLimit), [filteredItems, visibleLimit]);

  const handleSmartUpdate = (item: PantryItem, direction: number) => {
    const unit = item.unit.toLowerCase();
    let delta = 1;
    if (['g', 'ml'].includes(unit)) delta = 100 * direction;
    else if (['kg', 'l'].includes(unit)) delta = 0.1 * direction;
    else delta = direction;

    const rawNewQty = Math.max(0, item.quantity + delta);
    const { quantity: finalQty, unit: finalUnit } = autoScaleIngredient(rawNewQty, unit);
    onEdit({ ...item, quantity: finalQty, unit: finalUnit });
  };

  const startEditing = (item: PantryItem) => {
      setEditingId(item.id);
      setLocalValue(formatQuantity(item.quantity, item.unit).replace('.', ','));
  };

  const handleLocalChange = (val: string) => {
      const sanitized = val.replace(/[^0-9.,]/g, '');
      const parts = sanitized.split(/[.,]/);
      if (parts.length > 2) return;
      setLocalValue(sanitized);
  };

  const finishEditing = (item: PantryItem) => {
      const num = parseLocaleNumber(localValue);
      const { quantity: finalQty, unit: finalUnit } = autoScaleIngredient(num, item.unit);
      onEdit({ ...item, quantity: finalQty, unit: finalUnit });
      setEditingId(null);
  };

  const handleAddNewItem = () => {
    if (!newItem.name) return;
    const finalItem: PantryItem = {
      id: `manual-${Date.now()}`,
      name: newItem.name,
      category: newItem.category || 'pantry',
      quantity: Number(newItem.quantity) || 1,
      unit: newItem.unit || 'uds',
      added_at: newItem.added_at ? new Date(newItem.added_at).toISOString() : new Date().toISOString(),
      expires_at: newItem.expires_at ? new Date(newItem.expires_at).toISOString() : undefined
    };
    onAdd(finalItem);
    setShowAddModal(false);
    setNewItem({ name: '', category: 'pantry', quantity: 1, unit: 'uds', added_at: format(new Date(), 'yyyy-MM-dd'), expires_at: '' });
  };

  const InputLabel = ({ children, icon: Icon }: { children?: React.ReactNode, icon?: any }) => (
    <label className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] ml-1 mb-2 flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" />}
        {children}
    </label>
  );

  return (
    <div className="animate-fade-in pb-48 w-full max-w-full px-4 md:px-8 bg-[#FCFCFC] h-full overflow-y-auto no-scrollbar">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-6 mb-6">
        <div>
            <h1 className="text-[#013b33] text-[2rem] font-black tracking-[-0.05em] leading-[0.9]">Mi Stock</h1>
            <p className="text-gray-300 font-black uppercase text-[7px] tracking-[0.4em]">Gestión Inteligente</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-200 w-3.5 h-3.5" />
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setVisibleLimit(ITEMS_PER_PAGE); }}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl text-[11px] font-bold text-[#013b33] focus:outline-none shadow-sm transition-all"
                />
            </div>
            <button onClick={() => setShowScanner(true)} className="p-2.5 bg-orange-500 text-white rounded-xl shadow-lg active:scale-95 transition-all"><Camera className="w-4 h-4" /></button>
            <button onClick={() => { setNewItem({ name: '', category: 'pantry', quantity: 1, unit: 'uds', added_at: format(new Date(), 'yyyy-MM-dd'), expires_at: '' }); setShowAddModal(true); }} className="p-2.5 bg-[#013b33] text-white rounded-xl shadow-lg active:scale-95 transition-all"><Plus className="w-4 h-4" /></button>
        </div>
      </header>

      {/* SISTEMA DE FILTROS NORMALIZADO */}
      <div className="relative group/filters mb-6">
          {canScrollLeft && (
              <button 
                onClick={() => scroll('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white/90 backdrop-blur shadow-md rounded-full flex items-center justify-center text-[#147A74] border border-gray-100 animate-fade-in"
              >
                  <ChevronLeft className="w-5 h-5" />
              </button>
          )}
          
          <div 
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex overflow-x-auto no-scrollbar gap-3 pb-2 -mx-2 px-2 scroll-smooth"
          >
              {FILTER_OPTIONS.map(opt => {
                  const isActive = selectedCategory === opt.id;
                  const count = opt.id === 'all' 
                    ? items.length 
                    : items.filter(i => i.category === opt.id).length;

                  // Opcional: Ocultar categorías vacías en el Stock si se prefiere limpieza máxima
                  // Pero en stock suele ser útil verlas para saber qué falta. Por ahora mostramos todas.
                  
                  return (
                      <button 
                        key={opt.id} 
                        onClick={() => { setSelectedCategory(opt.id); setVisibleLimit(ITEMS_PER_PAGE); }}
                        className={`px-5 py-2.5 rounded-full font-bold text-[11px] whitespace-nowrap transition-all duration-300 border flex items-center gap-2 ${
                            isActive 
                            ? 'bg-[#e6f2f1] border-[#147A74] text-[#147A74] shadow-sm' 
                            : 'bg-[#f4f7f6] border-transparent text-[#6e8a88] hover:bg-gray-100'
                        }`}
                      >
                          <span>{opt.emoji}</span>
                          {opt.label}
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-md ${isActive ? 'bg-[#147A74] text-white' : 'bg-white/50 text-[#6e8a88]'}`}>{count}</span>
                      </button>
                  );
              })}
          </div>

          {canScrollRight && (
              <button 
                onClick={() => scroll('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white/90 backdrop-blur shadow-md rounded-full flex items-center justify-center text-[#147A74] border border-gray-100 animate-fade-in"
              >
                  <ChevronRight className="w-5 h-5" />
              </button>
          )}
      </div>

      <div className="flex items-center gap-6 mb-8 px-2">
          <div className="flex items-center gap-1 group">
              <button onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><ArrowUpDown className={`w-4 h-4 text-[#4a5f6b] transition-transform duration-300 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} /></button>
              <button onClick={() => setSortBy(prev => prev === 'name' ? 'expiry' : prev === 'expiry' ? 'quantity' : 'name')} className="flex items-center gap-2 text-[#4a5f6b] hover:text-[#013b33] transition-colors">
                  <span className="text-[12px] font-bold uppercase tracking-wider">Sort by: <span className="text-[#013b33] capitalize">{sortBy === 'expiry' ? 'Caducidad' : sortBy === 'quantity' ? 'Cantidad' : 'Nombre'}</span></span>
              </button>
          </div>
          <button onClick={() => { setFilterExpiring(!filterExpiring); setVisibleLimit(ITEMS_PER_PAGE); }} className={`flex items-center gap-3 transition-colors group ${filterExpiring ? 'text-[#147A74]' : 'text-[#4a5f6b] hover:text-[#013b33]'}`}><CalendarClock className={`w-4 h-4 group-hover:scale-110 transition-transform ${filterExpiring ? 'text-[#147A74]' : 'text-[#4a5f6b]'}`} /><span className="text-[12px] font-bold uppercase tracking-wider">Expiring soon</span>{filterExpiring && <div className="w-1.5 h-1.5 rounded-full bg-[#147A74] animate-pulse" />}</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {visibleItems.length === 0 ? (
              <div className="col-span-full py-20 text-center opacity-10 flex flex-col items-center">
                  {selectedCategory === 'all' ? <Package size={40} className="mb-2" /> : <FilterX size={40} className="mb-2" />}
                  <p className="font-black text-sm uppercase tracking-widest">Sin resultados</p>
                  {selectedCategory !== 'all' && <button onClick={() => setSelectedCategory('all')} className="mt-4 text-teal-600 font-bold text-xs underline pointer-events-auto">Ver todo el stock</button>}
              </div>
          ) : (
            visibleItems.map(item => {
                const status = getExpiryStatus(item);
                const catInfo = CATEGORIES_LIST.find(c => c.id === item.category) || CATEGORIES_LIST[0];
                const isLowStock = item.quantity <= 1;
                const StatusIcon = status.icon;
                const isEditing = editingId === item.id;
                return (
                    <div key={item.id} className="bg-white rounded-[2rem] shadow-[0_4px_25px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.05)] transition-all duration-500 flex flex-col h-[230px] border border-gray-50 group animate-fade-in p-5 relative">
                        <div className="flex justify-between items-start mb-2"><h3 className="text-[1.1rem] text-[#013b33] font-black leading-[1.1] tracking-tight line-clamp-1 pr-2 capitalize">{item.name}</h3><button onClick={() => setItemToEdit(item)} className="p-1 text-[#013b33] hover:opacity-60 transition-opacity"><MoreVertical className="w-5 h-5" /></button></div>
                        <div className="flex items-center gap-4 flex-1 min-h-0"><div className="w-14 h-14 rounded-full bg-[#F2F4F7] shadow-inner border border-white flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition-transform duration-500">{catInfo.emoji || '📦'}</div><div className="flex flex-col gap-0.5 min-w-0"><div className={`flex items-center gap-1.5 font-black text-[10px] tracking-tight ${status.color}`}><StatusIcon className="w-3.5 h-3.5 stroke-[2.5px]" /><span className="truncate uppercase">{status.label}</span></div></div></div>
                        
                        <div className={`mt-2 rounded-[1.8rem] p-0.5 flex items-center justify-between border transition-all duration-500 w-[100px] self-end ${isLowStock ? 'bg-[#FFF5F5] border-[#FFEBEB]' : 'bg-[#F9FAFB] border-[#F2F4F7]'}`}>
                          <button onClick={(e) => { e.stopPropagation(); handleSmartUpdate(item, -1); }} className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-300 hover:text-red-500 transition-all"><Minus className="w-3 h-3 stroke-[2.5px]" /></button>
                          <div className="px-0.5 text-center min-w-0 flex-1">
                              <input 
                                  type="text"
                                  inputMode="decimal"
                                  className={`w-full bg-transparent font-black text-[10px] leading-none tracking-tighter text-center outline-none border-none p-0 focus:ring-0 ${isLowStock ? 'text-[#FF4D4D]' : 'text-[#013b33]'}`}
                                  value={isEditing ? localValue : formatQuantity(item.quantity, item.unit).replace('.', ',')}
                                  onChange={(e) => handleLocalChange(e.target.value)}
                                  onFocus={() => startEditing(item)}
                                  onBlur={() => finishEditing(item)}
                                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                                  onClick={e => (e.target as HTMLInputElement).select()}
                              />
                              <span className={`text-[5px] font-black mt-0.5 tracking-widest block leading-none ${isLowStock ? 'text-[#FF4D4D]' : 'text-[#9DB2AF]'}`}>{isLowStock ? 'BAJO' : (item.unit || 'uds').toUpperCase()}</span>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleSmartUpdate(item, 1); }} className={`w-8 h-8 flex items-center justify-center text-white rounded-full shadow-md transition-all ${isLowStock ? 'bg-[#FF4D4D]' : 'bg-[#147A74]'}`}><Plus className="w-3.5 h-3.5 stroke-[3px]" /></button>
                        </div>
                    </div>
                );
            })
          )}
      </div>

      {visibleLimit < filteredItems.length && (
          <div className="flex justify-center pt-10"><button onClick={() => setVisibleLimit(prev => prev + ITEMS_PER_PAGE)} className="group flex items-center gap-4 px-8 py-3 bg-white border border-gray-100 rounded-2xl shadow-md hover:shadow-lg transition-all"><span className="text-[#013b33] font-black text-[10px] uppercase tracking-widest">Ver más inventario</span><ChevronDown className="w-4 h-4 text-gray-200 group-hover:translate-y-1 transition-transform" /></button></div>
      )}
      
      {itemToEdit && (
        <ModalPortal>
          <div className="fixed inset-0 z-[5000] bg-black/40 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setItemToEdit(null)}>
              <div className="w-full max-w-[420px] bg-white rounded-[2.8rem] p-10 shadow-2xl relative animate-slide-up" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-8"><h2 className="text-[#013b33] text-[2rem] font-black tracking-tight leading-none">Editar Item</h2><div className="flex gap-1"><button onClick={() => { triggerDialog({ title: '¿Borrar?', message: 'Se perderá el stock.', type: 'confirm', onConfirm: () => { onRemove(itemToEdit.id); setItemToEdit(null); } }); }} className="p-2.5 text-gray-200 hover:text-red-500 transition-colors"><Trash2 className="w-6 h-6" /></button><button onClick={() => setItemToEdit(null)} className="p-2.5 text-gray-200 hover:text-black transition-colors"><X className="w-7 h-7" /></button></div></div>
                  <div className="space-y-6">
                      <div className="flex flex-col"><InputLabel>Nombre del producto</InputLabel><input className={MODAL_INPUT_CLASSES + " !text-[1rem]"} placeholder="Ej. Manzanas" value={itemToEdit.name} onChange={e => setItemToEdit({...itemToEdit, name: e.target.value})} /></div>
                      <div className="flex flex-col"><InputLabel icon={Tag}>Categoría</InputLabel><div className="relative"><select className={MODAL_INPUT_CLASSES} value={itemToEdit.category} onChange={e => setItemToEdit({...itemToEdit, category: e.target.value})}>{CATEGORIES_LIST.map(cat => <option key={cat.id} value={cat.id}>{cat.emoji} {cat.label.toUpperCase()}</option>)}</select><ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-300" /></div></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col">
                              <InputLabel icon={Calendar}>Compra</InputLabel>
                              <div className="relative">
                                  <input type="text" className={MODAL_INPUT_CLASSES} placeholder="AAAA-MM-DD" value={itemToEdit.added_at ? format(new Date(itemToEdit.added_at), "yyyy-MM-dd") : ""} onChange={e => setItemToEdit({...itemToEdit, added_at: new Date(e.target.value).toISOString()})} />
                                  <input type="date" className="absolute inset-0 opacity-0 cursor-pointer" value={itemToEdit.added_at ? format(new Date(itemToEdit.added_at), "yyyy-MM-dd") : ""} onChange={e => {
                                      const d = new Date(e.target.value);
                                      if(!isNaN(d.getTime())) setItemToEdit({...itemToEdit, added_at: d.toISOString()});
                                  }} />
                              </div>
                          </div>
                          <div className="flex flex-col">
                              <InputLabel icon={Clock}>Caducidad</InputLabel>
                              <div className="relative">
                                  <input type="text" className={MODAL_INPUT_CLASSES + " !text-[#147A74]"} placeholder="AAAA-MM-DD" value={itemToEdit.expires_at ? format(new Date(itemToEdit.expires_at), "yyyy-MM-dd") : ""} onChange={e => setItemToEdit({...itemToEdit, expires_at: new Date(e.target.value).toISOString()})} />
                                  <input type="date" className="absolute inset-0 opacity-0 cursor-pointer" value={itemToEdit.expires_at ? format(new Date(itemToEdit.expires_at), "yyyy-MM-dd") : ""} onChange={e => {
                                      const d = new Date(e.target.value);
                                      if(!isNaN(d.getTime())) setItemToEdit({...itemToEdit, expires_at: d.toISOString()});
                                  }} />
                              </div>
                          </div>
                      </div>
                      <div className="grid grid-cols-[1fr_2fr] gap-4">
                          <div className="flex flex-col"><InputLabel>Cantidad</InputLabel><input type="number" step="0.1" className={MODAL_INPUT_CLASSES + " text-center px-2"} value={itemToEdit.quantity} onChange={e => setItemToEdit({...itemToEdit, quantity: parseFloat(e.target.value) || 0})} /></div>
                          <div className="flex flex-col"><InputLabel icon={Scale}>Unidad</InputLabel><div className="relative"><select className={MODAL_INPUT_CLASSES} value={itemToEdit.unit || 'uds'} onChange={e => setItemToEdit({...itemToEdit, unit: e.target.value})}>{UNIT_OPTIONS.map(u => <option key={u.id} value={u.id}>{u.label.toUpperCase()}</option>)}</select><ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-300" /></div></div>
                      </div>
                      <button onClick={() => { onEdit(itemToEdit); setItemToEdit(null); }} className="w-full h-[64px] bg-[#013b33] text-white rounded-[1.6rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">Guardar Cambios</button>
                  </div>
              </div>
          </div>
        </ModalPortal>
      )}

      {showAddModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[5000] bg-black/40 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
              <div className="w-full max-w-[420px] bg-white rounded-[2.8rem] p-10 shadow-2xl relative animate-slide-up" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-8"><h2 className="text-[#013b33] text-[2rem] font-black tracking-tight leading-none">Nuevo Item</h2><button onClick={() => setShowAddModal(false)} className="p-2.5 text-gray-200 hover:text-black transition-colors"><X className="w-7 h-7" /></button></div>
                  <div className="space-y-6">
                      <div className="flex flex-col"><InputLabel>Nombre del producto</InputLabel><input autoFocus className={MODAL_INPUT_CLASSES + " !text-[1rem] placeholder:text-gray-200"} placeholder="Ej. Manzanas" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} /></div>
                      <div className="flex flex-col"><InputLabel icon={Tag}>Categoría</InputLabel><div className="relative"><select className={MODAL_INPUT_CLASSES} value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>{CATEGORIES_LIST.map(cat => <option key={cat.id} value={cat.id}>{cat.emoji} {cat.label.toUpperCase()}</option>)}</select><ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-300" /></div></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col">
                              <InputLabel icon={Calendar}>Compra</InputLabel>
                              <div className="relative">
                                  <input type="text" className={MODAL_INPUT_CLASSES} placeholder="AAAA-MM-DD" value={newItem.added_at || ""} onChange={e => setNewItem({...newItem, added_at: e.target.value})} />
                                  <input type="date" className="absolute inset-0 opacity-0 cursor-pointer" value={newItem.added_at || ""} onChange={e => setNewItem({...newItem, added_at: e.target.value})} />
                              </div>
                          </div>
                          <div className="flex flex-col">
                              <InputLabel icon={Clock}>Caducidad</InputLabel>
                              <div className="relative">
                                  <input type="text" className={MODAL_INPUT_CLASSES + " !text-[#147A74]"} placeholder="AAAA-MM-DD" value={newItem.expires_at || ""} onChange={e => setNewItem({...newItem, expires_at: e.target.value})} />
                                  <input type="date" className="absolute inset-0 opacity-0 cursor-pointer" value={newItem.expires_at || ""} onChange={e => setNewItem({...newItem, expires_at: e.target.value})} />
                              </div>
                          </div>
                      </div>
                      <div className="grid grid-cols-[1fr_2fr] gap-4">
                          <div className="flex flex-col"><InputLabel>Cantidad</InputLabel><input type="number" step="0.1" className={MODAL_INPUT_CLASSES + " text-center px-2"} value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value) || 0})} /></div>
                          <div className="flex flex-col"><InputLabel icon={Scale}>Unidad</InputLabel><div className="relative"><select className={MODAL_INPUT_CLASSES} value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})}>{UNIT_OPTIONS.map(u => <option key={u.id} value={u.id}>{u.label.toUpperCase()}</option>)}</select><ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-300" /></div></div>
                      </div>
                      <button onClick={handleAddNewItem} disabled={!newItem.name} className="w-full h-[64px] bg-[#013b33] text-white rounded-[1.6rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all disabled:opacity-40">AÑADIR A DESPENSA</button>
                  </div>
              </div>
          </div>
        </ModalPortal>
      )}
      {showScanner && <TicketScanner onClose={() => setShowScanner(false)} onAddItems={(items) => { onAddMany(items); setShowScanner(false); }} />}
    </div>
  );
}
