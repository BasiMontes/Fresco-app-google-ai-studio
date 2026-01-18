
import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Upload, Sparkles, Trash2, AlertCircle, CheckCircle2, RefreshCw, ChevronDown, PenLine } from 'lucide-react';
import { extractItemsFromTicket } from '../services/geminiService';
import { PantryItem } from '../types';
import { EXPIRY_DAYS_BY_CATEGORY } from '../constants';

interface TicketScannerProps {
  onClose: () => void;
  onAddItems: (items: PantryItem[]) => void;
}

const CATEGORIES_OPTIONS = [
    { id: 'vegetables', label: 'Verduría', emoji: '🥦' },
    { id: 'fruits', label: 'Frutería', emoji: '🍎' },
    { id: 'dairy', label: 'Lácteos y Huevos', emoji: '🧀' },
    { id: 'meat', label: 'Carnicería', emoji: '🥩' },
    { id: 'fish', label: 'Pescadería', emoji: '🐟' },
    { id: 'pasta', label: 'Pasta y Arroz', emoji: '🍝' },
    { id: 'legumes', label: 'Legumbres', emoji: '🫘' },
    { id: 'bakery', label: 'Panadería', emoji: '🥖' },
    { id: 'frozen', label: 'Congelados', emoji: '❄️' },
    { id: 'pantry', label: 'Despensa', emoji: '🥫' },
    { id: 'spices', label: 'Especias', emoji: '🧂' },
    { id: 'drinks', label: 'Bebidas', emoji: '🥤' },
    { id: 'other', label: 'Otros', emoji: '🛍️' },
];

