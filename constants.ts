
import { Recipe, UserProfile, DietPreference, CuisineType, MealCategory } from "./types";

export const FEATURES = {
    MORNING_BRIEFING: true,
    VOICE_ASSISTANT: false,
    WAKE_LOCK: false,
    SHOPPING_COMPARISON: true
};

export const SPANISH_PRICES: Record<string, number> = {
  "tomate": 2.20, "cebolla": 1.20, "ajo": 5.50, "pollo": 7.50, "leche": 1.15,
  "huevos": 0.25, "arroz": 1.30, "aceite": 9.50, "pan": 1.00, "lechuga": 1.00,
  "pasta": 1.50, "queso": 12.00, "manzana": 2.50, "platano": 1.80, "pimiento": 2.50,
  "zanahoria": 1.00, "patata": 1.20, "salmon": 18.00, "ternera": 14.00, "yogur": 2.50,
  "aguacate": 1.50, "limon": 0.40, "pepino": 0.80, "quinoa": 3.50, "queso feta": 2.50,
  "aceitunas": 1.20, "calabacin": 1.10, "default": 1.50, "lentejas": 2.00, "garbanzos": 1.80,
  "espinacas": 1.50, "atun": 1.00, "merluza": 12.00, "gbas": 15.00, "avena": 2.00,
  "champiñones": 3.50, "pavo": 8.00, "tofu": 4.50, "gambas": 12.00, "brocoli": 1.80,
  "coliflor": 1.90, "judias": 2.50, "guisantes": 2.00, "cerdo": 6.50, "batata": 1.50, "cuscus": 2.00
};

export const UNIT_WEIGHTS: Record<string, number> = {
  "tomate": 150, "cebolla": 130, "ajo": 8, "huevo": 60, "pimiento": 180,
  "zanahoria": 90, "patata": 200, "aguacate": 220, "limon": 110, "pepino": 250,
  "calabacin": 320, "manzana": 180, "platano": 130, "rebanada": 40, "diente": 6,
  "filete": 150, "pechuga": 200, "muslo": 150, "yogur": 125, "puñado": 30
};

export const SUPERMARKETS = [
  { id: 'merc-1', name: 'Mercadona', multiplier: 1.0 },
  { id: 'carr-1', name: 'Carrefour', multiplier: 1.12 },
  { id: 'lidl-1', name: 'Lidl', multiplier: 0.95 },
  { id: 'aldi-1', name: 'Aldi', multiplier: 0.96 }
];

export const EXPIRY_DAYS_BY_CATEGORY: Record<string, number> = {
    "vegetables": 7,
    "fruits": 10,
    "dairy": 12,
    "meat": 4,
    "fish": 2,
    "pasta": 365,
    "legumes": 365,
    "broths": 180,
    "bakery": 5,
    "frozen": 180,
    "spices": 365,
    "pantry": 180,
    "drinks": 90,
    "other": 30
};

