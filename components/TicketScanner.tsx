
import React, { useState, useRef, useEffect } from 'react';
// Added ChevronDown to the lucide-react import list
import { Camera, X, Check, Loader2, Upload, Sparkles, Plus, Trash2, AlertCircle, CheckCircle2, RefreshCw, CalendarDays, FileText, ChevronDown } from 'lucide-react';
import { extractItemsFromTicket } from '../services/geminiService';
import { PantryItem } from '../types';
import { EXPIRY_DAYS_BY_CATEGORY } from '../constants';

interface TicketScannerProps {
  onClose: () => void;
  onAddItems: (items: PantryItem[]) => void;
}

const CATEGORY_MAP: Record<string, string> = {
    'verduras': 'vegetables', 'hortalizas': 'vegetables', 'vegetales': 'vegetables', 'greens': 'vegetables',
    'frutas': 'fruits', 'fruta': 'fruits', 'citricos': 'fruits',
    'lacteos': 'dairy', 'leche': 'dairy', 'quesos': 'dairy', 'huevos': 'dairy', 'yogures': 'dairy',
    'carne': 'meat', 'pollo': 'meat', 'aves': 'meat', 'embutidos': 'meat', 'cerdo': 'meat', 'vacuno': 'meat',
    'pescado': 'fish', 'marisco': 'fish', 'congelados': 'fish',
    'pasta': 'pasta', 'arroz': 'pasta', 'macarrones': 'pasta', 'espaguetis': 'pasta',
    'legumbres': 'legumes', 'lentejas': 'legumes', 'garbanzos': 'legumes', 'alubias': 'legumes',
    'caldos': 'broths', 'sopas': 'broths', 'cremas': 'broths',
    'panederia': 'bakery', 'pan': 'bakery', 'bolleria': 'bakery',
    'bebidas': 'drinks', 'agua': 'drinks', 'refrescos': 'drinks', 'vino': 'drinks', 'zumo': 'drinks',
    'congelado': 'frozen', 'hielo': 'frozen',
    'despensa': 'pantry', 'conservas': 'pantry', 'salsas': 'pantry', 'aceites': 'pantry',
    'especias': 'spices', 'condimentos': 'spices', 'sal': 'spices',
    'limpieza': 'other', 'hogar': 'other', 'higiene': 'other', 'otros': 'other'
};

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

const sanitizeCategory = (rawCategory: string): string => {
    const lower = rawCategory.toLowerCase().trim();
    if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];
    const found = Object.keys(CATEGORY_MAP).find(key => lower.includes(key));
    return found ? CATEGORY_MAP[found] : 'pantry'; 
};

