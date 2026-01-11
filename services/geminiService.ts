
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, BatchSession, MealCategory } from "../types";
import { FALLBACK_RECIPES } from "../constants";

// HELPER: Lectura segura de entorno compatible con Vite y Node
const getEnv = (key: string) => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

const API_KEY = getEnv('VITE_API_KEY') || getEnv('API_KEY');
const ai = new GoogleGenAI({ apiKey: API_KEY || 'MISSING_KEY' });

const notifyError = (message: string) => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fresco-toast', { detail: { type: 'error', message } }));
    }
};

const notifyInfo = (message: string) => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fresco-toast', { detail: { type: 'info', message } }));
    }
};

const cleanJson = (text: string): string => {
    let clean = text.trim();
    if (clean.startsWith('```json')) {
        clean = clean.replace(/^```json/, '').replace(/```$/, '');
    } else if (clean.startsWith('```')) {
        clean = clean.replace(/^```/, '').replace(/```$/, '');
    }
    return clean.trim();
};

const RECIPE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    meal_category: { type: Type.STRING },
    cuisine_type: { type: Type.STRING },
    difficulty: { type: Type.STRING },
    prep_time: { type: Type.INTEGER },
    calories: { type: Type.INTEGER },
    ingredients: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
          unit: { type: Type.STRING },
          category: { type: Type.STRING }
        },
        required: ["name", "quantity", "unit"]
      }
    },
    instructions: { type: Type.ARRAY, items: { type: Type.STRING } }
  }
};

const validateRecipe = (r: any): any => {
    return {
        ...r,
        ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
        instructions: Array.isArray(r.instructions) ? r.instructions : ["Mezclar ingredientes y cocinar."],
        prep_time: typeof r.prep_time === 'number' ? r.prep_time : 15,
        dietary_tags: Array.isArray(r.dietary_tags) ? r.dietary_tags : []
    };
};

// FIX CRÍTICO: El filtro ahora ignora 'none' si existen otras restricciones explícitas
const filterRecipesByDiet = (recipes: Recipe[], preferences: string[]) => {
    // Si no hay preferencias o está vacío, devolvemos todo
    if (!preferences || preferences.length === 0) return recipes;

    // Si SOLO es 'none', devolvemos todo. Si hay 'none' Y 'vegetarian', ignoramos 'none' y aplicamos filtro.
    const effectivePrefs = preferences.filter(p => p !== 'none');
    if (effectivePrefs.length === 0) return recipes; 
    
    return recipes.filter(r => {
        const tags = r.dietary_tags || [];
        
        // Lógica de exclusión estricta
        if (effectivePrefs.includes('vegan') && !tags.includes('vegan')) return false;
        if (effectivePrefs.includes('vegetarian') && !tags.includes('vegetarian') && !tags.includes('vegan')) return false;
        if (effectivePrefs.includes('paleo') && !tags.includes('paleo')) return false;
        if (effectivePrefs.includes('keto') && !tags.includes('keto')) return false;
        if (effectivePrefs.includes('gluten_free') && !tags.includes('gluten_free')) return false;
        if (effectivePrefs.includes('lactose_free') && !tags.includes('lactose_free') && !tags.includes('vegan')) return false;

        return true;
    });
};

const generateLocalPlanStrategy = (
    user: UserProfile, 
    targetDates: string[], 
    targetTypes: string[], 
    availableRecipes: Recipe[]
): MealSlot[] => {
    const plan: MealSlot[] = [];
    
    // 1. Base de datos combinada
    const allSources = [...availableRecipes, ...FALLBACK_RECIPES];
    
    // 2. Filtrado ESTRICTO (El "Gatekeeper")
    const validRecipes = filterRecipesByDiet(allSources, user.dietary_preferences);
    
    // Si no hay recetas válidas para la dieta, NO rellenamos con basura. Devolvemos vacío y alertamos.
    if (validRecipes.length === 0 && targetDates.length > 0) {
        notifyError("No hay recetas compatibles con tu dieta en la biblioteca.");
        return [];
    }

    const shuffledRecipes = validRecipes.sort(() => 0.5 - Math.random());

    targetDates.forEach(date => {
        targetTypes.forEach(type => {
            // Intentamos buscar receta del tipo correcto, si no, cualquiera compatible vale para rellenar
            const recipe = shuffledRecipes.find(r => 
                r.meal_category === type || 
                (type === 'lunch' && r.meal_category === 'dinner') || 
                (type === 'dinner' && r.meal_category === 'lunch')
            );

            if (recipe) {
                plan.push({
                    date,
                    type: type as MealCategory,
                    recipeId: recipe.id,
                    servings: user.household_size,
                    isCooked: false
                });
                // Rotación para variedad
                const idx = shuffledRecipes.indexOf(recipe);
                if (idx > -1) {
                    shuffledRecipes.push(shuffledRecipes.splice(idx, 1)[0]);
                }
            }
        });
    });

    return plan;
};

