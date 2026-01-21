
import React, { useState, useRef } from 'react';
import { X, Upload, Sparkles, Trash2, AlertCircle, CheckCircle2, RefreshCw, PenLine, Plus, Minus, Calendar, Scale, ChevronDown, FileText, Camera, ShoppingBag, Loader2 } from 'lucide-center';
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

const INPUT_STYLE = "w-full h-[58px] px-5 bg-gray-50 rounded-2xl font-black text-[11px] text-[#013b33] uppercase tracking-widest outline-none border-2 border-transparent focus:border-teal-500/20 transition-all flex items-center appearance-none";

export const TicketScanner: React.FC<TicketScannerProps> = ({ onClose, onAddItems }) => {
  const [step, setStep] = useState<'idle' | 'processing' | 'review' | 'error'>('idle');
  const [items, setItems] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        
        // Detección manual de MIME si el navegador falla
        let mimeType = file.type;
        if (!mimeType) {
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (ext === 'pdf') mimeType = 'application/pdf';
            else if (['jpg', 'jpeg', 'png'].includes(ext || '')) mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
            else mimeType = 'image/jpeg'; // Fallback
        }
        
        const extracted = await extractItemsFromTicket(base64Data, mimeType);
        
        if (extracted && Array.isArray(extracted) && extracted.length > 0) {
            const today = format(new Date(), 'yyyy-MM-dd');
            const processed = extracted.map((i, idx) => {
                const days = EXPIRY_DAYS_BY_CATEGORY[i.category] || 14;
                const expDate = new Date();
                expDate.setDate(expDate.getDate() + days);
                
                return {
                    ...i,
                    quantity: Number(i.quantity) || 1,
                    added_at: today,
                    expires_at: format(expDate, 'yyyy-MM-dd'),
                    tempId: `item-${Date.now()}-${idx}`
                };
            });
            setItems(processed);
            setStep('review');
        } else {
            setStep('error');
        }
      } catch (err) {
          console.error("Fresco Vision Critical Error:", err);
          setStep('error');
      }
    };
    
    reader.onerror = () => setStep('error');
    reader.readAsDataURL(file);
  };

  const addItemManual = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 14);

    const newItem = {
        name: '',
        quantity: 1,
        unit: 'uds',
        category: 'other',
        added_at: today,
        expires_at: format(expDate, 'yyyy-MM-dd'),
        tempId: `manual-${Date.now()}`
    };
    setItems([newItem, ...items]);
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
            id: `ocr-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
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
        alert("Error al guardar.");
    }
  };

  return (
    <div className="fixed inset-0 z-[5000] bg-teal-900 flex flex-col animate-fade-in overflow-hidden safe-pb">
      <div className="p-6 flex justify-between items-center bg-black/10 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
                <h2 className="text-xl font-black text-white tracking-tight">Fresco Vision</h2>
                <p className="text-[9px] font-black text-teal-400 uppercase tracking-widest">IA Importadora Gold</p>
            </div>
        </div>
        <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-white"><X className="w-6 h-6" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
        {step === 'idle' && (
          <div className="h-full flex flex-col items-center justify-center gap-8 max-w-sm mx-auto animate-slide-up">
            <div className="text-center">
                <h3 className="text-4xl font-black text-white mb-2 leading-none">Nueva Compra</h3>
                <p className="text-teal-200/50 text-sm">Escanea el ticket o sube el PDF de Mercadona.</p>
            </div>

            <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-square bg-white/5 border-4 border-dashed border-teal-500/30 rounded-[3.5rem] flex flex-col items-center justify-center gap-6 group hover:border-orange-500/50 transition-all cursor-pointer"
            >
                <div className="w-24 h-24 bg-teal-900 rounded-[2.5rem] flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                    <Camera className="w-10 h-10 text-teal-400" />
                </div>
                <div className="text-center px-4">
                    <p className="text-xl font-black text-white">Subir Foto o PDF</p>
                    <p className="text-[10px] text-teal-500 font-bold uppercase mt-1">Soporte Mercadona Nativo</p>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
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
          <div className="h-full flex flex-col items-center justify-center gap-10 text-center animate-fade-in">
            <div className="relative">
                <div className="w-32 h-32 border-[6px] border-teal-500/10 border-t-orange-500 rounded-full animate-spin flex items-center justify-center" />
                <FileText className="absolute inset-0 m-auto w-10 h-10 text-orange-500 animate-pulse" />
            </div>
            <div>
                <h3 className="text-3xl font-black text-white">Analizando Ticket...</h3>
                <p className="text-teal-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">IA detectando productos</p>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="h-full flex flex-col items-center justify-center gap-8 text-center animate-slide-up">
            <div className="w-24 h-24 bg-red-500/20 rounded-[2.5rem] flex items-center justify-center">
                <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <div>
                <h3 className="text-3xl font-black text-white">No se detectó nada</h3>
                <p className="text-teal-200/50 mt-2 px-6">Asegúrate de que la foto esté enfocada y se vea el texto completo del ticket.</p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
                <button onClick={() => setStep('idle')} className="w-full py-5 bg-white text-teal-900 rounded-[1.8rem] font-black text-xs uppercase tracking-widest flex justify-center gap-3 shadow-xl">
                    <RefreshCw className="w-5 h-5" /> Reintentar
                </button>
                <button onClick={addItemManual} className="w-full py-4 text-teal-400 font-bold text-xs uppercase tracking-widest">Añadir a mano</button>
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
                {items.map((item) => {
                    const catInfo = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[CATEGORIES.length-1];
                    return (
                        <div key={item.tempId} className="bg-white rounded-[2.5rem] p-6 shadow-2xl flex flex-col gap-5 border border-white/5 animate-fade-in relative">
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex-1">
                                    <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 block ml-1">Producto</label>
                                    <input 
                                        className="bg-gray-50 font-black text-lg text-teal-950 w-full px-4 py-3 rounded-xl focus:outline-none capitalize border-2 border-transparent focus:border-teal-500/10 transition-all" 
                                        value={item.name} 
                                        onChange={(e) => updateItem(item.tempId, { name: e.target.value })}
                                    />
                                </div>
                                <button onClick={() => removeItem(item.tempId)} className="mt-7 p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 block ml-1">Comprado</label>
                                    <input type="date" value={item.added_at} onChange={e => updateItem(item.tempId, { added_at: e.target.value })} className={INPUT_STYLE} />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 block ml-1">Caducidad</label>
                                    <input type="date" value={item.expires_at} onChange={e => updateItem(item.tempId, { expires_at: e.target.value })} className={INPUT_STYLE + " !text-orange-500"} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 block ml-1">Categoría</label>
                                    <div className="relative">
                                        <select 
                                            value={item.category}
                                            onChange={(e) => updateItem(item.tempId, { category: e.target.value })}
                                            className={INPUT_STYLE + " pl-12"}
                                        >
                                            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label.toUpperCase()}</option>)}
                                        </select>
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg pointer-events-none">{catInfo.emoji}</span>
                                        <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-3 h-3 text-teal-200 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-[1.5fr_1fr] gap-3">
                                    <div className="relative">
                                        <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 block ml-1">Unidad</label>
                                        <select 
                                            value={item.unit}
                                            onChange={(e) => updateItem(item.tempId, { unit: e.target.value })}
                                            className={INPUT_STYLE}
                                        >
                                            {UNIT_OPTIONS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-5 top-2/3 -translate-y-1/2 w-3 h-3 text-teal-200 pointer-events-none" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 block ml-1">Cantidad</label>
                                        <div className="bg-teal-900 h-[58px] rounded-2xl flex items-center justify-between px-2 shadow-lg">
                                            <button onClick={() => updateItem(item.tempId, { quantity: Math.max(0.1, item.quantity - 0.5) })} className="p-2 text-white/50 hover:text-white"><Minus className="w-3 h-3" /></button>
                                            <input type="number" step="0.1" value={item.quantity} onChange={e => updateItem(item.tempId, { quantity: parseFloat(e.target.value) || 0 })} className="w-8 bg-transparent text-center font-black text-white text-xs outline-none" />
                                            <button onClick={() => updateItem(item.tempId, { quantity: item.quantity + 0.5 })} className="p-2 text-white/50 hover:text-white"><Plus className="w-3 h-3" /></button>
                                        </div>
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
        <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-teal-900 via-teal-900/90 to-transparent z-50">
            <button 
                onClick={handleFinalSave}
                disabled={isSaving || items.length === 0}
                className="w-full py-6 bg-orange-500 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
            >
                {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <><CheckCircle2 className="w-6 h-6" /> Añadir a Despensa</>}
            </button>
        </div>
      )}
    </div>
  );
};