export const PREDICTIVE_CATEGORY_RULES: Record<string, { category: string, unit: string }> = {
    // Lácteos
    "leche": { category: "dairy", unit: "l" },
    "huevo": { category: "dairy", unit: "uds" },
    "queso": { category: "dairy", unit: "g" },
    "yogur": { category: "dairy", unit: "uds" },
    "mantequilla": { category: "dairy", unit: "g" },
    // Carnes
    "pollo": { category: "meat", unit: "g" },
    "ternera": { category: "meat", unit: "g" },
    "cerdo": { category: "meat", unit: "g" },
    "pavo": { category: "meat", unit: "g" },
    // Pescados
    "salmon": { category: "fish", unit: "g" },
    "atun": { category: "fish", unit: "uds" },
    "merluza": { category: "fish", unit: "g" },
    // Verduras
    "tomate": { category: "vegetables", unit: "uds" },
    "cebolla": { category: "vegetables", unit: "uds" },
    "ajo": { category: "vegetables", unit: "dientes" },
    "patata": { category: "vegetables", unit: "kg" },
    "lechuga": { category: "vegetables", unit: "uds" },
    // Pasta y Arroz
    "arroz": { category: "pasta", unit: "g" },
    "pasta": { category: "pasta", unit: "g" },
    "macarron": { category: "pasta", unit: "g" },
    "espagueti": { category: "pasta", unit: "g" },
    "tallarin": { category: "pasta", unit: "g" },
    "cuscus": { category: "pasta", unit: "g" },
    "quinoa": { category: "pasta", unit: "g" },
    // Legumbres
    "lenteja": { category: "legumes", unit: "g" },
    "garbanzo": { category: "legumes", unit: "g" },
    "alubia": { category: "legumes", unit: "g" },
    "faba": { category: "legumes", unit: "g" },
    "judion": { category: "legumes", unit: "g" },
    // Caldos
    "caldo": { category: "broths", unit: "l" },
    "sopa": { category: "broths", unit: "uds" },
    "crema": { category: "broths", unit: "uds" },
    "gazpacho": { category: "broths", unit: "l" },
    // Panadería
    "pan": { category: "bakery", unit: "uds" },
    "bollo": { category: "bakery", unit: "uds" },
    "barra": { category: "bakery", unit: "uds" },
    // Bebidas
    "agua": { category: "drinks", unit: "l" },
    "zumo": { category: "drinks", unit: "l" },
    "vino": { category: "drinks", unit: "l" },
    "cerveza": { category: "drinks", unit: "l" },
    "refresco": { category: "drinks", unit: "l" },
    // Despensa
    "aceite": { category: "pantry", unit: "l" },
    "vinagre": { category: "pantry", unit: "l" },
    "harina": { category: "pantry", unit: "g" },
    "azucar": { category: "pantry", unit: "g" },
    "sal": { category: "spices", unit: "g" }
};

export const MOCK_USER: UserProfile = {
  name: "Alex Demo",
  dietary_preferences: ["none"],
  favorite_cuisines: ["mediterranean", "spanish"],
  cooking_experience: "intermediate",
  household_size: 2,
  onboarding_completed: true,
  total_savings: 124.80,
  meals_cooked: 34,
  time_saved_mins: 0,
  history_savings: [{ date: '2024-05-01', amount: 124.80 }]
};

