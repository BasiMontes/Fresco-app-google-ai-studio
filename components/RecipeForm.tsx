
import React, { useState } from 'react';
import { X, Plus, Trash2, Check, ChefHat, Clock, Utensils, Tag, ChevronDown } from 'lucide-react';
import { Recipe, Ingredient, Difficulty, MealCategory, CuisineType } from '../types';

interface RecipeFormProps {
  onClose: () => void;
  onSave: (recipe: Recipe) => void;
}

const CATEGORIES: { id: MealCategory; label: string; emoji: string }[] = [
  { id: 'breakfast', label: 'Desayuno', emoji: '🌅' },
  { id: 'lunch', label: 'Comida', emoji: '☀️' },
  { id: 'dinner', label: 'Cena', emoji: '🌙' },
];

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Fácil' },
  { id: 'medium', label: 'Media' },
  { id: 'hard', label: 'Difícil' },
];

const CUISINES: CuisineType[] = ['mediterranean', 'italian', 'mexican', 'asian', 'spanish', 'healthy', 'fast', 'indian'];

const UNIT_OPTIONS = [
  { id: 'uds', label: 'unidades' },
  { id: 'g', label: 'gramos' },
  { id: 'kg', label: 'kilogramos' },
  { id: 'ml', label: 'mililitros' },
  { id: 'l', label: 'litros' },
  { id: 'taza', label: 'taza' },
  { id: 'cda', label: 'cucharada' },
  { id: 'cdta', label: 'cucharadita' },
  { id: 'pizca', label: 'pizca' },
  { id: 'puñado', label: 'puñado' },
  { id: 'rebanada', label: 'rebanada' },
  { id: 'diente', label: 'diente' },
];

const INPUT_STYLE = "w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-teal-900 outline-none focus:border-teal-500/20 transition-all placeholder:text-gray-300";
const LABEL_STYLE = "text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block";