const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.src = url;
        img.onload = () => {
            URL.revokeObjectURL(url); 
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const MAX_SIZE = 1200; // Un poco más de resolución para leer tickets
            let width = img.width;
            let height = img.height;
            if (width > height && width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
            } else if (height > MAX_SIZE) {
                width *= MAX_SIZE / height;
                height = MAX_SIZE;
            }
            canvas.width = width;
            canvas.height = height;
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            } else {
                reject(new Error("Canvas context failed"));
            }
        };
        img.onerror = reject;
    });
};

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
      const handlePopState = (event: PopStateEvent) => { onClose(); };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, [onClose]);

  const handleManualClose = () => {
      if (window.history.state?.modal === 'ticket-scanner') window.history.back();
      else onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStep('processing');
      setLoading(true);
      try {
          if (file.type === 'application/pdf') {
              const base64 = await fileToBase64(file);
              await processTicket(base64, 'application/pdf');
          } else {
              const compressedBase64 = await compressImage(file);
              await processTicket(compressedBase64, 'image/jpeg');
          }
      } catch (err) {
          console.error("Processing error", err);
          setStep('error');
          setLoading(false);
      }
    }
  };

  const processTicket = async (base64: string, mimeType: string) => {
    const base64Data = base64.split(',')[1];
    try {
        const items = await extractItemsFromTicket(base64Data, mimeType);
        if (items && items.length > 0) {
            const sanitized = items.map((item: any) => ({
                ...item,
                category: sanitizeCategory(String(item.category || '')),
                daysToExpire: EXPIRY_DAYS_BY_CATEGORY[sanitizeCategory(String(item.category || ''))] || 14
            }));
            setDetectedItems(sanitized);
            setStep('review');
        } else {
            setStep('error');
        }
    } catch (e) {
        setStep('error');
    } finally {
        setLoading(false);
    }
  };

  const handleSave = () => {
    const itemsToSave: PantryItem[] = detectedItems.map((item, i) => {
      const days = item.daysToExpire || EXPIRY_DAYS_BY_CATEGORY[item.category] || 30;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);

      return {
        id: `ticket-${Date.now()}-${i}`,
        name: item.name || 'Producto desconocido',
        quantity: parseFloat(item.quantity) || 1,
        unit: item.unit || 'unidad',
        category: item.category || 'other',
        added_at: new Date().toISOString(),
        expires_at: expiryDate.toISOString()
      };
    });
    onAddItems(itemsToSave);
    handleManualClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-[#013b33] flex flex-col animate-fade-in overflow-hidden">
      {/* Header Compacto */}
      <div className="p-5 flex justify-between items-center text-white border-b border-white/5 bg-[#013b33] z-50">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/10">
                <Sparkles className="w-6 h-6" />
            </div>
            <div>
                <h3 className="text-lg font-black leading-none">Fresco Vision</h3>
                <p className="text-[9px] font-black uppercase tracking-widest text-teal-400 mt-1">Escáner Inteligente</p>
            </div>
        </div>
        <button onClick={handleManualClose} className="p-2.5 bg-white/5 rounded-xl hover:bg-white/10 transition-all"><X className="w-5 h-5 text-gray-400" /></button>
      </div>

      <div className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full flex flex-col overflow-y-auto no-scrollbar">
        {step === 'capture' && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 md:space-y-8 animate-slide-up h-full">
            <div className="w-full flex-1 min-h-[300px] rounded-[3rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center p-6 md:p-12 text-center group hover:border-orange-500/40 transition-all cursor-pointer bg-white/5"
                 onClick={() => fileInputRef.current?.click()}>
                <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xl border border-white/5">
                    <Camera className="w-8 h-8 text-teal-200" />
                </div>
                <h4 className="text-white text-2xl md:text-3xl font-black mb-3">Sube tu ticket</h4>
                <p className="text-teal-200/50 font-medium text-base md:text-lg leading-relaxed max-w-xs">Toma una foto clara o sube un PDF de tu compra.</p>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
            </div>
            <div className="flex flex-col gap-3 w-full pb-8">
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-5 bg-orange-500 text-white rounded-[1.8rem] font-black text-base shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                    <Upload className="w-5 h-5" /> Seleccionar Archivo
                </button>
                <div className="flex items-center justify-center gap-4 text-teal-300/40 font-black text-[9px] uppercase tracking-[0.2em]">
                    <span className="flex items-center gap-1.5"><Camera className="w-3 h-3" /> FOTOS</span>
                    <span className="w-1 h-1 bg-white/20 rounded-full" />
                    <span className="flex items-center gap-1.5"><FileText className="w-3 h-3" /> PDFS</span>
                </div>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8">
            <div className="relative">
                <div className="w-32 h-32 border-4 border-teal-500/10 border-t-orange-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-orange-400 animate-pulse" />
                </div>
            </div>
            <div className="text-center space-y-2">
                <h4 className="text-white text-2xl font-black">Analizando...</h4>
                <p className="text-teal-200/40 font-medium text-sm">Traducimos códigos a comida real...</p>
            </div>
          </div>
        )}

        {step === 'error' && (
             <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-slide-up text-center h-full">
                <div className="w-24 h-24 bg-red-500/10 rounded-[2.5rem] flex items-center justify-center mb-4">
                    <AlertCircle className="w-12 h-12 text-red-400" />
                </div>
                <div>
                    <h4 className="text-white text-2xl font-black mb-2">Lectura fallida</h4>
                    <p className="text-teal-200/40 font-medium text-sm max-w-xs mx-auto">No logramos identificar los productos. Asegúrate de que el ticket esté bien iluminado o que el PDF sea legible.</p>
                </div>
                <button 
                    onClick={() => setStep('capture')}
                    className="w-full py-5 bg-white text-teal-900 rounded-[1.8rem] font-black text-base shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                    <RefreshCw className="w-5 h-5" /> Reintentar
                </button>
             </div>
        )}

        {step === 'review' && (
          <div className="space-y-6 animate-slide-up pb-40">
            <div className="bg-orange-500/5 border border-orange-500/10 p-5 rounded-[2rem] flex items-center gap-4">
                <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-400 flex-shrink-0">
                    <AlertCircle className="w-5 h-5" />
                </div>
                <p className="text-orange-200/60 text-[10px] font-bold uppercase tracking-wide leading-relaxed">
                    Hemos traducido los nombres crípticos. Revisa y pulsa guardar.
                </p>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                    <h4 className="text-teal-200/40 font-black uppercase text-[10px] tracking-widest">Encontrados ({detectedItems.length})</h4>
                    <button 
                        onClick={() => setDetectedItems([{ name: 'Nuevo producto', quantity: 1, unit: 'uds', category: 'pantry', daysToExpire: 7 }, ...detectedItems])}
                        className="p-2 bg-white/5 text-white rounded-lg border border-white/5"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="space-y-3">
                    {detectedItems.map((item, i) => (
                        <div key={i} className="p-5 rounded-[1.8rem] flex flex-col gap-4 bg-white shadow-xl animate-fade-in">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <input 
                                        className="bg-transparent font-black text-lg w-full focus:outline-none text-[#013b33] border-b border-gray-100 pb-1" 
                                        value={item.name} 
                                        onChange={(e) => {
                                            const newItems = [...detectedItems];
                                            newItems[i].name = e.target.value;
                                            setDetectedItems(newItems);
                                        }}
                                    />
                                    <div className="relative mt-3 inline-block">
                                        <select 
                                            value={item.category}
                                            onChange={(e) => {
                                                const newItems = [...detectedItems];
                                                const val = String(e.target.value);
                                                newItems[i].category = val;
                                                newItems[i].daysToExpire = EXPIRY_DAYS_BY_CATEGORY[val] || 14;
                                                setDetectedItems(newItems);
                                            }}
                                            className="appearance-none bg-teal-50 text-teal-700 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg pr-8 focus:outline-none cursor-pointer w-full"
                                        >
                                            {CATEGORIES_OPTIONS.map(opt => (
                                                <option key={opt.id} value={opt.id}>{opt.emoji} {opt.label.toUpperCase()}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-teal-700">
                                            <ChevronDown className="h-3 w-3" />
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setDetectedItems(detectedItems.filter((_, idx) => idx !== i))}
                                    className="p-2 text-gray-200 hover:text-red-400 transition-all"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between border border-gray-100">
                                    <span className="text-[9px] font-black uppercase text-gray-300 tracking-wider">CANT</span>
                                    <input 
                                        type="number" 
                                        step="0.1"
                                        className="bg-transparent text-right font-black text-[#013b33] w-12 focus:outline-none"
                                        value={item.quantity}
                                        onChange={(e) => {
                                            const newItems = [...detectedItems];
                                            newItems[i].quantity = e.target.value;
                                            setDetectedItems(newItems);
                                        }}
                                    />
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between border border-gray-100">
                                    <span className="text-[9px] font-black uppercase text-gray-300 tracking-wider">UNI</span>
                                    <input 
                                        className="bg-transparent text-right font-black text-[#013b33] w-12 focus:outline-none uppercase"
                                        value={item.unit}
                                        onChange={(e) => {
                                            const newItems = [...detectedItems];
                                            newItems[i].unit = e.target.value;
                                            setDetectedItems(newItems);
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="bg-orange-50 rounded-xl p-3 flex items-center justify-between border border-orange-100/50">
                                <div className="flex items-center gap-2 text-orange-500">
                                    <CalendarDays className="w-3.5 h-3.5" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">CADUCIDAD ESTIMADA</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <input 
                                        type="number" 
                                        min="1"
                                        className="bg-transparent text-right font-black text-orange-700 w-10 focus:outline-none"
                                        value={item.daysToExpire}
                                        onChange={(e) => {
                                            const newItems = [...detectedItems];
                                            newItems[i].daysToExpire = parseInt(e.target.value) || 1;
                                            setDetectedItems(newItems);
                                        }}
                                    />
                                    <span className="text-[9px] font-black text-orange-300">DÍAS</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        )}
      </div>

      {step === 'review' && (
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#013b33] via-[#013b33] to-transparent z-50">
              <div className="flex gap-4 max-w-2xl mx-auto">
                  <button 
                      onClick={() => setStep('capture')}
                      className="flex-1 py-5 bg-white/10 text-white rounded-[1.6rem] font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all border border-white/5"
                  >
                      Repetir
                  </button>
                  <button 
                      onClick={handleSave}
                      className="flex-[2] py-5 bg-orange-500 text-white rounded-[1.6rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                      <CheckCircle2 className="w-5 h-5 stroke-[3px]" /> Guardar Todo
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};
