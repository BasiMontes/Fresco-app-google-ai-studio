
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
    if (!preferences || preferences.length === 0) return recipes;
    const effectivePrefs = preferences.filter(p => p !== 'none');
    if (effectivePrefs.length === 0) return recipes; 
    
    return recipes.filter(r => {
        const tags = r.dietary_tags || [];
        if (effectivePrefs.includes('vegan') && !tags.includes('vegan')) return false;
        if (effectivePrefs.includes('vegetarian') && !tags.includes('vegetarian') && !tags.includes('vegan')) return false;
        if (effectivePrefs.includes('paleo') && !tags.includes('paleo')) return false;
        if (effectivePrefs.includes('keto') && !tags.includes('keto')) return false;
        if (effectivePrefs.includes('gluten_free') && !tags.includes('gluten_free')) return false;
        if (effectivePrefs.includes('lactose_free') && !tags.includes('lactose_free') && !tags.includes('vegan')) return false;
        return true;
    });
};

// NUEVO: Algoritmo de Planificación Inteligente (Sin IA externa)
export const generateSmartMenu = async (
    user: UserProfile,
    pantry: PantryItem[],
    targetDates: string[], 
    targetTypes: string[],
    availableRecipes: Recipe[]
): Promise<{ plan: MealSlot[], newRecipes: Recipe[] }> => {
    
    const plan: MealSlot[] = [];
    
    // 1. Unificar Fuentes y Filtrar por Dieta
    const allSources = [...availableRecipes, ...FALLBACK_RECIPES];
    const validRecipes = filterRecipesByDiet(allSources, user.dietary_preferences);

    if (validRecipes.length === 0) {
        notifyError("No hay recetas compatibles con tu dieta.");
        return { plan: [], newRecipes: [] };
    }

    // 2. Separar por categorías
    const breakfasts = validRecipes.filter(r => r.meal_category === 'breakfast');
    const meals = validRecipes.filter(r => r.meal_category !== 'breakfast'); // Lunch & Dinner pool

    // 3. Estrategia de DESAYUNOS: Poca variedad (Rotación)
    // Seleccionamos aleatoriamente 2 o 3 opciones para la semana
    const breakfastPool = breakfasts.sort(() => 0.5 - Math.random()).slice(0, 3); 
    
    // 4. Estrategia de COMIDAS: Máxima variedad + Prioridad Despensa
    // Puntuamos las recetas según ingredientes en despensa
    const scoredMeals = meals.map(recipe => {
        let score = Math.random(); // Base aleatoria para variedad
        const hasIngredients = recipe.ingredients.filter(ing => 
            pantry.some(p => p.name.toLowerCase().includes(ing.name.toLowerCase()))
        ).length;
        score += hasIngredients * 2; // Boost por ingredientes disponibles
        return { recipe, score };
    }).sort((a, b) => b.score - a.score).map(item => item.recipe);

    let mealIndex = 0;
    
    targetDates.forEach((date, dayIndex) => {
        targetTypes.forEach(type => {
            let selectedRecipe: Recipe | undefined;

            if (type === 'breakfast') {
                // Rotar entre los desayunos seleccionados (A, B, C, A, B...)
                if (breakfastPool.length > 0) {
                    selectedRecipe = breakfastPool[dayIndex % breakfastPool.length];
                }
            } else {
                // Asignar comida del pool ordenado
                // Si se acaban, volver a empezar (aunque improbable con suficientes recetas)
                if (scoredMeals.length > 0) {
                    selectedRecipe = scoredMeals[mealIndex % scoredMeals.length];
                    mealIndex++;
                }
            }

            if (selectedRecipe) {
                plan.push({
                    date,
                    type: type as MealCategory,
                    recipeId: selectedRecipe.id,
                    servings: user.household_size,
                    isCooked: false
                });
            }
        });
    });

    return { plan, newRecipes: [] };
};

// Mantenemos la firma antigua redirigiendo a la nueva lógica para compatibilidad
export const generateWeeklyPlanAI = generateSmartMenu;

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
