
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { UserProfile, DietPreference, CuisineType } from '../types';
import { Logo } from './Logo';
// Fix: Added missing ArrowRight icon to the import list
import { User, Users, ChefHat, Settings, LogOut, Download, Trash2, ShieldCheck, Heart, ChevronRight, Upload, Globe, Trophy, PiggyBank, Sparkles, Smartphone, Share as ShareIcon, Bug, Mail, Send, RefreshCw, Shield, HelpCircle, FileText, Check, ArrowRight } from 'lucide-react';

interface ProfileProps {
  user: UserProfile;
  onUpdate: (updatedUser: UserProfile) => void;
  onLogout: () => void;
  onReset: () => void;
}

const DIETS: { id: DietPreference; label: string; emoji: string }[] = [
  { id: 'vegetarian', label: 'Vegetarian', emoji: '🥦' },
  { id: 'vegan', label: 'Vegan', emoji: '🌱' },
  { id: 'gluten_free', label: 'Gluten Free', emoji: '🌾' },
  { id: 'keto', label: 'Keto', emoji: '🥑' },
  { id: 'none', label: 'Kosher', emoji: '🥩' }, // Usando labels de la imagen del usuario
  { id: 'healthy', label: 'Healthy', emoji: '🥗' },
];

const EXTRA_TAGS = ['Indian', 'Fast']; // Tags adicionales mostrados en la imagen

export const Profile: React.FC<ProfileProps> = ({ user, onUpdate, onLogout, onReset }) => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  
  // Estado local para preferencias (para el flujo de confirmación)
  const [tempPreferences, setTempPreferences] = useState<DietPreference[]>(user.dietary_preferences);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
        e.preventDefault();
        setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt' as any, handler);
    return () => window.removeEventListener('beforeinstallprompt' as any, handler);
  }, []);

  const hasChanges = useMemo(() => {
    return JSON.stringify([...tempPreferences].sort()) !== JSON.stringify([...user.dietary_preferences].sort());
  }, [tempPreferences, user.dietary_preferences]);

  const handleUpdatePreferences = () => {
    setIsUpdating(true);
    onUpdate({ ...user, dietary_preferences: tempPreferences });
    setTimeout(() => setIsUpdating(false), 800);
  };

  const togglePreference = (id: DietPreference) => {
    setTempPreferences(prev => 
        prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
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
      {/* User Header */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-50 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl shadow-xl border-4 border-gray-50 overflow-hidden">
            <InitialsAvatar name={user.name} />
        </div>
        <div className="flex-1">
            <h1 className="text-xl font-black text-teal-900 tracking-tight leading-none mb-1">{user.name}</h1>
            <p className="text-gray-400 font-bold uppercase text-[9px] tracking-[0.2em]">{user.email || 'Planificador Fresco'}</p>
        </div>
        <div className="bg-teal-50 text-teal-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
            <PiggyBank className="w-3.5 h-3.5" /> {user.total_savings.toFixed(0)}€
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Preferencias Card (Según imagen del usuario) */}
        <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col">
            <h3 className="text-xl font-black text-gray-900 mb-6">Preferencias</h3>
            
            <div className="flex flex-wrap gap-2 mb-8">
                {DIETS.map(diet => {
                    const isSelected = tempPreferences.includes(diet.id);
                    return (
                        <button
                            key={diet.id}
                            onClick={() => togglePreference(diet.id)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-2 ${
                                isSelected
                                ? 'bg-teal-50 border-teal-200 text-teal-800 shadow-sm'
                                : 'bg-white border-gray-100 text-gray-400 hover:border-teal-100'
                            }`}
                        >
                            {diet.label}
                        </button>
                    );
                })}
                {EXTRA_TAGS.map(tag => (
                    <button key={tag} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white border-2 border-gray-100 text-gray-400 opacity-60">{tag}</button>
                ))}
            </div>

            <div className="mt-auto pt-6 border-t border-gray-50">
                <button 
                    onClick={handleUpdatePreferences}
                    disabled={!hasChanges || isUpdating}
                    className={`w-full h-14 rounded-2xl font-black text-sm flex items-center justify-between px-6 transition-all border-2 ${
                        hasChanges 
                        ? 'bg-teal-900 text-white border-teal-900 shadow-xl' 
                        : 'bg-white text-gray-300 border-gray-100 cursor-not-allowed'
                    }`}
                >
                    {isUpdating ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : (
                        <>
                            <span>Actualizar Preferencias</span>
                            <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>
            </div>
        </section>

        {/* Ayuda Card (Según imagen del usuario) */}
        <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <h3 className="text-xl font-black text-gray-900 mb-6">Ayuda</h3>
            <div className="space-y-3">
                {[
                    { icon: Settings, label: 'Configuración', color: 'text-teal-600' },
                    { icon: Shield, label: 'Política de Privacidad', color: 'text-teal-600' },
                    { icon: HelpCircle, label: 'FAQ', color: 'text-teal-600' },
                    { icon: FileText, label: 'Términos de Servicio', color: 'text-teal-600' }
                ].map((item, idx) => (
                    <button key={idx} className="w-full h-16 bg-white border-2 border-gray-50 hover:border-teal-100 rounded-2xl px-5 flex items-center justify-between group transition-all">
                        <div className="flex items-center gap-4">
                            <item.icon className={`w-5 h-5 ${item.color}`} />
                            <span className="font-bold text-sm text-gray-800">{item.label}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:translate-x-1 transition-transform" />
                    </button>
                ))}
            </div>
        </section>

        {/* Centro de Seguridad (Inverted) */}
        <section className="bg-teal-900 p-8 rounded-[2.5rem] shadow-2xl space-y-6 md:col-span-2 text-white relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex-1 text-center md:text-left">
                    <h3 className="text-xl font-black tracking-tight">Tus datos son tuyos.</h3>
                    <p className="text-teal-300 font-medium text-xs opacity-60">Sincronización en la nube activa.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={exportData} className="px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">Backup JSON</button>
                    <button onClick={() => { if(confirm("¿Cerrar sesión?")) onLogout(); }} className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2">
                        <LogOut className="w-3.5 h-3.5" /> Salir
                    </button>
                </div>
            </div>
            <button 
                onClick={() => { if(confirm("¿BORRAR TODO? Esto no se puede deshacer.")) onReset(); }}
                className="w-full h-14 bg-red-500/10 border-2 border-red-500/20 rounded-2xl flex items-center justify-center gap-3 text-red-200 font-black text-[10px] uppercase tracking-widest hover:bg-red-500/20 transition-all"
            >
                <Trash2 className="w-4 h-4" /> Borrar Cuenta Definitivamente
            </button>
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-orange-500 rounded-full blur-[150px] opacity-10" />
        </section>
      </div>
    </div>
  );

  function exportData() {
    const data = { profile: user, pantry: [], plan: [], recipes: [], metadata: { version: 1, date: new Date().toISOString() }};
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fresco_backup.json`;
    a.click();
  }
};
