
import React, { useRef, useEffect, useState } from 'react';
import { UserProfile, DietPreference, CuisineType } from '../types';
import { Logo } from './Logo';
import { User, Users, ChefHat, Settings, LogOut, Download, Trash2, ShieldCheck, Heart, ChevronRight, Upload, Globe, Trophy, PiggyBank, Sparkles, Smartphone, Share as ShareIcon, Bug, Mail, Send, RefreshCw } from 'lucide-react';

interface ProfileProps {
  user: UserProfile;
  onUpdate: (updatedUser: UserProfile) => void;
  onLogout: () => void;
  onReset: () => void;
}

const DIETS: { id: DietPreference; label: string; emoji: string }[] = [
  { id: 'vegetarian', label: 'Vegetariano', emoji: '🥦' },
  { id: 'vegan', label: 'Vegano', emoji: '🌱' },
  { id: 'gluten_free', label: 'Sin Gluten', emoji: '🌾' },
  { id: 'keto', label: 'Keto', emoji: '🥩' },
  { id: 'none', label: 'Sin restricciones', emoji: '🍽️' },
];

const CUISINES: { id: CuisineType; label: string; emoji: string }[] = [
  { id: 'mediterranean', label: 'Mediterránea', emoji: '🫒' },
  { id: 'italian', label: 'Italiana', emoji: '🍝' },
  { id: 'mexican', label: 'Mexicana', emoji: '🌮' },
  { id: 'asian', label: 'Asiática', emoji: '🥢' },
  { id: 'spanish', label: 'Española', emoji: '🥘' },
  { id: 'healthy', label: 'Saludable', emoji: '🥗' },
];

