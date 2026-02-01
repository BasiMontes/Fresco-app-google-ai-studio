
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, MealCategory } from "../types";

const cleanJson = (text: string | undefined): string => {
    if (!text) return '{"items":[]}';
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
          name: { type: Type.STRING, description: "Nombre normalizado sin abreviaturas (ej: Leche Entera en lugar de LCH ENT)." },
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

export const extractItemsFromTicket = async (base64Data: string, mimeType: string): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { 
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: "Analiza este ticket de compra. Extrae CADA producto. Traduce abreviaturas comerciales a nombres naturales. Ignora importes monetarios. Calcula los días estimados de caducidad según el tipo de producto (Fresco: 2-5, Seco: 180+)." }
        ] 
      },
      config: { 
        systemInstruction: "Eres 'Fresco Vision Elite'. Tu misión es digitalizar inventarios de cocina. Eres experto en supermercados españoles. Devuelve siempre JSON puro siguiendo el esquema.",
        responseMimeType: "application/json",
        responseSchema: EXTRACTION_SCHEMA,
        temperature: 0.1,
      }
    });
    
    return JSON.parse(cleanJson(response.text));
  } catch (error) {
    console.error("Fresco Vision OCR Error:", error);
    throw new Error("No se pudo procesar el ticket. Prueba con otra foto.");
  }
};

export const generateSmartMenu = async (user: UserProfile, pantry: PantryItem[], targetDates: string[], targetTypes: MealCategory[], availableRecipes: Recipe[]): Promise<{ plan: MealSlot[], newRecipes: Recipe[] }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const plan: MealSlot[] = [];
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Genera ${count} recetas con estos ingredientes: ${pantry.map(p => p.name).join(",")}.`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJson(response.text));
    } catch { return []; }
};
