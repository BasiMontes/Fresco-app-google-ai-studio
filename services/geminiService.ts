
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, MealCategory } from "../types";

const cleanJson = (text: string | undefined): string => {
    if (!text) return '{"items":[]}';
    // Buscamos el primer '{' y el último '}' para extraer solo el bloque JSON
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
        return match[0];
    }
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
          name: { type: Type.STRING, description: "Nombre legible del producto sin abreviaturas raras" },
          quantity: { type: Type.NUMBER, description: "Cantidad numérica" },
          unit: { type: Type.STRING, description: "Unidad normalizada: uds, kg, l, g, ml" },
          category: { type: Type.STRING, description: "Categoría más probable: vegetables, fruits, dairy, meat, fish, pasta, legumes, bakery, drinks, pantry" }
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
          { text: "Analiza este ticket de supermercado. TU MISIÓN: Extraer EXCLUSIVAMENTE los productos comprados. \n\nREGLAS ORO:\n1. Ignora logos, fechas, IVAs, subtotales, formas de pago y descuentos.\n2. Traduce abreviaturas (ej: 'HAC.' a 'Hacendado', 'LCH' a 'Leche').\n3. Identifica la cantidad real (si hay '2 x 1.50', la cantidad es 2).\n4. Devuelve un JSON limpio siguiendo el esquema proporcionado." }
        ] 
      },
      config: { 
        systemInstruction: "Eres el motor 'Fresco Vision'. Tu especialidad es leer tickets de supermercado (especialmente Mercadona, Carrefour, Lidl) y convertirlos en inventario digital. Eres extremadamente preciso con las cantidades y unidades. Si un producto es ambiguo, asígnale la categoría 'pantry'.",
        responseMimeType: "application/json",
        responseSchema: EXTRACTION_SCHEMA,
        temperature: 0, // Máxima precisión, cero creatividad
      }
    });
    
    const text = response.text;
    const cleaned = cleanJson(text);
    const parsed = JSON.parse(cleaned);
    return parsed.items || [];
  } catch (error) {
    console.error("Fresco Vision OCR Critical Error:", error);
    throw new Error("No se pudo procesar el ticket. Asegúrate de que la foto esté bien iluminada.");
  }
};

export const generateSmartMenu = async (user: UserProfile, pantry: PantryItem[], targetDates: string[], targetTypes: MealCategory[], availableRecipes: Recipe[]): Promise<{ plan: MealSlot[], newRecipes: Recipe[] }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const plan: MealSlot[] = [];
    
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
