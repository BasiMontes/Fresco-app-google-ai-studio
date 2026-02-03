
import React, { useState, useRef } from 'react';
import { X, Camera, FileText, CheckCircle2, Plus, Minus, Trash2, ChevronDown, AlertCircle, ShoppingBag, ExternalLink, RefreshCw } from 'lucide-react';
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
  const [step, setStep] = useState<'idle' | 'uploading' | 'analyzing' | 'review' | 'error'>('idle');
  const [items, setItems] = useState<any[]>([]);
  const [supermarket, setSupermarket] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetScanner = () => {
    setStep('idle');
    setItems([]);
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const checkAndOpenKeySelector = async (): Promise<boolean> => {
    // Si la clave ya está en process.env (por nuestro puente de Vercel), no pedimos nada
    if (process.env.API_KEY) return true;

    const aiStudio = (window as any).aistudio;
    if (aiStudio) {
      const hasKey = await aiStudio.hasSelectedApiKey();
      if (!hasKey) {
        await aiStudio.openSelectKey();
        return true;
      }
      return true;
    }
    return true; 
  };

  const handleStartScan = async () => {
    const ready = await checkAndOpenKeySelector();
    if (ready) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStep('uploading');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setStep('analyzing');
        const base64Data = (reader.result as string).split(',')[1];
        const data = await extractItemsFromTicket(base64Data, file.type);
        
        setSupermarket(data.supermarket || 'Ticket de Compra');
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
        setStep('review');
      } catch (err: any) {
        console.error("Scanner Error Details:", err);
        if (err.message === "MISSING_API_KEY") {
            setErrorMessage("No detectamos tu VITE_API_KEY. Si estás en Vercel, asegúrate de que el nombre sea exacto y hayas redeplegado.");
        } else {
            setErrorMessage("No hemos podido procesar la imagen. Intenta con una foto más clara.");
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
    } else {
        window.location.reload(); // En Vercel, refrescar para intentar pillar la variable de nuevo
    }
    resetScanner();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[5000] bg-[#0F4E0E] flex flex-col animate-fade-in overflow-hidden">
        <div className="p-6 flex items-center justify-between border-b border-white/5 bg-black/10 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-3">
             <Logo variant="inverted" iconOnly className="scale-75" />
             <h2 className="text-white font-black text-lg leading-none">Fresco Vision</h2>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 text-white rounded-2xl hover:bg-white/10 active:scale-90 transition-all"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar">
          {step === 'idle' && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-slide-up max-w-sm mx-auto">
              <div className="w-24 h-24 bg-white/10 rounded-[2.5rem] flex items-center justify-center shadow-2xl">
                 <Camera className="w-10 h-10 text-teal-400" />
              </div>
              <div className="space-y-4">
                <h3 className="text-3xl font-black text-white">Escanear Ticket</h3>
                <p className="text-teal-100/60 font-medium text-sm leading-relaxed px-4">Detectaremos tus productos automáticamente con IA.</p>
              </div>
              <button 
                onClick={handleStartScan}
                className="w-full py-5 bg-white text-[#0F4E0E] rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl active:scale-95 transition-all"
              >
                HACER FOTO / SUBIR
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
          )}

          {(step === 'uploading' || step === 'analyzing') && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-12 animate-fade-in">
              <div className="relative">
                 <div className="w-40 h-40 border-4 border-teal-500/10 border-t-orange-500 rounded-full animate-spin" />
                 <FileText className="absolute inset-0 m-auto w-12 h-12 text-white animate-pulse" />
              </div>
              <div className="w-full max-w-xs space-y-4">
                <h3 className="text-2xl font-black text-white">Procesando...</h3>
                <p className="text-teal-400 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse italic">Analizando imagen y extrayendo datos</p>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-10 animate-slide-up max-w-xs mx-auto">
              <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center bg-red-500/20 border border-red-500/20">
                 <AlertCircle className="w-10 h-10 text-red-400" />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-black text-white leading-none">Error de Configuración</h3>
                <p className="text-teal-100/60 font-medium text-sm leading-relaxed">{errorMessage}</p>
                <div className="bg-black/20 p-4 rounded-xl text-left border border-white/5">
                    <p className="text-[9px] text-teal-400 font-black uppercase tracking-widest mb-2 underline">Checklist para Vercel:</p>
                    <ul className="text-[10px] text-teal-100/60 space-y-1 font-bold">
                        <li>• Variable: <span className="text-orange-400">VITE_API_KEY</span></li>
                        <li>• Valor: Tu clave de Google AI Studio</li>
                        <li>• Entorno: Production / Preview</li>
                    </ul>
                </div>
              </div>
              <div className="w-full space-y-3">
                <button onClick={handleRetryKey} className="w-full py-5 bg-orange-500 text-white rounded-[1.8rem] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">REINTENTAR / ACTUALIZAR</button>
                <button onClick={resetScanner} className="w-full py-4 text-teal-300 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                    <RefreshCw className="w-3 h-3" /> CANCELAR
                </button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-6 pb-40 max-w-2xl mx-auto animate-slide-up">
              <div className="px-2">
                <p className="text-orange-400 text-[10px] font-black uppercase tracking-widest mb-1">{supermarket}</p>
                <h3 className="text-white font-black text-3xl">Revisar Productos</h3>
              </div>
              
              <div className="grid gap-3">
                {items.map((item) => (
                    <div key={item.tempId} className="bg-white rounded-[2rem] p-5 shadow-2xl flex flex-col gap-4 border border-white/5 relative group">
                      <button onClick={() => handleDeleteItem(item.tempId)} className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                      <div className="flex-1">
                        <label className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-1 ml-1 block">Producto</label>
                        <input className="w-full h-12 bg-gray-50 rounded-xl px-4 font-black text-[15px] text-[#0F4E0E] outline-none border-2 border-transparent focus:border-teal-500/10 transition-all capitalize" value={item.name} onChange={(e) => handleUpdateItem(item.tempId, { name: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-1 ml-1 block">Categoría</label>
                            <select className="w-full h-12 bg-gray-50 rounded-xl px-3 font-bold text-[10px] text-[#0F4E0E] outline-none" value={item.category} onChange={(e) => handleUpdateItem(item.tempId, { category: e.target.value })}>
                                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center bg-teal-50 rounded-xl px-2 h-12 border border-teal-100/50">
                            <button onClick={() => handleUpdateItem(item.tempId, { quantity: Math.max(0.1, item.quantity - 1) })} className="p-1 text-teal-600"><Minus className="w-3.5 h-3.5" /></button>
                            <input type="number" step="0.001" className="flex-1 bg-transparent text-[#0F4E0E] font-black text-center outline-none text-xs" value={item.quantity} onChange={(e) => handleUpdateItem(item.tempId, { quantity: parseFloat(e.target.value) || 0 })} />
                            <button onClick={() => handleUpdateItem(item.tempId, { quantity: item.quantity + 1 })} className="p-1 text-teal-600"><Plus className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {step === 'review' && (
          <div className="p-8 bg-gradient-to-t from-[#0F4E0E] via-[#0F4E0E] to-transparent flex-shrink-0 flex justify-center">
            <button onClick={handleSave} className="w-full max-w-lg py-5 bg-orange-500 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3">
              <CheckCircle2 className="w-6 h-6" /> CONFIRMAR Y GUARDAR ({items.length})
            </button>
          </div>
        )}
      </div>
    </ModalPortal>
  );
};
