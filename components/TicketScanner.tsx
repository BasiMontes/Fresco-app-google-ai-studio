
import React, { useState, useRef } from 'react';
import { X, Camera, FileText, Loader2, CheckCircle2, Plus, Minus, Trash2, ChevronDown, AlertCircle, ShoppingBag, Edit3, Save, ExternalLink } from 'lucide-react';
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
    { id: 'frozen', label: 'Congelados', emoji: '❄️' },
    { id: 'other', label: 'Otros', emoji: '📦' },
];

export const TicketScanner: React.FC<TicketScannerProps> = ({ onClose, onAddItems }) => {
  const [step, setStep] = useState<'idle' | 'uploading' | 'analyzing' | 'syncing' | 'review' | 'error'>('idle');
  const [items, setItems] = useState<any[]>([]);
  const [supermarket, setSupermarket] = useState('');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verificar API Key antes de nada
    const hasKey = (window as any).aistudio ? await (window as any).aistudio.hasSelectedApiKey() : true;
    if (!hasKey) {
        await (window as any).aistudio.openSelectKey();
        // Procedemos asumiendo que el usuario seleccionó una clave o la pondrá ahora
    }

    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        setErrorMessage("Solo se admiten imágenes JPG, PNG o WebP.");
        setStep('error');
        return;
    }

    setStep('uploading');
    setProgress(15);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setProgress(40);
        setStep('analyzing');
        const base64Data = (reader.result as string).split(',')[1];
        const data = await extractItemsFromTicket(base64Data, file.type);
        
        setProgress(85);
        setStep('syncing');
        setSupermarket(data.supermarket || 'Supermercado');
        
        const processed = (data.items || []).map((i: any, idx: number) => ({
            ...i,
            tempId: `item-${Date.now()}-${idx}`,
            quantity: Number(i.quantity) || 1,
            unit: i.unit || 'uds',
            category: i.category || 'other',
            added_at: format(new Date(), 'yyyy-MM-dd'),
            expires_at: format(addDays(new Date(), i.estimated_expiry_days || 7), 'yyyy-MM-dd')
        }));
        
        setItems(processed);
        setProgress(100);
        setTimeout(() => setStep('review'), 400);
      } catch (err: any) {
        console.error("Scanner Error:", err);
        if (err.message === "MISSING_API_KEY") {
            setErrorMessage("Debes seleccionar una API Key válida de un proyecto con facturación para usar el escáner Pro.");
        } else {
            setErrorMessage("No hemos podido leer el ticket. Prueba con otra foto más nítida.");
        }
        setStep('error');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateItem = (tempId: string, updates: any) => {
    setItems(prev => prev.map(item => item.tempId === tempId ? { ...item, ...updates } : item));
  };

  const handleDeleteItem = (tempId: string) => {
    setItems(prev => prev.filter(item => item.tempId !== tempId));
  };

  const handleSave = async () => {
    if (items.length === 0) return;
    const finalItems: PantryItem[] = items.map(item => ({
      id: `scr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: item.name.trim(),
      quantity: Number(item.quantity),
      unit: item.unit,
      category: item.category,
      added_at: new Date().toISOString(),
      expires_at: item.expires_at ? new Date(item.expires_at).toISOString() : undefined
    }));
    await onAddItems(finalItems);
    onClose();
  };

  const handleRetryKey = async () => {
    if ((window as any).aistudio) {
        await (window as any).aistudio.openSelectKey();
        setStep('idle');
        setErrorMessage('');
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[5000] bg-[#0F4E0E] flex flex-col animate-fade-in overflow-hidden">
        <div className="p-6 flex items-center justify-between border-b border-white/5 bg-black/10 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-3">
             <Logo variant="inverted" iconOnly className="scale-75" />
             <div>
                <h2 className="text-white font-black text-lg leading-none">Fresco Vision</h2>
                <p className="text-teal-400 text-[9px] font-black uppercase tracking-widest mt-1">IA SCANNER • PRO</p>
             </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 text-white rounded-2xl hover:bg-white/10 transition-all active:scale-90"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar">
          {step === 'idle' && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-slide-up max-w-sm mx-auto">
              <div className="w-28 h-28 bg-white/10 rounded-[3rem] flex items-center justify-center shadow-2xl relative">
                 <Camera className="w-12 h-12 text-teal-400" />
                 <div className="absolute -bottom-2 -right-2 bg-orange-500 p-2.5 rounded-full border-4 border-[#0F4E0E]"><Plus className="w-5 h-5 text-white stroke-[3px]" /></div>
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-black text-white leading-none">Actualiza tu cocina</h3>
                <p className="text-teal-100/60 font-medium text-sm leading-relaxed">Sube una foto de tu ticket. Nuestra IA detectará productos, pesos y calculará su caducidad automáticamente.</p>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-6 bg-white text-[#0F4E0E] rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4"
              >
                SUBIR TICKET
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              <p className="text-teal-400 text-[9px] font-bold uppercase tracking-widest">Optimizado para tickets españoles</p>
            </div>
          )}

          {(step === 'uploading' || step === 'analyzing' || step === 'syncing') && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-12 animate-fade-in">
              <div className="relative">
                 <div className="w-48 h-48 border-4 border-teal-500/10 rounded-full flex items-center justify-center">
                    <div className="w-36 h-36 border-4 border-teal-500/10 border-t-orange-500 rounded-full animate-spin" />
                 </div>
                 <FileText className="absolute inset-0 m-auto w-16 h-16 text-white animate-pulse" />
              </div>
              <div className="w-full max-w-xs space-y-6">
                <h3 className="text-3xl font-black text-white">
                    {step === 'uploading' ? 'Subiendo...' : 'Extrayendo productos...'}
                </h3>
                <div className="h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5">
                    <div className="h-full bg-orange-500 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-teal-400 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Analizando con Gemini 3 Pro</p>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-10 animate-slide-up max-w-xs mx-auto">
              <div className="w-24 h-24 rounded-[2.5rem] flex items-center justify-center bg-red-500/20 border-2 border-red-500/20">
                 <AlertCircle className="w-12 h-12 text-red-400" />
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-black text-white leading-none">Error de configuración</h3>
                <p className="text-teal-100/60 font-medium text-sm leading-relaxed">{errorMessage}</p>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="flex items-center justify-center gap-2 text-orange-400 font-bold text-xs hover:underline">
                    Ver documentación de facturación <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="w-full space-y-3">
                <button 
                    onClick={handleRetryKey}
                    className="w-full py-5 bg-orange-500 text-white rounded-[1.8rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
                >
                    SELECCIONAR API KEY
                </button>
                <button onClick={() => { setStep('idle'); setErrorMessage(''); }} className="w-full py-4 text-teal-300 font-bold text-[10px] uppercase tracking-widest hover:text-white">
                    CANCELAR
                </button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-8 pb-40 max-w-2xl mx-auto animate-slide-up">
              <header className="flex flex-col md:flex-row justify-between items-end gap-4 px-2">
                <div>
                  <p className="text-orange-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2 bg-orange-500/10 w-fit px-3 py-1 rounded-lg border border-orange-500/20">{supermarket}</p>
                  <h3 className="text-white font-black text-3xl tracking-tight leading-none">Revisar Compra</h3>
                  <p className="text-teal-200/40 text-sm mt-2">Valida los productos detectados antes de guardar.</p>
                </div>
                <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-3">
                    <ShoppingBag className="w-4 h-4 text-teal-400" />
                    <span className="text-white font-black text-sm">{items.length} items</span>
                </div>
              </header>
              
              <div className="grid gap-4">
                {items.map((item, idx) => (
                    <div key={item.tempId} className="bg-white rounded-[2.5rem] p-6 shadow-2xl flex flex-col gap-5 border border-white/5 group relative">
                      <button onClick={() => handleDeleteItem(item.tempId)} className="absolute -top-2 -right-2 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 z-10"><Trash2 className="w-5 h-5" /></button>
                      <div className="flex flex-col md:flex-row gap-5">
                          <div className="flex-1">
                            <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1.5 ml-1 block">Producto</label>
                            <input className="w-full h-14 bg-gray-50 border-2 border-transparent focus:border-teal-500/10 rounded-2xl px-5 font-black text-[16px] text-[#0F4E0E] outline-none transition-all capitalize" value={item.name} onChange={(e) => handleUpdateItem(item.tempId, { name: e.target.value })} />
                          </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                          <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1.5 ml-1 block">Categoría</label>
                          <select className="w-full h-14 bg-gray-50 border-2 border-transparent rounded-2xl px-5 font-bold text-xs text-[#0F4E0E] outline-none appearance-none cursor-pointer" value={item.category} onChange={(e) => handleUpdateItem(item.tempId, { category: e.target.value })}>
                            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label.toUpperCase()}</option>)}
                          </select>
                          <ChevronDown className="absolute right-4 top-[65%] -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 md:col-span-2">
                            <div>
                                <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1.5 ml-1 block">Cantidad</label>
                                <div className="flex items-center bg-teal-50 rounded-2xl px-2 h-14 border border-teal-100/50">
                                   <button onClick={() => handleUpdateItem(item.tempId, { quantity: Math.max(0.1, item.quantity - 1) })} className="p-2 text-teal-600 hover:bg-white rounded-xl transition-all"><Minus className="w-4 h-4" /></button>
                                   <input type="number" step="0.001" className="flex-1 bg-transparent text-[#0F4E0E] font-black text-center outline-none text-sm min-w-0" value={item.quantity} onChange={(e) => handleUpdateItem(item.tempId, { quantity: parseFloat(e.target.value) || 0 })} />
                                   <button onClick={() => handleUpdateItem(item.tempId, { quantity: item.quantity + 1 })} className="p-2 text-teal-600 hover:bg-white rounded-xl transition-all"><Plus className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1.5 ml-1 block">Unidad</label>
                                <select className="w-full h-14 bg-gray-50 border-2 border-transparent rounded-2xl px-4 font-black text-[10px] text-[#0F4E0E] uppercase tracking-tighter outline-none appearance-none text-center" value={item.unit} onChange={(e) => handleUpdateItem(item.tempId, { unit: e.target.value })}>
                                    {['uds', 'kg', 'g', 'l', 'ml', 'pack'].map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
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
          <div className="p-8 bg-gradient-to-t from-[#0F4E0E] via-[#0F4E0E] to-transparent flex-shrink-0 flex justify-center z-20">
            <button onClick={handleSave} disabled={items.length === 0} className="w-full max-w-lg py-6 bg-orange-500 text-white rounded-[2.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50">
              <CheckCircle2 className="w-6 h-6 stroke-[3px]" /> CONFIRMAR DESPENSA
            </button>
          </div>
        )}
      </div>
    </ModalPortal>
  );
};
