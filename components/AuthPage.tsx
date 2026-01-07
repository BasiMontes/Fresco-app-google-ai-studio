
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { Logo } from './Logo';
import { ArrowRight, Mail, Lock, User, AlertCircle, Loader2, Check, Send } from 'lucide-react';
import { LegalModal } from './LegalModal';

interface AuthPageProps {
  onLogin: (user: UserProfile) => void;
  onSignup: (name: string, email: string) => void; 
}

const translateAuthError = (error: any): string => {
    const msg = (error?.message || '').toLowerCase();
    if (error?.status === 401 || msg.includes('jwt') || msg.includes('api key')) {
        return 'Error 401: API Key inválida o expirada.';
    }
    if (msg.includes('invalid login credentials')) return 'Email o contraseña incorrectos.';
    if (msg.includes('user already registered')) return 'Este email ya está registrado.';
    return error?.message || 'Ocurrió un error desconocido.';
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
            if (!acceptedTerms) throw new Error('Debes aceptar los Términos.');
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

  if (verificationSent) {
      return (
          <div className="h-screen w-full flex items-center justify-center bg-[#f8f9fa] p-6 animate-fade-in font-sans overflow-hidden">
              <div className="w-full max-w-md bg-white p-10 rounded-[2.5rem] shadow-xl text-center">
                  <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Send className="w-8 h-8 text-[#013b33]" />
                  </div>
                  <h2 className="text-2xl font-black text-[#013b33] mb-2">Revisa tu correo</h2>
                  <p className="text-gray-500 mb-8">Enlace enviado a <span className="font-bold">{email}</span>.</p>
                  <button onClick={() => { setVerificationSent(false); setIsLogin(true); }} className="w-full py-4 bg-[#013b33] text-white font-bold rounded-xl">Volver</button>
              </div>
          </div>
      );
  }

  return (
    <div className="h-screen w-full flex bg-[#f8f9fa] overflow-hidden font-sans">
      {showLegalModal && <LegalModal type={showLegalModal} onClose={() => setShowLegalModal(null)} />}

      {/* LEFT PANEL - BRANDING */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#013b33] h-full flex-col justify-center px-20 relative text-white">
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

      {/* RIGHT PANEL - FORM */}
      <div className="w-full lg:w-1/2 h-full flex items-center justify-center p-6 relative">
        {/* CARD WITH FIXED HEIGHT (650px) TO PREVENT LAYOUT SHIFTS */}
        <div className="w-full max-w-[450px] h-[650px] bg-white p-10 md:p-14 rounded-[2.5rem] shadow-2xl shadow-gray-200/40 relative animate-slide-up flex flex-col">
            
            {/* Logo on Card (Centered) */}
            <div className="flex justify-center mb-8 flex-shrink-0">
                 <Logo align="center" className="scale-110" />
            </div>

            {/* Tabs (Segmented Control) */}
            <div className="flex p-1.5 bg-gray-50 rounded-2xl mb-8 border border-gray-100 flex-shrink-0">
                <button 
                    onClick={() => { setIsLogin(true); setError(''); }}
                    className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-200 ${
                        isLogin ? 'bg-white text-[#013b33] shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                    Iniciar Sesión
                </button>
                <button 
                    onClick={() => { setIsLogin(false); setError(''); }}
                    className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-200 ${
                        !isLogin ? 'bg-white text-[#013b33] shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                    Registrarse
                </button>
            </div>

            <form onSubmit={handleAuth} className="flex-1 flex flex-col justify-between">
                <div className="space-y-6">
                    {!isLogin && !isRecovery && (
                        <div className="space-y-2 animate-fade-in">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nombre Completo</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="text" required placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} 
                                    className="w-full pl-12 pr-4 py-4 bg-[#F9FAFB] border border-gray-100 rounded-xl font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-[#013b33] transition-all placeholder-gray-400" 
                                />
                            </div>
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Correo Electrónico</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input type="email" required placeholder="hola@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} 
                                className="w-full pl-12 pr-4 py-4 bg-[#F9FAFB] border border-gray-100 rounded-xl font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-[#013b33] transition-all placeholder-gray-400" 
                            />
                        </div>
                    </div>

                    {!isRecovery && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} 
                                    className="w-full pl-12 pr-4 py-4 bg-[#F9FAFB] border border-gray-100 rounded-xl font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-[#013b33] transition-all placeholder-gray-400" 
                                />
                            </div>
                        </div>
                    )}

                    {!isLogin && !isRecovery && (
                        <div className="flex items-start gap-3 pt-1 px-1">
                            <input type="checkbox" id="terms" required checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)}
                                className="mt-0.5 w-4 h-4 text-[#013b33] rounded border-gray-300 focus:ring-[#013b33]"
                            />
                            <label htmlFor="terms" className="text-xs text-gray-500 font-medium">
                                Acepto los <button type="button" className="font-bold text-[#013b33] hover:underline" onClick={() => setShowLegalModal('terms')}>Términos</button>.
                            </label>
                        </div>
                    )}
                </div>

                <div className="space-y-4 pt-4">
                    {error && (
                        <div className="flex items-start gap-3 text-red-600 font-medium text-xs bg-red-50 p-4 rounded-xl animate-fade-in">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {successMsg && (
                        <div className="flex items-center gap-3 text-green-700 font-medium text-sm bg-green-50 p-4 rounded-xl animate-fade-in">
                            <Check className="w-5 h-5 flex-shrink-0" />
                            {successMsg}
                        </div>
                    )}

                    <button type="submit" disabled={loading}
                        className="w-full bg-[#013b33] text-white font-bold py-4 rounded-xl shadow-lg hover:bg-[#012e28] transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <>
                                {isRecovery ? 'Enviar enlace' : (isLogin ? 'Entrar' : 'Crear cuenta')}
                                {!loading && <ArrowRight className="w-4 h-4" />}
                            </>
                        )}
                    </button>

                    {isLogin && !isRecovery && (
                        <div className="text-center">
                            <button type="button" onClick={() => setIsRecovery(true)} className="text-xs font-bold text-gray-400 hover:text-[#013b33] transition-colors">
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>
                    )}

                    {isRecovery && (
                        <button type="button" onClick={() => setIsRecovery(false)} className="w-full text-center text-xs font-bold text-gray-400 hover:text-[#013b33]">
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
