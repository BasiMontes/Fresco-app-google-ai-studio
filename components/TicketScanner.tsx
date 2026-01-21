
import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Sparkles, Trash2, AlertCircle, CheckCircle2, RefreshCw, PenLine, Plus, Minus, Calendar, Scale, ChevronDown, FileText, Camera, Tag } from 'lucide-react';
import { extractItemsFromTicket } from '../services/geminiService';
import { PantryItem } from '../types';
import { EXPIRY_DAYS_BY_CATEGORY } from '../constants';
import { format } from 'date-fns';

interface TicketScannerProps {
  onClose: () => void;
  onAddItems: (items: PantryItem[]) => void;
}

const CATEGORIES = [
    { id: 'vegetables', label: 'Verdulería', emoji: '🥦' },
    { id: 'fruits', label: 'Frutería', emoji: '🍎' },
    { id: 'dairy', label: 'Lácteos', emoji: '🧀' },
    { id: 'meat', label: 'Carnicería', emoji: '🥩' },
    { id: 'fish', label: 'Pescadería', emoji: '🐟' },
    { id: 'pasta', label: 'Pasta/Arroz', emoji: '🍝' },
    { id: 'legumes', label: 'Legumbres', emoji: '🫘' },
    { id: 'bakery', label: 'Panadería', emoji: '🥖' },
    { id: 'drinks', label: 'Bebidas', emoji: '🥤' },
    { id: 'pantry', label: 'Despensa', emoji: '🥫' },
    { id: 'other', label: 'Otros', emoji: '📦' },
];

const UNIT_OPTIONS = [
    { id: 'uds', label: 'UNIDADES' },
    { id: 'kg', label: 'KILOGRAMOS' },
    { id: 'l', label: 'LITROS' },
    { id: 'g', label: 'GRAMOS' },
    { id: 'ml', label: 'MILILITROS' }
];

const MODAL_INPUT_CLASSES = "w-full h-[58px] px-5 bg-gray-50 rounded-2xl font-black text-[11px] text-[#013b33] uppercase tracking-widest outline-none border-2 border-transparent focus:border-teal-500/20 transition-all flex items-center appearance-none";

