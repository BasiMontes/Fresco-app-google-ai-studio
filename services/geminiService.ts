
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
  // CRITICAL: Use process.env.API_KEY directly as per guidelines. 
  // No fallback to "" to allow the SDK/Environment to handle the missing key error correctly.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  try {
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    };

    const textPart = {
      text: "Extrae los productos de este ticket de compra en el formato JSON solicitado."
    };

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest", 
      contents: [{ parts: [imagePart, textPart] }],
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
    console.error("Gemini Error:", error);
    
    const errorMsg = error.message?.toLowerCase() || "";
    // Si falta la clave o el modelo no se encuentra
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
    if (!process.env.API_KEY) return "Configura tu clave para recibir consejos.";
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    
    if (pantry.length === 0) return "Tu despensa está lista.";
    
    const expiringItems = pantry
        .filter(i => i.expires_at)
        .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime())
        .slice(0, 3);

    try {
        const response = await ai.models.generateContent({
            model: "gemini-flash-latest",
            contents: `Dame un consejo de 10 palabras para aprovechar: ${expiringItems.map(i => i.name).join(", ")}.`,
        });
        return response.text || "Aprovecha tus frescos hoy.";
    } catch (error: any) {
        return "Organiza tu cocina para ahorrar.";
    }
};

export const generateSmartMenu = async (user: UserProfile, pantry: PantryItem[], targetDates: string[], targetTypes: MealCategory[], availableRecipes: Recipe[]): Promise<{ plan: MealSlot[], newRecipes: Recipe[] }> => {
    if (!process.env.API_KEY) throw new Error("MISSING_API_KEY");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const recipeOptions = availableRecipes.map(r => ({ id: r.id, title: r.title }));

    try {
        const response = await ai.models.generateContent({
            model: "gemini-flash-latest",
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
