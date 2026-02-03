
import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, FileText, Loader2, CheckCircle2, RefreshCw, Plus, Minus, Trash2, ChevronDown, AlertCircle, Key, ExternalLink, Info, CreditCard, ShieldAlert } from 'lucide-react';
import { extractItemsFromTicket } from '../services/geminiService';
import { PantryItem } from '../types';
import { format, addDays } from 'date-fns';
import { ModalPortal } from './ModalPortal';
import { Logo } from './Logo';

interface TicketScannerProps {
  onClose: () => void;
  onAddItems: (items: PantryItem[]) => void;
}

const CATEGORIES = [
    { id: 'vegetables', label: 'Verduras', emoji: '🥦' },
    { id: 'fruits', label: 'Frutas', emoji: '🍎' },
    { id: 'dairy', label: 'Lácteos', emoji: '🧀' },
    { id: 'meat', label: 'Carne', emoji: '🥩' },
    { id: 'fish', label: 'Pescado', emoji: '🐟' },
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
  const [supermarket, setSupermarket] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorType, setErrorType] = useState<'general' | 'auth' | 'billing' | 'leaked'>('general');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Comprobación inicial de API Key al abrir el escáner
  useEffect(() => {
    const checkKey = async () => {
        const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
        if (!hasKey && !process.env.API_KEY) {
            setErrorType('auth');
            setErrorMessage("Necesitas vincular una llave de Google AI Studio para activar el escaneo inteligente.");
            setStep('error');
        }
    };
    checkKey();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStep('processing');
    setProgress(20);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setProgress(40);
        const base64Data = (reader.result as string).split(',')[1];
        const data = await extractItemsFromTicket(base64Data, file.type);
        
        setProgress(80);
        setSupermarket(data.supermarket || 'Supermercado');
        const processed = data.items.map((i: any, idx: number) => ({
            ...i,
            tempId: `item-${Date.now()}-${idx}`,
            added_at: format(new Date(), 'yyyy-MM-dd'),
            expires_at: format(addDays(new Date(), i.estimated_expiry_days || 14), 'yyyy-MM-dd')
        }));
        
        setItems(processed);
        setProgress(100);
        setTimeout(() => setStep('review'), 500);
      } catch (err: any) {
        if (err.message === "MISSING_API_KEY") {
            setErrorType('auth');
            setErrorMessage("La llave de acceso ha caducado o no está configurada. Por favor, vincúlala de nuevo.");
        } else if (err.message?.includes("403") || err.message?.includes("API_KEY_INVALID")) {
            setErrorType('auth');
            setErrorMessage("La llave actual no es válida. Prueba a seleccionar una diferente.");
        } else {
            setErrorType('general');
            setErrorMessage(err.message || "Error al leer el ticket. Asegúrate de que la imagen sea nítida.");
        }
        setStep('error');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenSelector = async () => {
    if ((window as any).aistudio) {
        await (window as any).aistudio.openSelectKey();
        // Asumimos éxito inmediato y permitimos reintentar
        setStep('idle');
        setErrorType('general');
        setErrorMessage('');
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
        const finalItems: PantryItem[] = items.map(item => ({
          id: `scr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: item.name,
          quantity: Number(item.quantity),
          unit: item.unit,
          category: item.category,
          added_at: new Date().toISOString(),
          expires_at: item.expires_at ? new Date(item.expires_at).toISOString() : undefined
        }));
        await onAddItems(finalItems);
        onClose();
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[5000] bg-[#0F4E0E] flex flex-col animate-fade-in overflow-hidden safe-pb">
        <div className="p-6 flex items-center justify-between border-b border-white/5 bg-black/10 backdrop-blur-md">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-white/10 rounded-xl">
                <Logo variant="inverted" iconOnly className="scale-75" />
             </div>
             <div>
                <h2 className="text-white font-black text-lg leading-none">Fresco Vision</h2>
                <p className="text-teal-400 text-[9px] font-black uppercase tracking-widest mt-1">IA de Reconocimiento</p>
             </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 text-white rounded-2xl hover:bg-white/10 transition-all"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
          {step === 'idle' && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-slide-up">
              <div className="w-24 h-24 bg-white/10 rounded-[2.5rem] flex items-center justify-center shadow-2xl relative">
                 <Camera className="w-10 h-10 text-teal-400" />
                 <div className="absolute -bottom-2 -right-2 bg-orange-500 p-2 rounded-full border-4 border-[#0F4E0E]"><Plus className="w-4 h-4 text-white" /></div>
              </div>
              <div className="max-w-xs">
                <h3 className="text-3xl font-black text-white leading-tight">Digitaliza tu compra</h3>
                <p className="text-teal-100/60 font-medium mt-3 text-sm">Escanea tu ticket y deja que la IA organice tu despensa.</p>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-sm py-6 bg-white text-[#0F4E0E] rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                HACER FOTO O SUBIR
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
          )}

          {step === 'processing' && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-10 animate-fade-in">
              <div className="relative">
                 <div className="w-40 h-40 border-4 border-teal-500/20 rounded-full flex items-center justify-center">
                    <div className="w-32 h-32 border-4 border-teal-500/10 border-t-orange-500 rounded-full animate-spin" />
                 </div>
                 <FileText className="absolute inset-0 m-auto w-12 h-12 text-white animate-pulse" />
              </div>
              <div className="w-full max-w-xs space-y-4">
                <h3 className="text-3xl font-black text-white">Extrayendo datos...</h3>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-teal-400 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Normalizando productos</p>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-slide-up">
              <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center ${errorType === 'auth' ? 'bg-orange-500/20' : 'bg-red-500/20'}`}>
                 {errorType === 'auth' ? <Key className="w-12 h-12 text-orange-400" /> : <AlertCircle className="w-12 h-12 text-red-500" />}
              </div>
              <div className="max-w-xs px-6">
                <h3 className="text-3xl font-black text-white leading-tight">
                    {errorType === 'auth' ? 'Llave requerida' : 'Lectura fallida'}
                </h3>
                <p className="text-teal-100/60 font-medium mt-3 text-sm">{errorMessage}</p>
              </div>

              <div className="w-full max-w-sm flex flex-col gap-3 px-6">
                {errorType === 'auth' ? (
                    <button 
                        onClick={handleOpenSelector}
                        className="w-full py-6 bg-orange-500 text-white rounded-[1.8rem] font-black text-sm uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        VINCULAR LLAVE
                    </button>
                ) : (
                    <button onClick={() => setStep('idle')} className="w-full py-6 bg-white text-[#0F4E0E] rounded-[1.8rem] font-black text-sm uppercase tracking-widest active:scale-95 transition-all">
                        REINTENTAR
                    </button>
                )}
                
                {errorType === 'auth' && (
                    <a 
                      href="https://ai.google.dev/gemini-api/docs/billing" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 text-teal-300 text-[10px] font-bold uppercase tracking-widest hover:text-white"
                    >
                        <Info className="w-3 h-3" /> Ver documentación de facturación
                    </a>
                )}
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-6 pb-40 animate-slide-up">
              <div className="flex justify-between items-end px-2">
                <div>
                  <p className="text-orange-400 text-[9px] font-black uppercase tracking-widest mb-1">{supermarket}</p>
                  <h3 className="text-white font-black text-2xl tracking-tight">Revisar Stock</h3>
                </div>
                <span className="bg-white/10 text-teal-300 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border border-white/5">{items.length} items</span>
              </div>
              
              <div className="grid gap-3">
                {items.map((item, idx) => (
                  <div key={item.tempId} className="bg-white rounded-[2rem] p-5 shadow-2xl flex flex-col gap-4 border border-white/5 animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 block">Producto Detectado</label>
                        <input 
                          className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-black text-lg text-[#0F4E0E] outline-none capitalize"
                          value={item.name}
                          onChange={(e) => setItems(items.map(i => i.tempId === item.tempId ? {...i, name: e.target.value} : i))}
                        />
                      </div>
                      <button 
                        onClick={() => setItems(items.filter(i => i.tempId !== item.tempId))}
                        className="mt-6 p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 block">Categoría</label>
                        <select 
                          className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-xs text-[#0F4E0E] outline-none appearance-none"
                          value={item.category}
                          onChange={(e) => setItems(items.map(i => i.tempId === item.tempId ? {...i, category: e.target.value} : i))}
                        >
                          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label.toUpperCase()}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-[65%] -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 block">Cantidad</label>
                        <div className="flex items-center bg-[#0F4E0E] rounded-xl px-2 py-2 h-[48px]">
                           <button onClick={() => setItems(items.map(i => i.tempId === item.tempId ? {...i, quantity: Math.max(0, i.quantity - 0.5)} : i))} className="p-1 text-white/50 hover:text-white"><Minus className="w-4 h-4" /></button>
                           <input type="number" className="flex-1 bg-transparent text-white font-black text-center outline-none text-xs" value={item.quantity} onChange={(e) => setItems(items.map(i => i.tempId === item.tempId ? {...i, quantity: parseFloat(e.target.value) || 0} : i))} />
                           <button onClick={() => setItems(items.map(i => i.tempId === item.tempId ? {...i, quantity: i.quantity + 0.5} : i))} className="p-1 text-white/50 hover:text-white"><Plus className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {step === 'review' && (
          <div className="p-8 bg-gradient-to-t from-[#0F4E0E] via-[#0F4E0E] to-transparent sticky bottom-0 flex justify-center">
            <button 
              onClick={handleSave}
              disabled={isSaving || items.length === 0}
              className="w-full max-w-md py-6 bg-orange-500 text-white rounded-[2.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <><CheckCircle2 className="w-6 h-6" /> INYECTAR EN DESPENSA</>}
            </button>
          </div>
        )}
      </div>
    </ModalPortal>
  );
};
