
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, MealCategory } from "../types";

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

const cleanJson = (text: string | undefined): string => {
    if (!text) return '{}';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return match[0];
    return text.trim();
};

const AI_TICKET_PROMPT = `Actúa como un experto en OCR de tickets. Analiza la imagen y extrae: 
1. supermarket: Nombre comercial.
2. items: Array de objetos con name, quantity (número), unit (uds/kg/g/l/ml), category (vegetables, fruits, dairy, meat, fish, pasta, legumes, bakery, drinks, pantry, other) y estimated_expiry_days (número).
Normas: Normaliza "HAC. LECHE" a "Leche Hacendado". Estima caducidad lógica (carne 2, lácteos 7, verduras 5, conservas 365).`;

export const extractItemsFromTicket = async (base64Data: string, mimeType: string, retries = 1): Promise<any> => {
  // CRITICAL: New instance inside to catch the most recent API KEY from window environment
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Usamos Flash para evitar el error 404 de cuota del modelo Pro
      contents: [
        {
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: "Analiza este ticket y devuelve los productos en formato JSON según las instrucciones." }
          ]
        }
      ],
      config: { 
        systemInstruction: AI_TICKET_PROMPT,
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    });
    
    const text = response.text;
    if (!text) throw new Error("EMPTY_RESPONSE");
    
    return JSON.parse(cleanJson(text));
  } catch (error: any) {
    console.error("Fresco Gemini Error:", error);
    
    // Si el error indica que no se encuentra el modelo o la entidad (404)
    if (error.message?.includes("not found") || error.message?.includes("API key")) {
        throw new Error("MISSING_API_KEY");
    }
    
    if (retries > 0) {
        await wait(1000);
        return extractItemsFromTicket(base64Data, mimeType, retries - 1);
    }
    throw error;
  }
};

export const getWastePreventionTip = async (pantry: PantryItem[]): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
    if (pantry.length === 0) return "Tu despensa está vacía.";
    
    const expiringItems = pantry
        .filter(i => i.expires_at)
        .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime())
        .slice(0, 3);

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Dame un consejo de 10 palabras para aprovechar estos productos: ${expiringItems.map(i => i.name).join(", ")}.`,
        });
        return response.text || "Cocina con lo que tienes hoy.";
    } catch (error: any) {
        return "Planifica tu menú para evitar desperdicios.";
    }
};

export const generateSmartMenu = async (user: UserProfile, pantry: PantryItem[], targetDates: string[], targetTypes: MealCategory[], availableRecipes: Recipe[]): Promise<{ plan: MealSlot[], newRecipes: Recipe[] }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
    const recipeOptions = availableRecipes.map(r => ({ id: r.id, title: r.title }));

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Genera un plan de comidas JSON para: ${targetDates.join(", ")}. Recetas disponibles: ${JSON.stringify(recipeOptions)}.`,
            config: { 
                responseMimeType: "application/json",
                temperature: 0.2
            }
        });
        const selections = JSON.parse(cleanJson(response.text) || '{}');
        const plan: MealSlot[] = [];
        targetDates.forEach(date => {
            targetTypes.forEach(type => {
                const recipeId = selections[date]?.[type] || availableRecipes[Math.floor(Math.random()*availableRecipes.length)].id;
                plan.push({ date, type, recipeId, servings: user.household_size, isCooked: false });
            });
        });
        return { plan, newRecipes: [] };
    } catch (error: any) {
        // Fallback básico en caso de error
        const plan = targetDates.flatMap(date => 
            targetTypes.map(type => ({ date, type, recipeId: availableRecipes[Math.floor(Math.random() * availableRecipes.length)].id, servings: user.household_size, isCooked: false }))
        );
        return { plan, newRecipes: [] };
    }
};
