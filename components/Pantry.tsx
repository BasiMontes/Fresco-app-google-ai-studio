
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PantryItem } from '../types';
import { Package, Plus, Trash2, Calendar, X, Save, AlertTriangle, Clock, Minus, Plus as PlusIcon, Camera, Sparkles, Pencil, CheckCircle2, AlertOctagon, WifiOff, Search, ChevronDown, ChevronUp, Wand2, RotateCcw, Utensils, ArrowRight, Skull, Zap } from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { TicketScanner } from './TicketScanner';
import { PREDICTIVE_CATEGORY_RULES, SPANISH_PRICES } from '../constants';

interface PantryProps {
  items: PantryItem[];
  highlightId?: string | null; 
  onRemove: (id: string) => void;
  onAdd: (item: PantryItem) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onAddMany: (items: PantryItem[]) => void;
  onEdit: (item: PantryItem) => void;
  onWaste?: (item: PantryItem, value: number) => void;
  onCook?: (itemName: string) => void; 
  isOnline?: boolean;
}

const CATEGORIES_OPTIONS = [
    { id: 'vegetables', label: 'Verdulería', emoji: '🥦' },
    { id: 'fruits', label: 'Frutería', emoji: '🍎' },
    { id: 'dairy', label: 'Lácteos', emoji: '🧀' },
    { id: 'meat', label: 'Carnicería', emoji: '🥩' },
    { id: 'fish', label: 'Pescadería', emoji: '🐟' },
    { id: 'grains', label: 'Cereales', emoji: '🥖' },
    { id: 'pantry', label: 'Despensa', emoji: '🥫' },
    { id: 'spices', label: 'Especias', emoji: '🧂' },
    { id: 'other', label: 'Otros', emoji: '🛍️' },
];