function generateMassiveLogicalRecipes(): Recipe[] {
    const pool: Recipe[] = [];
    
    // 1. DESAYUNOS (40 recetas)
    const breakfastBases = ['Yogur Griego', 'Tostada de Pan Integral', 'Porridge de Avena', 'Tortitas de Avena', 'Smoothie Bowl'];
    const breakfastToppings = ['Fresas', 'Plátano', 'Arándanos', 'Nueces', 'Miel', 'Aguacate', 'Huevo Poché', 'Mantequilla de Cacahuete'];
    
    for (let i = 0; i < 40; i++) {
        const base = breakfastBases[i % breakfastBases.length];
        const top = breakfastToppings[i % breakfastToppings.length];
        const secondTop = breakfastToppings[(i + 1) % breakfastToppings.length];
        
        pool.push({
            id: `static-bf-${i}`,
            title: `${base} con ${top} y ${secondTop}`,
            description: `Un desayuno energético y equilibrado con base de ${base.toLowerCase()}.`,
            meal_category: 'breakfast',
            cuisine_type: 'healthy',
            difficulty: 'easy',
            prep_time: 10,
            servings: 2,
            ingredients: [
                { name: base, quantity: 1, unit: 'ud', category: 'dairy' },
                { name: top, quantity: 50, unit: 'g', category: 'fruits' },
                { name: secondTop, quantity: 20, unit: 'g', category: 'other' }
            ],
            instructions: [`Preparar la base de ${base}.`, `Añadir ${top.toLowerCase()} troceado.`, `Decorar con ${secondTop.toLowerCase()} y servir.`],
            dietary_tags: ['vegetarian', 'healthy'],
            image_url: `https://images.unsplash.com/photo-1494390248081-4e521a5940db?auto=format&fit=crop&q=80&sig=bf-${i}`
        });
    }

    // 2. COMIDAS Y CENAS (160 recetas)
    const proteins = [
        { n: 'Pollo', c: 'meat', t: ['lactose_free'] },
        { n: 'Salmón', c: 'fish', t: ['healthy', 'paleo'] },
        { n: 'Tofu', c: 'meat', t: ['vegan', 'vegetarian'] },
        { n: 'Ternera', c: 'meat', t: ['keto'] },
        { n: 'Gambas', c: 'fish', t: ['healthy'] },
        { n: 'Lentejas', c: 'legumes', t: ['vegan', 'vegetarian', 'healthy'] },
        { n: 'Atún', c: 'fish', t: ['healthy'] },
        { n: 'Garbanzos', c: 'legumes', t: ['vegan', 'vegetarian'] }
    ];

    const bases = [
        { n: 'Arroz', c: 'pasta', cui: 'asian' },
        { n: 'Pasta', c: 'pasta', cui: 'italian' },
        { n: 'Quinoa', c: 'pasta', cui: 'healthy' },
        { n: 'Cuscús', c: 'pasta', cui: 'mediterranean' },
        { n: 'Ensalada', c: 'vegetables', cui: 'healthy' },
        { n: 'Patatas Asadas', c: 'vegetables', cui: 'spanish' }
    ];

    const styles = [
        { n: 'al Curry', cui: 'indian' },
        { n: 'Teriyaki', cui: 'asian' },
        { n: 'con Pesto', cui: 'italian' },
        { n: 'al Ajillo', cui: 'spanish' },
        { n: 'Mediterráneo', cui: 'mediterranean' },
        { n: 'Picante', cui: 'mexican' },
        { n: 'al Limón', cui: 'healthy' },
        { n: 'Salteado con Verduras', cui: 'healthy' }
    ];

    let idCounter = 0;
    for (let p of proteins) {
        for (let b of bases) {
            for (let s of styles) {
                if (idCounter >= 160) break;
                
                // Mezcla lógica: pasta con curry es raro, pero arroz con curry es top.
                // Filtramos algunas combinaciones muy locas para mantener coherencia.
                if (b.n === 'Pasta' && s.n === 'al Curry') continue;
                if (b.n === 'Arroz' && s.n === 'con Pesto') continue;

                pool.push({
                    id: `static-main-${idCounter}`,
                    title: `${p.n} ${s.n} sobre ${b.n}`,
                    description: `Plato completo de ${p.n.toLowerCase()} cocinado ${s.n.toLowerCase()} acompañado de ${b.n.toLowerCase()}.`,
                    meal_category: idCounter % 2 === 0 ? 'lunch' : 'dinner',
                    cuisine_type: s.cui as CuisineType,
                    difficulty: idCounter % 3 === 0 ? 'medium' : 'easy',
                    prep_time: 20 + (idCounter % 20),
                    servings: 2,
                    ingredients: [
                        { name: p.n, quantity: 150, unit: 'g', category: p.c as any },
                        { name: b.n, quantity: 100, unit: 'g', category: b.c as any },
                        { name: 'Verduras variadas', quantity: 1, unit: 'ración', category: 'vegetables' }
                    ],
                    instructions: [
                        `Preparar el/la ${p.n.toLowerCase()} siguiendo el estilo ${s.n.toLowerCase()}.`,
                        `Cocer la base de ${b.n.toLowerCase()}.`,
                        `Servir caliente y disfrutar de una comida equilibrada.`
                    ],
                    dietary_tags: [...p.t, 'healthy'] as DietPreference[],
                    image_url: `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&sig=main-${idCounter}`
                });
                idCounter++;
            }
        }
    }

    return pool;
}

export const STATIC_RECIPES = generateMassiveLogicalRecipes();
export const FALLBACK_RECIPES = STATIC_RECIPES;
