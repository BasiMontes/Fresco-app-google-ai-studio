
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, BatchSession, MealCategory } from "../types";

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
          name: { type: Type.STRING, description: "Descripción completa del producto" },
          quantity: { type: Type.NUMBER, description: "Cantidad numérica" },
          unit: { type: Type.STRING, description: "Unidad (uds, kg, l)" },
          category: { type: Type.STRING, description: "Categoría: vegetables, fruits, dairy, meat, fish, pasta, legumes, bakery, drinks, pantry, other" }
        },
        required: ["name", "quantity", "unit", "category"]
      }
    }
  },
  required: ["items"]
};

export const extractItemsFromTicket = async (base64Data: string, mimeType: string): Promise<any[]> => {
  // Validación defensiva: Si no hay clave, lanzamos un error controlado
  const apiKey = process.env.API_KEY || (window as any).process?.env?.API_KEY;
  
  if (!apiKey || apiKey === "undefined") {
    throw new Error("API Key must be set");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { 
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: "Analiza este ticket de Mercadona. La estructura es: [CANTIDAD] [DESCRIPCIÓN] [PRECIO UNITARIO] [IMPORTE]. Ejemplo: '1 QUESO DADOS ENSALADA 1,15' -> cantidad: 1, nombre: 'QUESO DADOS ENSALADA'. Ignora 'BOLSA PLASTICO'." }
        ] 
      },
      config: { 
        systemInstruction: "Eres un OCR especializado en tickets de Mercadona. El primer dígito de cada línea es la cantidad. El texto que sigue es el nombre. No inventes productos. Ignora bolsas de plástico.",
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
    const apiKey = process.env.API_KEY || (window as any).process?.env?.API_KEY;
    if (!apiKey) return [];
    
    const ai = new GoogleGenAI({ apiKey });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Genera ${count} recetas con estos ingredientes: ${pantry.map(p => p.name).join(",")}.`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJson(response.text));
    } catch { return []; }
};
