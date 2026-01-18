
import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Check, Loader2, Upload, Sparkles, Trash2, AlertCircle, CheckCircle2, RefreshCw, FileText, ChevronDown, Info } from 'lucide-react';
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
    { id: 'broths', label: 'Caldos y Sopas', emoji: '🥣' },
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
    "Leyendo documento...",
    "Identificando productos...",
    "Filtrando bolsas y datos bancarios...",
    "Categorizando tu compra...",
    "Casi listo..."
  ];

  useEffect(() => {
    let interval: number;
    if (step === 'processing') {
      interval = window.setInterval(() => {
        setLoadingStep(prev => (prev + 1) % loadingMessages.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [step]);

  const handleFile = async (file: File) => {
    if (!file) return;
    setStep('processing');
    setLoadingStep(0);
    
    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64 = reader.result as string;
            const base64Data = base64.split(',')[1];
            
            const items = await extractItemsFromTicket(base64Data, file.type);
            
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
        reader.onerror = () => setStep('error');
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
        quantity: parseFloat(String(item.quantity || "1").replace(',', '.')),
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
      <div className="p-4 flex justify-between items-center text-white bg-[#013b33] z-50">
        <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5" />
            </div>
            <div>
                <h3 className="text-base font-black leading-none">Importar Compra</h3>
                <p className="text-[8px] font-black uppercase tracking-widest text-teal-400 mt-1">Fresco Vision Gold</p>
            </div>
        </div>
        <button onClick={onClose} className="p-2 bg-white/5 rounded-xl"><X className="w-5 h-5 text-gray-400" /></button>
      </div>

      <div className="flex-1 p-6 w-full flex flex-col overflow-y-auto no-scrollbar">
        
        {step === 'idle' && (
          <div className="flex-1 flex flex-col gap-8 justify-center animate-slide-up">
            <div className="text-center">
                <h4 className="text-white text-3xl font-black mb-2">Sube tu ticket</h4>
                <p className="text-teal-200/50 text-sm">Cualquier foto o PDF de Mercadona será leído con precisión.</p>
            </div>

            <div 
                className="flex-1 min-h-[320px] flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-teal-500/30 p-12 text-center bg-white/5 group hover:border-orange-500/50 transition-all cursor-pointer shadow-inner"
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="w-24 h-24 bg-teal-900/50 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl group-hover:scale-110 transition-transform border border-white/5">
                    <Upload className="w-10 h-10 text-teal-400" />
                </div>
                <div className="space-y-2">
                    <p className="text-white font-black text-xl">Sube tu archivo</p>
                    <p className="text-teal-200/30 text-[10px] uppercase tracking-[0.2em] font-black">PDF, JPEG o PNG</p>
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,application/pdf" 
                    onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} 
                />
            </div>

            <div className="bg-teal-900/50 p-6 rounded-[2rem] border border-teal-800 flex gap-4 items-center">
                <Info className="w-5 h-5 text-teal-400 shrink-0" />
                <p className="text-[11px] text-teal-100/60 leading-relaxed font-medium italic">
                    "Fresco Vision Gold lee automáticamente las cantidades y categorías, ignorando bolsas y otros datos irrelevantes."
                </p>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8">
            <div className="relative">
                <div className="w-28 h-28 border-[6px] border-teal-500/10 border-t-orange-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-orange-400 animate-pulse" />
                </div>
            </div>
            <div className="text-center space-y-2">
                <h4 className="text-white text-2xl font-black transition-all duration-500">{loadingMessages[loadingStep]}</h4>
                <p className="text-teal-200/40 font-black text-[9px] uppercase tracking-widest">Motor de Inteligencia Artificial Activo</p>
            </div>
          </div>
        )}

        {step === 'error' && (
             <div className="flex-1 flex flex-col items-center justify-center gap-8 text-center animate-slide-up">
                <div className="w-24 h-24 bg-red-500/10 rounded-[2.5rem] flex items-center justify-center mb-4">
                    <AlertCircle className="w-12 h-12 text-red-400" />
                </div>
                <div className="space-y-2">
                    <h4 className="text-white text-2xl font-black">No pudimos leerlo</h4>
                    <p className="text-teal-200/40 font-medium text-xs max-w-[280px] mx-auto leading-relaxed">
                        Asegúrate de que el documento sea un ticket de supermercado y que el archivo no esté corrupto.
                    </p>
                </div>
                <button 
                    onClick={() => setStep('idle')}
                    className="w-full max-w-[240px] py-5 bg-white text-teal-900 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                    <RefreshCw className="w-4 h-4" /> Intentar de nuevo
                </button>
             </div>
        )}

        {step === 'review' && (
          <div className="space-y-6 animate-slide-up pb-32">
             <div className="bg-orange-500/10 border border-orange-500/20 p-5 rounded-[2rem] flex items-center gap-5">
                <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <Check className="w-6 h-6 stroke-[3px]" />
                </div>
                <div>
                    <h5 className="text-orange-500 font-black text-[10px] uppercase tracking-widest mb-1">Extracción Completada</h5>
                    <p className="text-xs text-orange-100/70 font-medium leading-tight">Hemos encontrado {detectedItems.length} productos.</p>
                </div>
             </div>
            
            <div className="space-y-4">
                {detectedItems.map((item, i) => (
                    <div key={i} className="p-5 rounded-[2.5rem] bg-white shadow-xl flex flex-col gap-4 border border-gray-100 group">
                        <div className="flex justify-between items-start gap-4">
                            <input 
                                className="bg-transparent font-black text-lg w-full focus:outline-none text-teal-950 capitalize" 
                                value={item.name} 
                                onChange={(e) => {
                                    const newItems = [...detectedItems];
                                    newItems[i].name = e.target.value;
                                    setDetectedItems(newItems);
                                }}
                            />
                            <button onClick={() => setDetectedItems(detectedItems.filter((_, idx) => idx !== i))} className="p-2 text-gray-200 hover:text-red-500 transition-colors">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                                <select 
                                    value={item.category}
                                    onChange={(e) => {
                                        const newItems = [...detectedItems];
                                        newItems[i].category = e.target.value;
                                        setDetectedItems(newItems);
                                    }}
                                    className="appearance-none bg-teal-50 text-teal-700 text-[10px] font-black uppercase px-5 py-3.5 rounded-2xl w-full outline-none border border-transparent focus:border-teal-200"
                                >
                                    {CATEGORIES_OPTIONS.map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.emoji} {opt.label.toUpperCase()}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-teal-300 pointer-events-none" />
                            </div>
                            <div className="bg-gray-50 rounded-2xl px-5 py-3 flex items-center gap-4 border border-gray-100">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cant</span>
                                <input type="number" step="0.1" className="bg-transparent text-right font-black text-teal-950 w-14 focus:outline-none text-base" value={item.quantity} onChange={(e) => {
                                    const newItems = [...detectedItems];
                                    newItems[i].quantity = e.target.value;
                                    setDetectedItems(newItems);
                                }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {step === 'review' && (
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#013b33] via-[#013b33] to-transparent z-50">
              <div className="flex gap-4 max-w-lg mx-auto">
                  <button onClick={() => setStep('idle')} className="flex-1 py-5 bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/5 active:scale-95 transition-all">Cancelar</button>
                  <button onClick={handleSave} className="flex-[2] py-5 bg-orange-500 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                      <CheckCircle2 className="w-5 h-5" /> Confirmar Inventario
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};
