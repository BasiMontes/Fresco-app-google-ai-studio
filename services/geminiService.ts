
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, BatchSession, MealCategory } from "../types";

/**
 * Limpia y extrae el JSON de la respuesta de la IA de forma segura.
 * Evita errores si el texto es undefined o contiene markdown.
 */
const cleanJson = (text: string | undefined): string => {
    if (!text) return '[]';
    let clean = text.trim();
    
    // Eliminar bloques de código markdown si existen
    clean = clean.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '');
    
    // Intentar encontrar el inicio y fin de un array
    const start = clean.indexOf('[');
    const end = clean.lastIndexOf(']');
    if (start !== -1 && end !== -1) {
        return clean.substring(start, end + 1);
    }
    
    // Intentar encontrar el inicio y fin de un objeto
    const objectStart = clean.indexOf('{');
    const objectEnd = clean.lastIndexOf('}');
    if (objectStart !== -1 && objectEnd !== -1) {
        return clean.substring(objectStart, objectEnd + 1);
    }
    
    return clean;
};

const TICKET_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Nombre legible del producto" },
      quantity: { type: Type.NUMBER, description: "Cantidad numérica" },
      unit: { type: Type.STRING, description: "Unidad (uds, kg, l, g)" },
      category: { type: Type.STRING, description: "Categoría de alimentación" }
    },
    required: ["name", "quantity", "unit", "category"]
  }
};

/**
 * Escanea un ticket usando el modelo Flash Lite para una respuesta casi instantánea.
 */
export const extractItemsFromTicket = async (base64Data: string, mimeType: string = 'image/jpeg'): Promise<any[]> => {
  // Inicialización de instancia justo antes de la llamada según directrices
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-lite-latest", // EL MÁS RÁPIDO PARA TAREAS DE EXTRACCIÓN
      contents: { 
        parts: [
          { inlineData: { mimeType, data: base64Data } }
        ] 
      },
      config: { 
        systemInstruction: "Actúa como un escáner OCR especializado en tickets de supermercado. Extrae únicamente productos de alimentación. Devuelve SIEMPRE un array JSON. Categorías válidas: vegetables, fruits, dairy, meat, fish, pasta, legumes, bakery, drinks, pantry, other. Idioma: Español.",
        responseMimeType: "application/json",
        responseSchema: TICKET_SCHEMA,
        temperature: 0.1,
      }
    });
    
    const jsonStr = cleanJson(response.text);
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Fresco Vision OCR Error:", error);
    return [];
  }
};

/**
 * Genera un menú semanal inteligente.
 */
export const generateSmartMenu = async (
    user: UserProfile, 
    pantry: PantryItem[], 
    targetDates: string[], 
    targetTypes: MealCategory[], 
    availableRecipes: Recipe[]
): Promise<{ plan: MealSlot[], newRecipes: Recipe[] }> => {
    // Simulación de lógica para respuesta inmediata
    const plan: MealSlot[] = [];
    targetDates.forEach(date => {
        targetTypes.forEach(type => {
            const pool = availableRecipes.filter(r => r.meal_category === (type === 'breakfast' ? 'breakfast' : r.meal_category));
            if (pool.length === 0) return;
            const selected = pool[Math.floor(Math.random() * pool.length)];
            plan.push({ date, type, recipeId: selected.id, servings: user.household_size, isCooked: false });
        });
    });
    return { plan, newRecipes: [] };
};

/**
 * Genera recetas mediante IA usando los ingredientes de la despensa.
 */
export const generateRecipesAI = async (user: UserProfile, pantry: PantryItem[], count: number = 3): Promise<Recipe[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Genera ${count} recetas deliciosas con estos ingredientes: ${pantry.slice(0, 10).map(p => p.name).join(",")}.`,
            config: { 
                responseMimeType: "application/json",
                systemInstruction: "Eres un chef experto. Genera un array JSON de objetos Recipe detallados."
            }
        });
        return JSON.parse(cleanJson(response.text));
    } catch (error) {
        console.error("AI Recipe Generation Error:", error);
        return [];
    }
};

/**
 * Crea un plan de Batch Cooking coordinado.
 */
export const generateBatchCookingAI = async (recipes: Recipe[]): Promise<BatchSession> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Optimiza el tiempo de cocinado para estas recetas: ${recipes.map(r => r.title).join(", ")}.`,
            config: { 
                responseMimeType: "application/json",
                systemInstruction: "Genera un objeto BatchSession con pasos optimizados para cocinar todo a la vez."
            }
        });
        return JSON.parse(cleanJson(response.text));
    } catch {
        return { total_duration: 0, steps: [] };
    }
};
