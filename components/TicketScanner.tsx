
import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Check, Loader2, Upload, Sparkles, Plus, Trash2, AlertCircle, CheckCircle2, RefreshCw, CalendarDays, FileText, ChevronDown } from 'lucide-react';
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

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export const TicketScanner: React.FC<TicketScannerProps> = ({ onClose, onAddItems }) => {
  const [step, setStep] = useState<'capture' | 'processing' | 'review' | 'error'>('capture');
  const [detectedItems, setDetectedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      window.history.pushState({ modal: 'ticket-scanner' }, '', window.location.href);
      const handlePopState = () => { onClose(); };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, [onClose]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStep('processing');
      setLoading(true);
      try {
          const base64 = await fileToBase64(file);
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
      } catch (err) {
          setStep('error');
      } finally {
          setLoading(false);
      }
    }
  };

  const handleSave = () => {
    const itemsToSave: PantryItem[] = detectedItems.map((item, i) => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (item.daysToExpire || 14));
      return {
        id: `ticket-${Date.now()}-${i}`,
        name: item.name || 'Producto',
        quantity: parseFloat(item.quantity) || 1,
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
                <h3 className="text-base font-black leading-none">Fresco Vision</h3>
                <p className="text-[8px] font-black uppercase tracking-widest text-teal-400 mt-1">Beta Scanner</p>
            </div>
        </div>
        <button onClick={onClose} className="p-2 bg-white/5 rounded-xl"><X className="w-5 h-5 text-gray-400" /></button>
      </div>

      <div className="flex-1 p-4 w-full flex flex-col overflow-y-auto no-scrollbar">
        {step === 'capture' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-slide-up">
            <div className="w-full flex-1 max-h-[400px] rounded-[2.5rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center p-8 text-center bg-white/5"
                 onClick={() => fileInputRef.current?.click()}>
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-white/5">
                    <Camera className="w-7 h-7 text-teal-200" />
                </div>
                <h4 className="text-white text-xl font-black mb-2">Sube tu ticket</h4>
                <p className="text-teal-200/50 font-medium text-sm max-w-[200px]">Toma una foto clara o sube un PDF de Mercadona.</p>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
            </div>
            <div className="w-full flex flex-col gap-3 pb-4">
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 bg-orange-500 text-white rounded-[1.4rem] font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                    <Upload className="w-5 h-5" /> Seleccionar Archivo
                </button>
                <div className="flex items-center justify-center gap-4 text-teal-300/40 font-black text-[8px] uppercase tracking-[0.2em]">
                    <span className="flex items-center gap-1.5"><Camera className="w-3 h-3" /> FOTOS</span>
                    <span className="w-1 h-1 bg-white/10 rounded-full" />
                    <span className="flex items-center gap-1.5"><FileText className="w-3 h-3" /> PDFS</span>
                </div>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="relative">
                <div className="w-24 h-24 border-[3px] border-teal-500/10 border-t-orange-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-orange-400 animate-pulse" />
                </div>
            </div>
            <div className="text-center">
                <h4 className="text-white text-xl font-black mb-1">Leyendo ticket...</h4>
                <p className="text-teal-200/40 font-medium text-xs">Esto puede tardar unos segundos.</p>
            </div>
          </div>
        )}

        {step === 'error' && (
             <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
                <div className="w-20 h-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center mb-2">
                    <AlertCircle className="w-10 h-10 text-red-400" />
                </div>
                <div>
                    <h4 className="text-white text-xl font-black mb-2">Lectura fallida</h4>
                    <p className="text-teal-200/40 font-medium text-xs max-w-[240px] mx-auto leading-relaxed">No logramos identificar los productos. Asegúrate de que el PDF sea de un supermercado soportado.</p>
                </div>
                <button 
                    onClick={() => setStep('capture')}
                    className="w-full max-w-[240px] py-4 bg-white text-teal-900 rounded-[1.2rem] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" /> Reintentar
                </button>
             </div>
        )}

        {step === 'review' && (
          <div className="space-y-4 animate-slide-up pb-32">
            <div className="space-y-3">
                {detectedItems.map((item, i) => (
                    <div key={i} className="p-4 rounded-[1.6rem] bg-white shadow-xl flex flex-col gap-3">
                        <div className="flex justify-between items-start gap-4">
                            <input 
                                className="bg-transparent font-black text-base w-full focus:outline-none text-[#013b33] capitalize" 
                                value={item.name} 
                                onChange={(e) => {
                                    const newItems = [...detectedItems];
                                    newItems[i].name = e.target.value;
                                    setDetectedItems(newItems);
                                }}
                            />
                            <button onClick={() => setDetectedItems(detectedItems.filter((_, idx) => idx !== i))} className="text-gray-200 hover:text-red-400"><Trash2 className="w-5 h-5" /></button>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <select 
                                    value={item.category}
                                    onChange={(e) => {
                                        const newItems = [...detectedItems];
                                        newItems[i].category = e.target.value;
                                        setDetectedItems(newItems);
                                    }}
                                    className="appearance-none bg-teal-50 text-teal-700 text-[9px] font-black uppercase px-3 py-2 rounded-lg w-full"
                                >
                                    {CATEGORIES_OPTIONS.map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.emoji} {opt.label.toUpperCase()}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-teal-300 pointer-events-none" />
                            </div>
                            <div className="bg-gray-50 rounded-lg px-3 py-1 flex items-center gap-2 border border-gray-100">
                                <span className="text-[8px] font-black text-gray-300 uppercase">Cant</span>
                                <input type="number" step="0.1" className="bg-transparent text-right font-black text-teal-900 w-10 focus:outline-none" value={item.quantity} onChange={(e) => {
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
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#013b33] via-[#013b33] to-transparent z-50">
              <div className="flex gap-3 max-w-lg mx-auto">
                  <button onClick={() => setStep('capture')} className="flex-1 py-4 bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/5">Repetir</button>
                  <button onClick={handleSave} className="flex-[2] py-4 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Guardar en Stock
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};
