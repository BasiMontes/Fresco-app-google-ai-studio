
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, BatchSession, MealCategory, DietPreference } from "../types";
import { cleanName } from "./unitService";

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

/**
 * Función local para calcular qué porcentaje de ingredientes de una receta están en la despensa.
 */
const calculatePantryScore = (recipe: Recipe, pantry: PantryItem[]): number => {
    if (!recipe.ingredients || recipe.ingredients.length === 0) return 0;
    let matches = 0;
    recipe.ingredients.forEach(ing => {
        const name = cleanName(ing.name);
        const inPantry = pantry.some(p => cleanName(p.name).includes(name) || name.includes(cleanName(p.name)));
        if (inPantry) matches++;
    });
    return matches / recipe.ingredients.length;
};

/**
 * Valida si una receta cumple con las preferencias dietéticas del usuario.
 */
const satisfiesDiet = (recipe: Recipe, preferences: DietPreference[]): boolean => {
    if (!preferences || preferences.length === 0 || preferences.includes('none')) return true;
    
    return preferences.every(pref => {
        if (pref === 'vegetarian') return recipe.dietary_tags.includes('vegetarian') || recipe.dietary_tags.includes('vegan');
        return recipe.dietary_tags.includes(pref);
    });
};

/**
 * PLANIFICADOR LOCAL (SIN IA)
 */
export const generateSmartMenu = async (
    user: UserProfile,
    pantry: PantryItem[],
    targetDates: string[], 
    targetTypes: MealCategory[],
    availableRecipes: Recipe[]
): Promise<{ plan: MealSlot[], newRecipes: Recipe[] }> => {
    await new Promise(resolve => setTimeout(resolve, 800));

    const plan: MealSlot[] = [];
    const usedRecipeIds = new Set<string>();

    targetDates.forEach(date => {
        targetTypes.forEach(type => {
            let pool = availableRecipes.filter(r => {
                if (type === 'breakfast') return r.meal_category === 'breakfast';
                return r.meal_category === 'lunch' || r.meal_category === 'dinner';
            });

            let filteredPool = pool.filter(r => satisfiesDiet(r, user.dietary_preferences));
            if (filteredPool.length === 0) filteredPool = pool; 

            if (filteredPool.length === 0) return;

            const scoredPool = filteredPool.map(r => ({
                recipe: r,
                score: calculatePantryScore(r, pantry) - (usedRecipeIds.has(r.id) ? 0.8 : 0)
            }));

            scoredPool.sort((a, b) => b.score - a.score);
            const topChoices = scoredPool.slice(0, Math.min(5, scoredPool.length));
            
            if (topChoices.length > 0) {
                const selected = topChoices[Math.floor(Math.random() * topChoices.length)].recipe;
                usedRecipeIds.add(selected.id);
                plan.push({
                    date,
                    type,
                    recipeId: selected.id,
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const recipeTitles = recipes.map(r => r.title).join(", ");
    const prompt = `Plan de Batch Cooking optimizado para: ${recipeTitles}. JSON output.`;

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
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const pantryList = pantry.map(p => p.name).join(", ");
        const dietString = user.dietary_preferences.filter(p => p !== 'none').join(", ");
        const prompt = `Genera ${count} recetas ${customPrompt || `basadas en: ${pantryList}`}. 
        Dieta OBLIGATORIA: ${dietString}.`;
        
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: { 
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
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
                }
              }
            }
        });
        
        const safeText = response.text ? response.text : '';
        const data = JSON.parse(cleanJson(safeText));
        
        if (!Array.isArray(data)) return [];

        return data.map((raw: any, i: number) => {
            return {
                ...raw,
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

export const extractItemsFromTicket = async (base64Data: string, mimeType: string = 'image/jpeg'): Promise<any[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } }, 
          { text: "Actúa como un experto en tickets de supermercado españoles (como Mercadona, Carrefour o Lidl). Analiza la imagen o PDF adjunto. Extrae exclusivamente la lista de productos comprados. \n\nInstrucciones:\n1. Identifica la cantidad y el nombre de cada producto.\n2. Limpia los nombres: elimina códigos internos, 'OP:', '#' o abreviaturas crípticas si es posible.\n3. Ignora secciones de IVA, totales o datos bancarios.\n4. Devuelve un array JSON de objetos.\n\nEsquema: name (string), quantity (number), unit (string, ej: 'uds', 'kg', 'pack'), category (string, una de: vegetables, fruits, dairy, meat, fish, pasta, legumes, broths, bakery, frozen, pantry, spices, drinks, other)." }
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
    console.error("Gemini Error:", error);
    notifyError("Error leyendo el ticket. Prueba con una foto más clara.");
    return [];
  }
};
