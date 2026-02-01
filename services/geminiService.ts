
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, MealCategory } from "../types";

const getApiKey = () => {
  // Prioridad absoluta a la variable de Vite que el usuario ya tiene configurada
  // @ts-ignore
  return import.meta.env?.VITE_API_KEY || process.env.API_KEY || (window as any).process?.env?.API_KEY || '';
};

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

const cleanJson = (text: string | undefined): string => {
    if (!text) return '{"items":[]}';
    // Buscamos el primer { y el último } por si la IA mete texto extra
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return match[0];
    return '{"items":[]}';
};

const EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    supermarket: { type: Type.STRING },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Nombre normalizado sin abreviaturas." },
          quantity: { type: Type.NUMBER },
          unit: { type: Type.STRING, description: "uds, kg, l, g, ml" },
          category: { type: Type.STRING, description: "vegetables, fruits, dairy, meat, fish, pasta, legumes, bakery, drinks, pantry, other" },
          estimated_expiry_days: { type: Type.INTEGER }
        },
        required: ["name", "quantity", "unit", "category", "estimated_expiry_days"]
      }
    }
  },
  required: ["items"]
};

/**
 * Extrae productos de un ticket con lógica de reintento para cuotas gratuitas.
 */
export const extractItemsFromTicket = async (base64Data: string, mimeType: string, retries = 2): Promise<any> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { 
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: "Extrae los productos de este ticket de supermercado español. Normaliza nombres. Ignora precios. Calcula días de caducidad lógica según el producto." }
        ] 
      },
      config: { 
        systemInstruction: "Eres Fresco Vision. Tu misión es digitalizar tickets. Devuelve EXCLUSIVAMENTE un objeto JSON que cumpla el esquema. No añadas explicaciones.",
        responseMimeType: "application/json",
        responseSchema: EXTRACTION_SCHEMA,
        temperature: 0.1,
      }
    });
    
    return JSON.parse(cleanJson(response.text));
  } catch (error: any) {
    console.error("Fresco Vision Error:", error);

    // Si es error de cuota (Rate Limit) y tenemos reintentos
    if ((error.message?.includes("429") || error.message?.includes("quota")) && retries > 0) {
        console.log(`⚠️ Límite alcanzado. Reintentando en 3s... (${retries} restantes)`);
        await wait(3000);
        return extractItemsFromTicket(base64Data, mimeType, retries - 1);
    }

    if (error.message?.includes("API Key") || error.message?.includes("Requested entity was not found")) {
        throw new Error("MISSING_API_KEY");
    }
    
    throw new Error("No se pudo procesar el ticket. Verifica que la foto sea clara y que la configuración sea correcta.");
  }
};

export const generateSmartMenu = async (user: UserProfile, pantry: PantryItem[], targetDates: string[], targetTypes: MealCategory[], availableRecipes: Recipe[]): Promise<{ plan: MealSlot[], newRecipes: Recipe[] }> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("MISSING_API_KEY");
    
    const ai = new GoogleGenAI({ apiKey });
    const plan: MealSlot[] = [];
    
    // Aquí iría la lógica de IA para seleccionar recetas óptimas basadas en stock
    targetDates.forEach(date => {
        targetTypes.forEach(type => {
            const pool = availableRecipes.filter(r => r.meal_category === (type === 'breakfast' ? 'breakfast' : r.meal_category));
            const selected = pool[Math.floor(Math.random() * pool.length)] || availableRecipes[0];
            plan.push({ date, type, recipeId: selected.id, servings: user.household_size, isCooked: false });
        });
    });
    return { plan, newRecipes: [] };
};

export const generateRecipesAI = async (user: UserProfile, pantry: PantryItem[], count: number = 3): Promise<Recipe[]> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("MISSING_API_KEY");
    
    const ai = new GoogleGenAI({ apiKey });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Genera ${count} recetas deliciosas usando principalmente estos ingredientes de mi despensa: ${pantry.map(p => p.name).join(",")}.`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJson(response.text));
    } catch { return []; }
};
