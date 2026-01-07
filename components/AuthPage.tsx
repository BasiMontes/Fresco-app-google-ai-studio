
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { Logo } from './Logo';
import { AlertCircle, Loader2, Check, Send, AlertTriangle, Star } from 'lucide-react';
import { LegalModal } from './LegalModal';

interface AuthPageProps {
  onLogin: (user: UserProfile) => void;
  onSignup: (name: string, email: string) => void; 
  onEnterDemo: () => void;
}

const translateAuthError = (error: any): string => {
    const msg = (error?.message || '').toLowerCase();
    if (error?.status === 401 || msg.includes('jwt') || msg.includes('api key')) {
        return 'Error 401: API Key inválida o expirada.';
    }
    if (msg.includes('fetch') || msg.includes('network')) {
        return 'Error de conexión. Verifica tu internet.';
    }
    if (msg.includes('invalid login credentials')) return 'Credenciales incorrectas.';
    if (msg.includes('user already registered')) return 'Este email ya está registrado.';
    if (msg.includes('password should be at least')) return 'Mínimo 6 caracteres.';
    return error?.message || 'Error desconocido.';
};

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onEnterDemo }) => {
  const [isLogin, setIsLogin] = useState(false); // Default to Sign up as per reference image
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
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
      const clearGhostSession = async () => {
          const { data } = await supabase.auth.getSession();
          if (data.session && !data.session.user) {
              await supabase.auth.signOut();
          }
      };
      clearGhostSession();
      setIsLocalhost(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  }, []);

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
            setSuccessMsg('Enlace de recuperación enviado.');
        } else if (isLogin) {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
        } else {
            if (!acceptedTerms) throw new Error('Debes aceptar los Términos y Condiciones.');

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                        onboarding_completed: false
                    },
                    emailRedirectTo: window.location.origin 
                }
            });
            if (error) throw error;
            
            if (data.user && data.user.identities && data.user.identities.length === 0) {
                 setError('Usuario ya registrado. Inicia sesión.');
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
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 animate-fade-in font-sans">
              <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl text-center">
                  <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Send className="w-8 h-8 text-teal-800" />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 mb-2">Revisa tu correo</h2>
                  <p className="text-gray-500 mb-8">
                      Enlace de confirmación enviado a <span className="font-bold text-teal-800">{email}</span>.
                  </p>
                  <button 
                      onClick={() => { setVerificationSent(false); setIsLogin(true); }}
                      className="w-full py-3.5 bg-teal-900 text-white font-bold rounded-xl hover:bg-teal-800 transition-all"
                  >
                      Volver a Iniciar Sesión
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white font-sans text-[#1a1a1a] overflow-x-hidden">
      {showLegalModal && (
          <LegalModal type={showLegalModal} onClose={() => setShowLegalModal(null)} />
      )}

      {/* Left Column (Visual) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#FDF8F3] overflow-hidden flex-col justify-between p-16">
         {/* Background Image Layer */}
         <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1615486511484-92e172cc416d?q=80&w=2070&auto=format&fit=crop" 
              alt="Fresh Oranges" 
              className="w-full h-full object-cover opacity-90"
            />
            {/* Soft Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#FDF8F3]/95 via-[#FDF8F3]/40 to-[#FDF8F3]/90" />
         </div>

         {/* Top Text */}
         <div className="relative z-10 max-w-lg mt-8">
            <h1 className="text-6xl font-[850] tracking-tight text-[#064e3b] mb-6 leading-[1.05]">
               Bienvenido a<br/>tu comunidad.
            </h1>
            <p className="text-xl text-[#064e3b] font-medium leading-relaxed max-w-md">
               Fresco te da los ingredientes y herramientas que necesitas para crear una dieta verdaderamente profesional.
            </p>
         </div>

         {/* Testimonial Bottom */}
         <div className="relative z-10 mb-4">
             <div className="flex gap-1 mb-4">
                 {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />)}
             </div>
             <blockquote className="text-2xl font-medium text-[#064e3b] mb-8 leading-snug tracking-tight">
                "¡Amamos Fresco! Nuestros chefs lo usan para sus proyectos, así que ya sabíamos qué tipo de diseño querían."
             </blockquote>
             <div className="flex items-center gap-4">
                 <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100&h=100" className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" alt="User" />
                 <div>
                     <p className="font-bold text-[#064e3b] text-lg">Carlos Vega</p>
                     <p className="text-sm text-[#064e3b]/70 font-medium">Co-Fundador, Design.co</p>
                 </div>
             </div>
         </div>
      </div>

      {/* Right Column (Form) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-16 bg-white">
          <div className="w-full max-w-[420px] animate-fade-in">
              <div className="mb-10 text-center lg:text-left">
                  <h2 className="text-4xl font-[850] text-[#064e3b] mb-3 tracking-tight">
                      {isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta gratis'}
                  </h2>
                  <p className="text-gray-500 font-medium text-sm leading-relaxed">
                      {isLogin 
                        ? 'Accede a tu planificación y lista de compra.' 
                        : 'Fresco te da el control total de tu cocina. Regístrate en segundos.'}
                  </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                  {!isLogin && !isRecovery && (
                    <div className="space-y-1">
                        <input 
                            type="text" 
                            placeholder="Nombre completo" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#064e3b] focus:border-transparent transition-all bg-white font-medium text-sm"
                        />
                    </div>
                  )}
                  
                  <div className="space-y-1">
                      <input 
                          type="email" 
                          placeholder="Correo electrónico" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-4 py-3.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#064e3b] focus:border-transparent transition-all bg-white font-medium text-sm"
                      />
                  </div>

                  <div className="space-y-1">
                      <input 
                          type="password" 
                          placeholder="Contraseña" 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-4 py-3.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#064e3b] focus:border-transparent transition-all bg-white font-medium text-sm"
                      />
                      {isLogin && !isRecovery && (
                        <div className="flex justify-end pt-1">
                            <button type="button" onClick={() => setIsRecovery(true)} className="text-xs font-bold text-[#064e3b] hover:underline">
                                ¿Olvidaste la contraseña?
                            </button>
                        </div>
                      )}
                  </div>

                  {!isLogin && !isRecovery && (
                      <div className="flex items-start gap-3 pt-2">
                          <input 
                              type="checkbox" 
                              id="terms"
                              checked={acceptedTerms}
                              onChange={(e) => setAcceptedTerms(e.target.checked)}
                              className="mt-1 w-4 h-4 rounded border-gray-300 text-[#064e3b] focus:ring-[#064e3b]"
                          />
                          <label htmlFor="terms" className="text-sm text-gray-500 leading-snug font-medium">
                              Estoy de acuerdo con los <button type="button" onClick={() => setShowLegalModal('terms')} className="font-bold text-[#064e3b] hover:underline">Términos y Condiciones</button>
                          </label>
                      </div>
                  )}

                  {error && (
                      <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs font-bold flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                      </div>
                  )}
                  {successMsg && (
                      <div className="p-3 rounded-lg bg-green-50 text-green-700 text-xs font-bold flex items-center gap-2">
                          <Check className="w-4 h-4 flex-shrink-0" /> {successMsg}
                      </div>
                  )}

                  <button 
                      type="submit" 
                      disabled={loading}
                      className="w-full py-3.5 bg-[#064e3b] text-white rounded-lg font-bold text-sm hover:bg-[#052e16] transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-teal-900/10 mt-2"
                  >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isRecovery ? 'Enviar Enlace' : (isLogin ? 'Iniciar Sesión' : 'Registrarse'))}
                  </button>
              </form>
              
              {!isRecovery && (
                  <>
                      {/* Divider Style */}
                      <div className="relative my-8">
                          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                          <div className="relative flex justify-center text-xs uppercase tracking-widest"><span className="px-3 bg-white text-gray-400 font-bold">O continúa con</span></div>
                      </div>

                      {/* Social Buttons */}
                      <div className="space-y-3">
                          <button 
                              onClick={onEnterDemo}
                              className="w-full py-3.5 border border-gray-200 rounded-lg font-bold text-sm text-gray-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-3 bg-white"
                          >
                              {/* Google Icon SVG */}
                              <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                              </svg>
                              <span>Entrar en Modo Demo</span>
                          </button>
                          
                          <button 
                              disabled
                              className="w-full py-3.5 border border-gray-200 rounded-lg font-bold text-sm text-gray-400 cursor-not-allowed flex items-center justify-center gap-3 bg-white opacity-60"
                          >
                              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.21-1.23 3.91-1.23.96.06 1.98.51 2.49 1.25-2.16 1.29-1.8 4.41.35 5.53-.9 2.36-2.09 4.67-3.83 6.68zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                              <span>Sign in with Apple</span>
                          </button>
                      </div>
                  </>
              )}

              {/* Toggle Footer */}
              <div className="mt-8 text-center text-sm font-medium text-gray-500">
                  {isRecovery ? (
                      <button onClick={() => setIsRecovery(false)} className="text-[#064e3b] font-bold hover:underline">Volver al inicio</button>
                  ) : (
                      <>
                        {isLogin ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
                        <button 
                            onClick={() => { setIsLogin(!isLogin); setError(''); }}
                            className="text-[#064e3b] font-bold hover:underline"
                        >
                            {isLogin ? 'Regístrate' : 'Inicia Sesión'}
                        </button>
                      </>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};