export const Profile: React.FC<ProfileProps> = ({ user, onUpdate, onLogout, onReset }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);
    
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(standalone);

    const handler = (e: Event) => {
        e.preventDefault();
        setInstallPrompt(e);
    };
    // FIX: TypeScript no reconoce 'beforeinstallprompt' por defecto, usamos 'as any'
    window.addEventListener('beforeinstallprompt' as any, handler);
    return () => window.removeEventListener('beforeinstallprompt' as any, handler);
  }, []);

  const handleInstall = () => {
      if (installPrompt) {
          installPrompt.prompt();
          installPrompt.userChoice.then((choiceResult: any) => {
              if (choiceResult.outcome === 'accepted') {
                  setInstallPrompt(null);
              }
          });
      }
  };

  // QA FIX BB-09: Backup Versioning
  const exportData = () => {
    const data = {
        metadata: {
            version: 1,
            date: new Date().toISOString(),
            app: 'Fresco'
        },
        profile: user,
        pantry: JSON.parse(localStorage.getItem('fresco_pantry') || '[]'),
        plan: JSON.parse(localStorage.getItem('fresco_plan') || '[]'),
        recipes: JSON.parse(localStorage.getItem('fresco_recipes') || '[]')
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fresco_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const raw = JSON.parse(event.target?.result as string);
          
          // Soporte Retrocompatible (v0 sin metadata)
          const data = raw.metadata ? raw : { profile: raw.profile, pantry: raw.pantry, plan: raw.plan, recipes: raw.recipes };

          if (data.profile) {
            if (confirm("Esto sobrescribirá tus datos actuales. ¿Continuar?")) {
                localStorage.setItem('fresco_user', JSON.stringify(data.profile));
                localStorage.setItem('fresco_pantry', JSON.stringify(data.pantry || []));
                localStorage.setItem('fresco_plan', JSON.stringify(data.plan || []));
                localStorage.setItem('fresco_recipes', JSON.stringify(data.recipes || []));
                window.location.reload();
            }
          } else {
              throw new Error("Formato inválido");
          }
        } catch (err) {
          alert("Error al importar: El archivo no es válido o es incompatible.");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleShareApp = async () => {
      const shareData = {
          title: 'Prueba Fresco Beta',
          text: '¡Estoy probando esta app de cocina inteligente y gestión de despensa! Únete a la beta:',
          url: window.location.origin
      };

      if (navigator.share) {
          try { await navigator.share(shareData); } catch(e) {}
      } else {
          navigator.clipboard.writeText(window.location.origin);
          alert("Enlace copiado al portapapeles");
      }
  };

  const handleFeedback = () => {
      const subject = encodeURIComponent("Feedback Beta Fresco v1.0");
      const body = encodeURIComponent(`Hola equipo Fresco,\n\nHe encontrado un bug / Tengo una sugerencia:\n\n[ESCRIBE AQUÍ]\n\nDatos técnicos (No borrar):\nUser: ${user.name}\nOS: ${navigator.platform}\nUA: ${navigator.userAgent}`);
      window.location.href = `mailto:feedback@fresco.app?subject=${subject}&body=${body}`;
  };

  const InitialsAvatar = ({ name }: { name: string }) => {
      const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      return (
          <div className="w-full h-full bg-gradient-to-br from-teal-500 to-teal-800 flex items-center justify-center text-white font-black text-3xl">
              {initials}
          </div>
      );
  };

  return (
    <div className="space-y-10 animate-fade-in pb-48" role="main">
      <div className="bg-white p-12 md:p-4 rounded-[4rem] md:rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-10 md:gap-6">
        <div className="relative">
            <div className="w-32 h-32 md:w-20 md:h-20 rounded-[2rem] shadow-2xl border-4 border-gray-50 overflow-hidden">
                <InitialsAvatar name={user.name} />
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 md:w-8 md:h-8 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-xl border-4 border-white">
                <Trophy className="w-6 h-6 md:w-4 md:h-4" />
            </div>
        </div>
        <div className="text-center md:text-left flex-1">
            <h1 className="text-5xl md:text-2xl font-black text-teal-900 tracking-tight leading-none mb-2">{user.name}</h1>
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em] mb-6 md:mb-3">{user.email || 'Planificador Fresco'}</p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <div className="bg-teal-50 text-teal-700 px-4 py-2 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2">
                    <PiggyBank className="w-4 h-4" /> {user.total_savings.toFixed(2)}€ Ahorrados
                </div>
                <div className="bg-orange-50 text-orange-700 px-4 py-2 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Nivel {Math.floor((user.total_savings || 0)/20) + 1}
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {installPrompt && (
            <button 
                onClick={handleInstall}
                className="col-span-1 md:col-span-2 bg-gradient-to-r from-teal-900 to-teal-800 p-8 rounded-[3rem] text-white flex items-center justify-between shadow-2xl hover:scale-[1.01] transition-transform"
            >
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                        <Smartphone className="w-8 h-8 text-teal-200" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-black text-xl">Instalar Fresco</h3>
                        <p className="text-teal-200 text-sm">Acceso rápido sin navegador</p>
                    </div>
                </div>
                <div className="bg-white text-teal-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">
                    Instalar
                </div>
            </button>
        )}

        {/* Zona Beta Tester (NUEVO) */}
        <section className="bg-white p-10 md:p-6 rounded-[3.5rem] md:rounded-[2rem] shadow-sm border border-gray-100 space-y-8 md:col-span-2" aria-labelledby="beta-title">
            <h3 id="beta-title" className="text-[11px] font-black uppercase tracking-[0.4em] text-teal-700 flex items-center gap-2">
                <Bug className="w-4 h-4" /> Zona Beta Tester
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                    onClick={handleShareApp}
                    className="p-6 md:p-4 bg-teal-50 rounded-[2.5rem] flex items-center gap-4 hover:bg-teal-100 transition-colors group text-left"
                >
                    <div className="w-14 h-14 md:w-10 md:h-10 bg-white rounded-2xl flex items-center justify-center text-teal-600 shadow-sm group-hover:scale-110 transition-transform">
                        <ShareIcon className="w-6 h-6 md:w-4 md:h-4" />
                    </div>
                    <div>
                        <h4 className="font-black text-teal-900 text-sm">Invitar Amigos</h4>
                        <p className="text-[10px] text-teal-600/70 font-medium">Comparte el enlace de prueba</p>
                    </div>
                </button>

                <button 
                    onClick={handleFeedback}
                    className="p-6 md:p-4 bg-orange-50 rounded-[2.5rem] flex items-center gap-4 hover:bg-orange-100 transition-colors group text-left"
                >
                    <div className="w-14 h-14 md:w-10 md:h-10 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-sm group-hover:scale-110 transition-transform">
                        <Mail className="w-6 h-6 md:w-4 md:h-4" />
                    </div>
                    <div>
                        <h4 className="font-black text-orange-900 text-sm">Reportar Bug</h4>
                        <p className="text-[10px] text-orange-600/70 font-medium">Ayúdanos a mejorar</p>
                    </div>
                </button>
            </div>
        </section>

        {/* Ajustes Básicos */}
        <section className="bg-white p-10 md:p-6 rounded-[3.5rem] md:rounded-[2rem] shadow-sm border border-gray-100 space-y-8" aria-labelledby="settings-title">
            <h3 id="settings-title" className="text-[11px] font-black uppercase tracking-[0.4em] text-orange-600 flex items-center gap-2">
                <Settings className="w-4 h-4" /> Perfil de Cocina
            </h3>
            
            <div className="space-y-6">
                <div className="flex items-center justify-between p-6 md:p-4 bg-gray-50 rounded-[2.5rem]">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 md:w-10 md:h-10 bg-white rounded-2xl flex items-center justify-center text-teal-600 shadow-sm">
                            <Users className="w-7 h-7 md:w-5 md:h-5" />
                        </div>
                        <div>
                            <p className="font-black text-gray-900 text-lg md:text-sm">Comensales</p>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Raciones IA</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => onUpdate({ ...user, household_size: Math.max(1, user.household_size - 1) })}
                            className="w-12 h-12 md:w-8 md:h-8 bg-white rounded-2xl flex items-center justify-center font-black shadow-sm active:scale-90 transition-all hover:bg-teal-600 hover:text-white"
                        >-</button>
                        <span className="font-black text-2xl md:text-lg text-teal-900 w-8 text-center">{user.household_size}</span>
                        <button 
                            onClick={() => onUpdate({ ...user, household_size: user.household_size + 1 })}
                            className="w-12 h-12 md:w-8 md:h-8 bg-white rounded-2xl flex items-center justify-center font-black shadow-sm active:scale-90 transition-all hover:bg-teal-600 hover:text-white"
                        >+</button>
                    </div>
                </div>

                <div className="flex items-center justify-between p-6 md:p-4 bg-gray-50 rounded-[2.5rem]">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 md:w-10 md:h-10 bg-white rounded-2xl flex items-center justify-center text-orange-600 shadow-sm">
                            <ChefHat className="w-7 h-7 md:w-5 md:h-5" />
                        </div>
                        <div>
                            <p className="font-black text-gray-900 text-lg md:text-sm">Experiencia</p>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Dificultad IA</p>
                        </div>
                    </div>
                    <select 
                        value={user.cooking_experience}
                        onChange={(e) => onUpdate({ ...user, cooking_experience: e.target.value as any })}
                        className="bg-white border-none rounded-2xl px-6 py-3 font-black text-xs text-teal-800 shadow-sm focus:ring-2 focus:ring-teal-500 cursor-pointer appearance-none"
                    >
                        <option value="beginner">Novato</option>
                        <option value="intermediate">Medio</option>
                        <option value="advanced">Chef</option>
                    </select>
                </div>
            </div>
        </section>

        {/* Dieta */}
        <section className="bg-white p-10 md:p-6 rounded-[3.5rem] md:rounded-[2rem] shadow-sm border border-gray-100 space-y-6" aria-labelledby="diet-title">
            <h3 id="diet-title" className="text-[11px] font-black uppercase tracking-[0.4em] text-teal-700 flex items-center gap-2">
                <Heart className="w-4 h-4" /> Restricciones
            </h3>
            <div className="flex flex-wrap gap-3">
                {DIETS.map(diet => (
                    <button
                        key={diet.id}
                        onClick={() => {
                            const current = user.dietary_preferences;
                            const updated = current.includes(diet.id) 
                                ? current.filter(d => d !== diet.id) 
                                : [...current, diet.id];
                            onUpdate({ ...user, dietary_preferences: updated as any });
                        }}
                        className={`px-6 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                            user.dietary_preferences.includes(diet.id)
                            ? 'bg-teal-900 text-white border-teal-900 shadow-xl'
                            : 'bg-white text-gray-500 border-gray-100 hover:border-teal-200'
                        }`}
                    >
                        {diet.emoji} {diet.label}
                    </button>
                ))}
            </div>
        </section>

        {/* Centro de Seguridad */}
        <section className="bg-teal-900 p-12 md:p-6 rounded-[4rem] md:rounded-[2rem] shadow-2xl space-y-8 md:col-span-2 text-white relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                <div className="flex-1 space-y-4 text-center md:text-left">
                    <h3 className="text-3xl md:text-xl font-black tracking-tight">Tus datos son tuyos.</h3>
                    <p className="text-teal-300 font-medium text-lg md:text-sm opacity-60">Gestiona tu información o soluciona problemas con la base de datos.</p>
                </div>
                <div className="flex flex-wrap gap-4 justify-center">
                    <button 
                        onClick={exportData}
                        className="px-8 py-5 bg-white text-teal-900 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-3"
                    >
                        <Download className="w-5 h-5" /> Backup JSON
                    </button>
                </div>
            </div>
            
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
                <button 
                    onClick={() => { if(confirm("¿Cerrar sesión?")) onLogout(); }}
                    className="flex items-center justify-between p-8 md:p-6 bg-white/5 rounded-[2.5rem] hover:bg-white/10 group transition-all border border-white/10"
                >
                    <div className="flex items-center gap-4">
                        <LogOut className="w-7 h-7 text-orange-400" />
                        <span className="font-black text-xl md:text-sm">Cerrar Sesión</span>
                    </div>
                    <ChevronRight className="w-6 h-6 text-white/20 group-hover:translate-x-1 transition-transform" />
                </button>

                <button 
                    onClick={() => { if(confirm("¿BORRAR TODO? Esto no se puede deshacer.")) onReset(); }}
                    className="flex items-center justify-between p-8 md:p-6 bg-red-500/10 rounded-[2.5rem] hover:bg-red-500/20 group transition-all border border-red-500/20"
                >
                    <div className="flex items-center gap-4">
                        <Trash2 className="w-7 h-7 text-red-400" />
                        <span className="font-black text-xl md:text-sm text-red-200">Borrar Cuenta</span>
                    </div>
                    <ChevronRight className="w-6 h-6 text-red-500/20 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-orange-500 rounded-full blur-[150px] opacity-10" />
        </section>
      </div>

      <div className="text-center space-y-2 opacity-30 mt-20">
          <p className="text-[10px] font-black uppercase tracking-[0.5em]">Fresco v1.0 (Gold-Beta)</p>
          <p className="text-[8px] font-bold">Respetando tu tiempo y tu bolsillo 🍊</p>
      </div>
    </div>
  );
};
