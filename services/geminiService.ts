
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, MealCategory } from "../types";

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

const cleanJson = (text: string | undefined): string => {
    if (!text) return '{}';
    const match = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || text.match(/\{[\s\S]*\}/);
    if (match) return match[1] || match[0];
    return text.trim();
};

const AI_TICKET_PROMPT = `Analiza este ticket de supermercado.
IGNORA: logos, CIF, dirección, totales, cupones.
NORMALIZA: "HAC. LECHE ENT." → "Leche Entera Hacendado".
CATEGORÍAS: vegetables, fruits, dairy, meat, fish, pasta, legumes, bakery, drinks, pantry, other.
CADUCIDAD ESTIMADA (días): pescado/carne: 2, lácteos: 7, verduras/frutas: 5, otros: 30.`;

export const extractItemsFromTicket = async (base64Data: string, mimeType: string, retries = 2): Promise<any> => {
  // Instancia nueva en cada llamada para capturar la clave actual del proceso
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Volvemos al modelo rápido y compatible
      contents: { 
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: "Extrae los productos en este JSON." }
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
                            estimated_expiry_days: { type: Type.INTEGER }
                        },
                        required: ["name", "quantity", "unit", "category", "estimated_expiry_days"]
                    }
                }
            },
            required: ["supermarket", "items"]
        },
        temperature: 0.1,
      }
    });
    
    const text = response.text;
    if (!text) throw new Error("EMPTY_RESPONSE");
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Error en extractItemsFromTicket:", error);
    if (error.message?.includes("Requested entity was not found") || error.message?.includes("API key")) {
        throw new Error("MISSING_API_KEY");
    }
    if (retries > 0) {
        await wait(1500);
        return extractItemsFromTicket(base64Data, mimeType, retries - 1);
    }
    throw error;
  }
};

export const getWastePreventionTip = async (pantry: PantryItem[]): Promise<string> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return "Organiza tu cocina hoy para ahorrar mañana.";
    const ai = new GoogleGenAI({ apiKey });
    if (pantry.length === 0) return "¡Tu despensa está lista!";
    
    const expiringItems = pantry
        .filter(i => i.expires_at)
        .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime())
        .slice(0, 3);

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Dame un consejo de 10 palabras para aprovechar: ${expiringItems.map(i => i.name).join(", ")}.`,
            config: { temperature: 0.7 }
        });
        return response.text || "Cocina con lo que tienes hoy.";
    } catch (error: any) {
        return "Aprovecha tus productos frescos antes de que caduquen.";
    }
};

export const generateSmartMenu = async (user: UserProfile, pantry: PantryItem[], targetDates: string[], targetTypes: MealCategory[], availableRecipes: Recipe[]): Promise<{ plan: MealSlot[], newRecipes: Recipe[] }> => {
    const apiKey = process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey: apiKey || "" });
    const recipeOptions = availableRecipes.map(r => ({ id: r.id, title: r.title }));

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Genera un plan JSON para estas fechas: ${targetDates.join(", ")}. Recetas: ${JSON.stringify(recipeOptions)}.`,
            config: { 
                systemInstruction: "Responde solo con el objeto JSON solicitado.",
                responseMimeType: "application/json",
                temperature: 0.2
            }
        });
        const selections = JSON.parse(response.text || '{}');
        const plan: MealSlot[] = [];
        targetDates.forEach(date => {
            targetTypes.forEach(type => {
                const recipeId = selections[date]?.[type] || availableRecipes[Math.floor(Math.random()*availableRecipes.length)].id;
                plan.push({ date, type, recipeId, servings: user.household_size, isCooked: false });
            });
        });
        return { plan, newRecipes: [] };
    } catch (error: any) {
        const plan = targetDates.flatMap(date => 
            targetTypes.map(type => ({ date, type, recipeId: availableRecipes[Math.floor(Math.random() * availableRecipes.length)].id, servings: user.household_size, isCooked: false }))
        );
        return { plan, newRecipes: [] };
    }
};
