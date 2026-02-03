
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, MealCategory } from "../types";

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

const cleanJson = (text: string | undefined): string => {
    if (!text) return '{}';
    // Buscar bloques de código markdown o simplemente el primer {
    const match = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || text.match(/\{[\s\S]*\}/);
    if (match) return match[1] || match[0];
    return '{}';
};

const AI_TICKET_PROMPT = `Analiza tickets de supermercados españoles (Mercadona, Carrefour, Lidl, Aldi, Eroski, Dia).
IGNORA: logos, CIF, dirección, ticket#, fecha, pago, IVA, totales.
NORMALIZA: "HAC. LECHE ENT." → "Leche Entera Hacendado", "PIMT. VERDE KG" → "Pimiento Verde", "FTE SALMON" → "Filete de Salmón".
CANTIDADES: "2 x 1,50€" → cantidad: 2.0; "0,540 kg" → cantidad: 0.540, unit: "kg".
UNIDADES: uds, kg, g, l, ml.
CATEGORÍAS: vegetables, fruits, dairy, meat, fish, pasta, legumes, bakery, drinks, pantry, other.
CADUCIDAD (estimated_expiry_days): pescado/carne=2-4 días, lácteos=7-14, verduras/frutas=5-7, pan=3-5, congelados=180-365, conservas/pasta=365-730.

RESPONDE EXCLUSIVAMENTE CON ESTE FORMATO JSON:
{"supermarket":"Nombre del Supermercado","items":[{"name":"Producto Normalizado","quantity":1.0,"unit":"uds","category":"category_id","estimated_expiry_days":7}]}`;

export const extractItemsFromTicket = async (base64Data: string, mimeType: string, retries = 2): Promise<any> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("MISSING_API_KEY");

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { 
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: "Analiza este ticket de compra. Responde SOLO con el JSON." }
        ] 
      },
      config: { 
        systemInstruction: AI_TICKET_PROMPT,
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    });
    
    const text = response.text;
    if (!text) throw new Error("La IA no devolvió contenido.");
    
    return JSON.parse(cleanJson(text));
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found")) throw new Error("MISSING_API_KEY");
    if ((error.message?.includes("429") || error.message?.includes("limit")) && retries > 0) {
        await wait(2000);
        return extractItemsFromTicket(base64Data, mimeType, retries - 1);
    }
    throw error;
  }
};

export const getWastePreventionTip = async (pantry: PantryItem[]): Promise<string> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return "Cocina con lo que tienes y ahorra hoy.";
    const ai = new GoogleGenAI({ apiKey });
    if (pantry.length === 0) return "¡Tu despensa está lista! Añade productos para empezar.";
    
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
        if (error.message?.includes("Requested entity was not found")) throw new Error("MISSING_API_KEY");
        const plan = targetDates.flatMap(date => 
            targetTypes.map(type => ({ date, type, recipeId: availableRecipes[Math.floor(Math.random() * availableRecipes.length)].id, servings: user.household_size, isCooked: false }))
        );
        return { plan, newRecipes: [] };
    }
};
