
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, BatchSession, MealCategory, DietPreference } from "../types";

const cleanJson = (text: string): string => {
    if (!text) return '[]';
    let clean = text.trim();
    clean = clean.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '');
    const start = clean.indexOf('[');
    const end = clean.lastIndexOf(']');
    if (start !== -1 && end !== -1) {
        return clean.substring(start, end + 1);
    }
    return clean;
};

// ESQUEMA ULTRA-SIMPLIFICADO
const TICKET_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      quantity: { type: Type.NUMBER },
      unit: { type: Type.STRING },
      category: { type: Type.STRING }
    },
    required: ["name", "quantity", "unit", "category"]
  }
};

export const extractItemsFromTicket = async (base64Data: string, mimeType: string = 'image/jpeg'): Promise<any[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-lite-latest", // EL MÁS RÁPIDO PARA OCR
      contents: { 
        parts: [
          { inlineData: { mimeType, data: base64Data } }
        ] 
      },
      config: { 
        systemInstruction: "Eres un escáner OCR de tickets de supermercado. Extrae productos de alimentación. Devuelve SOLO un array JSON con: name, quantity, unit, category (vegetables, fruits, dairy, meat, fish, pasta, legumes, bakery, drinks, pantry, other). Idioma: Español.",
        responseMimeType: "application/json",
        responseSchema: TICKET_SCHEMA,
        temperature: 0.1,
      }
    });
    
    const jsonStr = cleanJson(response.text);
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Fresco Vision Error:", error);
    return [];
  }
};

// Funciones auxiliares mantenidas con el modelo flash para velocidad
export const generateSmartMenu = async (user: UserProfile, pantry: PantryItem[], targetDates: string[], targetTypes: MealCategory[], availableRecipes: Recipe[]): Promise<{ plan: MealSlot[], newRecipes: Recipe[] }> => {
    await new Promise(resolve => setTimeout(resolve, 300));
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
            contents: `Genera ${count} recetas con lo que tengo: ${pantry.map(p => p.name).join(",")}. JSON array.`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJson(response.text));
    } catch { return []; }
};
