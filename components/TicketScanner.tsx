import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, FileText, CheckCircle2, Plus, Minus, Trash2, ChevronDown, AlertCircle, ShoppingBag, ExternalLink, RefreshCw, Loader2, Sparkles, ShoppingCart, Check } from 'lucide-react';
import { extractItemsFromTicket } from '../services/geminiService';
import { PantryItem } from '../types';
import { format, addDays } from 'date-fns';
import { ModalPortal } from './ModalPortal';
import { Logo } from './Logo';

interface TicketScannerProps {
  onClose: () => void;
  onAddItems: (items: PantryItem[]) => void;
}

const LOADING_MESSAGES = [
    "Activando Visión Fresco...",
    "Escaneando ticket...",
    "Normalizando productos...",
    "Casi listo..."
];

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
    { id: 'frozen', label: 'Congelados', emoji: '❄️' },
    { id: 'other', label: 'Otros', emoji: '📦' },
];

export const TicketScanner: React.FC<TicketScannerProps> = ({ onClose, onAddItems }) => {
  const [step, setStep] = useState<'idle' | 'uploading' | 'analyzing' | 'review' | 'error'>('idle');
  const [items, setItems] = useState<any[]>([]);
  const [supermarket, setSupermarket] = useState('');
  const [confidence, setConfidence] = useState(90);
  const [errorMessage, setErrorMessage] = useState('');
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: number;
    if (step === 'analyzing') {
        interval = window.setInterval(() => {
            setLoadingMessageIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
        }, 2500);
    }
    return () => clearInterval(interval);
  }, [step]);

  const handleStartScan = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio) {
      const hasKey = await aiStudio.hasSelectedApiKey();
      if (!hasKey) {
        await aiStudio.openSelectKey();
      }
    }
    setTimeout(() => fileInputRef.current?.click(), 200);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewUrl(URL.createObjectURL(file));
    setStep('uploading');
    
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setStep('analyzing');
        const base64Data = (reader.result as string).split(',')[1];
        const data = await extractItemsFromTicket(base64Data, file.type);
        
        setSupermarket(data.supermarket || 'Ticket de Compra');
        setConfidence(data.confidence || 95);
        
        const processed = (data.items || []).map((i: any, idx: number) => ({
            ...i,
            tempId: `item-${Date.now()}-${idx}`,
            quantity: Number(i.quantity) || 1,
            unit: i.unit || 'ud',
            category: i.category || 'other',
            added_at: new Date().toISOString(),
            expires_at: format(addDays(new Date(), i.estimated_expiry_days || 7), 'yyyy-MM-dd')
        }));
        
        setItems(processed);
        setStep('review');
      } catch (err: any) {
        console.error("Scanner Error:", err);
        if (err.message === "RESELECT_KEY") {
            const aiStudio = (window as any).aistudio;
            if (aiStudio) await aiStudio.openSelectKey();
            setErrorMessage("Sesión de IA expirada. Selecciona tu clave de nuevo en el diálogo y reintenta.");
        } else {
            setErrorMessage("No hemos podido leer este ticket. Prueba con otra foto más clara.");
        }
        setStep('error');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateItem = (tempId: string, updates: any) => {
    setItems(prev => prev.map(item => item.tempId === tempId ? { ...item, ...updates } : item));
  };

  const handleAddManualItem = () => {
      const newItem = {
          tempId: `manual-${Date.now()}`,
          name: '',
          quantity: 1,
          unit: 'ud',
          category: 'other',
          added_at: new Date().toISOString(),
          expires_at: format(addDays(new Date(), 7), 'yyyy-MM-dd')
      };
      setItems(prev => [...prev, newItem]);
  };

  const handleSave = async () => {
    const finalItems: PantryItem[] = items
      .filter(i => i.name.trim() !== '')
      .map(item => ({
        id: `scr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: item.name.trim(),
        quantity: Number(item.quantity),
        unit: item.unit,
        category: item.category,
        added_at: item.added_at,
        expires_at: item.expires_at ? new Date(item.expires_at).toISOString() : undefined
      }));
    await onAddItems(finalItems);
    onClose();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[5000] bg-[#0F4E0E] flex flex-col animate-fade-in overflow-hidden">
        <div className="p-6 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-3">
             <Logo variant="inverted" iconOnly className="scale-75" />
             <h2 className="text-white font-black text-lg tracking-tight">Fresco Vision Pro</h2>
          </div>
          <button onClick={onClose} className="p-3 bg-white/10 text-white rounded-full hover:bg-white/20 active:scale-90 transition-all"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 no-scrollbar">
          {step === 'idle' && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-10 animate-slide-up max-w-sm mx-auto">
              <div className="w-28 h-28 bg-white/10 rounded-[3rem] flex items-center justify-center shadow-2xl relative border border-white/10">
                 <Camera className="w-12 h-12 text-orange-400" />
                 <div className="absolute -top-2 -right-2 w-10 h-10 bg-teal-500 rounded-2xl flex items-center justify-center animate-pulse shadow-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                 </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-4xl font-black text-white leading-none">Visión Inteligente</h3>
                <p className="text-teal-100/50 font-medium text-base px-6">Sube una foto de tu ticket. Nuestra IA detectará los productos y sus caducidades por ti.</p>
              </div>
              <button 
                onClick={handleStartScan}
                className="w-full py-6 bg-white text-[#0F4E0E] rounded-[2.5rem] font-black text-xs uppercase tracking-[0.25em] shadow-2xl active:scale-95 transition-all"
              >
                HACER FOTO / SUBIR
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
          )}

          {(step === 'uploading' || step === 'analyzing') && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-12 animate-fade-in">
              <div className="relative">
                 <div className="w-48 h-48 border-[6px] border-white/5 border-t-orange-500 rounded-full animate-spin" />
                 {previewUrl ? (
                     <img src={previewUrl} className="absolute inset-0 m-auto w-32 h-32 rounded-3xl object-cover opacity-40 blur-[1px]" />
                 ) : (
                     <FileText className="absolute inset-0 m-auto w-16 h-16 text-white animate-pulse" />
                 )}
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-black text-white">{LOADING_MESSAGES[loadingMessageIdx]}</h3>
                <p className="text-teal-400 text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Analizando píxeles...</p>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-10 animate-slide-up max-w-xs mx-auto">
              <div className="w-24 h-24 rounded-[2.5rem] flex items-center justify-center bg-red-500/10 border border-red-500/20">
                 <AlertCircle className="w-12 h-12 text-red-500" />
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-black text-white">Vaya... algo falló</h3>
                <p className="text-teal-100/60 font-medium text-sm px-4">{errorMessage}</p>
              </div>
              <button onClick={() => setStep('idle')} className="w-full py-6 bg-orange-500 text-white rounded-[2.2rem] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">REINTENTAR</button>
            </div>
          )}

          {step === 'review' && (
            <div className="max-w-3xl mx-auto space-y-8 pb-40 animate-slide-up">
              {/* Resumen Superior */}
              <div className="flex flex-col items-center gap-6">
                  {previewUrl && (
                      <div className="w-full h-48 rounded-[2.5rem] overflow-hidden border-4 border-white/5 shadow-2xl relative group">
                          <img src={previewUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
                              <div className="flex justify-between items-center w-full">
                                  <div className="bg-green-500/20 backdrop-blur-md px-4 py-2 rounded-xl border border-green-500/30 flex items-center gap-2">
                                      <Check className="w-4 h-4 text-green-400" />
                                      <span className="text-green-400 font-black text-[10px] uppercase">Análisis completado</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}
                  
                  <div className="flex items-center gap-8 w-full px-4">
                      <div className="flex items-center gap-3">
                          <ShoppingCart className="w-6 h-6 text-orange-400" />
                          <h3 className="text-white font-black text-2xl">Productos <span className="text-teal-400">{items.length}</span></h3>
                      </div>
                      <div className="ml-auto flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                          <CheckCircle2 className="w-4 h-4 text-teal-400" />
                          <span className="text-teal-100/60 text-[10px] font-black uppercase tracking-widest">{confidence}% confianza</span>
                      </div>
                  </div>
              </div>

              {/* Lista de Items Detectados */}
              <div className="grid gap-3">
                {items.map((item) => {
                    const categoryObj = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[CATEGORIES.length - 1];
                    return (
                        <div key={item.tempId} className="bg-white/10 backdrop-blur-md rounded-[2.2rem] p-5 shadow-xl flex flex-col md:flex-row gap-5 border border-white/5 relative group animate-fade-in">
                          <button onClick={() => setItems(prev => prev.filter(i => i.tempId !== item.tempId))} className="absolute -top-2 -right-2 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center shadow-2xl md:opacity-0 group-hover:opacity-100 transition-all active:scale-90"><Trash2 className="w-5 h-5" /></button>
                          
                          <div className="flex items-center gap-4 flex-1">
                              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-white/5">
                                  {categoryObj.emoji}
                              </div>
                              <div className="flex-1 space-y-1">
                                <input className="w-full bg-transparent font-black text-xl text-white outline-none border-b border-transparent focus:border-orange-500/30 transition-all capitalize" value={item.name} onChange={(e) => handleUpdateItem(item.tempId, { name: e.target.value })} />
                                <div className="relative inline-block">
                                    <select className="bg-white/5 text-teal-400 font-bold text-[10px] uppercase tracking-widest py-1.5 px-3 rounded-lg outline-none appearance-none cursor-pointer pr-8 border border-white/5" value={item.category} onChange={(e) => handleUpdateItem(item.tempId, { category: e.target.value })}>
                                        {CATEGORIES.map(c => <option key={c.id} value={c.id} className="text-black">{c.label}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-teal-400 pointer-events-none" />
                                </div>
                              </div>
                          </div>

                          <div className="flex items-center gap-3">
                              <div className="flex items-center bg-black/20 rounded-2xl px-2 h-14 border border-white/5 w-32">
                                  <button onClick={() => handleUpdateItem(item.tempId, { quantity: Math.max(0.1, item.quantity - 1) })} className="p-2 text-teal-400"><Minus className="w-4 h-4 stroke-[3px]" /></button>
                                  <input type="number" step="0.001" className="flex-1 bg-transparent text-white font-black text-center outline-none text-base" value={item.quantity} onChange={(e) => handleUpdateItem(item.tempId, { quantity: parseFloat(e.target.value) || 0 })} />
                                  <button onClick={() => handleUpdateItem(item.tempId, { quantity: item.quantity + 1 })} className="p-2 text-teal-400"><Plus className="w-4 h-4 stroke-[3px]" /></button>
                              </div>
                              <div className="relative">
                                <select className="h-14 bg-black/20 text-white/40 font-black text-[10px] uppercase rounded-2xl px-4 border border-white/5 appearance-none min-w-[70px]" value={item.unit} onChange={(e) => handleUpdateItem(item.tempId, { unit: e.target.value })}>
                                    {['ud', 'kg', 'l', 'g', 'ml', 'pack'].map(u => <option key={u} value={u} className="text-black">{u}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 pointer-events-none" />
                              </div>
                          </div>
                        </div>
                    );
                })}
              </div>

              {/* Acciones de revisión */}
              <button onClick={handleAddManualItem} className="w-full py-6 border-2 border-dashed border-white/10 rounded-[2.2rem] text-white/30 font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:border-orange-500/50 hover:text-white transition-all">
                  <Plus className="w-5 h-5" /> Añadir producto manualmente
              </button>
            </div>
          )}
        </div>

        {step === 'review' && (
          <div className="p-8 pb-12 bg-gradient-to-t from-[#0F4E0E] via-[#0F4E0E] to-transparent flex-shrink-0 flex justify-center">
            <button onClick={handleSave} className="w-full max-w-lg py-6 bg-orange-500 text-white rounded-[2.5rem] font-black text-sm uppercase tracking-[0.25em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4">
              AÑADIR {items.length} PRODUCTOS A LA DESPENSA
            </button>
          </div>
        )}
      </div>
    </ModalPortal>
  );
};