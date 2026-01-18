
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, BatchSession, MealCategory, DietPreference } from "../types";
import { cleanName } from "./unitService";

const notifyError = (message: string) => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fresco-toast', { detail: { type: 'error', message } }));
    }
};

const cleanJson = (text: string): string => {
    if (!text) return '[]';
    let clean = text.trim();
    // Eliminar posibles bloques de código markdown
    clean = clean.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '');
    const start = clean.indexOf('[');
    const end = clean.lastIndexOf(']');
    if (start !== -1 && end !== -1) {
        return clean.substring(start, end + 1);
    }
    return clean;
};

// MOTOR TURBO FLASH: Optimizado para velocidad pura
const TICKET_PROMPT = "MERCADONA_OCR: Extract [qty, name, unit, category] to JSON array. Categories: vegetables, fruits, dairy, meat, fish, pasta, legumes, broths, bakery, frozen, pantry, spices, drinks, other.";

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
  // Inicializamos dentro de la función para asegurar el API_KEY más reciente
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: { 
        parts: [
          { inlineData: { mimeType, data: base64Data } }, 
          { text: TICKET_PROMPT }
        ] 
      },
      config: { 
        responseMimeType: "application/json",
        responseSchema: TICKET_SCHEMA,
        thinkingConfig: { thinkingBudget: 0 }, // DESACTIVADO COMPLETAMENTE PARA VELOCIDAD
        temperature: 0, // Determinismo máximo = más rapidez
        topP: 0.1
      }
    });
    
    const rawText = response.text;
    const jsonStr = cleanJson(rawText);
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Fresco Turbo Vision Error:", error);
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
    // Simulación rápida para el planificador
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

export const generateBatchCookingAI = async (recipes: Recipe[]): Promise<BatchSession> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Batch cooking plan for: ${recipes.map(r => r.title).join(", ")}. JSON output.`,
      config: { 
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 }
      }
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
            contents: `Generate ${count} recipes with: ${pantry.map(p => p.name).join(",")}. JSON array.`,
            config: { 
              responseMimeType: "application/json",
              thinkingConfig: { thinkingBudget: 0 }
            }
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
      model: "gemini-3-flash-preview",
      contents: `${TICKET_PROMPT}\n\nTEXT:\n${rawText}`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: TICKET_SCHEMA,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return JSON.parse(cleanJson(response.text || '[]'));
  } catch (error) {
    return [];
  }
};
