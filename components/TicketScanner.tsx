
import React, { useState, useRef, useEffect } from 'react';
/* Added ChevronDown to the lucide-react imports */
import { X, Upload, Sparkles, Trash2, AlertCircle, CheckCircle2, RefreshCw, PenLine, Plus, Minus, Tag, Camera, ChevronDown } from 'lucide-react';
import { extractItemsFromTicket } from '../services/geminiService';
import { PantryItem } from '../types';
import { EXPIRY_DAYS_BY_CATEGORY } from '../constants';

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

export const TicketScanner: React.FC<TicketScannerProps> = ({ onClose, onAddItems }) => {
  const [step, setStep] = useState<'idle' | 'processing' | 'review' | 'error'>('idle');
  const [items, setItems] = useState<any[]>([]);
  const [loadingMsg, setLoadingMsg] = useState("Procesando imagen...");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const msgs = ["Analizando ticket...", "Identificando productos...", "Calculando fechas...", "Casi listo..."];
    let i = 0;
    const interval = setInterval(() => {
      if (step === 'processing') {
        setLoadingMsg(msgs[i % msgs.length]);
        i++;
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [step]);

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
                setItems(result.map(i => ({ ...i, quantity: Number(i.quantity) || 1 })));
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
    setItems([{ name: '', quantity: 1, category: 'other', unit: 'uds' }, ...items]);
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
    const finalItems: PantryItem[] = items.map((item, i) => {
      const days = EXPIRY_DAYS_BY_CATEGORY[item.category] || 14;
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + days);
      
      return {
        id: `vis-${Date.now()}-${i}`,
        name: item.name || 'Producto nuevo',
        quantity: Number(item.quantity) || 1,
        unit: item.unit || 'uds',
        category: item.category || 'other',
        added_at: new Date().toISOString(),
        expires_at: expiry.toISOString()
      };
    });
    onAddItems(finalItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[5000] bg-teal-900 flex flex-col animate-fade-in overflow-hidden">
      {/* Header Premium */}
      <div className="p-6 flex justify-between items-center text-white border-b border-white/5 bg-black/10 backdrop-blur-md">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
                <h2 className="text-xl font-black tracking-tight">Fresco Vision</h2>
                <p className="text-[9px] font-black uppercase tracking-widest text-teal-400">Escáner de Compras IA</p>
            </div>
        </div>
        <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all">
            <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6">
        {step === 'idle' && (
          <div className="h-full flex flex-col items-center justify-center gap-10 max-w-sm mx-auto animate-slide-up">
            <div className="text-center space-y-3">
                <h3 className="text-4xl font-black text-white leading-none">¿Cómo quieres añadir tu compra?</h3>
                <p className="text-teal-200/50 text-sm font-medium">Usa la cámara o introduce los productos tú mismo.</p>
            </div>

            <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-square bg-white/5 border-4 border-dashed border-teal-500/30 rounded-[3.5rem] flex flex-col items-center justify-center gap-6 group hover:border-orange-500/50 hover:bg-white/10 transition-all cursor-pointer"
            >
                <div className="w-24 h-24 bg-teal-900 rounded-[2rem] flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                    <Camera className="w-10 h-10 text-teal-400" />
                </div>
                <p className="text-xl font-black text-white">Escanear Ticket</p>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>

            <button 
                onClick={addItemManual}
                className="w-full py-5 border-2 border-teal-500/30 text-teal-400 rounded-[1.8rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-teal-500/10"
            >
                <PenLine className="w-5 h-5" /> Entrada Manual
            </button>
          </div>
        )}

        {step === 'processing' && (
          <div className="h-full flex flex-col items-center justify-center gap-8 animate-fade-in">
            <div className="relative">
                <div className="w-32 h-32 border-8 border-teal-500/10 border-t-orange-500 rounded-full animate-spin" />
                <Sparkles className="absolute inset-0 m-auto w-10 h-10 text-orange-500 animate-pulse" />
            </div>
            <div className="text-center">
                <h3 className="text-2xl font-black text-white">{loadingMsg}</h3>
                <p className="text-teal-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Tecnología Gemini Flash 3.0</p>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="h-full flex flex-col items-center justify-center gap-8 text-center animate-slide-up">
            <div className="w-24 h-24 bg-red-500/20 rounded-[2.5rem] flex items-center justify-center">
                <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <div>
                <h3 className="text-3xl font-black text-white">No pudimos leerlo</h3>
                <p className="text-teal-200/50 mt-2">Asegúrate de que el ticket esté bien iluminado y plano.</p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
                <button onClick={() => setStep('idle')} className="w-full py-5 bg-white text-teal-900 rounded-[1.8rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3">
                    <RefreshCw className="w-5 h-5" /> Reintentar Foto
                </button>
                <button onClick={addItemManual} className="w-full py-4 text-teal-400 font-bold text-xs uppercase tracking-widest">Introducir a mano</button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-6 pb-32 animate-slide-up">
            <div className="flex justify-between items-center px-2">
                <h3 className="text-white font-black text-xl">Revisar Productos ({items.length})</h3>
                <button onClick={addItemManual} className="p-2 bg-orange-500 text-white rounded-xl shadow-lg"><Plus className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((item, i) => {
                    const catInfo = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[10];
                    return (
                        <div key={i} className="bg-white rounded-[2.2rem] p-5 shadow-xl flex flex-col gap-5 border border-gray-100 group">
                            <div className="flex justify-between items-start">
                                <input 
                                    className="bg-transparent font-black text-xl text-teal-950 w-full focus:outline-none placeholder:text-gray-200 capitalize" 
                                    value={item.name} 
                                    placeholder="Nombre del producto..."
                                    onChange={(e) => updateItem(i, { name: e.target.value })}
                                />
                                <button onClick={() => removeItem(i)} className="p-2 text-gray-200 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <select 
                                        value={item.category}
                                        onChange={(e) => updateItem(i, { category: e.target.value })}
                                        className="w-full h-12 pl-10 pr-4 bg-gray-50 rounded-2xl font-bold text-[10px] text-teal-800 uppercase tracking-widest appearance-none outline-none border border-transparent focus:border-teal-500 transition-all"
                                    >
                                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label.toUpperCase()}</option>)}
                                    </select>
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">{catInfo.emoji}</span>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-teal-200" />
                                </div>

                                <div className="bg-teal-900 rounded-2xl p-0.5 flex items-center shadow-lg">
                                    <button onClick={() => updateItem(i, { quantity: Math.max(1, item.quantity - 1) })} className="w-10 h-10 flex items-center justify-center text-white/50 hover:text-white"><Minus className="w-4 h-4" /></button>
                                    <span className="w-8 text-center font-black text-white text-lg">{item.quantity}</span>
                                    <button onClick={() => updateItem(i, { quantity: item.quantity + 1 })} className="w-10 h-10 flex items-center justify-center text-white/50 hover:text-white"><Plus className="w-4 h-4" /></button>
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
        <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-teal-900 via-teal-900/90 to-transparent z-50">
            <button 
                onClick={handleSave}
                disabled={items.length === 0}
                className="w-full py-6 bg-orange-500 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-30"
            >
                <CheckCircle2 className="w-6 h-6" /> Añadir a Despensa
            </button>
        </div>
      )}
    </div>
  );
};
