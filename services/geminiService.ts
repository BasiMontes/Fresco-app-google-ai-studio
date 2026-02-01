
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, MealCategory } from "../types";

const getApiKey = () => {
  // 1. Prioridad Máxima: Clave inyectada manualmente por el usuario en la app (Local Storage)
  const manualKey = localStorage.getItem('fresco_manual_api_key');
  if (manualKey) return manualKey;

  // 2. Fallback: Variable de entorno de compilación
  // @ts-ignore
  return import.meta.env?.VITE_API_KEY || process.env.API_KEY || (window as any).process?.env?.API_KEY || '';
};

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

const cleanJson = (text: string | undefined): string => {
    if (!text) return '{"items":[]}';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return match[0];
    return '{"items":[]}';
};

/**
 * Prueba si una clave es válida realizando una petición mínima.
 */
export const validateApiKey = async (testKey: string): Promise<boolean> => {
    try {
        const ai = new GoogleGenAI({ apiKey: testKey });
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: "hi",
        });
        return !!response.text;
    } catch (e) {
        console.error("Validation failed:", e);
        return false;
    }
};

/**
 * Genera un consejo de aprovechamiento basado en productos próximos a caducar.
 */
export const getWastePreventionTip = async (pantry: PantryItem[]): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey || pantry.length === 0) return "¡Tu despensa está lista! Añade productos para recibir consejos.";
    
    const expiringItems = pantry
        .filter(i => i.expires_at)
        .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime())
        .slice(0, 3);

    const ai = new GoogleGenAI({ apiKey });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Tengo estos productos a punto de caducar: ${expiringItems.map(i => i.name).join(", ")}. Dame un consejo de cocina de 15 palabras máximo para aprovecharlos hoy. Sé motivador.`,
            config: { temperature: 0.7 }
        });
        return response.text || "Cocina algo creativo con lo que tienes hoy.";
    } catch (error: any) {
        if (error.message?.includes("leaked") || error.message?.includes("reported as leaked")) throw new Error("API_KEY_LEAKED");
        return "Aprovecha tus productos frescos antes de que caduquen.";
    }
};

export const extractItemsFromTicket = async (base64Data: string, mimeType: string, retries = 2): Promise<any> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("MISSING_API_KEY");

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { 
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: "Extrae productos de este ticket. JSON formato: supermarket, items[name, quantity, unit, category, estimated_expiry_days]" }
        ] 
      },
      config: { 
        systemInstruction: "Digitalizador de tickets Fresco. Responde solo JSON.",
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    });
    
    // Incrementar contador de uso
    const current = parseInt(localStorage.getItem('fresco_api_usage') || '0');
    localStorage.setItem('fresco_api_usage', (current + 1).toString());

    return JSON.parse(cleanJson(response.text));
  } catch (error: any) {
    if (error.message?.includes("leaked") || error.message?.includes("reported as leaked")) {
        throw new Error("API_KEY_LEAKED");
    }

    if ((error.message?.includes("429") || error.message?.includes("limit")) && retries > 0) {
        await wait(2000);
        return extractItemsFromTicket(base64Data, mimeType, retries - 1);
    }
    throw error;
  }
};

export const generateSmartMenu = async (user: UserProfile, pantry: PantryItem[], targetDates: string[], targetTypes: MealCategory[], availableRecipes: Recipe[]): Promise<{ plan: MealSlot[], newRecipes: Recipe[] }> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("MISSING_API_KEY");
    
    const ai = new GoogleGenAI({ apiKey });
    const pantrySummary = pantry.map(p => p.name).join(", ");
    const recipeOptions = availableRecipes.map(r => ({ id: r.id, title: r.title, ingredients: r.ingredients.map(i => i.name).join(",") }));

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Basado en esta despensa: ${pantrySummary}. Selecciona las mejores IDs de estas recetas para un plan de ${targetDates.length} días: ${JSON.stringify(recipeOptions)}. Devuelve JSON con el mapeo.`,
            config: { responseMimeType: "application/json" }
        });
        
        const selections = JSON.parse(cleanJson(response.text));
        const plan: MealSlot[] = [];
        
        targetDates.forEach(date => {
            targetTypes.forEach(type => {
                const recipeId = selections[date]?.[type] || availableRecipes[Math.floor(Math.random()*availableRecipes.length)].id;
                plan.push({ date, type, recipeId, servings: user.household_size, isCooked: false });
            });
        });
        return { plan, newRecipes: [] };
    } catch (error: any) {
        if (error.message?.includes("leaked") || error.message?.includes("reported as leaked")) throw new Error("API_KEY_LEAKED");
        const plan = targetDates.flatMap(date => 
            targetTypes.map(type => ({ date, type, recipeId: availableRecipes[0].id, servings: user.household_size, isCooked: false }))
        );
        return { plan, newRecipes: [] };
    }
};
