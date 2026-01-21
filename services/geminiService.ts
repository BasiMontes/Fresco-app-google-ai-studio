
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, BatchSession, MealCategory } from "../types";

const cleanJson = (text: string | undefined): string => {
    if (!text) return '[]';
    let clean = text.trim();
    clean = clean.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '');
    const start = clean.indexOf('[');
    const end = clean.lastIndexOf(']');
    if (start !== -1 && end !== -1) {
        return clean.substring(start, end + 1);
    }
    return clean;
};

const TICKET_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      quantity: { type: Type.NUMBER },
      unit: { type: Type.STRING, description: "uds, kg, l, g, ml" },
      category: { type: Type.STRING, description: "vegetables, fruits, dairy, meat, fish, pasta, legumes, bakery, drinks, pantry, other" }
    },
    required: ["name", "quantity", "unit", "category"]
  }
};

export const extractItemsFromTicket = async (base64Data: string, mimeType: string = 'image/jpeg'): Promise<any[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { 
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: "Analiza este documento (ticket o factura PDF) de supermercado. Extrae los productos de alimentación a JSON estructurado." }
        ] 
      },
      config: { 
        systemInstruction: "Eres un experto en OCR y logística alimentaria. Extrae: nombre, cantidad, unidad (normaliza a uds, kg, l, g o ml) y categoría. Devuelve siempre un array JSON. Si es un PDF de varias páginas, procesa solo la primera.",
        responseMimeType: "application/json",
        responseSchema: TICKET_SCHEMA,
        temperature: 0,
      }
    });
    
    const text = response.text || "[]";
    return JSON.parse(cleanJson(text));
  } catch (error) {
    console.error("Fresco Vision Error:", error);
    return [];
  }
};

export const generateSmartMenu = async (user: UserProfile, pantry: PantryItem[], targetDates: string[], targetTypes: MealCategory[], availableRecipes: Recipe[]): Promise<{ plan: MealSlot[], newRecipes: Recipe[] }> => {
    const plan: MealSlot[] = [];
    targetDates.forEach(date => {
        targetTypes.forEach(type => {
            let pool = availableRecipes.filter(r => r.meal_category === (type === 'breakfast' ? 'breakfast' : r.meal_category));
            if (pool.length === 0) return;
            const selected = pool[Math.floor(Math.random() * pool.length)];
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
