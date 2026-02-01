
import React, { useState, useRef } from 'react';
import { X, Camera, FileText, Loader2, CheckCircle2, RefreshCw, PenLine, Plus, Minus, Trash2, ChevronDown, AlertCircle } from 'lucide-react';
import { extractItemsFromTicket } from '../services/geminiService';
import { PantryItem } from '../types';
import { EXPIRY_DAYS_BY_CATEGORY } from '../constants';
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

const UNIT_OPTIONS = [
    { id: 'uds', label: 'UNIDADES' },
    { id: 'kg', label: 'KILOGRAMOS' },
    { id: 'l', label: 'LITROS' },
    { id: 'g', label: 'GRAMOS' },
    { id: 'ml', label: 'MILILITROS' }
];

export const TicketScanner: React.FC<TicketScannerProps> = ({ onClose, onAddItems }) => {
  const [step, setStep] = useState<'idle' | 'processing' | 'review' | 'error'>('idle');
  const [items, setItems] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStep('processing');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        const extracted = await extractItemsFromTicket(base64Data, file.type);
        
        const processed = extracted.map((i, idx) => ({
            ...i,
            tempId: `item-${Date.now()}-${idx}`,
            added_at: format(new Date(), 'yyyy-MM-dd'),
            expires_at: format(addDays(new Date(), EXPIRY_DAYS_BY_CATEGORY[i.category] || 14), 'yyyy-MM-dd')
        }));
        
        setItems(processed);
        setStep('review');
      } catch (err) {
        setErrorMessage("Vaya, no hemos podido leer bien ese ticket. ¿Pruebas con otra foto?");
        setStep('error');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
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
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[5000] bg-[#0F4E0E] flex flex-col animate-fade-in overflow-hidden safe-pb">
        {/* Top bar */}
        <div className="p-6 flex items-center justify-between border-b border-white/5 bg-black/10 backdrop-blur-md">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-white/10 rounded-xl">
                <Logo variant="inverted" iconOnly className="scale-75" />
             </div>
             <div>
                <h2 className="text-white font-black text-lg leading-none">Escáner Vision</h2>
                <p className="text-teal-400 text-[9px] font-black uppercase tracking-widest mt-1">Motor de Stock Inteligente</p>
             </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 text-white rounded-2xl hover:bg-white/10 transition-all"><X className="w-6 h-6" /></button>
        </div>

        {/* Main Area */}
        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
          {step === 'idle' && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-slide-up">
              <div className="w-24 h-24 bg-white/10 rounded-[2.5rem] flex items-center justify-center shadow-2xl">
                 <Camera className="w-10 h-10 text-teal-400" />
              </div>
              <div className="max-w-xs">
                <h3 className="text-3xl font-black text-white leading-tight">Digitaliza tu compra</h3>
                <p className="text-teal-100/60 font-medium mt-3 text-sm">Sube una foto de tu ticket de supermercado y actualizaremos tu despensa por ti.</p>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-sm py-6 bg-white text-[#0F4E0E] rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <Camera className="w-5 h-5" /> HACER FOTO O SUBIR
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
            </div>
          )}

          {step === 'processing' && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-10 animate-fade-in">
              <div className="relative">
                 <div className="w-32 h-32 border-4 border-teal-500/20 border-t-orange-500 rounded-full animate-spin" />
                 <FileText className="absolute inset-0 m-auto w-12 h-12 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-3xl font-black text-white">Analizando ticket...</h3>
                <p className="text-teal-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3 animate-pulse">La IA está detectando productos</p>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-slide-up">
              <div className="w-24 h-24 bg-red-500/20 rounded-[2.5rem] flex items-center justify-center">
                 <AlertCircle className="w-12 h-12 text-red-500" />
              </div>
              <div className="max-w-xs">
                <h3 className="text-3xl font-black text-white">¡Vaya! Algo falló</h3>
                <p className="text-teal-100/60 font-medium mt-3 text-sm">{errorMessage}</p>
              </div>
              <button onClick={() => setStep('idle')} className="px-10 py-5 bg-white text-[#0F4E0E] rounded-[1.8rem] font-black text-xs uppercase tracking-widest flex items-center gap-3">
                 <RefreshCw className="w-5 h-5" /> REINTENTAR
              </button>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-6 pb-40 animate-slide-up">
              <div className="flex justify-between items-center px-2">
                <h3 className="text-white font-black text-2xl tracking-tight">Revisar Productos</h3>
                <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">{items.length} Detectados</span>
              </div>
              <div className="grid gap-4">
                {items.map((item, idx) => (
                  <div key={item.tempId} className="bg-white rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 border border-white/5 relative group animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 block">Producto</label>
                        <input 
                          className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-black text-lg text-[#0F4E0E] outline-none capitalize"
                          value={item.name}
                          onChange={(e) => setItems(items.map(i => i.tempId === item.tempId ? {...i, name: e.target.value} : i))}
                        />
                      </div>
                      <button 
                        onClick={() => setItems(items.filter(i => i.tempId !== item.tempId))}
                        className="mt-6 ml-3 p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 block">Categoría</label>
                        <div className="relative">
                          <select 
                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-xs text-[#0F4E0E] outline-none appearance-none cursor-pointer"
                            value={item.category}
                            onChange={(e) => setItems(items.map(i => i.tempId === item.tempId ? {...i, category: e.target.value} : i))}
                          >
                            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label.toUpperCase()}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1 block">Cantidad</label>
                        <div className="flex items-center bg-[#0F4E0E] rounded-xl px-2 py-2 shadow-inner">
                           <button onClick={() => setItems(items.map(i => i.tempId === item.tempId ? {...i, quantity: Math.max(0, i.quantity - 1)} : i))} className="p-1 text-white/50 hover:text-white"><Minus className="w-4 h-4" /></button>
                           <input 
                             type="number" 
                             className="flex-1 bg-transparent text-white font-black text-center outline-none text-sm"
                             value={item.quantity}
                             onChange={(e) => setItems(items.map(i => i.tempId === item.tempId ? {...i, quantity: parseFloat(e.target.value) || 0} : i))}
                           />
                           <button onClick={() => setItems(items.map(i => i.tempId === item.tempId ? {...i, quantity: i.quantity + 1} : i))} className="p-1 text-white/50 hover:text-white"><Plus className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {step === 'review' && (
          <div className="p-8 bg-gradient-to-t from-[#0F4E0E] via-[#0F4E0E] to-transparent sticky bottom-0">
            <button 
              onClick={handleSave}
              disabled={isSaving || items.length === 0}
              className="w-full py-6 bg-orange-500 text-white rounded-[2.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <><CheckCircle2 className="w-6 h-6" /> CONFIRMAR Y AÑADIR STOCK</>}
            </button>
          </div>
        )}
      </div>
    </ModalPortal>
  );
};
