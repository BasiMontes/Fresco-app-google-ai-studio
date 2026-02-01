
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { ArrowLeft, User, Shield, Eye, EyeOff, Lock, LogOut, Trash2, Pencil, Check, RefreshCw, Cpu, CreditCard, ExternalLink, Info } from 'lucide-react';
import { triggerDialog } from './Dialog';

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

  useEffect(() => {
    setScansCount(parseInt(localStorage.getItem('fresco_api_usage') || '0'));
  }, []);

  const estimatedCost = (scansCount * 0.0004).toFixed(4);

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

      {/* Monitor de IA y Costes */}
      <section className="bg-[#0F4E0E] p-8 md:p-10 rounded-[2.5rem] shadow-2xl text-white space-y-8 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
          
          <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-2xl">
                      <Cpu className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                      <h2 className="text-xl font-black">Motor de IA Gemini</h2>
                      <p className="text-teal-400 text-[10px] font-black uppercase tracking-widest">Estado: Facturación Activa</p>
                  </div>
              </div>
              <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-teal-400 tracking-widest leading-none mb-1">Inversión Estimada</p>
                  <span className="text-3xl font-black">{estimatedCost}€</span>
              </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 relative z-10">
              <div className="flex justify-between items-center text-sm">
                  <span className="font-bold opacity-60">Tickets Escaneados</span>
                  <span className="font-black text-orange-400">{scansCount}</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${Math.min((scansCount/100)*100, 100)}%` }} />
              </div>
              <div className="flex items-start gap-3 mt-4">
                  <Info className="w-4 h-4 text-teal-300 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-teal-100/60 leading-relaxed italic">
                    Este coste es una estimación basada en el volumen de tickets procesados. Google Cloud aplicará el coste real a final de mes.
                  </p>
              </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 relative z-10">
              <a 
                href="https://console.cloud.google.com/billing" 
                target="_blank" 
                rel="noreferrer"
                className="flex-1 h-14 bg-white text-[#0F4E0E] rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-teal-50 transition-all"
              >
                  <CreditCard className="w-4 h-4" /> Ajustar Límite en Google
              </a>
              <button 
                onClick={() => triggerDialog({ title: 'Uso de IA', message: `Has realizado ${scansCount} peticiones a la IA. El coste aproximado por cada 1000 tickets es de 0,40€.`, type: 'info' })}
                className="h-14 px-6 bg-white/10 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all"
              >
                  Detalles
              </button>
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
              <div className="space-y-4">
                  <h3 className="text-[17px] font-black text-gray-900">Cambiar contraseña</h3>
                  <InputField 
                    label="Nueva contraseña" 
                    value={newPass} 
                    onChange={setNewPass} 
                    placeholder="Tu nueva contraseña" 
                    type="password" 
                    showToggle 
                    onToggle={() => setShowPass(!showPass)} 
                    isToggled={showPass} 
                  />
                  <InputField 
                    label="Confirmar nueva contraseña" 
                    value={confirmPass} 
                    onChange={setConfirmPass} 
                    placeholder="Confirma tu nueva contraseña" 
                    type="password" 
                    showToggle 
                    onToggle={() => setShowConfirmPass(!showConfirmPass)} 
                    isToggled={showConfirmPass} 
                  />
              </div>

              <div className="flex justify-end pt-2 border-b border-gray-50 pb-8">
                  <ActionButton 
                    onClick={handleUpdatePassword} 
                    loading={isUpdatingPass} 
                    icon={Lock}
                    disabled={!newPass || newPass !== confirmPass}
                  >
                    Actualizar contraseña
                  </ActionButton>
              </div>

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
