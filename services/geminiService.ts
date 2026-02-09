import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, MealCategory } from "../types";

// Singleton persistente
let aiInstance: any = null;

const getAIClient = () => {
  if (!aiInstance) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("Fresco Engine: API_KEY no detectada aún en el entorno.");
      // No lanzamos error aquí para no romper el módulo, lo hará el SDK al usarlo
    }
    aiInstance = new GoogleGenAI({ apiKey: apiKey || "" });
  }
  return aiInstance;
};

const AI_TICKET_PROMPT = `Eres un experto en analizar tickets de supermercados españoles.
Extrae exclusivamente productos alimentarios. 
Reglas:
1. Normaliza nombres (ej: "L. ENT. 1L" -> "Leche Entera").
2. Categoriza en: vegetables, fruits, dairy, meat, fish, pasta, legumes, bakery, drinks, pantry, frozen, other.
3. Estima días de caducidad realistas para España.
Devuelve un JSON estrictamente válido.`;

export const extractItemsFromTicket = async (base64Data: string, mimeType: string): Promise<any> => {
  const ai = getAIClient();
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: { 
        parts: [
          { inlineData: { mimeType, data: base64Data } }, 
          { text: "Analiza el ticket y devuelve el JSON de productos." }
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
    console.error("Gemini Scan Error:", error);
    // Si falla por falta de clave, reseteamos el singleton para que re-intente en la próxima llamada
    if (error?.message?.includes("API Key")) {
      aiInstance = null;
    }
    throw error;
  }
};

export const getWastePreventionTip = async (pantry: PantryItem[]): Promise<string> => {
    if (pantry.length === 0) return "Organiza tu cocina hoy.";
    const ai = getAIClient();
    try {
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
    const ai = getAIClient();
    try {
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