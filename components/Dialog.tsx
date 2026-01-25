
import React from 'react';
import { X, AlertCircle, CheckCircle2, Info, HelpCircle } from 'lucide-react';
import { ModalPortal } from './ModalPortal';

export interface DialogOptions {
  title: string;
  message: string;
  type?: 'alert' | 'confirm' | 'info' | 'success';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface DialogProps extends DialogOptions {
  isOpen: boolean;
  onClose: () => void;
}

export const Dialog: React.FC<DialogProps> = ({ 
  isOpen, title, message, type = 'info', 
  confirmText = 'Aceptar', cancelText = 'Cancelar', 
  onConfirm, onCancel, onClose 
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  const icons = {
    alert: <AlertCircle className="w-12 h-12 text-red-500" />,
    confirm: <HelpCircle className="w-12 h-12 text-orange-500" />,
    info: <Info className="w-12 h-12 text-teal-600" />,
    success: <CheckCircle2 className="w-12 h-12 text-green-500" />
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-teal-900/40 backdrop-blur-md animate-fade-in">
        <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-slide-up relative">
          <button onClick={handleCancel} className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="mb-6">{icons[type]}</div>
            <h3 className="text-2xl font-black text-teal-900 leading-tight mb-2">{title}</h3>
            <p className="text-gray-500 font-medium text-sm leading-relaxed mb-8">{message}</p>

            <div className="flex flex-col w-full gap-3">
              <button 
                onClick={handleConfirm}
                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95 ${
                  type === 'alert' ? 'bg-red-500 text-white' : 'bg-teal-900 text-white'
                }`}
              >
                {confirmText}
              </button>
              {type === 'confirm' && (
                <button 
                  onClick={handleCancel}
                  className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-100 transition-all"
                >
                  {cancelText}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

// Hook/Event helper para disparar diálogos desde cualquier parte
export const triggerDialog = (options: DialogOptions) => {
  window.dispatchEvent(new CustomEvent('fresco-dialog', { detail: options }));
};
