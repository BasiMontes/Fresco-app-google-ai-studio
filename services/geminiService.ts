
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, BatchSession, MealCategory } from "../types";

const cleanJson = (text: string | undefined): string => {
    if (!text) return '{"items":[]}';
    let clean = text.trim();
    // Eliminar bloques de código markdown si los hay
    clean = clean.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '');
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
        return clean.substring(start, end + 1);
    }
    return clean;
};

// Usamos un objeto wrapper en lugar de un array directo para mayor compatibilidad con la salida de la IA
const EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Nombre del producto alimenticio" },
          quantity: { type: Type.NUMBER, description: "Cantidad numérica" },
          unit: { type: Type.STRING, description: "Unidad: uds, kg, l, g, ml" },
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
          { text: "Extrae todos los productos de este ticket. Estilo Mercadona: El número inicial es la CANTIDAD. Ejemplo: '1 QUESO DADOS' -> cantidad: 1, nombre: 'Queso Dados'. Ignora bolsas, IVA y el total. Clasifica en las categorías permitidas." }
        ] 
      },
      config: { 
        systemInstruction: "Eres Fresco Vision. Tu única tarea es devolver un objeto JSON con una propiedad 'items'. No añadas texto adicional. Si no estás seguro de algo, omite el producto. Normaliza unidades a minúsculas.",
        responseMimeType: "application/json",
        responseSchema: EXTRACTION_SCHEMA,
        temperature: 0,
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