export const RecipeForm: React.FC<RecipeFormProps> = ({ onClose, onSave }) => {
  const [step, setStep] = useState(1); 
  const [formData, setFormData] = useState<Partial<Recipe>>({
    title: '',
    description: '',
    meal_category: 'lunch',
    difficulty: 'easy',
    prep_time: 20,
    servings: 2,
    cuisine_type: 'mediterranean',
    ingredients: [{ name: '', quantity: 1, unit: 'uds', category: 'other' }],
    instructions: [''],
    dietary_tags: ['healthy'],
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80'
  });

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...(prev.ingredients || []), { name: '', quantity: 1, unit: 'uds', category: 'other' }]
    }));
  };

  const removeIngredient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients?.filter((_, i) => i !== index)
    }));
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: any) => {
    const newIngs = [...(formData.ingredients || [])];
    newIngs[index] = { ...newIngs[index], [field]: value };
    setFormData({ ...formData, ingredients: newIngs });
  };

  const addStep = () => {
    setFormData(prev => ({ ...prev, instructions: [...(prev.instructions || []), ''] }));
  };

  const removeStep = (index: number) => {
    setFormData(prev => ({ ...prev, instructions: prev.instructions?.filter((_, i) => i !== index) }));
  };

  const updateStepText = (index: number, text: string) => {
    const newSteps = [...(formData.instructions || [])];
    newSteps[index] = text;
    setFormData({ ...formData, instructions: newSteps });
  };

  const handleSave = () => {
    if (!formData.title || (formData.ingredients?.length || 0) === 0) return;
    onSave({
      ...formData,
      id: `manual-${Date.now()}`,
    } as Recipe);
  };

  return (
    <div className="fixed inset-0 z-[5000] bg-teal-900/60 backdrop-blur-xl flex items-center justify-center p-4 md:p-6 animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl h-[90vh] md:h-auto md:max-h-[85vh] rounded-[3rem] overflow-hidden flex flex-col shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-black text-teal-900 leading-none">Nueva Receta</h2>
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mt-2">Paso {step} de 3</p>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 no-scrollbar bg-gray-50/30">
          
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <label className={LABEL_STYLE}>Título de la receta</label>
                <input 
                  autoFocus
                  className={INPUT_STYLE + " text-xl"} 
                  placeholder="Ej: Ensalada de Quinoa y Mango" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_STYLE}>Categoría</label>
                  <div className="flex gap-2">
                    {CATEGORIES.map(cat => (
                      <button 
                        key={cat.id}
                        onClick={() => setFormData({...formData, meal_category: cat.id})}
                        className={`flex-1 py-3 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-tighter ${formData.meal_category === cat.id ? 'bg-teal-900 border-teal-900 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400'}`}
                      >
                        {cat.emoji} {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={LABEL_STYLE}>Dificultad</label>
                  <div className="flex gap-2">
                    {DIFFICULTIES.map(diff => (
                      <button 
                        key={diff.id}
                        onClick={() => setFormData({...formData, difficulty: diff.id})}
                        className={`flex-1 py-3 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-tighter ${formData.difficulty === diff.id ? 'bg-orange-500 border-orange-500 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400'}`}
                      >
                        {diff.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_STYLE}>Tiempo (min)</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-600" />
                    <input type="number" className={INPUT_STYLE + " pl-12 text-center"} value={formData.prep_time} onChange={e => setFormData({...formData, prep_time: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
                <div>
                  <label className={LABEL_STYLE}>Raciones</label>
                  <div className="relative">
                    <Utensils className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-600" />
                    <input type="number" className={INPUT_STYLE + " pl-12 text-center"} value={formData.servings} onChange={e => setFormData({...formData, servings: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
              </div>

              <div>
                <label className={LABEL_STYLE}>Tipo de Cocina</label>
                <div className="relative">
                  <select 
                    className={INPUT_STYLE + " appearance-none capitalize"} 
                    value={formData.cuisine_type}
                    onChange={e => setFormData({...formData, cuisine_type: e.target.value as CuisineType})}
                  >
                    {CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-teal-900 uppercase text-xs tracking-widest">Ingredientes necesarios</h3>
                <button onClick={addIngredient} className="p-2 bg-teal-900 text-white rounded-xl shadow-lg active:scale-90 transition-all"><Plus className="w-4 h-4" /></button>
              </div>
              
              <div className="space-y-3">
                {formData.ingredients?.map((ing, idx) => (
                  <div key={idx} className="flex gap-2 items-center group bg-white p-3 rounded-2xl border border-gray-100 shadow-sm animate-fade-in">
                    <input 
                      placeholder="Ej: Pasta de trigo" 
                      className="flex-1 bg-transparent font-bold text-sm outline-none px-2"
                      value={ing.name}
                      onChange={e => updateIngredient(idx, 'name', e.target.value)}
                    />
                    <div className="flex items-center gap-1 bg-gray-50 rounded-xl px-2 border border-gray-100">
                        <input 
                          type="number" 
                          step="any"
                          className="w-12 bg-transparent text-center font-black text-xs py-2 outline-none"
                          value={ing.quantity}
                          onChange={e => updateIngredient(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                        <div className="h-4 w-px bg-gray-200" />
                        {/* SELECTOR DE UNIDADES REQUERIDO */}
                        <div className="relative flex items-center">
                          <select 
                            className="bg-transparent font-black text-[9px] uppercase outline-none cursor-pointer px-1 pr-4 appearance-none text-teal-600"
                            value={ing.unit}
                            onChange={e => updateIngredient(idx, 'unit', e.target.value)}
                          >
                            {UNIT_OPTIONS.map(u => (
                              <option key={u.id} value={u.id}>{u.id}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-0 w-2.5 h-2.5 text-teal-400 pointer-events-none" />
                        </div>
                    </div>
                    <button onClick={() => removeIngredient(idx)} className="p-2 text-gray-200 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-teal-900 uppercase text-xs tracking-widest">Pasos de preparación</h3>
                <button onClick={addStep} className="p-2 bg-orange-500 text-white rounded-xl shadow-lg active:scale-90 transition-all"><Plus className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4">
                {formData.instructions?.map((inst, idx) => (
                  <div key={idx} className="flex gap-4 group animate-fade-in">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-900 flex items-center justify-center font-black text-xs shrink-0 mt-1">
                      {idx + 1}
                    </div>
                    <div className="flex-1 relative">
                      <textarea 
                        className={INPUT_STYLE + " !py-3 resize-none min-h-[80px] text-sm"} 
                        placeholder="Describe este paso..."
                        value={inst}
                        onChange={e => updateStepText(idx, e.target.value)}
                      />
                      <button 
                        onClick={() => removeStep(idx)}
                        className="absolute -right-2 -top-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        <div className="p-8 border-t border-gray-100 bg-white flex gap-3 sticky bottom-0">
          {step > 1 && (
            <button 
              onClick={() => setStep(step - 1)}
              className="px-6 py-4 border-2 border-gray-100 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
            >
              Atrás
            </button>
          )}
          
          {step < 3 ? (
            <button 
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !formData.title}
              className="flex-1 py-4 bg-teal-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-teal-800 transition-all active:scale-95 disabled:opacity-50"
            >
              Continuar
            </button>
          ) : (
            <button 
              onClick={handleSave}
              className="flex-1 py-4 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-orange-600 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[3px]" /> Guardar Receta
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
