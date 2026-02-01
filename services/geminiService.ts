
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, MealCategory } from "../types";

const cleanJson = (text: string | undefined): string => {
    if (!text) return '{"items":[]}';
    let clean = text.trim();
    clean = clean.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '');
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
        return clean.substring(start, end + 1);
    }
    return clean;
};

const EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Nombre claro del producto (ej: Leche Entera)" },
          quantity: { type: Type.NUMBER, description: "Cantidad numérica comprada" },
          unit: { type: Type.STRING, description: "Unidad (uds, kg, l, g, ml)" },
          category: { type: Type.STRING, description: "Categoría: vegetables, fruits, dairy, meat, fish, pasta, legumes, bakery, drinks, pantry, other" }
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
          { text: "Analiza este ticket de supermercado. Extrae la lista de productos comprados. Busca la columna de cantidad y la descripción. Ignora importes, impuestos, números de tarjeta, descuentos o bolsas de plástico. Traduce nombres crípticos a nombres amigables si es posible." }
        ] 
      },
      config: { 
        systemInstruction: "Eres un experto en tickets de compra españoles. Tu objetivo es devolver un JSON puro con los productos. Identifica correctamente si es fruta (fruits), verdura (vegetables), carne (meat), pescado (fish), lácteos (dairy), etc. Si no estás seguro de la cantidad, pon 1.",
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
    throw error;
  }
};

export const generateSmartMenu = async (user: UserProfile, pantry: PantryItem[], targetDates: string[], targetTypes: MealCategory[], availableRecipes: Recipe[]): Promise<{ plan: MealSlot[], newRecipes: Recipe[] }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const plan: MealSlot[] = [];
    
    // Fallback lógico simple por ahora para evitar delays
    targetDates.forEach(date => {
        targetTypes.forEach(type => {
            let pool = availableRecipes.filter(r => r.meal_category === (type === 'breakfast' ? 'breakfast' : r.meal_category));
            if (pool.length === 0) pool = availableRecipes;
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
