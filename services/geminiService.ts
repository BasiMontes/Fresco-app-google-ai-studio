
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, MealCategory } from "../types";

const cleanJson = (text: string | undefined): string => {
    if (!text) return '{}';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return match[0];
    return text.trim();
};

const AI_TICKET_PROMPT = `Actúa como un experto en OCR de tickets de supermercado. 
Extrae productos en el formato JSON especificado. Sé preciso con los nombres, cantidades y categorías de los productos.`;

// Siempre usamos process.env.API_KEY según las directrices del SDK.
export const extractItemsFromTicket = async (base64Data: string, mimeType: string): Promise<any> => {
  if (!process.env.API_KEY) {
      throw new Error("MISSING_API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: base64Data,
    },
  };

  // Se utiliza gemini-3-flash-preview para tareas de extracción por su precisión multimodal y velocidad.
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [imagePart, { text: "Analiza este ticket de compra y extrae todos los productos detectados." }] },
    config: { 
      systemInstruction: AI_TICKET_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          supermarket: { type: Type.STRING, description: "Nombre del supermercado" },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Nombre del producto" },
                quantity: { type: Type.NUMBER, description: "Cantidad" },
                unit: { type: Type.STRING, description: "Unidad (uds, kg, l, etc.)" },
                category: { type: Type.STRING, description: "Categoría (vegetables, dairy, meat, pantry, etc.)" },
                estimated_expiry_days: { type: Type.NUMBER, description: "Días estimados para caducidad" }
              },
              required: ["name", "quantity", "unit", "category", "estimated_expiry_days"]
            }
          }
        },
        required: ["supermarket", "items"]
      }
    }
  });
  
  // Acceso directo a .text según las directrices (no llamar como método).
  return JSON.parse(response.text || '{}');
};

export const getWastePreventionTip = async (pantry: PantryItem[]): Promise<string> => {
    if (pantry.length === 0) return "Tu despensa está lista.";
    if (!process.env.API_KEY) return "Configura tu API Key para consejos personalizados.";

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        // Tarea básica de texto: gemini-3-flash-preview es el modelo recomendado.
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Dame un consejo corto y accionable para aprovechar estos productos que van a caducar pronto: ${pantry.slice(0,2).map(i => i.name).join(", ")}.`,
        });
        return response.text || "Aprovecha tus frescos antes de que sea tarde.";
    } catch {
        return "Organiza tu cocina hoy para evitar desperdicios.";
    }
};

export const generateSmartMenu = async (user: UserProfile, pantry: PantryItem[], targetDates: string[], targetTypes: MealCategory[], availableRecipes: Recipe[]): Promise<{ plan: MealSlot[], newRecipes: Recipe[] }> => {
    if (!process.env.API_KEY) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        // Tarea compleja de razonamiento: gemini-3-pro-preview es el modelo recomendado.
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Genera un plan de comidas optimizado para ${targetDates.length} días. 
            Gustos: ${user.favorite_cuisines.join(', ')}. 
            Dieta: ${user.dietary_preferences.join(', ')}.
            Stock: ${pantry.map(i => i.name).join(', ')}.
            Recetas: ${availableRecipes.map(r => r.title).join(', ')}.`,
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
                                    type: { type: Type.STRING, description: "breakfast, lunch or dinner" },
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
        
        const data = JSON.parse(response.text || '{}');
        const plan = data.plan || [];
        
        // Validamos que los IDs devueltos por la IA correspondan a recetas reales de la biblioteca.
        const validatedPlan = plan.map((slot: any) => ({
            ...slot,
            isCooked: false,
            recipeId: availableRecipes.find(r => r.id === slot.recipeId)?.id || availableRecipes[0].id
        }));

        return { plan: validatedPlan, newRecipes: [] };
    } catch (e) {
        console.error("AI Generation error:", e);
        const plan = targetDates.flatMap(date => 
            targetTypes.map(type => ({ date, type, recipeId: availableRecipes[0].id, servings: user.household_size, isCooked: false }))
        );
        return { plan, newRecipes: [] };
    }
};
