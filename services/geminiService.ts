
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, MealCategory } from "../types";

// Helper for retries
const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

// Helper to sanitize potential JSON markdown in response
const cleanJson = (text: string | undefined): string => {
    if (!text) return '{}';
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
        return text.substring(start, end + 1);
    }
    return '{}';
};

/**
 * Generates a waste prevention tip based on current pantry items.
 */
export const getWastePreventionTip = async (pantry: PantryItem[]): Promise<string> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return "Configura tu API Key para recibir consejos personalizados.";

    const ai = new GoogleGenAI({ apiKey });
    if (pantry.length === 0) return "¡Tu despensa está lista! Añade productos para recibir consejos.";
    
    const expiringItems = pantry
        .filter(i => i.expires_at)
        .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime())
        .slice(0, 3);

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

/**
 * Extracts product items from a grocery ticket image.
 */
export const extractItemsFromTicket = async (base64Data: string, mimeType: string, retries = 2): Promise<any> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
      throw new Error("MISSING_API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { 
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: "Extrae productos de este ticket de supermercado. Devuelve un objeto JSON con: supermarket (nombre), items (lista de objetos con: name, quantity (número), unit (uds, kg, l, g, ml), category, estimated_expiry_days (número de días desde hoy)). Responde solo el JSON." }
        ] 
      },
      config: { 
        systemInstruction: "Eres Fresco, un asistente experto en digitalización de tickets. Tu objetivo es normalizar nombres de productos y categorías para una despensa inteligente.",
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    });
    
    const text = response.text;
    if (!text) throw new Error("La IA no devolvió contenido.");
    
    return JSON.parse(cleanJson(text));
  } catch (error: any) {
    // Si la entidad no existe, es probable que la API Key sea inválida o haya expirado el proyecto
    if (error.message?.includes("Requested entity was not found")) {
        throw new Error("MISSING_API_KEY");
    }

    if ((error.message?.includes("429") || error.message?.includes("limit")) && retries > 0) {
        await wait(2000);
        return extractItemsFromTicket(base64Data, mimeType, retries - 1);
    }
    throw error;
  }
};

/**
 * Generates a smart meal plan based on user preferences and pantry stock.
 */
export const generateSmartMenu = async (user: UserProfile, pantry: PantryItem[], targetDates: string[], targetTypes: MealCategory[], availableRecipes: Recipe[]): Promise<{ plan: MealSlot[], newRecipes: Recipe[] }> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("MISSING_API_KEY");

    const ai = new GoogleGenAI({ apiKey });
    
    const pantrySummary = pantry.map(p => p.name).join(", ");
    const recipeOptions = availableRecipes.map(r => ({ id: r.id, title: r.title }));

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Genera un plan para estas fechas: ${targetDates.join(", ")} y estas comidas: ${targetTypes.join(", ")}. Despensa: ${pantrySummary}. Recetas disponibles: ${JSON.stringify(recipeOptions)}. Devuelve UN OBJETO donde las llaves sean las FECHAS y el valor sea otro objeto con las COMIDAS y sus RECETA_ID.`,
            config: { 
                systemInstruction: "Eres un planificador experto de dietas mediterráneas. Responde EXCLUSIVAMENTE con el objeto JSON solicitado.",
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
        if (error.message?.includes("Requested entity was not found")) throw new Error("MISSING_API_KEY");
        
        const plan = targetDates.flatMap(date => 
            targetTypes.map(type => ({ date, type, recipeId: availableRecipes[Math.floor(Math.random() * availableRecipes.length)].id, servings: user.household_size, isCooked: false }))
        );
        return { plan, newRecipes: [] };
    }
};