export const TicketScanner: React.FC<TicketScannerProps> = ({ onClose, onAddItems }) => {
  const [step, setStep] = useState<'idle' | 'processing' | 'review' | 'error'>('idle');
  const [items, setItems] = useState<any[]>([]);
  const [loadingMsg, setLoadingMsg] = useState("Escaneando...");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    setStep('processing');
    setLoadingMsg("Leyendo documento...");
    
    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            const result = await extractItemsFromTicket(base64, file.type);
            
            if (result && result.length > 0) {
                const today = format(new Date(), 'yyyy-MM-dd');
                setItems(result.map(i => {
                    const days = EXPIRY_DAYS_BY_CATEGORY[i.category] || 14;
                    const expiry = new Date();
                    expiry.setDate(expiry.getDate() + days);
                    return { 
                        ...i, 
                        quantity: Number(i.quantity) || 1,
                        added_at: today,
                        expires_at: format(expiry, 'yyyy-MM-dd')
                    };
                }));
                setStep('review');
            } else {
                setStep('error');
            }
        };
        reader.onerror = () => setStep('error');
    } catch (err) {
        setStep('error');
    }
  };

  const addItemManual = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 14);
    
    setItems([{ 
        name: '', 
        quantity: 1, 
        category: 'other', 
        unit: 'uds', 
        added_at: today, 
        expires_at: format(expiry, 'yyyy-MM-dd') 
    }, ...items]);
    if (step !== 'review') setStep('review');
  };

  const updateItem = (index: number, fields: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...fields };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    const filtered = items.filter((_, i) => i !== index);
    if (filtered.length === 0) setStep('idle');
    setItems(filtered);
  };

  const handleSave = () => {
    const finalItems: PantryItem[] = items.map((item, i) => ({
        id: `vis-${Date.now()}-${i}`,
        name: item.name || 'Producto nuevo',
        quantity: Number(item.quantity) || 1,
        unit: item.unit || 'uds',
        category: item.category || 'other',
        added_at: new Date(item.added_at).toISOString(),
        expires_at: item.expires_at ? new Date(item.expires_at).toISOString() : undefined
    }));
    onAddItems(finalItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[5000] bg-teal-900 flex flex-col animate-fade-in overflow-hidden safe-pb">
      {/* Header Fijo */}
      <div className="p-6 flex justify-between items-center text-white border-b border-white/5 bg-black/10 backdrop-blur-xl">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6" />
            </div>
            <div>
                <h2 className="text-xl font-black tracking-tight">Fresco Vision</h2>
                <p className="text-[9px] font-black uppercase tracking-widest text-teal-400">Escáner de Compras</p>
            </div>
        </div>
        <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all"><X className="w-6 h-6" /></button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6">
        {step === 'idle' && (
          <div className="h-full flex flex-col items-center justify-center gap-8 max-w-sm mx-auto animate-slide-up">
            <div className="text-center space-y-3">
                <h3 className="text-4xl font-black text-white leading-none">Añade tu Compra</h3>
                <p className="text-teal-200/50 text-sm font-medium">Extraemos los productos de tu ticket o PDF automáticamente.</p>
            </div>

            <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-square bg-white/5 border-4 border-dashed border-teal-500/30 rounded-[3.5rem] flex flex-col items-center justify-center gap-6 group hover:border-orange-500/50 transition-all cursor-pointer"
            >
                <div className="relative">
                    <div className="w-24 h-24 bg-teal-900 rounded-[2.5rem] flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                        <Camera className="w-10 h-10 text-teal-400" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg border-2 border-teal-900">
                        <FileText className="w-5 h-5" />
                    </div>
                </div>
                <p className="text-xl font-black text-white">Subir Foto o PDF</p>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>

            <button 
                onClick={addItemManual}
                className="w-full py-5 border-2 border-teal-500/30 text-teal-400 rounded-[1.8rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-teal-500/10"
            >
                <PenLine className="w-5 h-5" /> Introducir Productos a Mano
            </button>
          </div>
        )}

        {step === 'processing' && (
          <div className="h-full flex flex-col items-center justify-center gap-10 animate-fade-in text-center">
            <div className="relative">
                <div className="w-32 h-32 border-[6px] border-teal-500/10 border-t-orange-500 rounded-full animate-spin flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-orange-500 animate-pulse" />
                </div>
            </div>
            <div>
                <h3 className="text-3xl font-black text-white mb-2">{loadingMsg}</h3>
                <p className="text-teal-400 text-[10px] font-black uppercase tracking-[0.3em]">IA Analizando Ticket</p>
            </div>
            <button onClick={() => setStep('idle')} className="text-white/30 font-bold text-xs uppercase tracking-widest hover:text-white">Cancelar</button>
          </div>
        )}

        {step === 'error' && (
          <div className="h-full flex flex-col items-center justify-center gap-8 text-center animate-slide-up">
            <div className="w-24 h-24 bg-red-500/20 rounded-[2.5rem] flex items-center justify-center">
                <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <div>
                <h3 className="text-3xl font-black text-white">No pudimos procesarlo</h3>
                <p className="text-teal-200/50 mt-2">Prueba con una imagen más clara o sube el PDF directamente.</p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
                <button onClick={() => setStep('idle')} className="w-full py-5 bg-white text-teal-900 rounded-[1.8rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3">
                    <RefreshCw className="w-5 h-5" /> Reintentar
                </button>
                <button onClick={addItemManual} className="w-full py-4 text-teal-400 font-bold text-xs uppercase tracking-widest">Entrada Manual</button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-6 pb-40 animate-slide-up">
            <div className="flex justify-between items-center px-2">
                <h3 className="text-white font-black text-xl">Revisar Compra ({items.length})</h3>
                <button onClick={addItemManual} className="p-3 bg-orange-500 text-white rounded-xl shadow-lg active:scale-90 transition-transform"><Plus className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((item, i) => {
                    const catInfo = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[CATEGORIES.length-1];
                    return (
                        <div key={i} className="bg-white rounded-[2.5rem] p-6 shadow-2xl flex flex-col gap-5 border border-white/5 group animate-fade-in">
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex-1">
                                    <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1.5 block ml-1">Producto</label>
                                    <input 
                                        className="bg-gray-50 font-black text-xl text-teal-950 w-full px-4 py-3 rounded-xl focus:outline-none focus:bg-gray-100 transition-colors placeholder:text-gray-200 capitalize" 
                                        value={item.name} 
                                        placeholder="Nombre..."
                                        onChange={(e) => updateItem(i, { name: e.target.value })}
                                    />
                                </div>
                                <button onClick={() => removeItem(i)} className="mt-7 p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1.5 block ml-1">Compra</label>
                                    <input type="date" value={item.added_at} onChange={e => updateItem(i, { added_at: e.target.value })} 
                                        className={MODAL_INPUT_CLASSES} />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1.5 block ml-1">Caducidad</label>
                                    <input type="date" value={item.expires_at} onChange={e => updateItem(i, { expires_at: e.target.value })} 
                                        className={MODAL_INPUT_CLASSES + " !text-orange-500"} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1.5 block ml-1">Categoría</label>
                                    <div className="relative">
                                        <select 
                                            value={item.category}
                                            onChange={(e) => updateItem(i, { category: e.target.value })}
                                            className={MODAL_INPUT_CLASSES + " pl-12"}
                                        >
                                            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label.toUpperCase()}</option>)}
                                        </select>
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg pointer-events-none">{catInfo.emoji}</span>
                                        <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-3 h-3 text-teal-200 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-[1.5fr_1fr] gap-3">
                                    <div>
                                        <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1.5 block ml-1">Unidad</label>
                                        <div className="relative">
                                            <select 
                                                value={item.unit}
                                                onChange={(e) => updateItem(i, { unit: e.target.value })}
                                                className={MODAL_INPUT_CLASSES}
                                            >
                                                {UNIT_OPTIONS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-3 h-3 text-teal-200 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1.5 block ml-1">Cantidad</label>
                                        <div className="bg-teal-900 h-[58px] rounded-2xl flex items-center justify-between px-2 shadow-lg">
                                            <button onClick={() => updateItem(i, { quantity: Math.max(0.1, item.quantity - 1) })} className="p-2 text-white/50 hover:text-white"><Minus className="w-4 h-4" /></button>
                                            <input 
                                                type="number" 
                                                step="0.1" 
                                                value={item.quantity} 
                                                onChange={e => updateItem(i, { quantity: parseFloat(e.target.value) || 0 })} 
                                                className="w-10 bg-transparent text-center font-black text-white text-sm outline-none" 
                                            />
                                            <button onClick={() => updateItem(i, { quantity: item.quantity + 1 })} className="p-2 text-white/50 hover:text-white"><Plus className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <button 
                    onClick={addItemManual}
                    className="aspect-[4/3] md:aspect-auto md:h-64 border-4 border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-white/30 hover:bg-white/5 hover:border-white/20 transition-all"
                >
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                        <Plus className="w-6 h-6" />
                    </div>
                    <span className="font-black text-[10px] uppercase tracking-widest">Añadir Otro</span>
                </button>
            </div>
          </div>
        )}
      </div>

      {step === 'review' && (
        <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-teal-900 via-teal-900/90 to-transparent z-50">
            <button 
                onClick={handleSave}
                disabled={items.length === 0}
                className="w-full py-6 bg-orange-500 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-30"
            >
                <CheckCircle2 className="w-6 h-6" /> Importar {items.length} Productos
            </button>
        </div>
      )}
    </div>
  );
};
