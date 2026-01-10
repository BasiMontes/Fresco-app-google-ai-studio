
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
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Left Panel (Visual Context) */}
        <div className="hidden md:flex md:w-5/12 bg-teal-900 p-12 flex-col justify-between text-white relative overflow-hidden">
            <div className="relative z-10">
                <Logo variant="inverted" />
                <div className="mt-12 space-y-6">
                    <h1 className="text-4xl font-black leading-tight">Diseña tu<br/>experiencia<br/><span className="text-orange-500">culinaria.</span></h1>
                    <p className="text-teal-200 text-sm font-medium leading-relaxed max-w-xs">
                        Personalizamos cada recomendación basándonos en tus gustos y necesidades reales.
                    </p>
                </div>
            </div>
            {/* Steps Indicator Desktop */}
            <div className="flex gap-2 relative z-10">
                {[1, 2, 3].map(i => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i <= step ? 'w-8 bg-orange-500' : 'w-2 bg-white/20'}`} />
                ))}
            </div>
            
            {/* Background Decorations */}
            <div className="absolute top-[-20%] right-[-20%] w-96 h-96 bg-teal-800 rounded-full blur-[100px] opacity-50" />
            <div className="absolute bottom-[-10%] left-[-10%] w-72 h-72 bg-orange-600 rounded-full blur-[120px] opacity-30" />
        </div>

        {/* Right Panel (Form) */}
        <div className="w-full md:w-7/12 p-8 md:p-16 flex flex-col relative">
            {/* Mobile Progress Bar */}
            <div className="md:hidden w-full bg-gray-100 h-1.5 rounded-full mb-8 overflow-hidden">
                <div className="bg-teal-600 h-full transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} />
            </div>

            {/* Back Button */}
            <div className="flex justify-between items-center mb-8 h-10">
                {step > 1 ? (
                    <button onClick={handleBack} className="flex items-center gap-2 text-gray-400 hover:text-teal-900 font-bold text-xs uppercase tracking-widest transition-colors group">
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-teal-50">
                            <ChevronLeft className="w-4 h-4" />
                        </div>
                        Atrás
                    </button>
                ) : <div />}
                <span className="text-gray-300 font-black text-[10px] uppercase tracking-[0.2em]">Paso {step} de 3</span>
            </div>

            <div className="flex-1 flex flex-col justify-center">
                {step === 1 && (
                    <div className="animate-fade-in space-y-8">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-black text-teal-900 mb-2">Tu Dieta</h2>
                            <p className="text-gray-500 font-medium">Selecciona tus restricciones alimentarias.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {DIETS.map((diet) => (
                                <button
                                    key={diet.id}
                                    onClick={() => toggleDiet(diet.id)}
                                    className={`p-4 rounded-2xl border-2 text-left flex items-center space-x-3 transition-all hover:scale-[1.02] active:scale-95 ${
                                        profile.dietary_preferences?.includes(diet.id)
                                        ? 'border-teal-600 bg-teal-50 text-teal-900 shadow-md'
                                        : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200'
                                    }`}
                                >
                                    <span className="text-2xl">{diet.emoji}</span>
                                    <span className="font-bold text-sm">{diet.label}</span>
                                    {profile.dietary_preferences?.includes(diet.id) && <Check className="w-4 h-4 ml-auto text-teal-600" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {step === 2 && (
                    <div className="animate-fade-in space-y-8">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-black text-teal-900 mb-2">Tus Gustos</h2>
                            <p className="text-gray-500 font-medium">¿Qué tipo de cocina te inspira más?</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {CUISINES.map((cuisine) => (
                                <button
                                    key={cuisine.id}
                                    onClick={() => toggleCuisine(cuisine.id)}
                                    className={`p-6 rounded-[2rem] border-2 text-center flex flex-col items-center justify-center gap-3 transition-all hover:shadow-lg active:scale-95 ${
                                        profile.favorite_cuisines?.includes(cuisine.id)
                                        ? 'border-orange-500 bg-orange-50 text-orange-900 shadow-md'
                                        : 'border-gray-100 bg-white text-gray-600 hover:border-orange-200'
                                    }`}
                                >
                                    <span className="text-4xl">{cuisine.emoji}</span>
                                    <span className="font-bold text-sm">{cuisine.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-fade-in space-y-8">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6 text-teal-700">
                                <ChefHat className="w-10 h-10" />
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black text-teal-900 mb-2">Raciones</h2>
                            <p className="text-gray-500 font-medium">¿Para cuántas personas cocinas habitualmente?</p>
                        </div>
                        
                        <div className="flex items-center justify-center gap-8 py-8">
                            <button 
                                onClick={() => setProfile(p => ({ ...p, household_size: Math.max(1, (p.household_size || 1) - 1) }))} 
                                className="w-16 h-16 rounded-2xl border-2 border-gray-100 text-2xl font-black hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-400 hover:text-teal-900"
                            >-</button>
                            <div className="text-center w-24">
                                <span className="text-6xl font-black text-teal-900 tracking-tighter">{profile.household_size}</span>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-2">Personas</p>
                            </div>
                            <button 
                                onClick={() => setProfile(p => ({ ...p, household_size: (p.household_size || 1) + 1 }))} 
                                className="w-16 h-16 rounded-2xl border-2 border-gray-100 text-2xl font-black hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-400 hover:text-teal-900"
                            >+</button>
                        </div>
                        
                        <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 flex gap-4">
                            <Sparkles className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                            <p className="text-orange-800 text-sm font-medium leading-relaxed">
                                Al finalizar, generaremos automáticamente un set inicial de recetas adaptadas a tu dieta para que empieces con buen pie.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-10 pt-6 border-t border-gray-50">
                <button
                onClick={handleNext}
                disabled={!isValid && step < 3}
                className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-xl ${
                    isValid || step === 3 
                    ? 'bg-teal-900 text-white hover:bg-teal-800 active:scale-[0.98]' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                >
                {step === 3 ? <>Diseñar mi Menú <ArrowRight className="w-5 h-5" /></> : <>Continuar <ArrowRight className="w-5 h-5" /></>}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
