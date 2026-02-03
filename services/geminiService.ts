
import { GoogleGenAI } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, MealCategory } from "../types";

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

const cleanJson = (text: string | undefined): string => {
    if (!text) return '{}';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return match[0];
    return text.trim();
};

const AI_TICKET_PROMPT = `Actúa como un experto en OCR de tickets de supermercado. 
Analiza la imagen y extrae los productos en este formato JSON exacto:
{
  "supermarket": "Nombre de la tienda",
  "items": [
    {
      "name": "Nombre claro del producto",
      "quantity": 1,
      "unit": "uds",
      "category": "vegetables/fruits/dairy/meat/fish/pasta/legumes/bakery/drinks/pantry/other",
      "estimated_expiry_days": 7
    }
  ]
}
Normas: Normaliza nombres y estima días de caducidad lógicos.`;

export const extractItemsFromTicket = async (base64Data: string, mimeType: string, retries = 1): Promise<any> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
      console.error("Fresco: API_KEY no configurada en process.env");
      throw new Error("MISSING_API_KEY");
  }

  try {
    // Instanciamos justo antes de la llamada como dictan las guías
    const ai = new GoogleGenAI({ apiKey });

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    };

    const textPart = {
      text: "Extrae los productos de este ticket de compra en el formato JSON solicitado."
    };

    // Usamos gemini-3-flash-preview y el formato de contents recomendado para multimodal
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: { parts: [imagePart, textPart] },
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
    console.error("Gemini Technical Error:", error);
    
    const errorMsg = error.message?.toLowerCase() || "";
    // Capturamos específicamente el error de "must be set" del SDK
    if (errorMsg.includes("api key") || errorMsg.includes("not found") || errorMsg.includes("404")) {
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
    const apiKey = process.env.API_KEY;
    if (!apiKey) return "Configura tu clave para recibir consejos.";
    
    if (pantry.length === 0) return "Tu despensa está lista.";
    
    const expiringItems = pantry
        .filter(i => i.expires_at)
        .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime())
        .slice(0, 3);

    try {
        const ai = new GoogleGenAI({ apiKey });
        // Usamos gemini-3-flash-preview para tareas de texto básicas
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Dame un consejo de 10 palabras para aprovechar: ${expiringItems.map(i => i.name).join(", ")}.`,
        });
        return response.text || "Aprovecha tus frescos hoy.";
    } catch (error: any) {
        return "Planifica tu menú para ahorrar hoy.";
    }
};

export const generateSmartMenu = async (user: UserProfile, pantry: PantryItem[], targetDates: string[], targetTypes: MealCategory[], availableRecipes: Recipe[]): Promise<{ plan: MealSlot[], newRecipes: Recipe[] }> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("MISSING_API_KEY");
    
    const ai = new GoogleGenAI({ apiKey });
    const recipeOptions = availableRecipes.map(r => ({ id: r.id, title: r.title }));

    try {
        // Usamos gemini-3-flash-preview para razonamiento y generación de JSON
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Genera un plan de comidas JSON para: ${targetDates.join(", ")}. Opciones: ${JSON.stringify(recipeOptions)}.`,
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
        const plan = targetDates.flatMap(date => 
            targetTypes.map(type => ({ date, type, recipeId: availableRecipes[Math.floor(Math.random() * availableRecipes.length)].id, servings: user.household_size, isCooked: false }))
        );
        return { plan, newRecipes: [] };
    }
};
