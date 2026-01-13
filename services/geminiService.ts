
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, BatchSession, MealCategory } from "../types";
import { FALLBACK_RECIPES, STATIC_RECIPES } from "../constants";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

const filterRecipesByDiet = (recipes: Recipe[], preferences: string[]) => {
    if (!preferences || preferences.length === 0) return recipes;
    const effectivePrefs = preferences.filter(p => p !== 'none');
    if (effectivePrefs.length === 0) return recipes; 
    
    return recipes.filter(r => {
        const tags = r.dietary_tags || [];
        if (effectivePrefs.includes('vegan') && !tags.includes('vegan')) return false;
        if (effectivePrefs.includes('vegetarian') && !tags.includes('vegetarian') && !tags.includes('vegan')) return false;
        // Para otras dietas, somos menos estrictos para evitar devolver array vacío si no hay recetas etiquetadas
        // if (effectivePrefs.includes('keto') && !tags.includes('keto')) return false;
        return true;
    });
};

// RECETA DE EMERGENCIA (Para evitar huecos vacíos si falla todo)
const EMERGENCY_RECIPE: Recipe = {
    id: 'emergency-pasta',
    title: "Pasta Rápida con lo que tengas",
    description: "Receta comodín para cuando la despensa está vacía.",
    meal_category: "lunch",
    cuisine_type: "fast",
    difficulty: "easy",
    prep_time: 15,
    servings: 1,
    ingredients: [{name: 'pasta', quantity: 100, unit: 'g', category: 'grains'}, {name: 'aceite', quantity: 10, unit: 'ml', category: 'pantry'}],
    instructions: ["Cocer pasta", "Añadir aceite y especias al gusto"],
    dietary_tags: ["vegetarian", "vegan"],
    image_url: "https://images.unsplash.com/photo-1598866594230-a7c12756260f?auto=format&fit=crop&q=80"
};

// NUEVO: Algoritmo de Planificación Inteligente (Blindado)
export const generateSmartMenu = async (
    user: UserProfile,
    pantry: PantryItem[],
    targetDates: string[], 
    targetTypes: string[],
    availableRecipes: Recipe[]
): Promise<{ plan: MealSlot[], newRecipes: Recipe[] }> => {
    
    const plan: MealSlot[] = [];
    
    // 1. Unificar Fuentes y Eliminar Duplicados (Por ID y Título)
    // Combinamos las recetas del usuario con las estáticas para tener el pool máximo
    const rawSources = [...availableRecipes, ...STATIC_RECIPES, EMERGENCY_RECIPE];
    const uniqueRecipesMap = new Map<string, Recipe>();
    
    rawSources.forEach(r => {
        const key = r.title.toLowerCase().trim();
        if (!uniqueRecipesMap.has(key)) {
            uniqueRecipesMap.set(key, r);
        }
    });
    
    const uniqueSources = Array.from(uniqueRecipesMap.values());
    let validRecipes = filterRecipesByDiet(uniqueSources, user.dietary_preferences);

    // SAFETY NET: Si el filtro de dieta es demasiado estricto y devuelve 0,
    // volvemos a usar todas las recetas (mejor sugerir algo con carne a un vegetariano que dejar el plan vacío y roto)
    if (validRecipes.length === 0) {
        console.warn("Filtro de dieta demasiado estricto, usando pool completo.");
        validRecipes = uniqueSources;
    }

    // 2. Separar por categorías
    const breakfasts = validRecipes.filter(r => r.meal_category === 'breakfast');
    const mainMeals = validRecipes.filter(r => r.meal_category === 'lunch' || r.meal_category === 'dinner');

    // 3. Pools de selección garantizados
    // Si no hay desayunos, usamos la receta de emergencia o cualquier cosa
    const safeBreakfastPool = breakfasts.length > 0 ? breakfasts : [EMERGENCY_RECIPE];
    const safeMainPool = mainMeals.length > 0 ? mainMeals : [EMERGENCY_RECIPE];

    // Barajar pools para variedad
    safeBreakfastPool.sort(() => 0.5 - Math.random());
    safeMainPool.sort(() => 0.5 - Math.random());

    let mealIndex = 0;
    let bfIndex = 0;
    
    // 4. Bucle de generación robusto
    targetDates.forEach((date) => {
        targetTypes.forEach(type => {
            let selectedRecipe: Recipe;

            if (type === 'breakfast') {
                selectedRecipe = safeBreakfastPool[bfIndex % safeBreakfastPool.length];
                bfIndex++;
            } else {
                // Alternar almuerzo/cena
                selectedRecipe = safeMainPool[mealIndex % safeMainPool.length];
                mealIndex++;
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

export const generateWeeklyPlanAI = generateSmartMenu;

export const generateBatchCookingAI = async (recipes: Recipe[]): Promise<BatchSession> => {
  try {
    const recipeTitles = recipes.map(r => r.title).join(", ");
    const prompt = `Plan de Batch Cooking optimizado para: ${recipeTitles}. JSON output.`;

    // Complex Text Tasks (e.g., advanced reasoning): 'gemini-3-pro-preview'
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
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

    // The GenerateContentResponse object features a text property
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
    try {
        const pantryList = pantry.map(p => p.name).join(", ");
        const dietString = user.dietary_preferences.filter(p => p !== 'none').join(", ");
        const prompt = `Genera ${count} recetas ${customPrompt || `basadas en: ${pantryList}`}. 
        Dieta OBLIGATORIA: ${dietString}. Si es vegetariano, NADA de carne/pescado.`;
        
        // Complex Text Tasks (e.g., advanced reasoning): 'gemini-3-pro-preview'
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: { 
              responseMimeType: "application/json",
              responseSchema: { type: Type.ARRAY, items: RECIPE_SCHEMA }
            }
        });
        
        // The GenerateContentResponse object features a text property
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
  try {
    // Basic Text Tasks (e.g., extraction): 'gemini-3-flash-preview'
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
    
    // The GenerateContentResponse object features a text property
    const safeText = response.text ? response.text : '';
    const items = JSON.parse(cleanJson(safeText));
    return Array.isArray(items) ? items : [];
  } catch (error) {
    notifyError("Error leyendo el ticket.");
    return [];
  }
};
