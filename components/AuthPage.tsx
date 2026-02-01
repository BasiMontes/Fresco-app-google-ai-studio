
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { Logo } from './Logo';
import { ArrowRight, Mail, Lock, User, AlertCircle, Loader2, Check, Send, WifiOff } from 'lucide-react';
import { LegalModal } from './LegalModal';

interface AuthPageProps {
  onLogin: (user: UserProfile) => void;
  onSignup: (name: string, email: string) => void; 
}

const translateAuthError = (error: any): string => {
    const msg = (error?.message || '').toLowerCase();
    
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('load failed')) {
        return 'Error de conexión: No se puede contactar con el servidor. Revisa tu conexión o configuración.';
    }
    
    if (error?.status === 401 || msg.includes('jwt') || msg.includes('api key')) {
        return 'Error 401: Sesión no autorizada o configuración expirada.';
    }
    
    if (msg.includes('invalid login credentials')) return 'Email o contraseña incorrectos.';
    if (msg.includes('user already registered')) return 'Este email ya está registrado.';
    if (msg.includes('email not confirmed')) return 'Por favor, confirma tu email antes de entrar.';
    
    return error?.message || 'Ocurrió un error inesperado al intentar entrar.';
};

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState<'privacy' | 'terms' | null>(null);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
      const clearGhostSession = async () => {
          const { data } = await supabase.auth.getSession();
          if (data.session && !data.session.user) await supabase.auth.signOut();
      };
      clearGhostSession();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
        if (isRecovery) {
            const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
            if (error) throw error;
            setSuccessMsg('Hemos enviado un enlace de recuperación a tu correo.');
        } else if (isLogin) {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } else {
            if (!acceptedTerms) throw new Error('Debes aceptar las condiciones legales.');
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: name, onboarding_completed: false },
                    emailRedirectTo: window.location.origin 
                }
            });
            if (error) throw error;
            if (data.user && data.user.identities && data.user.identities.length === 0) setError('Este usuario ya existe.');
            else setVerificationSent(true);
        }
    } catch (err: any) {
        setError(translateAuthError(err));
    } finally {
        setLoading(false);
    }
  };

  const isFormValid = isLogin 
    ? (email.trim() !== '' && password.trim() !== '')
    : isRecovery 
        ? email.trim() !== '' 
        : (name.trim() !== '' && email.trim() !== '' && password.trim() !== '' && acceptedTerms);

  if (verificationSent) {
      return (
          <div className="h-screen w-full flex items-center justify-center bg-[#f8f9fa] p-6 animate-fade-in font-sans overflow-hidden">
              <div className="w-full max-w-md bg-white p-10 rounded-[2.5rem] shadow-xl text-center">
                  <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Send className="w-8 h-8 text-[#0F4E0E]" />
                  </div>
                  <h2 className="text-2xl font-black text-[#0F4E0E] mb-2">Revisa tu correo</h2>
                  <p className="text-gray-500 mb-8">Enlace enviado a <span className="font-bold">{email}</span>.</p>
                  <button onClick={() => { setVerificationSent(false); setIsLogin(true); }} className="w-full py-4 bg-[#0F4E0E] text-white font-bold rounded-xl">Volver</button>
              </div>
          </div>
      );
  }

  return (
    <div className="h-screen w-full flex bg-[#f8f9fa] overflow-hidden font-sans">
      {showLegalModal && <LegalModal type={showLegalModal} onClose={() => setShowLegalModal(null)} />}

      {/* PANEL IZQUIERDO ACTUALIZADO CON #0F4E0E */}
      <div className="hidden lg:flex lg:w-1/2 lg:shrink-0 bg-[#0F4E0E] h-full flex-col justify-center px-20 relative text-white">
        <div className="absolute top-12 left-12">
            <Logo variant="inverted" />
        </div>
        
        <div className="relative z-10 animate-fade-in">
            <h1 className="text-6xl font-black leading-[1.1] mb-8 tracking-tight">
                Tu cocina,<br/>
                <span className="text-[#e87c3e]">sincronizada.</span>
            </h1>
            <p className="text-teal-50 text-xl max-w-lg leading-relaxed font-normal opacity-90">
                Gestión de despensa en tiempo real para hogares modernos. Tus datos seguros en la nube.
            </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 lg:shrink-0 h-full flex items-center justify-center p-6 relative">
        <div className="w-full max-w-[450px] bg-white p-10 md:p-14 rounded-[2.5rem] shadow-2xl shadow-gray-200/40 relative animate-slide-up flex flex-col h-auto min-h-[600px]">
            
            <div className="flex justify-center mb-6 flex-shrink-0">
                 <Logo align="center" className="scale-110" />
            </div>

            <div className="flex p-1 bg-gray-50 rounded-xl mb-6 border border-gray-100 flex-shrink-0">
                <button 
                    onClick={() => { setIsLogin(true); setError(''); }}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all duration-200 uppercase tracking-wide ${
                        isLogin ? 'bg-white text-[#0F4E0E] shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                    Iniciar Sesión
                </button>
                <button 
                    onClick={() => { setIsLogin(false); setError(''); }}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all duration-200 uppercase tracking-wide ${
                        !isLogin ? 'bg-white text-[#0F4E0E] shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                    Registrarse
                </button>
            </div>

            <form onSubmit={handleAuth} className="flex-1 flex flex-col">
                <div className="space-y-4 mb-8">
                    {!isLogin && !isRecovery && (
                        <div className="space-y-1.5 animate-fade-in">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                <input type="text" required placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} 
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl font-bold text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0F4E0E]/10 focus:border-[#0F4E0E] transition-all placeholder:text-gray-300" 
                                />
                            </div>
                        </div>
                    )}
                    
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <input type="email" required placeholder="hola@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} 
                                className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl font-bold text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0F4E0E]/10 focus:border-[#0F4E0E] transition-all placeholder:text-gray-300" 
                            />
                        </div>
                    </div>

                    {!isRecovery && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} 
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl font-bold text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0F4E0E]/10 focus:border-[#0F4E0E] transition-all placeholder:text-gray-300" 
                                />
                            </div>
                        </div>
                    )}

                    {!isLogin && !isRecovery && (
                        <div className="flex items-start gap-3 pt-2 px-1 group cursor-pointer" onClick={() => setAcceptedTerms(!acceptedTerms)}>
                            <div className={`mt-0.5 w-6 h-6 flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-all ${acceptedTerms ? 'bg-[#0F4E0E] border-[#0F4E0E]' : 'bg-white border-gray-200 group-hover:border-gray-300'}`}>
                                {acceptedTerms && <Check className="w-4 h-4 text-white stroke-[3.5px]" />}
                            </div>
                            <label className="text-[10px] text-gray-400 font-medium leading-relaxed select-none">
                                Al crear una cuenta, aceptas nuestros <button type="button" className="font-bold text-[#0F4E0E] hover:underline" onClick={(e) => { e.stopPropagation(); setShowLegalModal('terms'); }}>Términos de Servicio</button> y nuestra <button type="button" className="font-bold text-[#0F4E0E] hover:underline" onClick={(e) => { e.stopPropagation(); setShowLegalModal('privacy'); }}>Política de Privacidad</button>.
                            </label>
                        </div>
                    )}
                </div>

                <div className="mt-auto space-y-4">
                    {error && (
                        <div className="flex items-start gap-3 text-red-600 font-medium text-xs bg-red-50 p-3 rounded-xl animate-fade-in border border-red-100">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {successMsg && (
                        <div className="flex items-center gap-3 text-green-700 font-medium text-sm bg-green-50 p-3 rounded-xl animate-fade-in">
                            <Check className="w-4 h-4 flex-shrink-0" />
                            {successMsg}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading || !isFormValid}
                        className={`w-full font-black py-5 rounded-2xl shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] border-2 ${
                            isFormValid
                            ? 'bg-[#0F4E0E] text-white border-[#0F4E0E] hover:bg-[#062606]' 
                            : 'bg-white text-[#0F4E0E] border-[#0F4E0E] cursor-not-allowed opacity-60'
                        }`}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                            <>
                                {isRecovery ? 'Enviar enlace' : (isLogin ? 'Entrar' : 'Crear cuenta')}
                                {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
                            </>
                        )}
                    </button>

                    {isLogin && !isRecovery && (
                        <div className="text-center">
                            <button type="button" onClick={() => setIsRecovery(true)} className="text-[10px] font-bold uppercase tracking-wider text-gray-300 hover:text-[#0F4E0E] transition-colors">
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>
                    )}

                    {isRecovery && (
                        <button type="button" onClick={() => setIsRecovery(false)} className="w-full text-center text-[10px] font-bold uppercase tracking-wider text-gray-300 hover:text-[#0F4E0E]">
                            Cancelar
                        </button>
                    )}
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};
