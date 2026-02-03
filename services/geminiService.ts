
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserProfile, PantryItem, MealSlot, MealCategory } from "../types";

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

const cleanJson = (text: string | undefined): string => {
    if (!text) return '{}';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return match[0];
    return text.trim();
};

const AI_TICKET_PROMPT = `Actúa como un experto en OCR de tickets. Analiza la imagen y extrae en JSON:
1. supermarket: Nombre de la tienda.
2. items: Lista de productos con name, quantity, unit, category (vegetables, fruits, dairy, meat, fish, pasta, legumes, bakery, drinks, pantry, other) y estimated_expiry_days.
Normaliza nombres raros y estima caducidad lógica.`;

export const extractItemsFromTicket = async (base64Data: string, mimeType: string, retries = 1): Promise<any> => {
  // Siempre creamos una instancia fresca con la clave del proceso actual
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

  try {
    // ESTRUCTURA CORRECTA SEGÚN GUÍAS GEMINI 3 MULTIMODAL
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    };

    const textPart = {
      text: "Extrae los productos de este ticket en formato JSON siguiendo las instrucciones del sistema."
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // El modelo más compatible con facturación activa
      contents: { parts: [imagePart, textPart] }, // Estructura de partes obligatoria
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
    console.error("Error técnico Gemini:", error);
    
    // Si el error es 404 o relacionado con la clave, lo propagamos para que la UI lo maneje
    if (error.message?.includes("not found") || error.message?.includes("API key") || error.message?.includes("404")) {
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
    if (pantry.length === 0) return "Tu despensa está lista.";
    
    const expiringItems = pantry
        .filter(i => i.expires_at)
        .sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime())
        .slice(0, 3);

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Dame un consejo de 10 palabras para usar esto pronto: ${expiringItems.map(i => i.name).join(", ")}.`,
        });
        return response.text || "Aprovecha tus frescos hoy.";
    } catch (error: any) {
        return "Planifica tu menú para evitar desperdicios.";
    }
};

export const generateSmartMenu = async (user: UserProfile, pantry: PantryItem[], targetDates: string[], targetTypes: MealCategory[], availableRecipes: Recipe[]): Promise<{ plan: MealSlot[], newRecipes: Recipe[] }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
    const recipeOptions = availableRecipes.map(r => ({ id: r.id, title: r.title }));

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Genera plan JSON para: ${targetDates.join(", ")}. Recetas: ${JSON.stringify(recipeOptions)}.`,
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
