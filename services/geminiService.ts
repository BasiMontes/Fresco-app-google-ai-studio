
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, MealCategory } from "../types";

// Inicialización centralizada siguiendo las normas del SDK
const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

const AI_TICKET_PROMPT = `Actúa como un experto en OCR de tickets de supermercado. 
Analiza la imagen y extrae los productos en formato JSON. 
Sé extremadamente preciso con los nombres (ej: "Leche Entera 1L") y las cantidades.
Mapea los productos a estas categorías: vegetables, fruits, dairy, meat, fish, pasta, legumes, bakery, drinks, pantry, frozen, other.
Estima los días de caducidad (estimated_expiry_days) de forma lógica (ej: carne 3 días, pasta 365 días).`;

export const extractItemsFromTicket = async (base64Data: string, mimeType: string): Promise<any> => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { 
        parts: [
          { inlineData: { mimeType, data: base64Data } }, 
          { text: "Extrae los productos de este ticket en JSON siguiendo el esquema definido." }
        ] 
      },
      config: { 
        systemInstruction: AI_TICKET_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            supermarket: { type: Type.STRING, description: "Nombre del establecimiento" },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING, description: "uds, kg, l, g, ml" },
                  category: { type: Type.STRING },
                  estimated_expiry_days: { type: Type.NUMBER }
                },
                required: ["name", "quantity", "unit", "category", "estimated_expiry_days"]
              }
            }
          },
          required: ["supermarket", "items"]
        }
      }
    });

    const jsonStr = response.text || '{}';
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    throw error;
  }
};

export const getWastePreventionTip = async (pantry: PantryItem[]): Promise<string> => {
    if (pantry.length === 0) return "Tu despensa está lista.";
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Dame un consejo muy corto (máx 10 palabras) para aprovechar estos productos que van a caducar: ${pantry.slice(0,2).map(i => i.name).join(", ")}.`,
        });
        return response.text || "Organiza tu cocina hoy.";
    } catch {
        return "Organiza tu cocina hoy.";
    }
};

export const generateSmartMenu = async (user: UserProfile, pantry: PantryItem[], targetDates: string[], targetTypes: MealCategory[], availableRecipes: Recipe[]): Promise<{ plan: MealSlot[], newRecipes: Recipe[] }> => {
    try {
        const ai = getAIClient();
        // Usamos Gemini 3 Pro para tareas complejas de razonamiento nutricional
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Como nutricionista experto, genera un plan de comidas para ${user.name} basándote en su stock actual: ${pantry.map(i => i.name).join(', ')}.`,
            config: { 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        plan: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    date: { type: Type.STRING },
                                    type: { type: Type.STRING },
                                    recipeId: { type: Type.STRING },
                                    servings: { type: Type.NUMBER }
                                },
                                required: ["date", "type", "recipeId", "servings"]
                            }
                        }
                    },
                    required: ["plan"]
                }
            }
        });
        const jsonStr = response.text || '{"plan":[]}';
        const data = JSON.parse(jsonStr);
        return { plan: data.plan, newRecipes: [] };
    } catch (e) {
        console.error("AI Menu Error:", e);
        return { plan: [], newRecipes: [] };
    }
};
