
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
    // Eliminar posibles bloques de markdown si la IA los incluye a pesar de la configuración
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
 * MOTOR DE EXTRACCIÓN AVANZADO (PRO)
 * Optimizado para la estructura de Mercadona (PDF y Fotos)
 */
const TICKET_PROMPT = `Eres un experto en extracción de datos de recibos españoles. 
Analiza este documento (PDF o imagen) y extrae todos los productos de alimentación.

INSTRUCCIONES DE EXTRACCIÓN:
1. MERCADONA DETECTOR: Identifica el formato de Mercadona. La cantidad es el primer dígito de la línea.
   Ejemplo: "1 QUESO RALLADO 1,65" -> Cantidad: 1, Nombre: "Queso Rallado".
2. FILTRO DE RUIDO: Ignora "BOLSA PLASTICO", importes de IVA, totales, direcciones, teléfonos, o datos de tarjeta bancaria.
3. TRATAMIENTO DE NOMBRES: Si el nombre contiene porcentajes como "100% INTEGRAL", asegúrate de que el "1" inicial sea la cantidad y no parte del nombre si hay un espacio.
4. CATEGORIZACIÓN: Asigna una categoría (vegetables, fruits, dairy, meat, fish, pasta, legumes, broths, bakery, frozen, pantry, spices, drinks, other).
5. PRECIO: Extrae el nombre limpio sin el precio al final.

Devuelve SIEMPRE un array JSON válido.`;

const TICKET_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Nombre descriptivo del producto de alimentación" },
      quantity: { type: Type.NUMBER, description: "Cantidad comprada (número)" },
      unit: { type: Type.STRING, description: "Unidad (uds, kg, pack)" },
      category: { type: Type.STRING, description: "Categoría logística del producto" }
    },
    required: ["name", "quantity", "unit", "category"]
  }
};

export const extractItemsFromTicket = async (base64Data: string, mimeType: string = 'image/jpeg'): Promise<any[]> => {
  try {
    // CAMBIO CRÍTICO: Usamos el modelo Pro para asegurar la máxima capacidad de OCR y razonamiento
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
        temperature: 0.1 // Reducimos creatividad para máxima precisión en datos
      }
    });
    
    const safeText = response.text || '[]';
    const items = JSON.parse(cleanJson(safeText));
    
    // Si el modelo Pro devuelve un array vacío pero el ticket tiene texto, 
    // es posible que la validación del esquema haya sido demasiado estricta.
    return Array.isArray(items) ? items : [];
  } catch (error) {
    console.error("Gemini Pro Extraction Error:", error);
    // Reintento silencioso con el modelo Flash si el Pro falla (por cuotas o límites)
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const responseFlash = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts: [{ inlineData: { mimeType, data: base64Data } }, { text: TICKET_PROMPT }] },
            config: { responseMimeType: "application/json", responseSchema: TICKET_SCHEMA }
        });
        const flashText = responseFlash.text || '[]';
        return JSON.parse(cleanJson(flashText));
    } catch (innerError) {
        return [];
    }
  }
};

export const extractItemsFromRawText = async (rawText: string): Promise<any[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Procesa este texto de ticket y extrae los productos alimentarios:\n\n${rawText}\n\n${TICKET_PROMPT}`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: TICKET_SCHEMA
      }
    });
    const safeText = response.text || '[]';
    return JSON.parse(cleanJson(safeText));
  } catch (error) {
    console.error("Gemini Text Error:", error);
    return [];
  }
};
