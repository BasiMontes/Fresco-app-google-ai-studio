
import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Sparkles, Trash2, AlertCircle, CheckCircle2, RefreshCw, PenLine, Plus, Minus, Calendar, Scale, ChevronDown, FileText, Camera, ShoppingBag, Loader2, Key, ExternalLink, ArrowRight, Info } from 'lucide-react';
import { extractItemsFromTicket } from '../services/geminiService';
import { PantryItem } from '../types';
import { EXPIRY_DAYS_BY_CATEGORY } from '../constants';
import { format, addDays } from 'date-fns';

interface TicketScannerProps {
  onClose: () => void;
  onAddItems: (items: PantryItem[]) => void;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
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

const INPUT_STYLE = "w-full h-[58px] px-5 bg-gray-50 rounded-2xl font-black text-[11px] text-[#013b33] uppercase tracking-widest outline-none border-2 border-transparent focus:border-teal-500/20 transition-all flex items-center appearance-none";

export const TicketScanner: React.FC<TicketScannerProps> = ({ onClose, onAddItems }) => {
  const [step, setStep] = useState<'idle' | 'processing' | 'review' | 'error' | 'need-key'>('idle');
  const [items, setItems] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKey = async () => {
        if (window.aistudio) {
            try {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                if (!hasKey) setStep('need-key');
            } catch (e) {
                setStep('need-key');
            }
        }
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    if (window.aistudio) {
        await window.aistudio.openSelectKey();
        setStep('idle');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStep('processing');
    const reader = new FileReader();
    
    reader.onload = async () => {
      try {
        const result = reader.result as string;
        if (!result) throw new Error("File read failed");

        const base64Data = result.split(',')[1];
        let mimeType = file.type || 'image/jpeg';
        
        const extracted = await extractItemsFromTicket(base64Data, mimeType);
        
        if (extracted && Array.isArray(extracted) && extracted.length > 0) {
            const today = format(new Date(), 'yyyy-MM-dd');
            const processed = extracted.map((i, idx) => ({
                name: i.name || 'Producto desconocido',
                quantity: Number(i.quantity) || 1,
                unit: i.unit || 'uds',
                category: i.category || 'other',
                added_at: today,
                expires_at: format(addDays(new Date(), EXPIRY_DAYS_BY_CATEGORY[i.category] || 14), 'yyyy-MM-dd'),
                tempId: `item-${Date.now()}-${idx}`
            }));
            setItems(processed);
            setStep('review');
        } else {
            setStep('error');
        }
      } catch (err: any) {
          const errorMsg = err.message || "";
          console.error("Fresco Vision Error Intercepted:", errorMsg);
          
          if (errorMsg.includes("API Key") || errorMsg.includes("Requested entity")) {
              setStep('need-key');
          } else {
              setStep('error');
          }
      }
    };
    
    reader.onerror = () => setStep('error');
    reader.readAsDataURL(file);
  };

  const addItemManual = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const newItem = {
        name: '', quantity: 1, unit: 'uds', category: 'other',
        added_at: today, expires_at: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
        tempId: `manual-${Date.now()}`
    };
    setItems(prev => [newItem, ...prev]);
    if (step !== 'review') setStep('review');
  };

  const updateItem = (tempId: string, fields: any) => {
    setItems(prev => prev.map(item => item.tempId === tempId ? { ...item, ...fields } : item));
  };

  const removeItem = (tempId: string) => {
    setItems(prev => {
        const filtered = prev.filter(item => item.tempId !== tempId);
        if (filtered.length === 0) setStep('idle');
        return filtered;
    });
  };

  const handleFinalSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
        const pantryItems: PantryItem[] = items.map((item, i) => ({
            id: `ocr-${Date.now()}-${i}`,
            name: item.name || 'Producto nuevo',
            quantity: Number(item.quantity) || 1,
            unit: (item.unit || 'uds').toLowerCase(),
            category: item.category || 'other',
            added_at: new Date(item.added_at).toISOString(),
            expires_at: item.expires_at ? new Date(item.expires_at).toISOString() : undefined
        }));
        await onAddItems(pantryItems);
        onClose();
    } catch (err) {
        setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[5000] bg-[#013b33] flex flex-col animate-fade-in overflow-hidden safe-pb">
      <div className="p-6 flex justify-between items-center bg-black/20 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
                <h2 className="text-xl font-black text-white tracking-tight">Fresco Vision</h2>
                <p className="text-[9px] font-black text-teal-400 uppercase tracking-widest">Importador Inteligente</p>
            </div>
        </div>
        <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 text-white"><X className="w-6 h-6" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
        {step === 'need-key' && (
            <div className="h-full flex flex-col items-center justify-center gap-8 max-w-sm mx-auto text-center animate-slide-up">
                <div className="w-24 h-24 bg-orange-500/20 rounded-[2.5rem] flex items-center justify-center">
                    <Key className="w-12 h-12 text-orange-500" />
                </div>
                <div>
                    <h3 className="text-3xl font-black text-white leading-none">Activar Motor IA</h3>
                    <p className="text-teal-200/60 mt-4 text-sm leading-relaxed">
                        Para que Fresco pueda "leer" tus tickets, necesitas vincular una API Key de Gemini.
                    </p>
                </div>

                <div className="w-full bg-white/5 rounded-[2rem] p-6 text-left space-y-4 border border-white/5">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-2 flex items-center gap-2">
                        <Info className="w-3 h-3" /> Pasos para empezar gratis:
                    </h4>
                    <ol className="text-white/70 text-xs space-y-3 font-medium">
                        <li className="flex gap-3">
                            <span className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center text-[10px] font-black text-white flex-shrink-0">1</span>
                            <span>Crea tu clave en <a href="https://aistudio.google.com/" target="_blank" className="text-orange-400 underline">AI Studio</a>.</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center text-[10px] font-black text-white flex-shrink-0">2</span>
                            <span>Vincula un proyecto con facturación (gratis hasta 15 escaneos/min).</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center text-[10px] font-black text-white flex-shrink-0">3</span>
                            <span>Pulsa el botón naranja de abajo y selecciónala.</span>
                        </li>
                    </ol>
                </div>
                
                <div className="w-full space-y-3">
                    <button onClick={handleOpenKeySelector} className="w-full py-6 bg-orange-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all">
                        Seleccionar Clave
                    </button>
                    <button onClick={addItemManual} className="w-full py-4 text-teal-400 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                        Usar entrada manual sin IA <ArrowRight className="w-3 h-3" />
                    </button>
                </div>

                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="inline-flex items-center gap-2 text-teal-500 text-[9px] font-black uppercase tracking-widest mt-2 opacity-50">
                    Saber más sobre facturación <ExternalLink className="w-3 h-3" />
                </a>
            </div>
        )}

        {step === 'idle' && (
          <div className="h-full flex flex-col items-center justify-center gap-8 max-w-sm mx-auto animate-slide-up">
            <div className="text-center">
                <h3 className="text-4xl font-black text-white mb-2 leading-none">Nueva Compra</h3>
                <p className="text-teal-200/50 text-sm">Escanea el ticket o sube el PDF de Mercadona.</p>
            </div>

            <div onClick={() => fileInputRef.current?.click()} className="w-full aspect-square bg-white/5 border-4 border-dashed border-teal-500/30 rounded-[3.5rem] flex flex-col items-center justify-center gap-6 group hover:border-orange-500/50 transition-all cursor-pointer">
                <div className="w-24 h-24 bg-[#013b33] rounded-[2.5rem] flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform border border-white/5">
                    <Camera className="w-10 h-10 text-teal-400" />
                </div>
                <div className="text-center px-4">
                    <p className="text-xl font-black text-white">Subir Foto o PDF</p>
                    <p className="text-[10px] text-teal-500 font-bold uppercase mt-1">IA Gemini importará todo por ti</p>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
            </div>

            <button onClick={addItemManual} className="w-full py-5 border-2 border-teal-500/30 text-teal-400 rounded-[1.8rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-teal-500/10">
                <PenLine className="w-5 h-5" /> Entrada Manual
            </button>
          </div>
        )}

        {step === 'processing' && (
          <div className="h-full flex flex-col items-center justify-center gap-10 text-center animate-fade-in">
            <div className="relative">
                <div className="w-32 h-32 border-[6px] border-teal-500/10 border-t-orange-500 rounded-full animate-spin flex items-center justify-center" />
                <FileText className="absolute inset-0 m-auto w-10 h-10 text-orange-500 animate-pulse" />
            </div>
            <div>
                <h3 className="text-3xl font-black text-white">Analizando Ticket...</h3>
                <p className="text-teal-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">La IA está reconociendo los productos</p>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="h-full flex flex-col items-center justify-center gap-8 text-center animate-slide-up">
            <div className="w-24 h-24 bg-red-500/20 rounded-[2.5rem] flex items-center justify-center">
                <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <div>
                <h3 className="text-3xl font-black text-white">Lectura fallida</h3>
                <p className="text-teal-200/50 mt-2 px-6 text-sm">No pudimos procesar la imagen automáticamente. Inténtalo con otra foto o introduce los datos a mano.</p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
                <button onClick={() => setStep('idle')} className="w-full py-5 bg-white text-[#013b33] rounded-[1.8rem] font-black text-xs uppercase tracking-widest flex justify-center gap-3 shadow-xl active:scale-95">
                    <RefreshCw className="w-5 h-5" /> Probar otra foto
                </button>
                <button onClick={addItemManual} className="w-full py-4 bg-teal-500/10 text-teal-400 rounded-2xl font-bold text-xs uppercase tracking-widest active:scale-95">Añadir a mano</button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-6 pb-40 animate-slide-up">
            <div className="flex justify-between items-center px-2">
                <div>
                    <h3 className="text-white font-black text-xl">Confirmar Compra</h3>
                    <p className="text-teal-400 text-[10px] font-black uppercase tracking-widest">{items.length} productos detectados</p>
                </div>
                <button onClick={addItemManual} className="p-3 bg-orange-500 text-white rounded-xl shadow-lg active:scale-90 transition-all"><Plus className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((item) => (
                    <div key={item.tempId} className="bg-white rounded-[2.5rem] p-6 shadow-2xl flex flex-col gap-5 border border-white/5 animate-fade-in relative">
                        <div className="flex justify-between items-start gap-3">
                            <div className="flex-1">
                                <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 block ml-1">Producto</label>
                                <input className="bg-gray-50 font-black text-lg text-[#013b33] w-full px-4 py-3 rounded-xl focus:outline-none capitalize border-2 border-transparent focus:border-teal-500/10 transition-all" value={item.name} onChange={(e) => updateItem(item.tempId, { name: e.target.value })} />
                            </div>
                            <button onClick={() => removeItem(item.tempId)} className="mt-7 p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-5 h-5" /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="relative">
                                <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 block ml-1">Comprado</label>
                                <input type="text" value={item.added_at} placeholder="AAAA-MM-DD" onChange={e => updateItem(item.tempId, { added_at: e.target.value })} className={INPUT_STYLE} />
                                <input type="date" value={item.added_at} onChange={e => updateItem(item.tempId, { added_at: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>
                            <div className="relative">
                                <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 block ml-1">Caducidad</label>
                                <input type="text" value={item.expires_at} placeholder="AAAA-MM-DD" onChange={e => updateItem(item.tempId, { expires_at: e.target.value })} className={INPUT_STYLE + " !text-orange-500"} />
                                <input type="date" value={item.expires_at} onChange={e => updateItem(item.tempId, { expires_at: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="relative">
                                <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 block ml-1">Categoría</label>
                                <select value={item.category} onChange={(e) => updateItem(item.tempId, { category: e.target.value })} className={INPUT_STYLE}>
                                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label.toUpperCase()}</option>)}
                                </select>
                                <ChevronDown className="absolute right-5 top-[65%] -translate-y-1/2 w-3 h-3 text-teal-200 pointer-events-none" />
                            </div>
                            <div className="grid grid-cols-[1.5fr_1fr] gap-3">
                                <div className="relative">
                                    <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 block ml-1">Unidad</label>
                                    <select value={item.unit} onChange={(e) => updateItem(item.tempId, { unit: e.target.value })} className={INPUT_STYLE}>
                                        {UNIT_OPTIONS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-5 top-[65%] -translate-y-1/2 w-3 h-3 text-teal-200 pointer-events-none" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 block ml-1">Cantidad</label>
                                    <div className="bg-[#013b33] h-[58px] rounded-2xl flex items-center justify-between px-2 shadow-lg">
                                        <button onClick={() => updateItem(item.tempId, { quantity: Math.max(0.1, item.quantity - 0.5) })} className="p-2 text-white/50 hover:text-white"><Minus className="w-3 h-3" /></button>
                                        <input type="number" step="0.1" value={item.quantity} onChange={e => updateItem(item.tempId, { quantity: parseFloat(e.target.value) || 0 })} className="w-8 bg-transparent text-center font-black text-white text-xs outline-none" />
                                        <button onClick={() => updateItem(item.tempId, { quantity: item.quantity + 0.5 })} className="p-2 text-white/50 hover:text-white"><Plus className="w-3 h-3" /></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {(step === 'review' || step === 'idle' || step === 'error') && (
        <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#013b33] via-[#013b33]/90 to-transparent z-50">
            <button 
                onClick={step === 'review' ? handleFinalSave : () => {}}
                disabled={isSaving || (step === 'review' && items.length === 0)}
                className={`w-full py-6 bg-orange-500 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:bg-orange-600 active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50 ${step !== 'review' ? 'hidden' : ''}`}
            >
                {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <><CheckCircle2 className="w-6 h-6" /> Añadir a Despensa</>}
            </button>
        </div>
      )}
    </div>
  );
};
