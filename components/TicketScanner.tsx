
import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Check, Loader2, Upload, Sparkles, Plus, Trash2, AlertCircle, CheckCircle2, RefreshCw, FileText, ChevronDown, Info, ClipboardPaste, ArrowRight, HelpCircle } from 'lucide-react';
import { extractItemsFromTicket, extractItemsFromRawText } from '../services/geminiService';
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
  const [step, setStep] = useState<'selection' | 'capture' | 'paste' | 'processing' | 'review' | 'error'>('selection');
  const [detectedItems, setDetectedItems] = useState<any[]>([]);
  const [pastedText, setPastedText] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('Analizando...');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      window.history.pushState({ modal: 'ticket-scanner' }, '', window.location.href);
      const handlePopState = () => onClose();
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, [onClose]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStep('processing');
      setLoadingMessage('Leyendo imagen...');
      try {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = async () => {
              const base64 = reader.result as string;
              const base64Data = base64.split(',')[1];
              const items = await extractItemsFromTicket(base64Data, file.type);
              if (items && items.length > 0) {
                  processItems(items);
              } else {
                  setStep('error');
              }
          };
      } catch (err) {
          setStep('error');
      }
    }
  };

  const handlePasteProcess = async () => {
      if (!pastedText.trim()) return;
      setStep('processing');
      setLoadingMessage('Procesando lista...');
      try {
          const items = await extractItemsFromRawText(pastedText);
          if (items && items.length > 0) {
              processItems(items);
          } else {
              setStep('error');
          }
      } catch (e) {
          setStep('error');
      }
  };

  const processItems = (items: any[]) => {
      setDetectedItems(items.map((item: any) => ({
          ...item,
          daysToExpire: EXPIRY_DAYS_BY_CATEGORY[item.category] || 14
      })));
      setStep('review');
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
      {/* Header Fijo */}
      <div className="p-4 flex justify-between items-center text-white bg-[#013b33] z-50">
        <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5" />
            </div>
            <div>
                <h3 className="text-base font-black leading-none">Importar Compra</h3>
                <p className="text-[8px] font-black uppercase tracking-widest text-teal-400 mt-1">Smart Importer</p>
            </div>
        </div>
        <button onClick={onClose} className="p-2 bg-white/5 rounded-xl"><X className="w-5 h-5 text-gray-400" /></button>
      </div>

      <div className="flex-1 p-4 w-full flex flex-col overflow-y-auto no-scrollbar">
        
        {/* PASO 0: SELECCIÓN DE MÉTODO */}
        {step === 'selection' && (
            <div className="flex-1 flex flex-col gap-4 justify-center animate-slide-up">
                <div className="text-center mb-6">
                    <h4 className="text-white text-2xl font-black mb-2">¿Cómo es tu ticket?</h4>
                    <p className="text-teal-200/50 text-sm">Elige la opción más rápida para ti.</p>
                </div>

                <button 
                    onClick={() => setStep('capture')}
                    className="w-full p-6 bg-white/5 rounded-[2rem] border border-white/10 flex items-center gap-6 group active:scale-[0.98] transition-all"
                >
                    <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                        <Camera className="w-8 h-8" />
                    </div>
                    <div className="text-left">
                        <h5 className="text-white font-black text-lg">Ticket de Papel</h5>
                        <p className="text-teal-200/40 text-xs font-medium">Haz una foto a tu ticket impreso.</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-teal-800 ml-auto" />
                </button>

                <button 
                    onClick={() => setStep('paste')}
                    className="w-full p-6 bg-white/10 rounded-[2rem] border border-teal-500/20 flex items-center gap-6 group active:scale-[0.98] transition-all shadow-xl"
                >
                    <div className="w-16 h-16 bg-teal-400/10 rounded-2xl flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
                        <FileText className="w-8 h-8" />
                    </div>
                    <div className="text-left">
                        <h5 className="text-white font-black text-lg">Ticket Digital (PDF)</h5>
                        <p className="text-teal-200/60 text-xs font-medium">Copia y pega el texto del PDF.</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-teal-400 ml-auto" />
                </button>

                <div className="mt-8 p-4 bg-teal-900/50 rounded-2xl border border-teal-800 flex gap-3">
                    <Info className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-teal-100/60 leading-relaxed"><b>Consejo:</b> Si tienes el PDF de Mercadona, usa el método digital. Es 100% preciso y evita errores de lectura.</p>
                </div>
            </div>
        )}

        {/* PASO: CAPTURA (FOTO) */}
        {step === 'capture' && (
          <div className="flex-1 flex flex-col gap-6 animate-slide-up h-full">
            <div className="flex-1 flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-white/10 p-8 text-center bg-white/5"
                 onClick={() => fileInputRef.current?.click()}>
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-white/5">
                    <Camera className="w-7 h-7 text-teal-200" />
                </div>
                <h4 className="text-white text-xl font-black mb-2">Haz la foto</h4>
                <p className="text-teal-200/50 font-medium text-sm">Asegúrate de que haya buena luz y se vean bien los productos.</p>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
            </div>
            <button onClick={() => setStep('selection')} className="text-teal-400 font-black text-[10px] uppercase tracking-widest py-4">Volver atrás</button>
          </div>
        )}

        {/* PASO: PEGAR (PDF) */}
        {step === 'paste' && (
            <div className="flex-1 flex flex-col gap-6 animate-slide-up">
                <div className="bg-teal-900/50 p-4 rounded-2xl border border-teal-800 space-y-3">
                    <div className="flex items-center gap-2 text-teal-300 font-black text-[10px] uppercase tracking-widest">
                        <HelpCircle className="w-3 h-3" /> Cómo hacerlo
                    </div>
                    <ol className="text-[11px] text-teal-100/70 space-y-1 ml-4 list-decimal">
                        <li>Abre tu PDF de Mercadona.</li>
                        <li>Selecciona y copia la lista de productos.</li>
                        <li>Pégala en el cuadro de abajo.</li>
                    </ol>
                </div>

                <div className="flex-1 bg-white/5 rounded-[2rem] p-6 border border-white/10 flex flex-col min-h-[200px]">
                    <textarea 
                        className="flex-1 bg-transparent text-white font-medium text-sm outline-none resize-none placeholder:text-teal-200/10"
                        placeholder="Pega aquí la lista de tu ticket..."
                        value={pastedText}
                        onChange={e => setPastedText(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="flex gap-3 pb-4">
                    <button onClick={() => setStep('selection')} className="flex-1 py-4 text-teal-300 font-black text-[10px] uppercase tracking-widest">Cancelar</button>
                    <button 
                        onClick={handlePasteProcess}
                        disabled={!pastedText.trim()}
                        className="flex-[2] py-4 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl disabled:opacity-30 active:scale-95 transition-all"
                    >
                        Procesar Lista
                    </button>
                </div>
            </div>
        )}

        {/* PASO: PROCESANDO */}
        {step === 'processing' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="relative">
                <div className="w-24 h-24 border-[3px] border-teal-500/10 border-t-orange-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-orange-400 animate-pulse" />
                </div>
            </div>
            <div className="text-center">
                <h4 className="text-white text-xl font-black mb-1">{loadingMessage}</h4>
                <p className="text-teal-200/40 font-medium text-xs">Esto solo tardará un momento.</p>
            </div>
          </div>
        )}

        {/* PASO: ERROR (CON AUTO-RECUPERACIÓN) */}
        {step === 'error' && (
             <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center animate-slide-up">
                <div className="w-20 h-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center mb-2">
                    <AlertCircle className="w-10 h-10 text-red-400" />
                </div>
                <div>
                    <h4 className="text-white text-xl font-black mb-2">No se pudo leer bien</h4>
                    <p className="text-teal-200/40 font-medium text-xs max-w-[260px] mx-auto leading-relaxed">
                        A veces los PDFs digitales o las fotos oscuras fallan.
                    </p>
                </div>
                
                <div className="w-full flex flex-col gap-3">
                    <button 
                        onClick={() => setStep('paste')}
                        className="w-full py-5 bg-teal-400 text-teal-950 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <ClipboardPaste className="w-4 h-4" /> Probar con "Copiar y Pegar"
                    </button>
                    <button 
                        onClick={() => setStep('selection')}
                        className="w-full py-4 bg-white/5 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                    >
                        Volver a intentar
                    </button>
                </div>
             </div>
        )}

        {/* PASO: REVISIÓN */}
        {step === 'review' && (
          <div className="space-y-4 animate-slide-up pb-32">
             <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl flex items-start gap-3 mb-2">
                <Info className="w-4 h-4 text-orange-400 mt-0.5" />
                <p className="text-[10px] text-orange-100/70 font-medium leading-relaxed">Revisa los {detectedItems.length} productos detectados. Puedes editar cualquier nombre o cantidad antes de guardar.</p>
             </div>
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

      {/* Footer de Acción en Revisión */}
      {step === 'review' && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#013b33] via-[#013b33] to-transparent z-50">
              <div className="flex gap-3 max-w-lg mx-auto">
                  <button onClick={() => setStep('selection')} className="flex-1 py-4 bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/5">Repetir</button>
                  <button onClick={handleSave} className="flex-[2] py-4 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                      <CheckCircle2 className="w-4 h-4" /> Guardar en Stock
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};
