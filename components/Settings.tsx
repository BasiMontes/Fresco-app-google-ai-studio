
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { ArrowLeft, User, Shield, Eye, EyeOff, Lock, LogOut, Trash2, Pencil, Check, RefreshCw, Cpu, CreditCard, ExternalLink, Info, Key, ShieldCheck, ShieldX } from 'lucide-react';
import { triggerDialog } from './Dialog';
import { validateApiKey } from '../services/geminiService';

interface SettingsProps {
  user: UserProfile;
  onBack: () => void;
  onUpdateUser: (updatedUser: UserProfile) => void;
  onLogout: () => void;
  onReset: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, onBack, onUpdateUser, onLogout, onReset }) => {
  // Información Personal
  const [nombre, setNombre] = useState(user.name.split(' ')[0] || '');
  const [apellido, setApellido] = useState(user.name.split(' ').slice(1).join(' ') || '');
  const [email, setEmail] = useState(user.email || '');
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Monitor de IA
  const [scansCount, setScansCount] = useState(0);
  const [manualKey, setManualKey] = useState(localStorage.getItem('fresco_manual_api_key') || '');
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'none' | 'valid' | 'invalid'>(manualKey ? 'valid' : 'none');

  useEffect(() => {
    setScansCount(parseInt(localStorage.getItem('fresco_api_usage') || '0'));
  }, []);

  const estimatedCost = (scansCount * 0.0004).toFixed(4);

  const handleSaveKey = async () => {
      if (!manualKey) {
          localStorage.removeItem('fresco_manual_api_key');
          setKeyStatus('none');
          triggerDialog({ title: 'Clave Eliminada', message: 'Se usará la clave del sistema si existe.', type: 'info' });
          return;
      }

      setIsValidatingKey(true);
      const isValid = await validateApiKey(manualKey);
      setIsValidatingKey(false);

      if (isValid) {
          localStorage.setItem('fresco_manual_api_key', manualKey);
          setKeyStatus('valid');
          triggerDialog({ title: '¡Éxito!', message: 'Tu clave personal ha sido vinculada correctamente.', type: 'success' });
      } else {
          setKeyStatus('invalid');
          triggerDialog({ title: 'Clave Inválida', message: 'La clave introducida no funciona. Verifica que sea la clave actual de Google AI Studio.', type: 'alert' });
      }
  };

  // Seguridad
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  const handleSaveInfo = () => {
    setIsSavingUser(true);
    const fullName = `${nombre} ${apellido}`.trim();
    onUpdateUser({ ...user, name: fullName, email });
    setTimeout(() => {
        setIsSavingUser(false);
        triggerDialog({ title: 'Actualizado', message: 'Tu información personal ha sido guardada.', type: 'success' });
    }, 800);
  };

  const handleUpdatePassword = () => {
    if (!newPass || newPass !== confirmPass) {
        triggerDialog({ title: 'Error', message: 'Las contraseñas no coinciden.', type: 'alert' });
        return;
    }
    setIsUpdatingPass(true);
    setTimeout(() => {
        setIsUpdatingPass(false);
        setNewPass('');
        setConfirmPass('');
        triggerDialog({ title: 'Seguridad', message: 'Contraseña actualizada correctamente.', type: 'success' });
    }, 1200);
  };

  const InputField = ({ label, value, onChange, placeholder, type = "text", showToggle, onToggle, isToggled }: any) => (
    <div className="space-y-2">
        <label className="text-[14px] font-black text-gray-900 block ml-1">{label}</label>
        <div className="relative">
            <input 
                type={type === 'password' && isToggled ? 'text' : type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full h-14 px-5 bg-white border-2 border-gray-100 rounded-2xl font-bold text-gray-800 outline-none focus:border-teal-500/20 transition-all placeholder:text-gray-300"
            />
            {showToggle && (
                <button onClick={onToggle} type="button" className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors">
                    {isToggled ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
            )}
        </div>
    </div>
  );

  const ActionButton = ({ onClick, children, icon: Icon, loading, disabled, variant = 'teal' }: any) => (
    <button 
        onClick={onClick}
        disabled={disabled || loading}
        className={`mt-4 h-14 rounded-2xl font-black text-sm px-8 flex items-center justify-center gap-3 transition-all self-end ${
            variant === 'teal' 
            ? 'bg-[#8FBDB6] text-white hover:bg-[#7daea6]' 
            : 'bg-white border-2 border-gray-100 text-gray-400 hover:bg-gray-50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
        {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : (
            <>
                {Icon && <Icon className="w-4 h-4" />}
                {children}
            </>
        )}
    </button>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-40">
      <header className="flex items-start gap-4">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-900">
              <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="space-y-1">
              <h1 className="text-4xl font-black text-teal-900 tracking-tight leading-none">Configuración</h1>
              <p className="text-gray-500 font-medium text-lg opacity-70">Gestiona tu información y costes de IA</p>
          </div>
      </header>

      {/* Gestión de Llave Personal (SOLUCIÓN AL FILTRADO) */}
      <section className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border-2 border-orange-100 space-y-8">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-orange-600">
                  <Key className="w-6 h-6" />
                  <h2 className="text-xl font-black">Tu Llave de Google (Privada)</h2>
              </div>
              {keyStatus === 'valid' && <div className="flex items-center gap-2 text-green-600 font-black text-[10px] uppercase tracking-widest bg-green-50 px-3 py-1.5 rounded-lg"><ShieldCheck className="w-4 h-4" /> Activa</div>}
              {keyStatus === 'invalid' && <div className="flex items-center gap-2 text-red-600 font-black text-[10px] uppercase tracking-widest bg-red-50 px-3 py-1.5 rounded-lg"><ShieldX className="w-4 h-4" /> Error</div>}
          </div>

          <div className="space-y-4">
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  Para evitar que Google bloquee tu clave al subirla a GitHub, **pégala aquí directamente**. Esta clave se guardará solo en este dispositivo y nunca se filtrará.
              </p>
              
              <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Clave de API Gemini</label>
                  <div className="relative">
                      <input 
                          type="password"
                          value={manualKey}
                          onChange={e => setManualKey(e.target.value)}
                          placeholder="Pega aquí tu clave AIza..."
                          className="w-full h-14 px-5 bg-gray-50 border-2 border-transparent rounded-2xl font-mono text-sm text-teal-900 outline-none focus:border-orange-500/20 transition-all placeholder:text-gray-300"
                      />
                  </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3 pt-2">
                  <button 
                    onClick={handleSaveKey}
                    disabled={isValidatingKey}
                    className="flex-1 h-14 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-orange-600 transition-all shadow-lg active:scale-95"
                  >
                      {isValidatingKey ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> VINCULAR CLAVE</>}
                  </button>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noreferrer"
                    className="h-14 px-6 bg-gray-100 text-gray-600 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-gray-200 transition-all"
                  >
                      <ExternalLink className="w-4 h-4" /> Obtener Clave
                  </a>
              </div>
          </div>
      </section>

      {/* Monitor de IA y Costes */}
      <section className="bg-[#0F4E0E] p-8 md:p-10 rounded-[2.5rem] shadow-2xl text-white space-y-8 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
          
          <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-2xl">
                      <Cpu className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                      <h2 className="text-xl font-black">Consumo Acumulado</h2>
                      <p className="text-teal-400 text-[10px] font-black uppercase tracking-widest">IA en tiempo real</p>
                  </div>
              </div>
              <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-teal-400 tracking-widest leading-none mb-1">Inversión Estimada</p>
                  <span className="text-3xl font-black">{estimatedCost}€</span>
              </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 relative z-10">
              <div className="flex justify-between items-center text-sm">
                  <span className="font-bold opacity-60">Peticiones Realizadas</span>
                  <span className="font-black text-orange-400">{scansCount}</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${Math.min((scansCount/100)*100, 100)}%` }} />
              </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 relative z-10">
              <a 
                href="https://console.cloud.google.com/billing" 
                target="_blank" 
                rel="noreferrer"
                className="flex-1 h-14 bg-white text-[#0F4E0E] rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-teal-50 transition-all"
              >
                  <CreditCard className="w-4 h-4" /> Facturación Google
              </a>
          </div>
      </section>

      {/* Información Personal */}
      <section className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-8">
          <div className="flex items-center gap-3 text-teal-900">
              <User className="w-6 h-6 text-teal-500" />
              <h2 className="text-xl font-black">Información Personal</h2>
          </div>

          <div className="space-y-5">
              <InputField label="Nombre" value={nombre} onChange={setNombre} placeholder="Tu nombre" />
              <InputField label="Apellido" value={apellido} onChange={setApellido} placeholder="Tu apellido" />
              <InputField label="Email" value={email} onChange={setEmail} placeholder="tu@email.com" type="email" />
              
              <div className="flex justify-end pt-2">
                  <ActionButton onClick={handleSaveInfo} loading={isSavingUser}>Guardar cambios</ActionButton>
              </div>
          </div>
      </section>

      {/* Seguridad */}
      <section className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-8">
          <div className="flex items-center gap-3 text-teal-900">
              <Shield className="w-6 h-6 text-teal-500" />
              <h2 className="text-xl font-black">Seguridad</h2>
          </div>

          <div className="space-y-6">
              <div className="space-y-4 pt-4">
                  <button 
                    onClick={() => triggerDialog({ title: '¿Cerrar Sesión?', message: 'Tendrás que volver a introducir tus credenciales.', type: 'confirm', onConfirm: onLogout })}
                    className="w-full h-16 bg-white border-2 border-gray-100 hover:border-teal-100 rounded-2xl flex items-center justify-center gap-4 group transition-all"
                  >
                      <LogOut className="w-5 h-5 text-gray-400 group-hover:text-teal-600" />
                      <span className="font-bold text-gray-900">Cerrar Sesión</span>
                  </button>

                  <button 
                    onClick={() => triggerDialog({ title: '¿ELIMINAR CUENTA?', message: 'Esta acción es irreversible.', type: 'alert', onConfirm: onReset })}
                    className="w-full h-16 bg-white border-2 border-red-50 hover:bg-red-50 rounded-2xl flex items-center justify-center gap-4 group transition-all"
                  >
                      <Trash2 className="w-5 h-5 text-red-300 group-hover:text-red-500" />
                      <span className="font-bold text-red-500">Eliminar cuenta</span>
                  </button>
              </div>
          </div>
      </section>
    </div>
  );
};