export const TicketScanner: React.FC<TicketScannerProps> = ({ onClose, onAddItems }) => {
  const [step, setStep] = useState<'idle' | 'processing' | 'review' | 'error'>('idle');
  const [detectedItems, setDetectedItems] = useState<any[]>([]);
  const [loadingStep, setLoadingStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadingMessages = [
    "Leyendo ticket...",
    "Identificando productos...",
    "Casi listo..."
  ];

  useEffect(() => {
    let interval: number;
    if (step === 'processing') {
      interval = window.setInterval(() => {
        setLoadingStep(prev => (prev + 1) % loadingMessages.length);
      }, 1000);
    }
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
            const items = await extractItemsFromTicket(base64, file.type);
            
            if (items && items.length > 0) {
                setDetectedItems(items.map((item: any) => ({
                    ...item,
                    daysToExpire: EXPIRY_DAYS_BY_CATEGORY[item.category] || 14
                })));
                setStep('review');
            } else {
                setStep('error');
            }
        };
    } catch (err) {
        setStep('error');
    }
  };

  const handleSave = () => {
    const itemsToSave: PantryItem[] = detectedItems.map((item, i) => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (item.daysToExpire || 14));
      return {
        id: `ticket-${Date.now()}-${i}`,
        name: item.name || 'Producto',
        quantity: parseFloat(String(item.quantity || "1")),
        unit: item.unit || 'uds',
        category: item.category || 'other',
        added_at: new Date().toISOString(),
        expires_at: expiryDate.toISOString()
      };
    });
    onAddItems(itemsToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-[#013b33] flex flex-col animate-fade-in overflow-hidden safe-pb">
      <div className="p-4 flex justify-between items-center text-white z-50">
        <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
            </div>
            <div>
                <h3 className="text-sm font-black uppercase tracking-widest">Fresco Vision</h3>
                <p className="text-[8px] text-teal-400 font-bold uppercase tracking-[0.2em]">Engine: Flash Lite</p>
            </div>
        </div>
        <button onClick={onClose} className="p-2 bg-white/5 rounded-xl"><X className="w-5 h-5 text-gray-400" /></button>
      </div>

      <div className="flex-1 p-6 flex flex-col overflow-y-auto no-scrollbar">
        {step === 'idle' && (
          <div className="flex-1 flex flex-col gap-8 justify-center animate-slide-up">
            <div className="text-center">
                <h4 className="text-white text-3xl font-black mb-2">Escanea tu Ticket</h4>
                <p className="text-teal-200/50 text-sm">Sube una foto clara para importar tu compra.</p>
            </div>

            <div 
                className="flex-1 min-h-[300px] flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-teal-500/30 p-12 text-center bg-white/5 group hover:border-orange-500/50 transition-all cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="w-20 h-20 bg-teal-900/50 rounded-[2rem] flex items-center justify-center mb-8">
                    <Upload className="w-8 h-8 text-teal-400" />
                </div>
                <p className="text-white font-black text-xl">Seleccionar Foto</p>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>

            <button 
                onClick={() => { setDetectedItems([{ name: '', quantity: 1, category: 'other', unit: 'uds' }]); setStep('review'); }}
                className="w-full py-4 border border-teal-500/30 text-teal-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
            >
                <PenLine className="w-4 h-4" /> O introduce productos a mano
            </button>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="w-20 h-20 border-4 border-teal-500/10 border-t-orange-500 rounded-full animate-spin" />
            <div className="text-center">
                <h4 className="text-white text-xl font-black">{loadingMessages[loadingStep]}</h4>
                <p className="text-teal-200/30 text-[9px] uppercase tracking-widest mt-2">Tecnología de baja latencia activa</p>
            </div>
          </div>
        )}

        {step === 'error' && (
             <div className="flex-1 flex flex-col items-center justify-center gap-8 text-center animate-slide-up">
                <AlertCircle className="w-16 h-16 text-red-400" />
                <div className="space-y-2">
                    <h4 className="text-white text-2xl font-black">Error de lectura</h4>
                    <p className="text-teal-200/40 text-xs">No hemos podido procesar esta imagen. Inténtalo de nuevo con más luz.</p>
                </div>
                <div className="w-full flex flex-col gap-3">
                    <button onClick={() => setStep('idle')} className="w-full py-5 bg-white text-teal-900 rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3">
                        <RefreshCw className="w-4 h-4" /> Reintentar
                    </button>
                    <button onClick={() => { setDetectedItems([{ name: '', quantity: 1, category: 'other', unit: 'uds' }]); setStep('review'); }} className="w-full py-4 text-teal-400 font-bold text-[10px] uppercase tracking-widest">
                        Saltar a entrada manual
                    </button>
                </div>
             </div>
        )}

        {step === 'review' && (
          <div className="space-y-6 animate-slide-up pb-32">
            <div className="space-y-4">
                {detectedItems.map((item, i) => (
                    <div key={i} className="p-5 rounded-[2.5rem] bg-white shadow-xl flex flex-col gap-4">
                        <div className="flex justify-between items-start gap-4">
                            <input 
                                className="bg-transparent font-black text-lg w-full focus:outline-none text-teal-950 capitalize" 
                                value={item.name} 
                                placeholder="Nombre del producto..."
                                onChange={(e) => {
                                    const newItems = [...detectedItems];
                                    newItems[i].name = e.target.value;
                                    setDetectedItems(newItems);
                                }}
                            />
                            <button onClick={() => setDetectedItems(detectedItems.filter((_, idx) => idx !== i))} className="p-2 text-gray-200 hover:text-red-500">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            <select 
                                value={item.category}
                                onChange={(e) => {
                                    const newItems = [...detectedItems];
                                    newItems[i].category = e.target.value;
                                    setDetectedItems(newItems);
                                }}
                                className="bg-teal-50 text-teal-700 text-[10px] font-black uppercase px-4 py-3 rounded-xl flex-1 outline-none"
                            >
                                {CATEGORIES_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.emoji} {opt.label}</option>)}
                            </select>
                            <div className="bg-gray-50 rounded-xl px-4 py-2 flex items-center gap-2">
                                <input type="number" step="0.1" className="bg-transparent text-right font-black text-teal-950 w-12 focus:outline-none" value={item.quantity} onChange={(e) => {
                                    const newItems = [...detectedItems];
                                    newItems[i].quantity = e.target.value;
                                    setDetectedItems(newItems);
                                }} />
                            </div>
                        </div>
                    </div>
                ))}
                <button 
                    onClick={() => setDetectedItems([...detectedItems, { name: '', quantity: 1, category: 'other', unit: 'uds' }])}
                    className="w-full py-4 border-2 border-dashed border-white/10 text-white/30 rounded-[2rem] font-bold text-[10px] uppercase tracking-widest"
                >
                    + Añadir otro producto
                </button>
            </div>
          </div>
        )}
      </div>

      {step === 'review' && (
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#013b33] to-transparent z-50">
              <button onClick={handleSave} className="w-full py-5 bg-orange-500 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3">
                  <CheckCircle2 className="w-5 h-5" /> Guardar en Despensa
              </button>
          </div>
      )}
    </div>
  );
};
