
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
  const [loadingMessage, setLoadingMessage] = useState('Analizando ticket...');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setStep('processing');
    setLoadingMessage(file.type.includes('pdf') ? 'Procesando PDF...' : 'Analizando imagen...');
    
    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64 = reader.result as string;
            const base64Data = base64.split(',')[1];
            // Enviamos el MIME type original (image/jpeg o application/pdf)
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
                <p className="text-[8px] font-black uppercase tracking-widest text-teal-400 mt-1">Smart Vision AI</p>
            </div>
        </div>
        <button onClick={onClose} className="p-2 bg-white/5 rounded-xl"><X className="w-5 h-5 text-gray-400" /></button>
      </div>

      <div className="flex-1 p-6 w-full flex flex-col overflow-y-auto no-scrollbar">
        
        {step === 'idle' && (
          <div className="flex-1 flex flex-col gap-8 justify-center animate-slide-up">
            <div className="text-center">
                <h4 className="text-white text-3xl font-black mb-2">Sube tu ticket</h4>
                <p className="text-teal-200/50 text-sm">Arrastra o selecciona la foto de tu ticket o el PDF de Mercadona.</p>
            </div>

            <div 
                className="flex-1 min-h-[300px] flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-teal-500/30 p-12 text-center bg-white/5 group hover:border-orange-500/50 transition-all cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="w-24 h-24 bg-teal-900/50 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl group-hover:scale-110 transition-transform border border-white/5">
                    <Upload className="w-10 h-10 text-teal-400" />
                </div>
                <div className="space-y-2">
                    <p className="text-white font-black text-xl">Seleccionar Archivo</p>
                    <p className="text-teal-200/30 text-xs uppercase tracking-widest font-bold">PDF o Imágenes</p>
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,application/pdf" 
                    onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} 
                />
            </div>

            <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 flex gap-4 items-start">
                <Info className="w-5 h-5 text-orange-400 mt-1 shrink-0" />
                <p className="text-xs text-teal-100/60 leading-relaxed font-medium">
                    Nuestro sistema utiliza inteligencia artificial avanzada para identificar productos alimentarios automáticamente.
                </p>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="relative">
                <div className="w-24 h-24 border-[4px] border-teal-500/10 border-t-orange-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-orange-400 animate-pulse" />
                </div>
            </div>
            <div className="text-center">
                <h4 className="text-white text-2xl font-black mb-1">{loadingMessage}</h4>
                <p className="text-teal-200/40 font-medium text-xs">Esto puede tardar unos segundos...</p>
            </div>
          </div>
        )}

        {step === 'error' && (
             <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center animate-slide-up">
                <div className="w-24 h-24 bg-red-500/10 rounded-[2.5rem] flex items-center justify-center mb-4">
                    <AlertCircle className="w-12 h-12 text-red-400" />
                </div>
                <div>
                    <h4 className="text-white text-2xl font-black mb-2">No pudimos leerlo</h4>
                    <p className="text-teal-200/40 font-medium text-xs max-w-[280px] mx-auto leading-relaxed">
                        Asegúrate de que el archivo no esté protegido por contraseña o que la foto sea legible.
                    </p>
                </div>
                <button 
                    onClick={() => setStep('idle')}
                    className="w-full max-w-[240px] py-5 bg-white text-teal-900 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                    <RefreshCw className="w-4 h-4" /> Reintentar
                </button>
             </div>
        )}

        {step === 'review' && (
          <div className="space-y-6 animate-slide-up pb-32">
             <div className="bg-orange-500/10 border border-orange-500/20 p-5 rounded-[2rem] flex items-start gap-4">
                <div className="p-2 bg-orange-500 rounded-xl text-white">
                    <Check className="w-4 h-4" />
                </div>
                <div>
                    <h5 className="text-orange-500 font-black text-[10px] uppercase tracking-widest mb-1">¡Leído con éxito!</h5>
                    <p className="text-xs text-orange-100/70 font-medium leading-relaxed">Confirma que los productos detectados sean correctos.</p>
                </div>
             </div>
            
            <div className="space-y-3">
                {detectedItems.map((item, i) => (
                    <div key={i} className="p-4 rounded-[2rem] bg-white shadow-xl flex flex-col gap-4 border border-gray-100">
                        <div className="flex justify-between items-start gap-4">
                            <input 
                                className="bg-transparent font-black text-base w-full focus:outline-none text-teal-900 capitalize" 
                                value={item.name} 
                                onChange={(e) => {
                                    const newItems = [...detectedItems];
                                    newItems[i].name = e.target.value;
                                    setDetectedItems(newItems);
                                }}
                            />
                            <button onClick={() => setDetectedItems(detectedItems.filter((_, idx) => idx !== i))} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
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
                                    className="appearance-none bg-teal-50 text-teal-700 text-[10px] font-black uppercase px-4 py-3 rounded-xl w-full outline-none"
                                >
                                    {CATEGORIES_OPTIONS.map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.emoji} {opt.label.toUpperCase()}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-3 w-3 text-teal-300 pointer-events-none" />
                            </div>
                            <div className="bg-gray-50 rounded-xl px-4 py-2.5 flex items-center gap-3 border border-gray-100">
                                <span className="text-[9px] font-black text-gray-400 uppercase">Cant</span>
                                <input type="number" step="0.1" className="bg-transparent text-right font-black text-teal-900 w-12 focus:outline-none text-sm" value={item.quantity} onChange={(e) => {
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
                  <button onClick={handleSave} className="flex-[2] py-5 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                      <CheckCircle2 className="w-4 h-4" /> Añadir al Stock
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};
