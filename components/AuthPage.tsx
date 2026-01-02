
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { Logo } from './Logo';
import { ArrowRight, Mail, Lock, User, AlertCircle, Loader2, Check, Send, ChevronLeft, Database } from 'lucide-react';
import { LegalModal } from './LegalModal';

interface AuthPageProps {
  onLogin: (user: UserProfile) => void;
  onSignup: (name: string, email: string) => void; 
  onEnterDemo: () => void;
}

// Helper para traducir errores de Supabase a humano
const translateAuthError = (error: any): string => {
    const msg = (error?.message || '').toLowerCase();
    
    // Errores de Configuración / API Key
    if (error?.status === 401 || msg.includes('jwt') || msg.includes('api key')) {
        return 'Error 401: API Key inválida o expirada. Revisa Vercel/Supabase.';
    }
    if (msg.includes('fetch') || msg.includes('network')) {
        return 'Error de conexión. Verifica tu internet.';
    }

    // Errores de Base de Datos comunes en primer despliegue
    if (msg.includes('relation') && msg.includes('does not exist')) {
        return 'Faltan las tablas en Supabase. Ejecuta el script SQL (ver SUPABASE_SCHEMA.sql).';
    }
    if (msg.includes('trigger')) {
        return 'Error en el Trigger de base de datos. Revisa el SQL.';
    }

    // Errores de Usuario
    if (msg.includes('invalid login credentials')) return 'Email o contraseña incorrectos.';
    if (msg.includes('user already registered')) return 'Este email ya está registrado.';
    if (msg.includes('email not confirmed')) return 'Debes confirmar tu email antes de entrar.';
    if (msg.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
    if (msg.includes('rate limit exceeded')) return 'Demasiados intentos. Espera un momento.';
    
    // Fallback: Mostrar el error real para debugging
    return error?.message || 'Ocurrió un error desconocido.';
};

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onEnterDemo }) => {
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
        if (isRecovery) {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin,
            });
            if (error) throw error;
            setSuccessMsg('Hemos enviado un enlace de recuperación a tu correo.');
        } else if (isLogin) {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
        } else {
            if (!acceptedTerms) throw new Error('Debes aceptar los Términos y la Política de Privacidad.');

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                        onboarding_completed: false
                    }
                }
            });
            if (error) throw error;
            
            if (data.user && data.user.identities && data.user.identities.length === 0) {
                 setError('Este usuario ya existe. Intenta iniciar sesión.');
            } else {
                 setVerificationSent(true);
            }
        }
    } catch (err: any) {
        console.error("Auth Error:", err);
        setError(translateAuthError(err));
    } finally {
        setLoading(false);
    }
  };

  if (verificationSent) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 animate-fade-in">
              <div className="w-full max-w-md bg-white p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 text-center">
                  <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce-subtle">
                      <Send className="w-10 h-10 text-teal-600" />
                  </div>
                  <h2 className="text-3xl font-black text-teal-900 mb-4">¡Casi listo!</h2>
                  <p className="text-gray-500 text-lg mb-8 leading-relaxed">
                      Hemos enviado un enlace de confirmación a <span className="font-bold text-teal-700">{email}</span>.
                  </p>
                  <button 
                      onClick={() => { setVerificationSent(false); setIsLogin(true); }}
                      className="w-full py-4 bg-teal-900 text-white font-bold rounded-xl shadow-lg hover:bg-teal-800 transition-all active:scale-[0.98]"
                  >
                      Ya lo he confirmado, ir a Login
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans">
      {showLegalModal && (
          <LegalModal type={showLegalModal} onClose={() => setShowLegalModal(null)} />
      )}

      <div className="hidden lg:flex w-1/2 bg-teal-800 relative overflow-hidden flex-col justify-between p-16 text-white">
        <div className="relative z-10 animate-fade-in">
            <div className="flex items-center gap-3 mb-16">
                <Logo variant="inverted" className="w-64" align="left" />
            </div>
            <h1 className="text-6xl font-extrabold leading-tight mb-8">
                Tu cocina,<br/>
                <span className="text-orange-400">sincronizada.</span>
            </h1>
            <p className="text-teal-100 text-xl max-w-lg leading-relaxed font-light">
                Gestión de despensa en tiempo real para hogares modernos. Tus datos seguros en la nube.
            </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md bg-white p-10 rounded-[2rem] shadow-2xl border border-gray-100/50">
            <div className="flex justify-center mb-10">
                <Logo className="w-56" align="center" />
            </div>
            
            <div className="flex p-1.5 bg-gray-100 rounded-2xl mb-8 border border-gray-200">
                <button onClick={() => { setIsLogin(true); setError(''); }} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${isLogin ? 'bg-white text-teal-900 shadow-sm' : 'text-gray-500'}`}>Iniciar Sesión</button>
                <button onClick={() => { setIsLogin(false); setError(''); }} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${!isLogin ? 'bg-white text-teal-900 shadow-sm' : 'text-gray-500'}`}>Registrarse</button>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
                {!isLogin && !isRecovery && (
                    <div className="space-y-2 animate-slide-up">
                        <label className="text-sm font-semibold text-gray-700 ml-1">Nombre Completo</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                            <input type="text" required placeholder="Ej. Alex García" value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-teal-500 transition-all" />
                        </div>
                    </div>
                )}
                
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 ml-1">Correo Electrónico</label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                        <input type="email" required placeholder="hola@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-teal-500 transition-all" />
                    </div>
                </div>

                {!isRecovery && (
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 ml-1">Contraseña</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                            <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-teal-500 transition-all" />
                        </div>
                    </div>
                )}

                {!isLogin && !isRecovery && (
                    <div className="flex items-start gap-3 pt-2">
                        <input type="checkbox" id="terms" required checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-1 w-4 h-4 text-teal-600" />
                        <label htmlFor="terms" className="text-xs text-gray-500">He leído y acepto los <span className="font-bold text-teal-700 cursor-pointer" onClick={() => setShowLegalModal('terms')}>Términos y Condiciones</span>.</label>
                    </div>
                )}

                {error && (
                    <div className="flex items-start gap-3 text-red-600 font-medium text-xs bg-red-50 border border-red-100 p-4 rounded-xl animate-fade-in break-words">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {successMsg && (
                    <div className="flex items-center gap-3 text-green-700 font-medium text-sm bg-green-50 border border-green-100 p-4 rounded-xl animate-fade-in">
                        <Check className="w-5 h-5 flex-shrink-0" />
                        {successMsg}
                    </div>
                )}

                <button type="submit" disabled={loading} className="w-full bg-teal-800 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-teal-900 transition-all flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>{isRecovery ? 'Enviar enlace' : (isLogin ? 'Entrar' : 'Crear cuenta')}<ArrowRight className="w-5 h-5" /></>}
                </button>
            </form>
            
            {/* Debug Info para confirmar conexión */}
            <div className="mt-8 pt-4 border-t border-gray-100 text-center">
                <p className="text-[10px] text-gray-300 font-mono flex items-center justify-center gap-1">
                    <Database className="w-3 h-3" /> Conectado a Supabase
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};
