
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, MealCategory } from "../types";

const getApiKey = () => {
  const manualKey = localStorage.getItem('fresco_manual_api_key');
  if (manualKey) return manualKey;
  // @ts-ignore
  return import.meta.env?.VITE_API_KEY || process.env.API_KEY || (window as any).process?.env?.API_KEY || '';
};

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

const cleanJson = (text: string | undefined): string => {
    if (!text) return '{}';
    // Buscar el primer '{' y el último '}'
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
        return text.substring(start, end + 1);
    }
    return '{}';
};

export const validateApiKey = async (testKey: string): Promise<boolean> => {
    try {
        const ai = new GoogleGenAI({ apiKey: testKey });
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: "hi",
        });
        return !!response.text;
    } catch (e) {
        return false;
    }
};

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
    return JSON.parse(cleanJson(response.text));
  } catch (error: any) {
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
    // Solo enviamos IDs y Títulos para no saturar el contexto
    const recipeOptions = availableRecipes.map(r => ({ id: r.id, title: r.title }));

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Genera un plan para estas fechas: ${targetDates.join(", ")} y estas comidas: ${targetTypes.join(", ")}. Despensa: ${pantrySummary}. Recetas disponibles: ${JSON.stringify(recipeOptions)}. Devuelve UN OBJETO donde las llaves sean las FECHAS y el valor sea otro objeto con las COMIDAS y sus RECETA_ID.`,
            config: { 
                systemInstruction: "Eres un planificador experto. Responde EXCLUSIVAMENTE con el objeto JSON solicitado, sin explicaciones ni Markdown extra.",
                responseMimeType: "application/json",
                temperature: 0.2
            }
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
        console.error("Gemini Selection Error:", error);
        // Fallback: Asignación aleatoria si falla la IA
        const plan = targetDates.flatMap(date => 
            targetTypes.map(type => ({ date, type, recipeId: availableRecipes[Math.floor(Math.random() * availableRecipes.length)].id, servings: user.household_size, isCooked: false }))
        );
        return { plan, newRecipes: [] };
    }
};
