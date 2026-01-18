
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, BatchSession, MealCategory, DietPreference } from "../types";
import { cleanName } from "./unitService";

const notifyError = (message: string) => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fresco-toast', { detail: { type: 'error', message } }));
    }
};

const cleanJson = (text: string): string => {
    let clean = text.trim();
    clean = clean.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '');
    const start = clean.indexOf('[');
    const end = clean.lastIndexOf(']');
    if (start !== -1 && end !== -1) {
        return clean.substring(start, end + 1);
    }
    return clean;
};

// MOTOR DE EXTRACCIÓN ULTRA-RÁPIDO
const TICKET_PROMPT = "MERCADONA RECEIPT OCR: Extract [qty, name, unit, category] as JSON array. Ignore non-food. Categories: vegetables, fruits, dairy, meat, fish, pasta, legumes, broths, bakery, frozen, pantry, spices, drinks, other.";

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
      model: "gemini-flash-lite-latest", // El modelo más rápido disponible
      contents: { 
        parts: [
          { inlineData: { mimeType, data: base64Data } }, 
          { text: TICKET_PROMPT }
        ] 
      },
      config: { 
        responseMimeType: "application/json",
        responseSchema: TICKET_SCHEMA,
        thinkingConfig: { thinkingBudget: 0 }, // Cero latencia de pensamiento
        temperature: 0.1
      }
    });
    
    return JSON.parse(cleanJson(response.text || '[]'));
  } catch (error) {
    console.error("Turbo Extraction Error:", error);
    return [];
  }
};

export const generateSmartMenu = async (
    user: UserProfile,
    pantry: PantryItem[],
    targetDates: string[], 
    targetTypes: MealCategory[],
    availableRecipes: Recipe[]
): Promise<{ plan: MealSlot[], newRecipes: Recipe[] }> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const plan: MealSlot[] = [];
    const usedRecipeIds = new Set<string>();
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

export const generateBatchCookingAI = async (recipes: Recipe[]): Promise<BatchSession> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Batch cooking plan for: ${recipes.map(r => r.title).join(", ")}. JSON.`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJson(response.text || '{"steps":[]}'));
  } catch (error) {
    return { total_duration: 0, steps: [] };
  }
};

export const generateRecipesAI = async (user: UserProfile, pantry: PantryItem[], count: number = 3): Promise<Recipe[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Generate ${count} recipes with ingredients in: ${pantry.map(p => p.name).join(",")}. JSON array.`,
            config: { responseMimeType: "application/json" }
        });
        const data = JSON.parse(cleanJson(response.text || '[]'));
        return data.map((r: any, i: number) => ({ ...r, id: `ai-${Date.now()}-${i}`, servings: user.household_size }));
    } catch (e) {
        return [];
    }
};

export const extractItemsFromRawText = async (rawText: string): Promise<any[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: `${TICKET_PROMPT}\n\nTEXT:\n${rawText}`,
      config: { responseMimeType: "application/json", responseSchema: TICKET_SCHEMA }
    });
    return JSON.parse(cleanJson(response.text || '[]'));
  } catch (error) {
    return [];
  }
};
