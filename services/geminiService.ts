import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, MealCategory } from "../types";

const AI_TICKET_PROMPT = `Eres un experto en analizar tickets de supermercados españoles.
Extrae exclusivamente productos alimentarios. 
Reglas:
1. Normaliza nombres (ej: "L. ENT. 1L" -> "Leche Entera").
2. Categoriza en: vegetables, fruits, dairy, meat, fish, pasta, legumes, bakery, drinks, pantry, frozen, other.
3. Estima días de caducidad realistas para España.
IGNORA precios y productos no alimentarios.
Devuelve un JSON estrictamente válido.`;

export const extractItemsFromTicket = async (base64Data: string, mimeType: string): Promise<any> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.error("Fresco Service: API_KEY is missing in process.env");
    throw new Error("RESELECT_KEY");
  }

  // Instanciamos el cliente JUSTO ANTES de usarlo (norma oficial de Google AI Studio)
  let ai;
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (e) {
    console.error("Fresco Service: Error instantiating SDK", e);
    throw new Error("RESELECT_KEY");
  }
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: { 
        parts: [
          { inlineData: { mimeType, data: base64Data } }, 
          { text: "Analiza este ticket español y extrae los alimentos en formato JSON según el esquema." }
        ] 
      },
      config: { 
        systemInstruction: AI_TICKET_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            supermarket: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
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

    return JSON.parse(response.text || '{"supermarket": "Ticket", "items": []}');
  } catch (error: any) {
    console.error("Gemini Execution Error:", error);
    const msg = error?.message || "";
    if (msg.includes("API key must be set") || msg.includes("not found") || msg.includes("invalid")) {
        throw new Error("RESELECT_KEY");
    }
    throw error;
  }
};

export const getWastePreventionTip = async (pantry: PantryItem[]): Promise<string> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey || pantry.length === 0) return "Organiza tu cocina hoy.";
    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Dame un consejo de 10 palabras sobre esto: ${pantry.slice(0,2).map(i => i.name).join(", ")}.`,
        });
        return response.text || "Tu despensa está lista.";
    } catch {
        return "Organiza tu cocina hoy.";
    }
};

export const generateSmartMenu = async (user: UserProfile, pantry: PantryItem[], targetDates: string[], targetTypes: MealCategory[], availableRecipes: Recipe[]): Promise<{ plan: MealSlot[], newRecipes: Recipe[] }> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return { plan: [], newRecipes: [] };
    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Genera menú para ${user.name}. Stock: ${pantry.map(i => i.name).join(', ')}.`,
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
        const data = JSON.parse(response.text || '{"plan":[]}');
        return { plan: data.plan, newRecipes: [] };
    } catch (e) {
        console.error("AI Menu Error:", e);
        return { plan: [], newRecipes: [] };
    }
};