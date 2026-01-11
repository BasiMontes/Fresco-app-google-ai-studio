
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

  const renderLeftContent = () => {
    switch (step) {
        case 1:
            return (
                <div key="step1" className="mt-8 space-y-4 animate-fade-in relative z-10">
                    <h1 className="text-6xl font-black leading-[1.1] mb-8 tracking-tight text-white">
                        Eres lo que<br/>
                        <span className="text-[#e87c3e]">comes.</span>
                    </h1>
                    <p className="text-teal-50 text-xl max-w-lg leading-relaxed font-normal opacity-90">
                        Dinos qué combustible prefieres. Vegetariano, Keto o sin límites. Nosotros nos encargamos de los ingredientes.
                    </p>
                </div>
            );
        case 2:
            return (
                <div key="step2" className="mt-8 space-y-4 animate-fade-in relative z-10">
                    <h1 className="text-6xl font-black leading-[1.1] mb-8 tracking-tight text-white">
                        ¿Qué te hace<br/>
                        <span className="text-[#e87c3e]">vibrar?</span>
                    </h1>
                    <p className="text-teal-50 text-xl max-w-lg leading-relaxed font-normal opacity-90">
                        Desde la nonna italiana hasta el street food de Bangkok. Diseñamos menús que no aburren.
                    </p>
                </div>
            );
        case 3:
            return (
                <div key="step3" className="mt-8 space-y-4 animate-fade-in relative z-10">
                    <h1 className="text-6xl font-black leading-[1.1] mb-8 tracking-tight text-white">
                        Ni sobra,<br/>
                        ni <span className="text-[#e87c3e]">falta.</span>
                    </h1>
                    <p className="text-teal-50 text-xl max-w-lg leading-relaxed font-normal opacity-90">
                        Ajustamos las compras al milímetro para tu hogar. Ahorra dinero y deja de tirar comida.
                    </p>
                </div>
            );
        default: return null;
    }
  };

  return (
    <div className="h-screen w-full flex bg-[#f8f9fa] overflow-hidden font-sans">
      
      {/* LEFT PANEL - BRANDING & CONTEXT */}
      <div className="hidden lg:flex lg:w-1/2 lg:shrink-0 bg-[#013b33] h-full flex-col justify-center px-20 relative text-white transition-colors duration-500">
        <div className="absolute top-12 left-12">
            <Logo variant="inverted" />
        </div>
        
        {renderLeftContent()}

        {/* Steps Indicator */}
        <div className="absolute bottom-12 left-12 flex gap-2">
            {[1, 2, 3].map(i => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i <= step ? 'w-8 bg-orange-500' : 'w-2 bg-white/20'}`} />
            ))}
        </div>
        
        {/* Background Decorations */}
        <div className="absolute -right-20 -bottom-20 w-[500px] h-[500px] bg-teal-800 rounded-full blur-[120px] opacity-30 animate-pulse-slow pointer-events-none" />
      </div>

      {/* RIGHT PANEL - FORM */}
      <div className="w-full lg:w-1/2 lg:shrink-0 h-full flex items-center justify-center p-6 relative">
        <div className="w-full max-w-[500px] h-[700px] bg-white p-10 md:p-14 rounded-[2.5rem] shadow-2xl shadow-gray-200/40 relative animate-slide-up flex flex-col">
            
            {/* Mobile Header */}
            <div className="lg:hidden mb-6 flex justify-center">
                 <Logo align="center" />
            </div>

            {/* Mobile Progress Bar */}
            <div className="lg:hidden w-full bg-gray-100 h-1 rounded-full mb-8 overflow-hidden">
                <div className="bg-teal-900 h-full transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} />
            </div>

            {/* Back Button */}
            <div className="flex justify-between items-center mb-6 h-8">
                {step > 1 ? (
                    <button onClick={handleBack} className="flex items-center gap-2 text-gray-400 hover:text-teal-900 font-bold text-[10px] uppercase tracking-widest transition-colors group">
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-teal-50 transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                        </div>
                        Atrás
                    </button>
                ) : <div />}
                <span className="text-gray-300 font-black text-[10px] uppercase tracking-[0.2em]">Paso {step} de 3</span>
            </div>

            <div className="flex-1 flex flex-col justify-center overflow-y-auto no-scrollbar py-2">
                {step === 1 && (
                    <div className="animate-fade-in space-y-6">
                        <div>
                            <h2 className="text-3xl font-black text-teal-900 mb-2">Tu Dieta</h2>
                            <p className="text-gray-500 font-medium leading-relaxed">Selecciona tus restricciones alimentarias para filtrar recetas incompatibles.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {DIETS.map((diet) => (
                                <button
                                    key={diet.id}
                                    onClick={() => toggleDiet(diet.id)}
                                    className={`px-5 py-4 rounded-2xl border-2 text-left flex items-center justify-between transition-all hover:scale-[1.01] active:scale-95 ${
                                        profile.dietary_preferences?.includes(diet.id)
                                        ? 'border-[#013b33] bg-teal-50 text-[#013b33] shadow-sm'
                                        : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{diet.emoji}</span>
                                        <span className="font-bold text-sm">{diet.label}</span>
                                    </div>
                                    {profile.dietary_preferences?.includes(diet.id) && (
                                        <div className="w-6 h-6 bg-[#013b33] rounded-full flex items-center justify-center">
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {step === 2 && (
                    <div className="animate-fade-in space-y-6">
                        <div>
                            <h2 className="text-3xl font-black text-teal-900 mb-2">Tus Gustos</h2>
                            <p className="text-gray-500 font-medium leading-relaxed">¿Qué tipo de cocina te inspira más en el día a día?</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {CUISINES.map((cuisine) => (
                                <button
                                    key={cuisine.id}
                                    onClick={() => toggleCuisine(cuisine.id)}
                                    className={`p-4 rounded-2xl border-2 text-center flex flex-col items-center justify-center gap-2 transition-all hover:shadow-md active:scale-95 h-32 ${
                                        profile.favorite_cuisines?.includes(cuisine.id)
                                        ? 'border-orange-500 bg-orange-50 text-orange-900 shadow-sm'
                                        : 'border-gray-100 bg-white text-gray-600 hover:border-orange-200'
                                    }`}
                                >
                                    <span className="text-4xl mb-1 filter drop-shadow-sm">{cuisine.emoji}</span>
                                    <span className="font-bold text-xs uppercase tracking-wide leading-tight">{cuisine.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-fade-in space-y-8">
                        <div className="text-center space-y-4">
                            <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mx-auto text-[#013b33]">
                                <ChefHat className="w-10 h-10" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-teal-900 mb-2">Raciones</h2>
                                <p className="text-gray-500 font-medium">¿Para cuántas personas cocinas habitualmente?</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-center gap-8 py-6">
                            <button 
                                onClick={() => setProfile(p => ({ ...p, household_size: Math.max(1, (p.household_size || 1) - 1) }))} 
                                className="w-16 h-16 rounded-2xl border-2 border-gray-100 text-2xl font-black hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-400 hover:text-teal-900 shadow-sm active:scale-90"
                            >-</button>
                            <div className="text-center w-24">
                                <span className="text-7xl font-black text-[#013b33] tracking-tighter">{profile.household_size}</span>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-2">Personas</p>
                            </div>
                            <button 
                                onClick={() => setProfile(p => ({ ...p, household_size: (p.household_size || 1) + 1 }))} 
                                className="w-16 h-16 rounded-2xl border-2 border-gray-100 text-2xl font-black hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-400 hover:text-teal-900 shadow-sm active:scale-90"
                            >+</button>
                        </div>
                        
                        <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 flex gap-4 items-start">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 text-orange-500">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <p className="text-orange-900 text-xs font-bold leading-relaxed pt-1">
                                Al finalizar, generaremos automáticamente un set inicial de recetas adaptadas a tu dieta para que empieces con buen pie.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-50">
                <button
                onClick={handleNext}
                disabled={!isValid && step < 3}
                className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg uppercase tracking-widest ${
                    isValid || step === 3 
                    ? 'bg-[#013b33] text-white hover:bg-[#012e28] active:scale-[0.98]' 
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
