
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
    clean = clean.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '');
    return clean.trim();
};

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

const satisfiesDiet = (recipe: Recipe, preferences: DietPreference[]): boolean => {
    if (!preferences || preferences.length === 0 || preferences.includes('none')) return true;
    return preferences.every(pref => {
        if (pref === 'vegetarian') return recipe.dietary_tags.includes('vegetarian') || recipe.dietary_tags.includes('vegan');
        return recipe.dietary_tags.includes(pref);
    });
};

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
                plan.push({ date, type, recipeId: selected.id, servings: user.household_size, isCooked: false });
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
      config: { responseMimeType: "application/json" }
    });
    const safeText = response.text ? response.text : '';
    const data = JSON.parse(cleanJson(safeText));
    return { total_duration: data.total_duration || 0, steps: Array.isArray(data.steps) ? data.steps : [] };
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
        const prompt = `Genera ${count} recetas ${customPrompt || `basadas en: ${pantryList}`}. Dieta OBLIGATORIA: ${dietString}.`;
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const safeText = response.text ? response.text : '';
        const data = JSON.parse(cleanJson(safeText));
        if (!Array.isArray(data)) return [];
        return data.map((raw: any, i: number) => ({
            ...raw,
            id: `gen-rec-${Date.now()}-${i}`,
            servings: user.household_size,
            dietary_tags: user.dietary_preferences.filter(p => p !== 'none'),
            image_url: `https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&q=80&sig=${Math.random()}`
        }));
    } catch (e) {
        notifyError("Error conectando con la cocina IA.");
        return [];
    }
};

/**
 * MOTOR DE RAZONAMIENTO PROFUNDO (GEMINI 3 PRO + THINKING)
 * Optimizado específicamente para tickets de Mercadona
 */
const TICKET_PROMPT = `Analiza detenidamente este ticket de Mercadona. 
Antes de extraer los datos, identifica las columnas: Cantidad, Descripción y Precio.

REGLAS CRÍTICAS:
1. MERCADONA PDF: La cantidad es el primer número de la línea. Si el producto va por peso (kg), la cantidad puede ser decimal (ej: 0,524).
2. IGNORAR: No extraigas 'BOLSA PLASTICO', 'CÉNTIMOS', 'IVA', ni datos de pago. Solo comida.
3. LIMPIEZA: Quita los precios de los nombres. Ej: 'QUESO DADOS 1,15' -> Nombre: 'Queso Dados', Cantidad: 1.
4. CATEGORÍAS: vegetables, fruits, dairy, meat, fish, pasta, legumes, broths, bakery, frozen, pantry, spices, drinks, other.

Piensa paso a paso para no saltarte ningún producto alimentario.`;

const TICKET_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Nombre limpio" },
      quantity: { type: Type.NUMBER, description: "Cantidad numérica (acepta decimales para peso)" },
      unit: { type: Type.STRING, description: "Unidad (uds, kg, pack)" },
      category: { type: Type.STRING, description: "Categoría lógica" }
    },
    required: ["name", "quantity", "unit", "category"]
  }
};

export const extractItemsFromTicket = async (base64Data: string, mimeType: string = 'image/jpeg'): Promise<any[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    // Usamos el modelo PRO con THINKING BUDGET para una precisión absoluta
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", 
      contents: { 
        parts: [
          { inlineData: { mimeType, data: base64Data } }, 
          { text: TICKET_PROMPT }
        ] 
      },
      config: { 
        responseMimeType: "application/json",
        responseSchema: TICKET_SCHEMA,
        thinkingConfig: { thinkingBudget: 16000 }, // Damos capacidad de razonamiento
        temperature: 0.1
      }
    });
    
    const safeText = response.text || '[]';
    return JSON.parse(cleanJson(safeText));
  } catch (error) {
    console.warn("Fallo en extracción Pro, intentando modo rescate Flash...");
    try {
        // Modo rescate con Flash sin Thinking (más rápido pero menos 'listo')
        const responseFlash = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { 
                parts: [
                    { inlineData: { mimeType, data: base64Data } }, 
                    { text: "Extract food items from this receipt as JSON array." }
                ] 
            },
            config: { 
                responseMimeType: "application/json",
                responseSchema: TICKET_SCHEMA
            }
        });
        return JSON.parse(cleanJson(responseFlash.text || '[]'));
    } catch (innerError) {
        console.error("Fallo total en extracción:", innerError);
        return [];
    }
  }
};

export const extractItemsFromRawText = async (rawText: string): Promise<any[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Extrae productos de este texto:\n\n${rawText}\n\n${TICKET_PROMPT}`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: TICKET_SCHEMA,
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });
    return JSON.parse(cleanJson(response.text || '[]'));
  } catch (error) {
    return [];
  }
};
