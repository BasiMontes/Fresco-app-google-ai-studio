
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, BatchSession, MealCategory } from "../types";

const cleanJson = (text: string | undefined): string => {
    if (!text) return '{"items":[]}';
    let clean = text.trim();
    // Eliminar posibles bloques de código markdown
    clean = clean.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '');
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
        return clean.substring(start, end + 1);
    }
    return clean;
};

// Esquema optimizado para la estructura de Mercadona
const EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Descripción clara del producto (ej: QUESO DADOS ENSALADA)" },
          quantity: { type: Type.NUMBER, description: "El primer número de la línea (ej: 1, 2)" },
          unit: { type: Type.STRING, description: "Siempre 'uds' para Mercadona a menos que indique kg" },
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
          { text: "Extrae los productos de este ticket de Mercadona. REGLA DE ORO: La línea empieza con la cantidad (ej: 1 o 2), sigue con el nombre y termina con el precio. IGNORA el precio final. IGNORA 'BOLSA PLASTICO'. Clasifica cada item en una categoría de alimentación." }
        ] 
      },
      config: { 
        systemInstruction: "Eres un experto en tickets españoles. Tu salida debe ser exclusivamente un JSON siguiendo el esquema. Los nombres de productos deben estar en mayúsculas como en el ticket. Si ves 'QUESO DADOS ENSALADA', ese es el nombre. La cantidad es el primer dígito a la izquierda.",
        responseMimeType: "application/json",
        responseSchema: EXTRACTION_SCHEMA,
        temperature: 0.1, // Baja temperatura para máxima precisión
      }
    });
    
    const text = response.text;
    const parsed = JSON.parse(cleanJson(text));
    return parsed.items || [];
  } catch (error) {
    console.error("Fresco Vision Critical OCR Failure:", error);
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