export const generateWeeklyPlanAI = async (
  user: UserProfile,
  pantry: PantryItem[],
  existingPlan: MealSlot[] = [],
  targetDates?: string[], 
  targetTypes?: string[],
  availableRecipes: Recipe[] = []
): Promise<{ plan: MealSlot[], newRecipes: Recipe[] }> => {
  
  const safeDates = targetDates && targetDates.length > 0 ? targetDates : [];
  const safeTypes = targetTypes && targetTypes.length > 0 ? targetTypes : ['lunch', 'dinner'];

  // Modo Local (Fallback)
  if (!API_KEY) { 
      const localPlan = generateLocalPlanStrategy(user, safeDates, safeTypes, availableRecipes);
      return { plan: localPlan, newRecipes: [] }; 
  }
  
  try {
    const pantryList = pantry.map(p => `${p.name} (${p.quantity} ${p.unit})`).join(", ");
    const dietString = user.dietary_preferences.filter(p => p !== 'none').join(", ").toUpperCase();
    
    const prompt = `Actúa como Chef Personal experto.
    
    PERFIL DIETA: ${dietString || 'OMNIVORO'}.
    Gustos: ${user.favorite_cuisines.join(", ")}.
    Inventario: ${pantryList || "Vacío, inventar recetas"}.
    
    OBJETIVO: Planificar comidas para: ${safeDates.join(", ")}. Tipos: ${safeTypes.join(", ")}.
    
    REGLAS DE ORO (SAFETY):
    1. Si la dieta es VEGETARIAN/VEGAN, PROHIBIDO INCLUIR CARNE O PESCADO.
    2. Prioriza usar el inventario.
    3. Devuelve JSON con 'recipes' (nuevas) y 'plan' (asignación).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recipes: { type: Type.ARRAY, items: RECIPE_SCHEMA },
            plan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  type: { type: Type.STRING },
                  recipe_title: { type: Type.STRING }
                },
                required: ["date", "type", "recipe_title"]
              }
            }
          }
        }
      }
    });

    const safeText = response.text ? response.text : '';
    const data = JSON.parse(cleanJson(safeText));
    
    // Validar y etiquetar recetas generadas por IA para asegurar consistencia
    const newRecipes: Recipe[] = (data.recipes || []).map((raw: any, i: number) => {
      const r = validateRecipe(raw);
      // Forzamos las etiquetas del usuario en las recetas generadas para evitar falsos positivos en el Planner
      const userTags = user.dietary_preferences.filter(p => p !== 'none');
      
      return {
        ...r,
        id: `ai-rec-${Date.now()}-${i}`,
        servings: user.household_size,
        dietary_tags: [...(r.dietary_tags || []), ...userTags], // Merge tags
        image_url: `https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&sig=${i}`
      };
    });

    const newSlots: MealSlot[] = (data.plan || []).map((p: any) => ({
      date: p.date,
      type: p.type,
      recipeId: newRecipes.find(r => r.title === p.recipe_title)?.id,
      servings: user.household_size
    }));

    return { plan: newSlots, newRecipes };
  } catch (error) {
    console.warn("AI Plan Gen failed, falling back to local strategy");
    const localPlan = generateLocalPlanStrategy(user, safeDates, safeTypes, availableRecipes);
    notifyInfo("Plan generado con recetas guardadas (IA no disponible).");
    return { plan: localPlan, newRecipes: [] }; 
  }
};

export const generateBatchCookingAI = async (recipes: Recipe[]): Promise<BatchSession> => {
  if (!API_KEY) { notifyError("Falta API Key para Batch Cooking"); return { total_duration: 0, steps: [] }; }
  try {
    const recipeTitles = recipes.map(r => r.title).join(", ");
    const prompt = `Plan de Batch Cooking optimizado para: ${recipeTitles}. JSON output.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            total_duration: { type: Type.INTEGER },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  instruction: { type: Type.STRING },
                  duration_mins: { type: Type.INTEGER },
                  recipes_affected: { type: Type.ARRAY, items: { type: Type.STRING } },
                  type: { type: Type.STRING }
                },
                required: ["instruction", "duration_mins"]
              }
            }
          }
        }
      }
    });

    const safeText = response.text ? response.text : '';
    const data = JSON.parse(cleanJson(safeText));
    return {
        total_duration: data.total_duration || 0,
        steps: Array.isArray(data.steps) ? data.steps : []
    };
  } catch (error) {
    notifyError("La IA de cocina paralela no está disponible.");
    return { total_duration: 0, steps: [] };
  }
};

export const generateRecipesAI = async (user: UserProfile, pantry: PantryItem[], count: number = 3, customPrompt?: string): Promise<Recipe[]> => {
    if (!API_KEY) { notifyError("Falta API Key de Gemini"); return []; }
    try {
        const pantryList = pantry.map(p => p.name).join(", ");
        const dietString = user.dietary_preferences.filter(p => p !== 'none').join(", ");
        const prompt = `Genera ${count} recetas ${customPrompt || `basadas en: ${pantryList}`}. 
        Dieta OBLIGATORIA: ${dietString}. Si es vegetariano, NADA de carne/pescado.`;
        
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { 
              responseMimeType: "application/json",
              responseSchema: { type: Type.ARRAY, items: RECIPE_SCHEMA }
            }
        });
        
        const safeText = response.text ? response.text : '';
        const data = JSON.parse(cleanJson(safeText));
        
        if (!Array.isArray(data)) return [];

        return data.map((raw: any, i: number) => {
            const r = validateRecipe(raw);
            return {
                ...r,
                id: `gen-rec-${Date.now()}-${i}`,
                servings: user.household_size,
                dietary_tags: user.dietary_preferences.filter(p => p !== 'none'),
                image_url: `https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&q=80&sig=${Math.random()}`
            };
        });
    } catch (e) {
        notifyError("Error conectando con la cocina IA.");
        return [];
    }
};

export const extractItemsFromTicket = async (base64Image: string): Promise<any[]> => {
  if (!API_KEY) { notifyError("Falta API Key para escanear"); return []; }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } }, 
          { text: "Extrae productos del ticket en JSON. Simplifica nombres." }
        ]
      },
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              unit: { type: Type.STRING },
              category: { type: Type.STRING }
            },
            required: ["name", "quantity", "unit"]
          }
        }
      }
    });
    
    const safeText = response.text ? response.text : '';
    const items = JSON.parse(cleanJson(safeText));
    return Array.isArray(items) ? items : [];
  } catch (error) {
    notifyError("Error leyendo el ticket.");
    return [];
  }
};
