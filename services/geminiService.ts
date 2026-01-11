
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, BatchSession, MealCategory } from "../types";
import { FALLBACK_RECIPES } from "../constants";

// HELPER: Lectura segura de entorno compatible con Vite y Node
const getEnv = (key: string) => {
  // 1. Intento Vite (Estándar Frontend)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  // 2. Intento Process (Estándar Node/Fallback)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

// Buscamos primero la versión VITE_ (segura para navegador) y luego la genérica
const API_KEY = getEnv('VITE_API_KEY') || getEnv('API_KEY');

// Instancia segura de la IA
const ai = new GoogleGenAI({ apiKey: API_KEY || 'MISSING_KEY' });

const notifyError = (message: string) => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fresco-toast', { 
            detail: { type: 'error', message } 
        }));
    }
};

const notifyInfo = (message: string) => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fresco-toast', { 
            detail: { type: 'info', message } 
        }));
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

// QA Fix BB-05: Validador de Recetas para evitar crashes en UI
const validateRecipe = (r: any): any => {
    return {
        ...r,
        ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
        instructions: Array.isArray(r.instructions) ? r.instructions : ["Mezclar ingredientes y cocinar."], // Fallback seguro
        prep_time: typeof r.prep_time === 'number' ? r.prep_time : 15,
        dietary_tags: Array.isArray(r.dietary_tags) ? r.dietary_tags : []
    };
};

// Generador Local Determinista (Algoritmo Fallback)
const generateLocalPlanStrategy = (
    user: UserProfile, 
    targetDates: string[], 
    targetTypes: string[], 
    availableRecipes: Recipe[]
): MealSlot[] => {
    const plan: MealSlot[] = [];
    
    // Mezclar recetas para aleatoriedad
    const shuffledRecipes = [...availableRecipes, ...FALLBACK_RECIPES].sort(() => 0.5 - Math.random());

    targetDates.forEach(date => {
        targetTypes.forEach(type => {
            // Buscar receta compatible con el tipo (lunch/dinner)
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
                // Mover la receta usada al final para variar si hay pocas
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
  availableRecipes: Recipe[] = [] // Nuevo parámetro para fallback
): Promise<{ plan: MealSlot[], newRecipes: Recipe[] }> => {
  
  // Definir targets por defecto si faltan
  const safeDates = targetDates && targetDates.length > 0 ? targetDates : []; // Debería venir relleno del frontend
  const safeTypes = targetTypes && targetTypes.length > 0 ? targetTypes : ['lunch', 'dinner'];

  // Si no hay API KEY o falla la red, vamos directo al local
  if (!API_KEY) { 
      console.warn("API Key missing, using local planner.");
      const localPlan = generateLocalPlanStrategy(user, safeDates, safeTypes, availableRecipes);
      notifyInfo("Plan generado con tus recetas (Modo Local).");
      return { plan: localPlan, newRecipes: [] }; 
  }
  
  try {
    const pantryList = pantry.map(p => `${p.name} (${p.quantity} ${p.unit})`).join(", ");
    
    // FIX: Prompt modificado para soportar despensa vacía (Plan First, Buy Later)
    const prompt = `Actúa como Chef Personal para ${user.name}.
    
    Mis preferencias: ${user.dietary_preferences.join(", ")}, Gustos: ${user.favorite_cuisines.join(", ")}.
    Tengo estos ingredientes: ${pantryList.length > 5 ? pantryList : "La despensa está vacía, asumiremos que compraré todo lo necesario"}.
    
    TAREA OBLIGATORIA:
    Genera un plan completo para los días: ${safeDates.join(", ")}.
    Para CADA uno de esos días, DEBES asignar receta para: ${safeTypes.join(", ")}.
    
    REGLAS IMPORTANTES:
    1. PRIORIDAD: Crea un menú apetecible y variado según mis gustos.
    2. Si tengo ingredientes (stock), úsalos para ahorrar dinero.
    3. Si NO tengo ingredientes (o despensa vacía), INVENTA recetas coherentes igualmente. Yo compraré los ingredientes después basándome en este plan.
    4. NO dejes huecos vacíos. Rellena todos los días solicitados.
    5. Devuelve JSON con 'recipes' (nuevas recetas necesarias) y 'plan' (asignación).
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
    
    const newRecipes: Recipe[] = (data.recipes || []).map((raw: any, i: number) => {
      const r = validateRecipe(raw);
      return {
        ...r,
        id: `ai-rec-${Date.now()}-${i}`,
        servings: user.household_size,
        dietary_tags: user.dietary_preferences,
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
    console.error("AI Plan Gen failed, falling back to local strategy", error);
    // FALLBACK SILENCIOSO: Si la IA falla, usamos el algoritmo local
    const localPlan = generateLocalPlanStrategy(user, safeDates, safeTypes, availableRecipes);
    
    notifyInfo("Plan generado con recetas guardadas (IA ocupada).");
    return { plan: localPlan, newRecipes: [] }; 
  }
};

export const generateBatchCookingAI = async (recipes: Recipe[]): Promise<BatchSession> => {
  if (!API_KEY) { notifyError("Falta API Key para Batch Cooking"); return { total_duration: 0, steps: [] }; }
  try {
    const recipeTitles = recipes.map(r => r.title).join(", ");
    const prompt = `Como experto en eficiencia culinaria, crea un plan de Batch Cooking para cocinar estas ${recipes.length} recetas a la vez: ${recipeTitles}. 
    Optimiza para que el tiempo total sea el mínimo posible usando tareas paralelas. 
    Responde solo con el JSON siguiendo el esquema.`;

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
        const prompt = `Genera ${count} recetas ${customPrompt || `basadas en: ${pantryList}`}. Dieta: ${user.dietary_preferences.join(", ")}.`;
        
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
                dietary_tags: user.dietary_preferences,
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
