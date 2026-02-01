
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
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Nombre limpio y legible del producto (ej: 'Leche Entera' en lugar de 'LCH ENT')." },
          quantity: { type: Type.NUMBER, description: "Cantidad numérica comprada." },
          unit: { type: Type.STRING, description: "Unidad detectada (uds, kg, l, g, ml)." },
          category: { type: Type.STRING, description: "Categoría: vegetables, fruits, dairy, meat, fish, pasta, legumes, bakery, drinks, pantry, other." }
        },
        required: ["name", "quantity", "unit", "category"]
      }
    }
  },
  required: ["items"]
};

export const extractItemsFromTicket = async (base64Data: string, mimeType: string): Promise<any[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { 
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: "Analiza este ticket de compra. Extrae CADA producto. Traduce abreviaturas comerciales a nombres naturales. Si el ticket dice 'P.V.P' o importes, ignóralos, solo quiero cantidades y nombres. Devuelve el JSON estructurado." }
        ] 
      },
      config: { 
        systemInstruction: "Eres 'Fresco Vision', el motor OCR de una app de cocina inteligente. Tu objetivo es transformar fotos de tickets de supermercados (Mercadona, Lidl, Carrefour, Aldi, etc.) en datos de inventario. Eres experto en identificar productos incluso con nombres acortados. Ignora siempre el precio, el IVA, el total y la información del establecimiento.",
        responseMimeType: "application/json",
        responseSchema: EXTRACTION_SCHEMA,
        temperature: 0.1,
      }
    });
    
    const text = response.text;
    const parsed = JSON.parse(cleanJson(text));
    return parsed.items || [];
  } catch (error) {
    console.error("Fresco Vision OCR Error:", error);
    throw new Error("No se pudo procesar la imagen del ticket.");
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