export const Pantry: React.FC<PantryProps> = ({ items, highlightId, onRemove, onAdd, onUpdateQuantity, onAddMany, onEdit, onWaste, onCook, isOnline = true }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [itemToEdit, setItemToEdit] = useState<PantryItem | null>(null);
  
  const [quickAdjustItem, setQuickAdjustItem] = useState<PantryItem | null>(null);
  const [quickValue, setQuickValue] = useState(0);

  const [wasteItem, setWasteItem] = useState<PantryItem | null>(null);

  const [activeFilter, setActiveFilter] = useState<'all' | 'expired' | 'critical' | 'fresh'>('all');

  const [newItem, setNewItem] = useState({ 
    name: '', 
    quantity: 1, 
    unit: 'unidades', 
    category: 'pantry',
    daysToExpire: 7
  });
  
  const [manualOverride, setManualOverride] = useState({ category: false, unit: false });

  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const quantityInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      const initial: Record<string, boolean> = {};
      CATEGORIES_OPTIONS.forEach(c => initial[c.id] = true);
      setExpandedCategories(initial);
  }, []);

  useEffect(() => {
      if (highlightId && itemRefs.current[String(highlightId)]) {
          const item = items.find(i => i.id === highlightId);
          if(item) {
              setExpandedCategories(prev => ({...prev, [item.category]: true}));
              setTimeout(() => {
                  itemRefs.current[String(highlightId)]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 300);
          }
      }
  }, [highlightId, items]);

  useEffect(() => {
      if (!newItem.name) return;
      const lowerName = newItem.name.toLowerCase();
      const matchKey = Object.keys(PREDICTIVE_CATEGORY_RULES).find(key => lowerName.includes(key));
      
      if (matchKey) {
          const rule = PREDICTIVE_CATEGORY_RULES[matchKey];
          setNewItem(prev => ({
              ...prev,
              category: manualOverride.category ? prev.category : rule.category,
              unit: manualOverride.unit ? prev.unit : rule.unit
          }));
      }
  }, [newItem.name, manualOverride]);

  const handleManualAdd = (e?: React.FormEvent) => {
    if(e) e.preventDefault();
    if (!newItem.name.trim()) return;
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + newItem.daysToExpire);

    onAdd({
      id: `manual-${Date.now()}`,
      name: newItem.name.trim(),
      quantity: newItem.quantity,
      unit: newItem.unit,
      category: newItem.category,
      added_at: new Date().toISOString(),
      expires_at: expiryDate.toISOString()
    });
    setNewItem({ name: '', quantity: 1, unit: 'unidades', category: 'pantry', daysToExpire: 7 });
    setManualOverride({ category: false, unit: false });
    setShowAddModal(false);
  };

  const initDelete = (item: PantryItem) => {
      setWasteItem(item);
  };

  const confirmDelete = (type: 'consumed' | 'wasted' | 'mistake') => {
      if (!wasteItem) return;

      if (type === 'wasted') {
          const price = SPANISH_PRICES[wasteItem.name.toLowerCase()] || SPANISH_PRICES['default'];
          const multiplier = (wasteItem.unit === 'g' || wasteItem.unit === 'ml') ? 0.001 : 1;
          const lostValue = wasteItem.quantity * multiplier * price;
          
          if (onWaste) onWaste(wasteItem, lostValue);
      }

      onRemove(wasteItem.id);
      setWasteItem(null);
      setQuickAdjustItem(null); 
  };

  const handleEditSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(itemToEdit) {
          onEdit(itemToEdit);
          setItemToEdit(null);
      }
  };

  const handleQuickAdjustConfirm = () => {
      if (quickAdjustItem) {
          const newItem = { ...quickAdjustItem, quantity: quickValue };
          if (newItem.quantity <= 0) {
              initDelete(quickAdjustItem); 
          } else {
              onEdit(newItem);
              setQuickAdjustItem(null);
          }
      }
  };

  const getExpiryStatus = (item: PantryItem) => {
    if (!item.expires_at) return null;
    const days = differenceInDays(new Date(item.expires_at), new Date());
    if (isPast(new Date(item.expires_at)) && days < 0) return { type: 'expired', label: 'Caducado', color: 'text-red-600 bg-red-50' };
    if (days <= 2) return { type: 'critical', label: `Caduca en ${days === 0 ? 'hoy' : days + 'd'}`, color: 'text-orange-600 bg-orange-50' };
    return { type: 'fresh', label: 'Fresco', color: 'text-green-600 bg-green-50' };
  };

  const getSmartStep = (unit: string) => {
      const u = (unit || '').toLowerCase().trim();
      if (u === 'g' || u === 'ml') return 50; 
      if (u === 'kg' || u === 'l') return 0.25;
      if (u === 'unidades' || u === 'uds' || u === 'ud') return 1;
      return 1;
  };

  const pantryStats = useMemo(() => {
      let expired = 0;
      let critical = 0;
      let fresh = 0;

      items.forEach(item => {
          const status = getExpiryStatus(item);
          if (status?.type === 'expired') expired++;
          else if (status?.type === 'critical') critical++;
          else fresh++;
      });
      return { expired, critical, fresh };
  }, [items]);

  const filteredItems = useMemo<PantryItem[]>(() => {
      let result = items;
      if (activeFilter !== 'all') {
          result = result.filter(item => {
              const status = getExpiryStatus(item);
              return status?.type === activeFilter;
          });
      }
      if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          result = result.filter(item => item.name.toLowerCase().includes(lower));
      }
      return result;
  }, [items, activeFilter, searchTerm]);

  const toggleCategory = (cat: string) => {
      setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const categoriesPresent = Array.from(new Set(filteredItems.map(i => i.category)));

  const renderHighlightedText = (text: string, highlight: string) => {
      if (!highlight) return text;
      const strText = text || '';
      const parts = strText.split(new RegExp(`(${highlight})`, 'gi'));
      return parts.map((part, i) => 
          String(part).toLowerCase() === String(highlight).toLowerCase() 
              ? <span key={i} className="bg-orange-200 text-orange-900 px-0.5 rounded">{part}</span> 
              : part
      );
  };

  return (
    <div className="space-y-4 animate-fade-in relative pb-32">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
            <div>
            <h1 className="text-3xl font-black text-teal-900 leading-none mb-1">Stock Actual</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Gestión de activos alimentarios</p>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => { if(isOnline) setShowScanner(true); }}
                    disabled={!isOnline}
                    className={`text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-md transition-all ${isOnline ? 'bg-orange-500 hover:bg-orange-600 active:scale-95' : 'bg-gray-400 opacity-50 cursor-not-allowed'}`}
                >
                    {isOnline ? <><Camera className="w-4 h-4" /> Escáner</> : <><WifiOff className="w-4 h-4" /> Offline</>}
                </button>
                <button 
                    onClick={() => setShowAddModal(true)} 
                    className="w-10 h-10 bg-teal-900 text-white rounded-xl flex items-center justify-center shadow-md hover:bg-teal-800 active:scale-90 transition-all"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>
        </div>

        {items.length > 0 && (
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4 group-focus-within:text-teal-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Buscar en despensa..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-full font-bold text-gray-700 text-sm shadow-sm focus:outline-none focus:border-teal-500 focus:shadow-md transition-all"
                />
            </div>
        )}
      </div>

      {items.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-1">
              <button 
                onClick={() => setActiveFilter(activeFilter === 'expired' ? 'all' : 'expired')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                    activeFilter === 'expired' ? 'bg-red-500 text-white border-red-500 shadow-md' : 'bg-white border-gray-100 text-gray-500 hover:border-red-200'
                }`}
              >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${activeFilter === 'expired' ? 'bg-white/20' : 'bg-red-50'}`}>
                      <AlertOctagon className={`w-3 h-3 ${activeFilter === 'expired' ? 'text-white' : 'text-red-500'}`} />
                  </div>
                  <div className="text-left">
                      <div className="text-sm font-black leading-none">{pantryStats.expired}</div>
                      <div className="text-[8px] font-bold uppercase tracking-widest opacity-70">Caducados</div>
                  </div>
              </button>

              <button 
                onClick={() => setActiveFilter(activeFilter === 'critical' ? 'all' : 'critical')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                    activeFilter === 'critical' ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-white border-gray-100 text-gray-500 hover:border-orange-200'
                }`}
              >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${activeFilter === 'critical' ? 'bg-white/20' : 'bg-orange-50'}`}>
                      <AlertTriangle className={`w-3 h-3 ${activeFilter === 'critical' ? 'text-white' : 'text-orange-500'}`} />
                  </div>
                  <div className="text-left">
                      <div className="text-sm font-black leading-none">{pantryStats.critical}</div>
                      <div className="text-[8px] font-bold uppercase tracking-widest opacity-70">Críticos</div>
                  </div>
              </button>

              <button 
                onClick={() => setActiveFilter(activeFilter === 'fresh' ? 'all' : 'fresh')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                    activeFilter === 'fresh' ? 'bg-teal-600 text-white border-teal-600 shadow-md' : 'bg-white border-gray-100 text-gray-500 hover:border-teal-200'
                }`}
              >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${activeFilter === 'fresh' ? 'bg-white/20' : 'bg-teal-50'}`}>
                      <CheckCircle2 className={`w-3 h-3 ${activeFilter === 'fresh' ? 'text-white' : 'text-teal-600'}`} />
                  </div>
                  <div className="text-left">
                      <div className="text-sm font-black leading-none">{pantryStats.fresh}</div>
                      <div className="text-[8px] font-bold uppercase tracking-widest opacity-70">Frescos</div>
                  </div>
              </button>
          </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center px-12">
          <div className="w-24 h-24 bg-gray-50 rounded-3xl flex items-center justify-center mb-6">
            <Package className="w-12 h-12 text-gray-200" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Tu nevera está vacía</h2>
          <p className="text-gray-400 font-medium max-w-sm mx-auto leading-relaxed text-sm">
            Escanea tu ticket de compra.
          </p>
          <button 
            onClick={() => { if(isOnline) setShowScanner(true); }}
            disabled={!isOnline}
            className={`mt-6 px-8 py-4 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all ${isOnline ? 'bg-teal-900' : 'bg-gray-400 cursor-not-allowed'}`}
          >
            {isOnline ? 'Escanear mi primer ticket' : 'Modo Offline: Usar Botón +'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {categoriesPresent.sort().map(cat => (
            <div key={String(cat)} className="animate-fade-in bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <button 
                onClick={() => toggleCategory(String(cat))}
                className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
              >
                  <h3 className="uppercase text-[10px] font-black text-teal-900 tracking-[0.2em] flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${expandedCategories[String(cat)] ? 'bg-orange-500' : 'bg-gray-300'}`} /> 
                      {CATEGORIES_OPTIONS.find(c => c.id === String(cat))?.label || String(cat)}
                  </h3>
                  {expandedCategories[String(cat)] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              {expandedCategories[String(cat)] && (
                  <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-10 gap-2 border-t border-gray-50">
                    {filteredItems.filter(i => i.category === cat).map((item: PantryItem) => {
                      const status = getExpiryStatus(item);
                      const step = getSmartStep(String(item.unit || ''));
                      const isHighlighted = highlightId === item.id;

                      return (
                        <div 
                            key={item.id} 
                            ref={(el) => { if (el && itemRefs.current) itemRefs.current[String(item.id)] = el; }}
                            className={`bg-gray-50 p-4 md:p-1.5 rounded-2xl border flex flex-col justify-between group relative overflow-hidden transition-all duration-300 ${
                                isHighlighted 
                                ? 'ring-2 ring-orange-400 scale-[1.02] shadow-xl z-10 bg-orange-50 border-orange-200' 
                                : 'border-gray-100 hover:border-teal-400 hover:shadow-md hover:bg-white'
                            }`}
                        >
                          <div className="flex justify-between items-start mb-4 md:mb-1">
                            <div className="flex gap-1 items-center w-full overflow-hidden">
                                {status && status.type !== 'fresh' ? (
                                    <div className={`px-2 py-1 md:py-0.5 rounded-lg text-[8px] md:text-[6px] font-black uppercase flex items-center gap-1 shadow-sm flex-shrink-0 ${status.color}`}>
                                        <AlertTriangle className="w-3 h-3 md:w-2 md:h-2" />
                                    </div>
                                ) : (
                                    <div className="px-2 py-1 md:py-0.5 rounded-lg text-[8px] md:text-[6px] font-black uppercase flex items-center gap-1 bg-white text-gray-300 border border-gray-100 flex-shrink-0">
                                        OK
                                    </div>
                                )}
                                <div className="flex-1" />
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => setItemToEdit(item)} 
                                        className="p-1.5 md:p-0.5 text-gray-300 hover:text-teal-600 transition-colors"
                                    >
                                        <Pencil className="w-3 h-3 md:w-2 md:h-2" />
                                    </button>
                                </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-black text-gray-900 capitalize text-base md:text-[10px] mb-3 md:mb-1 truncate pr-2">
                                {renderHighlightedText(String(item.name || ''), String(searchTerm || ''))}
                            </div>
                            <div className="flex items-center justify-between bg-white p-1 rounded-xl border border-gray-100 group-hover:border-teal-100 transition-colors shadow-sm">
                                <button 
                                    onClick={() => onUpdateQuantity(String(item.id), -step)}
                                    className="w-8 h-8 md:w-4 md:h-4 flex items-center justify-center text-teal-900 hover:bg-gray-50 rounded-lg transition-all active:scale-75 flex-shrink-0"
                                >
                                    <Minus className="w-4 h-4 md:w-2 md:h-2" />
                                </button>
                                
                                <button
                                    onClick={() => {
                                        setQuickAdjustItem(item);
                                        setQuickValue(item.quantity);
                                    }}
                                    className="flex-1 text-center min-w-0 px-1"
                                >
                                    <span className="text-xs md:text-[8px] font-black text-teal-900 tabular-nums hover:text-orange-500 transition-colors block truncate">
                                        {Number.isInteger(item.quantity) ? item.quantity : item.quantity.toFixed(2)}
                                    </span>
                                </button>

                                <button 
                                    onClick={() => onUpdateQuantity(String(item.id), step)}
                                    className="w-8 h-8 md:w-4 md:h-4 flex items-center justify-center text-teal-900 hover:bg-gray-50 rounded-lg transition-all active:scale-75 flex-shrink-0"
                                >
                                    <PlusIcon className="w-4 h-4 md:w-2 md:h-2" />
                                </button>
                            </div>
                          </div>
                          {status && status.type !== 'fresh' && <div className="absolute bottom-0 left-0 h-1 bg-orange-500 w-full animate-pulse" />}
                        </div>
                      );
                    })}
                  </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[1000] bg-teal-900/60 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl relative">
                <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full hover:bg-gray-100"><X className="w-5 h-5" /></button>
                <h2 className="text-2xl font-black text-teal-900 mb-6 flex items-center gap-3">
                    <div className="p-3 bg-teal-50 rounded-2xl"><Package className="w-6 h-6 text-teal-600" /></div>
                    Añadir Producto
                </h2>
                
                <form onSubmit={handleManualAdd} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400">Nombre</label>
                        <input autoFocus type="text" placeholder="Ej. Arroz Integral" className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Cantidad</label>
                            <input type="number" step="0.1" className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value)})} />
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Unidad</label>
                            <input type="text" className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500" value={newItem.unit} onChange={e => { setNewItem({...newItem, unit: e.target.value}); setManualOverride(prev => ({...prev, unit: true})); }} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400">Categoría</label>
                        <select className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none" value={newItem.category} onChange={e => { setNewItem({...newItem, category: e.target.value}); setManualOverride(prev => ({...prev, category: true})); }}>
                            {CATEGORIES_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-gray-400">Días para caducar</label>
                        <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            <input type="number" className="bg-transparent font-bold text-gray-900 w-full focus:outline-none" value={newItem.daysToExpire} onChange={e => setNewItem({...newItem, daysToExpire: parseInt(e.target.value)})} />
                            <span className="text-sm font-bold text-gray-400">días</span>
                        </div>
                    </div>

                    <button type="submit" className="w-full py-5 bg-teal-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all">Guardar</button>
                </form>
            </div>
        </div>
      )}

      {showScanner && (
          <TicketScanner 
              onClose={() => setShowScanner(false)}
              onAddItems={(items) => {
                  onAddMany(items);
                  setShowScanner(false);
              }}
          />
      )}

      {itemToEdit && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
            <div className="w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-2xl relative">
                <h3 className="text-xl font-black text-gray-900 mb-6">Editar Producto</h3>
                <form onSubmit={handleEditSubmit} className="space-y-4">
                    <input className="w-full p-3 bg-gray-50 rounded-xl font-bold" value={itemToEdit.name} onChange={e => setItemToEdit({...itemToEdit, name: e.target.value})} />
                    <div className="flex gap-2">
                        <input type="number" step="0.1" className="flex-1 p-3 bg-gray-50 rounded-xl font-bold" value={itemToEdit.quantity} onChange={e => setItemToEdit({...itemToEdit, quantity: parseFloat(e.target.value)})} />
                        <input className="flex-1 p-3 bg-gray-50 rounded-xl font-bold" value={itemToEdit.unit} onChange={e => setItemToEdit({...itemToEdit, unit: e.target.value})} />
                    </div>
                    <select className="w-full p-3 bg-gray-50 rounded-xl font-bold" value={itemToEdit.category} onChange={e => setItemToEdit({...itemToEdit, category: e.target.value})}>
                        {CATEGORIES_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={() => setItemToEdit(null)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-gray-500">Cancelar</button>
                        <button type="submit" className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {wasteItem && (
          <div className="fixed inset-0 z-[1000] bg-red-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
              <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl relative text-center">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Skull className="w-10 h-10 text-red-500" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">¿Eliminar {wasteItem.name}?</h3>
                  <p className="text-gray-500 text-sm mb-8">Ayúdanos a mejorar tus estadísticas.</p>
                  
                  <div className="space-y-3">
                      <button onClick={() => confirmDelete('consumed')} className="w-full py-4 bg-green-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-green-600">
                          😋 Me lo he comido
                      </button>
                      <button onClick={() => confirmDelete('wasted')} className="w-full py-4 bg-red-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-red-600">
                          🗑️ Se ha estropeado
                      </button>
                      <button onClick={() => confirmDelete('mistake')} className="w-full py-4 bg-gray-100 text-gray-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-200">
                          Corregir error
                      </button>
                      <button onClick={() => setWasteItem(null)} className="mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                          Cancelar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {quickAdjustItem && (
          <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-end justify-center md:items-center animate-fade-in">
              <div className="w-full md:max-w-sm bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 shadow-2xl animate-slide-up pb-10">
                  <div className="text-center mb-8">
                      <h3 className="text-2xl font-black text-gray-900 mb-1">{quickAdjustItem.name}</h3>
                      <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Ajuste Rápido</p>
                  </div>
                  
                  <div className="flex items-center justify-center gap-6 mb-8">
                      <button onClick={() => setQuickValue(Math.max(0, quickValue - 1))} className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-teal-900 shadow-sm active:scale-90 transition-all">
                          <Minus className="w-8 h-8" />
                      </button>
                      <div className="text-center w-24">
                          <div className="text-5xl font-black text-teal-900 tracking-tighter">{Number.isInteger(quickValue) ? quickValue : quickValue.toFixed(1)}</div>
                          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{quickAdjustItem.unit}</div>
                      </div>
                      <button onClick={() => setQuickValue(quickValue + 1)} className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-teal-900 shadow-sm active:scale-90 transition-all">
                          <PlusIcon className="w-8 h-8" />
                      </button>
                  </div>

                  <div className="flex gap-3">
                      <button onClick={() => setQuickAdjustItem(null)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest">Cancelar</button>
                      <button onClick={handleQuickAdjustConfirm} className="flex-[2] py-4 bg-teal-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">Confirmar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
