
import { GoogleGenAI } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, MealCategory } from "../types";

const cleanJson = (text: string | undefined): string => {
    if (!text) return '{}';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return match[0];
    return text.trim();
};

const AI_TICKET_PROMPT = `Actúa como un experto en OCR de tickets de supermercado. 
Extrae productos en JSON:
{
  "supermarket": "Nombre",
  "items": [{"name": "Producto", "quantity": 1, "unit": "uds", "category": "other", "estimated_expiry_days": 7}]
}`;

export const extractItemsFromTicket = async (base64Data: string, mimeType: string): Promise<any> => {
  // Según las reglas: Usar process.env.API_KEY directamente
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: base64Data,
    },
  };

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview", 
    contents: { parts: [imagePart, { text: "Analiza el ticket" }] },
    config: { 
      systemInstruction: AI_TICKET_PROMPT,
      responseMimeType: "application/json"
    }
  });
  
  return JSON.parse(cleanJson(response.text));
};

export const getWastePreventionTip = async (pantry: PantryItem[]): Promise<string> => {
    if (pantry.length === 0) return "Tu despensa está lista.";
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Dame un consejo para: ${pantry.slice(0,2).map(i => i.name).join(", ")}.`,
        });
        return response.text || "Aprovecha tus frescos.";
    } catch {
        return "Organiza tu cocina hoy.";
    }
};

export const generateSmartMenu = async (user: UserProfile, pantry: PantryItem[], targetDates: string[], targetTypes: MealCategory[], availableRecipes: Recipe[]): Promise<{ plan: MealSlot[], newRecipes: Recipe[] }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Genera un menú para ${targetDates.length} días.`,
            config: { responseMimeType: "application/json" }
        });
        // Lógica de fallback simplificada
        const plan = targetDates.flatMap(date => 
            targetTypes.map(type => ({ date, type, recipeId: availableRecipes[0].id, servings: user.household_size, isCooked: false }))
        );
        return { plan, newRecipes: [] };
    } catch {
        const plan = targetDates.flatMap(date => 
            targetTypes.map(type => ({ date, type, recipeId: availableRecipes[0].id, servings: user.household_size, isCooked: false }))
        );
        return { plan, newRecipes: [] };
    }
};
