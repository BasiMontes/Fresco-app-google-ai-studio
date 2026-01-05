
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PantryItem } from '../types';
import { Package, Plus, Trash2, Calendar, X, Save, AlertTriangle, Clock, Minus, Plus as PlusIcon, Camera, Sparkles, Pencil, CheckCircle2, AlertOctagon, WifiOff, Search, ChevronDown, ChevronUp, Wand2, RotateCcw, Utensils, ArrowRight, Skull, Zap, Tag } from 'lucide-react';
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
    { id: 'vegetables', label: 'Verduras', emoji: '🥦' },
    { id: 'fruits', label: 'Frutas', emoji: '🍎' },
    { id: 'dairy', label: 'Lácteos', emoji: '🧀' },
    { id: 'meat', label: 'Carne', emoji: '🥩' },
    { id: 'fish', label: 'Pescado', emoji: '🐟' },
    { id: 'grains', label: 'Cereales', emoji: '🥖' },
    { id: 'pantry', label: 'Despensa', emoji: '🥫' },
    { id: 'spices', label: 'Especias', emoji: '🧂' },
    { id: 'other', label: 'Otros', emoji: '🛍️' },
];

export const Pantry: React.FC<PantryProps> = ({ items, highlightId, onRemove, onAdd, onUpdateQuantity, onAddMany, onEdit, onWaste, onCook, isOnline = true }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
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

  useEffect(() => {
      if (highlightId && itemRefs.current[String(highlightId)]) {
          setTimeout(() => {
              itemRefs.current[String(highlightId)]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
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
    if (isPast(new Date(item.expires_at)) && days < 0) return { type: 'expired', label: 'Caducado', color: 'bg-red-500' };
    if (days <= 2) return { type: 'critical', label: `${days === 0 ? 'Hoy' : days + 'd'}`, color: 'bg-orange-500' };
    return { type: 'fresh', label: 'OK', color: 'bg-green-500' };
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

  // Agrupado por categorías
  const groupedItems = useMemo(() => {
      const grouped: Record<string, PantryItem[]> = {};
      filteredItems.forEach(item => {
          const cat = item.category || 'other';
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(item);
      });
      return grouped;
  }, [filteredItems]);

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
    <div className="space-y-8 animate-fade-in relative pb-32">
      
      {/* Header Compacto */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl md:text-2xl font-black text-teal-900 leading-none mb-1">Stock Actual</h1>
            <p className="text-gray-400 font-bold uppercase text-[10px] md:text-[9px] tracking-widest">Gestión de activos alimentarios</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            {items.length > 0 && (
                <div className="relative group flex-1 md:flex-none md:w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4 group-focus-within:text-teal-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Buscar..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-full font-bold text-gray-700 text-sm shadow-sm focus:outline-none focus:border-teal-500 focus:shadow-md transition-all"
                    />
                </div>
            )}
            <button 
                onClick={() => { if(isOnline) setShowScanner(true); }}
                disabled={!isOnline}
                className={`text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-md transition-all ${isOnline ? 'bg-orange-500 hover:bg-orange-600 active:scale-95' : 'bg-gray-400 opacity-50 cursor-not-allowed'}`}
            >
                {isOnline ? <><Camera className="w-4 h-4" /> <span className="hidden md:inline">Escanear</span></> : <WifiOff className="w-4 h-4" />}
            </button>
            <button 
                onClick={() => setShowAddModal(true)} 
                className="w-10 h-10 bg-teal-900 text-white rounded-xl flex items-center justify-center shadow-md hover:bg-teal-800 active:scale-90 transition-all flex-shrink-0"
            >
                <Plus className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* Stats Filters (Chips) */}
      {items.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                  { id: 'expired', label: 'Caducados', count: pantryStats.expired, color: 'red' },
                  { id: 'critical', label: 'Críticos', count: pantryStats.critical, color: 'orange' },
                  { id: 'fresh', label: 'Frescos', count: pantryStats.fresh, color: 'teal' },
              ].map(filter => (
                  <button 
                    key={filter.id}
                    onClick={() => setActiveFilter(activeFilter === filter.id ? 'all' : filter.id as any)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                        activeFilter === filter.id 
                        ? `bg-${filter.color}-500 text-white border-${filter.color}-500 shadow-md` 
                        : `bg-white border-gray-100 text-gray-500 hover:border-${filter.color}-200`
                    }`}
                  >
                      <span className={`w-2 h-2 rounded-full ${activeFilter === filter.id ? 'bg-white' : `bg-${filter.color}-500`}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{filter.label}</span>
                      <span className="text-xs font-bold opacity-80">{filter.count}</span>
                  </button>
              ))}
          </div>
      )}

      {/* Grid de Contenido (Diseño Stock Card - LARGER) */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[40vh] text-center px-12 border-2 border-dashed border-gray-200 rounded-[2rem]">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-gray-300" />
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-1">Despensa vacía</h2>
          <p className="text-gray-400 text-xs font-medium max-w-xs mx-auto mb-6">
            Empieza escaneando un ticket o añadiendo productos manualmente.
          </p>
          <button 
            onClick={() => setShowAddModal(true)} 
            className="px-6 py-3 bg-teal-900 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all"
          >
            Añadir Producto
          </button>
        </div>
      ) : (
        <div className="space-y-8">
            {Object.keys(groupedItems).sort().map(cat => (
                <div key={cat} className="space-y-4">
                    <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 pl-1 border-b border-gray-100 pb-2">
                        {CATEGORIES_OPTIONS.find(c => c.id === cat)?.emoji} {CATEGORIES_OPTIONS.find(c => c.id === cat)?.label || cat}
                    </h3>
                    {/* REDUCED COLUMNS TO MAKE CARDS BIGGER (Max 4 cols) */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {groupedItems[cat].map(item => {
                            const status = getExpiryStatus(item);
                            const isHighlighted = highlightId === item.id;
                            const step = getSmartStep(item.unit);

                            return (
                                <div 
                                    key={item.id}
                                    ref={(el) => { if (el && itemRefs.current) itemRefs.current[String(item.id)] = el; }}
                                    className={`bg-white rounded-2xl border p-4 relative group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                                        isHighlighted ? 'ring-2 ring-orange-400 border-orange-200 shadow-xl z-10' : 'border-gray-100 hover:border-teal-200'
                                    }`}
                                >
                                    {/* Status Line */}
                                    <div className={`absolute top-4 left-0 w-1.5 h-10 rounded-r-full ${status?.color}`} />
                                    
                                    <div className="pl-4 flex flex-col h-full justify-between gap-4">
                                        <div className="flex justify-between items-start">
                                            <div className="min-w-0 pr-1">
                                                <h4 className="font-black text-gray-900 text-lg md:text-base truncate capitalize leading-tight mb-1" title={item.name}>
                                                    {renderHighlightedText(item.name, searchTerm)}
                                                </h4>
                                                <div className="flex items-center gap-2">
                                                    {status && status.type !== 'fresh' && (
                                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded text-white ${status.color}`}>
                                                            {status.label}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setItemToEdit(item)}
                                                className="text-gray-300 hover:text-teal-600 transition-colors p-1"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-1.5">
                                            <button 
                                                onClick={() => onUpdateQuantity(String(item.id), -step)}
                                                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-white hover:text-teal-900 rounded-lg shadow-sm transition-all"
                                            ><Minus className="w-4 h-4" /></button>
                                            
                                            <button 
                                                onClick={() => { setQuickAdjustItem(item); setQuickValue(item.quantity); }}
                                                className="text-sm font-black text-teal-900 tabular-nums hover:text-orange-500 transition-colors px-2"
                                            >
                                                {Number.isInteger(item.quantity) ? item.quantity : item.quantity.toFixed(1)} <span className="text-gray-400 text-[10px] uppercase ml-0.5">{item.unit}</span>
                                            </button>

                                            <button 
                                                onClick={() => onUpdateQuantity(String(item.id), step)}
                                                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-white hover:text-teal-900 rounded-lg shadow-sm transition-all"
                                            ><PlusIcon className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <div className="fixed inset-0 z-[1000] bg-teal-900/60 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
            <div className="w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-2xl relative">
                <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full hover:bg-gray-100"><X className="w-4 h-4" /></button>
                <h2 className="text-xl font-black text-teal-900 mb-6 flex items-center gap-2">
                    <Package className="w-5 h-5 text-teal-600" /> Nuevo Producto
                </h2>
                
                <form onSubmit={handleManualAdd} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nombre</label>
                        <input autoFocus type="text" placeholder="Ej. Arroz" className="w-full p-3 bg-gray-50 rounded-xl font-bold text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                    </div>
                    
                    <div className="flex gap-3">
                        <div className="flex-1 space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cant</label>
                            <input type="number" step="0.1" className="w-full p-3 bg-gray-50 rounded-xl font-bold text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value)})} />
                        </div>
                        <div className="flex-1 space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Unidad</label>
                            <input type="text" className="w-full p-3 bg-gray-50 rounded-xl font-bold text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" value={newItem.unit} onChange={e => { setNewItem({...newItem, unit: e.target.value}); setManualOverride(prev => ({...prev, unit: true})); }} />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Categoría</label>
                        <select className="w-full p-3 bg-gray-50 rounded-xl font-bold text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none" value={newItem.category} onChange={e => { setNewItem({...newItem, category: e.target.value}); setManualOverride(prev => ({...prev, category: true})); }}>
                            {CATEGORIES_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Caducidad</label>
                        <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <input type="number" className="bg-transparent font-bold text-gray-900 w-full text-sm focus:outline-none" value={newItem.daysToExpire} onChange={e => setNewItem({...newItem, daysToExpire: parseInt(e.target.value)})} />
                            <span className="text-xs font-bold text-gray-400">días</span>
                        </div>
                    </div>

                    <button type="submit" className="w-full py-4 bg-teal-900 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">Guardar</button>
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

      {/* Edit & Waste Modals */}
      {itemToEdit && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
            <div className="w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-2xl relative">
                <h3 className="text-xl font-black text-gray-900 mb-6">Editar</h3>
                <form onSubmit={handleEditSubmit} className="space-y-4">
                    <input className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm" value={itemToEdit.name} onChange={e => setItemToEdit({...itemToEdit, name: e.target.value})} />
                    <div className="flex gap-2">
                        <input type="number" step="0.1" className="flex-1 p-3 bg-gray-50 rounded-xl font-bold text-sm" value={itemToEdit.quantity} onChange={e => setItemToEdit({...itemToEdit, quantity: parseFloat(e.target.value)})} />
                        <input className="flex-1 p-3 bg-gray-50 rounded-xl font-bold text-sm" value={itemToEdit.unit} onChange={e => setItemToEdit({...itemToEdit, unit: e.target.value})} />
                    </div>
                    <select className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm" value={itemToEdit.category} onChange={e => setItemToEdit({...itemToEdit, category: e.target.value})}>
                        {CATEGORIES_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={() => setItemToEdit(null)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-gray-500 text-xs">Cancelar</button>
                        <button type="submit" className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold text-xs">Guardar</button>
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
                  
                  <div className="space-y-3 mt-6">
                      <button onClick={() => confirmDelete('consumed')} className="w-full py-4 bg-green-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-green-600">
                          😋 Consumido
                      </button>
                      <button onClick={() => confirmDelete('wasted')} className="w-full py-4 bg-red-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-red-600">
                          🗑️ Desperdiciado
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
