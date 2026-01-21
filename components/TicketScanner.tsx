
import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Sparkles, Trash2, AlertCircle, CheckCircle2, RefreshCw, PenLine, Plus, Minus, Calendar, Scale, ChevronDown, FileText, Camera } from 'lucide-react';
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
    { id: 'uds', label: 'Unidades' },
    { id: 'kg', label: 'Kilogramos' },
    { id: 'l', label: 'Litros' },
    { id: 'g', label: 'Gramos' },
    { id: 'ml', label: 'Mililitros' }
];

export const TicketScanner: React.FC<TicketScannerProps> = ({ onClose, onAddItems }) => {
  const [step, setStep] = useState<'idle' | 'processing' | 'review' | 'error'>('idle');
  const [items, setItems] = useState<any[]>([]);
  const [loadingMsg, setLoadingMsg] = useState("Escaneando documento...");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    setStep('processing');
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
    setStep('review');
  };

  const updateItem = (index: number, fields: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...fields };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
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
      <div className="p-6 flex justify-between items-center text-white border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6" />
            </div>
            <div>
                <h2 className="text-xl font-black tracking-tight">Fresco Vision</h2>
                <p className="text-[9px] font-black uppercase tracking-widest text-teal-400">OCR Inteligente Multi-formato</p>
            </div>
        </div>
        <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all"><X className="w-6 h-6" /></button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6">
        {step === 'idle' && (
          <div className="h-full flex flex-col items-center justify-center gap-8 max-w-sm mx-auto animate-slide-up">
            <div className="text-center space-y-3">
                <h3 className="text-4xl font-black text-white leading-none">Añade tu Compra</h3>
                <p className="text-teal-200/50 text-sm font-medium">Sube fotos, tickets o facturas PDF.</p>
            </div>

            <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-square bg-white/5 border-4 border-dashed border-teal-500/30 rounded-[3.5rem] flex flex-col items-center justify-center gap-6 group hover:border-orange-500/50 transition-all cursor-pointer"
            >
                <div className="relative">
                    <div className="w-24 h-24 bg-teal-900 rounded-[2rem] flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                        <Upload className="w-10 h-10 text-teal-400" />
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
                <PenLine className="w-5 h-5" /> Entrada Manual de Productos
            </button>
          </div>
        )}

        {step === 'processing' && (
          <div className="h-full flex flex-col items-center justify-center gap-8 animate-fade-in">
            <div className="w-32 h-32 border-8 border-teal-500/10 border-t-orange-500 rounded-full animate-spin flex items-center justify-center">
                <FileText className="w-10 h-10 text-orange-500 animate-pulse" />
            </div>
            <div className="text-center">
                <h3 className="text-2xl font-black text-white">{loadingMsg}</h3>
                <p className="text-teal-400 text-[10px] font-black uppercase tracking-widest mt-2">Gemini Vision 3.0 procesando datos...</p>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-6 pb-40 animate-slide-up">
            <div className="flex justify-between items-center px-2">
                <h3 className="text-white font-black text-xl">Confirmar Productos ({items.length})</h3>
                <button onClick={addItemManual} className="p-2 bg-orange-500 text-white rounded-xl shadow-lg"><Plus className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
                {items.map((item, i) => {
                    const catInfo = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[10];
                    return (
                        <div key={i} className="bg-white rounded-[2.5rem] p-6 shadow-2xl flex flex-col gap-6 border border-white/5 animate-fade-in">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 block">Nombre del Producto</label>
                                    <input 
                                        className="bg-transparent font-black text-xl text-teal-950 w-full focus:outline-none placeholder:text-gray-100 capitalize" 
                                        value={item.name} 
                                        placeholder="Ej: Salmón Fresco"
                                        onChange={(e) => updateItem(i, { name: e.target.value })}
                                    />
                                </div>
                                <button onClick={() => removeItem(i)} className="p-3 bg-red-50 text-red-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-1"><Plus className="w-3 h-3 text-teal-500" /> Compra</label>
                                    <div className="relative">
                                        <input type="date" value={item.added_at} onChange={e => updateItem(i, { added_at: e.target.value })} 
                                            className="w-full h-12 px-4 bg-gray-50 rounded-2xl font-bold text-xs text-teal-900 focus:outline-none border border-transparent focus:border-teal-500" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-1"><Calendar className="w-3 h-3 text-orange-500" /> Caducidad</label>
                                    <div className="relative">
                                        <input type="date" value={item.expires_at} onChange={e => updateItem(i, { expires_at: e.target.value })} 
                                            className="w-full h-12 px-4 bg-orange-50 text-orange-900 rounded-2xl font-bold text-xs focus:outline-none border border-transparent focus:border-orange-500" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1 relative">
                                    <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 block">Categoría</label>
                                    <select 
                                        value={item.category}
                                        onChange={(e) => updateItem(i, { category: e.target.value })}
                                        className="w-full h-14 pl-10 pr-4 bg-gray-50 rounded-2xl font-black text-[10px] text-teal-800 uppercase tracking-widest appearance-none outline-none border border-transparent focus:border-teal-500"
                                    >
                                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label.toUpperCase()}</option>)}
                                    </select>
                                    <span className="absolute left-4 top-[2.4rem] text-lg">{catInfo.emoji}</span>
                                    <ChevronDown className="absolute right-4 top-[2.4rem] w-3 h-3 text-teal-200" />
                                </div>

                                <div className="w-32">
                                    <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 block">Unidad</label>
                                    <div className="relative">
                                        <select 
                                            value={item.unit}
                                            onChange={(e) => updateItem(i, { unit: e.target.value })}
                                            className="w-full h-14 px-4 bg-gray-50 rounded-2xl font-black text-[10px] text-teal-800 uppercase tracking-widest appearance-none outline-none border border-transparent focus:border-teal-500"
                                        >
                                            {UNIT_OPTIONS.map(u => <option key={u.id} value={u.id}>{u.label.toUpperCase()}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-teal-200" />
                                    </div>
                                </div>

                                <div className="w-32">
                                    <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 block">Cantidad</label>
                                    <div className="bg-teal-900 h-14 rounded-2xl flex items-center justify-between px-2 shadow-lg">
                                        <button onClick={() => updateItem(i, { quantity: Math.max(0.1, item.quantity - 1) })} className="text-white/50 hover:text-white p-1"><Minus className="w-4 h-4" /></button>
                                        <input type="number" step="0.1" value={item.quantity} onChange={e => updateItem(i, { quantity: parseFloat(e.target.value) })} 
                                            className="w-10 bg-transparent text-center font-black text-white text-sm outline-none" />
                                        <button onClick={() => updateItem(i, { quantity: item.quantity + 1 })} className="text-white/50 hover:text-white p-1"><Plus className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
          </div>
        )}
      </div>

      {step === 'review' && (
        <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-teal-900 via-teal-900 to-transparent z-50">
            <button 
                onClick={handleSave}
                disabled={items.length === 0}
                className="w-full py-6 bg-orange-500 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-30"
            >
                <CheckCircle2 className="w-6 h-6" /> Guardar Todo en Despensa
            </button>
        </div>
      )}
    </div>
  );
};
