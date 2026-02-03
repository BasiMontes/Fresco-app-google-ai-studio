
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
  // CRITICAL: Must obtain key from process.env.API_KEY as per guidelines.
  // We use type casting to ensure it's treated as a string even if the polyfill is still mounting.
  const apiKey = (process.env.API_KEY as string);
  
  if (!apiKey || apiKey === "undefined") {
      console.error("Fresco Error: API_KEY is missing in process.env");
      throw new Error("MISSING_API_KEY");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    };

    const textPart = {
      text: "Analiza este ticket y devuelve el JSON de productos."
    };

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
    if (errorMsg.includes("api key") || errorMsg.includes("404") || errorMsg.includes("not found")) {
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
    const apiKey = (process.env.API_KEY as string);
    if (!apiKey || apiKey === "undefined") return "Configura tu clave para consejos IA.";
    
    if (pantry.length === 0) return "Tu despensa está lista.";
    
    const expiringItems = pantry
        .filter(i => i.expires_at)
        .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime())
        .slice(0, 3);

    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Dame un consejo de 10 palabras para aprovechar: ${expiringItems.map(i => i.name).join(", ")}.`,
        });
        return response.text || "Aprovecha tus frescos hoy.";
    } catch (error: any) {
        return "Organiza tu cocina hoy.";
    }
};

export const generateSmartMenu = async (user: UserProfile, pantry: PantryItem[], targetDates: string[], targetTypes: MealCategory[], availableRecipes: Recipe[]): Promise<{ plan: MealSlot[], newRecipes: Recipe[] }> => {
    const apiKey = (process.env.API_KEY as string);
    if (!apiKey || apiKey === "undefined") throw new Error("MISSING_API_KEY");
    
    const ai = new GoogleGenAI({ apiKey });
    const recipeOptions = availableRecipes.map(r => ({ id: r.id, title: r.title }));

    try {
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
