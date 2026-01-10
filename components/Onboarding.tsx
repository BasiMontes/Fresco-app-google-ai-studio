
import React, { useState, useEffect } from 'react';
import { UserProfile, DietPreference, CuisineType } from '../types';
import { ArrowRight, Check, Sparkles, ChevronLeft, ChefHat } from 'lucide-react';
import { Logo } from './Logo';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

const DIETS: { id: DietPreference; label: string; emoji: string }[] = [
  { id: 'vegetarian', label: 'Vegetariano', emoji: '🥦' },
  { id: 'vegan', label: 'Vegano', emoji: '🌱' },
  { id: 'gluten_free', label: 'Sin Gluten', emoji: '🌾' },
  { id: 'lactose_free', label: 'Sin Lactosa', emoji: '🥛' },
  { id: 'keto', label: 'Keto', emoji: '🥩' },
  { id: 'paleo', label: 'Paleo', emoji: '🦴' },
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

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    name: 'Usuario',
    dietary_preferences: [],
    favorite_cuisines: [],
    cooking_experience: 'intermediate',
    household_size: 1,
  });

  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (step === 1) setIsValid((profile.dietary_preferences?.length || 0) > 0);
    else if (step === 2) setIsValid((profile.favorite_cuisines?.length || 0) > 0);
    else setIsValid(true);
  }, [step, profile]);

  const toggleDiet = (item: DietPreference) => {
    let newList = [...(profile.dietary_preferences || [])];
    
    // Lógica Excluyente
    if (item === 'none') {
        newList = ['none']; 
    } else {
        newList = newList.filter(i => i !== 'none');
        if (item === 'vegan') newList = newList.filter(i => i !== 'vegetarian');
        if (item === 'vegetarian' && newList.includes('vegan')) newList = newList.filter(i => i !== 'vegan');
        
        if (newList.includes(item)) {
            newList = newList.filter(i => i !== item);
        } else {
            newList.push(item);
        }
    }
    setProfile(p => ({ ...p, dietary_preferences: newList as DietPreference[] }));
  };

  const toggleCuisine = (item: CuisineType) => {
    let newList = [...(profile.favorite_cuisines || [])];
    if (newList.includes(item)) {
      newList = newList.filter(i => i !== item);
    } else {
      newList.push(item);
    }
    setProfile(p => ({ ...p, favorite_cuisines: newList as CuisineType[] }));
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else onComplete({ ...profile, onboarding_completed: true, total_savings: 0, meals_cooked: 0, history_savings: [] } as UserProfile);
  };

  const handleBack = () => {
      if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4 font-sans">
      {/* Contenedor reducido: max-w-3xl y min-h-[450px] para evitar scroll */}
      <div className="w-full max-w-3xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[450px] transition-all">
        
        {/* Left Panel (Visual Context) */}
        <div className="hidden md:flex md:w-5/12 bg-teal-900 p-8 flex-col justify-between text-white relative overflow-hidden">
            <div className="relative z-10">
                <Logo variant="inverted" className="scale-90 origin-left" />
                <div className="mt-8 space-y-4">
                    <h1 className="text-3xl font-black leading-tight">Diseña tu<br/>experiencia<br/><span className="text-orange-500">culinaria.</span></h1>
                    <p className="text-teal-200 text-xs font-medium leading-relaxed max-w-xs">
                        Personalizamos cada recomendación basándonos en tus gustos y necesidades reales.
                    </p>
                </div>
            </div>
            {/* Steps Indicator Desktop */}
            <div className="flex gap-2 relative z-10">
                {[1, 2, 3].map(i => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i <= step ? 'w-6 bg-orange-500' : 'w-2 bg-white/20'}`} />
                ))}
            </div>
            
            {/* Background Decorations */}
            <div className="absolute top-[-20%] right-[-20%] w-80 h-80 bg-teal-800 rounded-full blur-[80px] opacity-50" />
            <div className="absolute bottom-[-10%] left-[-10%] w-60 h-60 bg-orange-600 rounded-full blur-[100px] opacity-30" />
        </div>

        {/* Right Panel (Form) */}
        <div className="w-full md:w-7/12 p-6 md:p-10 flex flex-col relative">
            {/* Mobile Progress Bar */}
            <div className="md:hidden w-full bg-gray-100 h-1 rounded-full mb-6 overflow-hidden">
                <div className="bg-teal-600 h-full transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} />
            </div>

            {/* Back Button */}
            <div className="flex justify-between items-center mb-4 h-8">
                {step > 1 ? (
                    <button onClick={handleBack} className="flex items-center gap-2 text-gray-400 hover:text-teal-900 font-bold text-[10px] uppercase tracking-widest transition-colors group">
                        <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-teal-50">
                            <ChevronLeft className="w-3 h-3" />
                        </div>
                        Atrás
                    </button>
                ) : <div />}
                <span className="text-gray-300 font-black text-[9px] uppercase tracking-[0.2em]">Paso {step} de 3</span>
            </div>

            <div className="flex-1 flex flex-col justify-center">
                {step === 1 && (
                    <div className="animate-fade-in space-y-4">
                        <div>
                            <h2 className="text-2xl font-black text-teal-900 mb-1">Tu Dieta</h2>
                            <p className="text-gray-500 text-xs font-medium">Selecciona tus restricciones alimentarias.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {DIETS.map((diet) => (
                                <button
                                    key={diet.id}
                                    onClick={() => toggleDiet(diet.id)}
                                    className={`px-3 py-2.5 rounded-xl border-2 text-left flex items-center space-x-2 transition-all hover:scale-[1.01] active:scale-95 ${
                                        profile.dietary_preferences?.includes(diet.id)
                                        ? 'border-teal-600 bg-teal-50 text-teal-900 shadow-sm'
                                        : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200'
                                    }`}
                                >
                                    <span className="text-lg">{diet.emoji}</span>
                                    <span className="font-bold text-xs">{diet.label}</span>
                                    {profile.dietary_preferences?.includes(diet.id) && <Check className="w-3 h-3 ml-auto text-teal-600" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {step === 2 && (
                    <div className="animate-fade-in space-y-4">
                        <div>
                            <h2 className="text-2xl font-black text-teal-900 mb-1">Tus Gustos</h2>
                            <p className="text-gray-500 text-xs font-medium">¿Qué tipo de cocina te inspira más?</p>
                        </div>
                        {/* Grid de 3 columnas para ahorrar espacio vertical */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {CUISINES.map((cuisine) => (
                                <button
                                    key={cuisine.id}
                                    onClick={() => toggleCuisine(cuisine.id)}
                                    className={`p-3 rounded-2xl border-2 text-center flex flex-col items-center justify-center gap-1 transition-all hover:shadow-md active:scale-95 h-24 ${
                                        profile.favorite_cuisines?.includes(cuisine.id)
                                        ? 'border-orange-500 bg-orange-50 text-orange-900 shadow-sm'
                                        : 'border-gray-100 bg-white text-gray-600 hover:border-orange-200'
                                    }`}
                                >
                                    <span className="text-3xl mb-1">{cuisine.emoji}</span>
                                    <span className="font-bold text-[10px] uppercase tracking-wide leading-tight">{cuisine.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-fade-in space-y-6">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4 text-teal-700">
                                <ChefHat className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-black text-teal-900 mb-1">Raciones</h2>
                            <p className="text-gray-500 text-xs font-medium">¿Para cuántas personas cocinas habitualmente?</p>
                        </div>
                        
                        <div className="flex items-center justify-center gap-6 py-4">
                            <button 
                                onClick={() => setProfile(p => ({ ...p, household_size: Math.max(1, (p.household_size || 1) - 1) }))} 
                                className="w-12 h-12 rounded-xl border-2 border-gray-100 text-xl font-black hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-400 hover:text-teal-900"
                            >-</button>
                            <div className="text-center w-20">
                                <span className="text-5xl font-black text-teal-900 tracking-tighter">{profile.household_size}</span>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mt-1">Personas</p>
                            </div>
                            <button 
                                onClick={() => setProfile(p => ({ ...p, household_size: (p.household_size || 1) + 1 }))} 
                                className="w-12 h-12 rounded-xl border-2 border-gray-100 text-xl font-black hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-400 hover:text-teal-900"
                            >+</button>
                        </div>
                        
                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex gap-3">
                            <Sparkles className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                            <p className="text-orange-800 text-xs font-medium leading-relaxed">
                                Al finalizar, generaremos automáticamente un set inicial de recetas adaptadas a tu dieta para que empieces con buen pie.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-50">
                <button
                onClick={handleNext}
                disabled={!isValid && step < 3}
                className={`w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
                    isValid || step === 3 
                    ? 'bg-teal-900 text-white hover:bg-teal-800 active:scale-[0.98]' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                >
                {step === 3 ? <>Diseñar mi Menú <ArrowRight className="w-4 h-4" /></> : <>Continuar <ArrowRight className="w-4 h-4" /></>}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
