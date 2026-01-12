
import { Recipe, UserProfile, DietPreference, CuisineType, MealCategory } from "./types";

// QA: Feature Flags para control de producción
export const FEATURES = {
    MORNING_BRIEFING: true, // Beta: Resumen matutino
    VOICE_ASSISTANT: false, // Desactivado por defecto (Alto consumo batería/bugs en iOS)
    WAKE_LOCK: false, // Desactivado (API experimental)
    SHOPPING_COMPARISON: true
};

// Base de datos de precios blindada
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

// Motor de equivalencias (Unidad -> Gramos)
export const UNIT_WEIGHTS: Record<string, number> = {
  "tomate": 150, "cebolla": 130, "ajo": 8, "huevo": 60, "pimiento": 180,
  "zanahoria": 90, "patata": 200, "aguacate": 220, "limon": 110, "pepino": 250,
  "calabacin": 320, "manzana": 180, "platano": 130, "rebanada": 40, "diente": 6,
  "filete": 150, "pechuga": 200, "muslo": 150, "yogur": 125, "puñado": 30
};

export const MEASURE_CONVERSIONS: Record<string, number> = {
  "pizca": 1, "cucharadita": 5, "cucharada": 15, "taza": 240, "chorrito": 10, "un": 1, "ud": 1, "unidad": 1, "puñado": 30
};

export const PREDICTIVE_CATEGORY_RULES: Record<string, { category: string, unit: string }> = {
    'leche': { category: 'dairy', unit: 'l' },
    'yogur': { category: 'dairy', unit: 'unidades' },
    'huevo': { category: 'dairy', unit: 'unidades' },
    'queso': { category: 'dairy', unit: 'g' },
    'arroz': { category: 'grains', unit: 'kg' },
    'pasta': { category: 'grains', unit: 'kg' },
    'pan': { category: 'grains', unit: 'unidades' },
    'harina': { category: 'pantry', unit: 'kg' },
    'azucar': { category: 'pantry', unit: 'kg' },
    'sal': { category: 'spices', unit: 'kg' },
    'aceite': { category: 'pantry', unit: 'l' },
    'tomate': { category: 'vegetables', unit: 'kg' },
    'lechuga': { category: 'vegetables', unit: 'unidades' },
    'cebolla': { category: 'vegetables', unit: 'kg' },
    'ajo': { category: 'vegetables', unit: 'unidades' },
    'pollo': { category: 'meat', unit: 'kg' },
    'carne': { category: 'meat', unit: 'kg' },
    'pescado': { category: 'fish', unit: 'kg' },
    'atun': { category: 'pantry', unit: 'unidades' },
    'manzana': { category: 'fruits', unit: 'kg' },
    'platano': { category: 'fruits', unit: 'kg' },
    'naranja': { category: 'fruits', unit: 'kg' },
    'papel': { category: 'other', unit: 'unidades' },
    'jabon': { category: 'other', unit: 'l' },
};

export const EXPIRY_DAYS_BY_CATEGORY: Record<string, number> = {
    "vegetables": 7, "fruits": 7, "dairy": 14, "meat": 3, "fish": 2,
    "grains": 180, "pantry": 90, "spices": 365, "other": 30
};

export const SUPERMARKETS = [
  { id: 'mercadona', name: 'Mercadona', multiplier: 1.0, color: 'bg-green-600' },
  { id: 'carrefour', name: 'Carrefour', multiplier: 1.05, color: 'bg-blue-600' },
  { id: 'lidl', name: 'Lidl', multiplier: 0.95, color: 'bg-yellow-500' },
  { id: 'aldi', name: 'Aldi', multiplier: 0.98, color: 'bg-blue-800' }
];

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

// --- RECETAS MANUALES (CORE) ---
const CORE_RECIPES: Recipe[] = [
  {
    id: "bf-1",
    title: "Tostada de Aguacate y Huevo",
    description: "Energía saludable para empezar el día.",
    meal_category: "breakfast",
    cuisine_type: "healthy",
    difficulty: "easy",
    prep_time: 10,
    servings: 1,
    calories: 350,
    dietary_tags: ["vegetarian", "lactose_free"],
    ingredients: [{ name: "pan integral", quantity: 1, unit: "rebanada", category: "grains" }, { name: "aguacate", quantity: 0.5, unit: "unidad", category: "fruits" }, { name: "huevo", quantity: 1, unit: "unidad", category: "dairy" }],
    instructions: ["Tostar pan", "Chafar aguacate", "Poner huevo encima"],
    image_url: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80"
  },
  {
    id: "main-1",
    title: "Pollo al Horno con Patatas",
    description: "Fácil y para toda la familia.",
    meal_category: "lunch",
    cuisine_type: "spanish",
    difficulty: "medium",
    prep_time: 60,
    servings: 2,
    calories: 500,
    dietary_tags: ["gluten_free", "lactose_free"],
    ingredients: [{ name: "muslos de pollo", quantity: 2, unit: "unidades", category: "meat" }, { name: "patata", quantity: 2, unit: "unidades", category: "vegetables" }, { name: "cebolla", quantity: 1, unit: "unidad", category: "vegetables" }],
    instructions: ["Cortar patatas", "Poner todo en bandeja", "Hornear 1h a 200ºC"],
    image_url: "https://images.unsplash.com/photo-1588723205368-200f3ec9f54b?auto=format&fit=crop&q=80"
  },
];

// --- GENERADOR PROCEDURAL DE RECETAS ---
// EXPANDIDO: Ahora con más bases y estilos para superar las 500 combinaciones

const BASES = [
    { name: 'Arroz Integral', cat: 'grains', tags: ['gluten_free', 'vegan', 'vegetarian', 'lactose_free'] },
    { name: 'Quinoa', cat: 'grains', tags: ['gluten_free', 'vegan', 'vegetarian', 'lactose_free', 'healthy'] },
    { name: 'Pasta', cat: 'grains', tags: ['vegan', 'vegetarian', 'lactose_free'] },
    { name: 'Calabacín (Zoodles)', cat: 'vegetables', tags: ['keto', 'paleo', 'gluten_free', 'vegan', 'vegetarian', 'lactose_free', 'healthy'] },
    { name: 'Ensalada Mezclum', cat: 'vegetables', tags: ['keto', 'paleo', 'gluten_free', 'vegan', 'vegetarian', 'lactose_free', 'healthy'] },
    { name: 'Salteado de Brócoli', cat: 'vegetables', tags: ['keto', 'paleo', 'gluten_free', 'vegan', 'vegetarian', 'lactose_free', 'healthy'] },
    { name: 'Puré de Coliflor', cat: 'vegetables', tags: ['keto', 'paleo', 'gluten_free', 'vegan', 'vegetarian', 'lactose_free', 'healthy'] },
    { name: 'Cuscús', cat: 'grains', tags: ['vegan', 'vegetarian', 'lactose_free'] },
    { name: 'Batata Asada', cat: 'vegetables', tags: ['paleo', 'gluten_free', 'vegan', 'vegetarian', 'lactose_free', 'healthy'] }
];

const PROTEINS = [
    { name: 'Pollo', cat: 'meat', tags: ['keto', 'paleo', 'gluten_free', 'lactose_free', 'healthy'] },
    { name: 'Ternera', cat: 'meat', tags: ['keto', 'paleo', 'gluten_free', 'lactose_free'] },
    { name: 'Cerdo', cat: 'meat', tags: ['keto', 'paleo', 'gluten_free', 'lactose_free'] },
    { name: 'Salmón', cat: 'fish', tags: ['keto', 'paleo', 'gluten_free', 'lactose_free', 'healthy'] },
    { name: 'Merluza', cat: 'fish', tags: ['keto', 'paleo', 'gluten_free', 'lactose_free', 'healthy'] },
    { name: 'Atún', cat: 'fish', tags: ['keto', 'paleo', 'gluten_free', 'lactose_free', 'healthy'] },
    { name: 'Tofu', cat: 'pantry', tags: ['vegan', 'vegetarian', 'gluten_free', 'lactose_free', 'healthy'] },
    { name: 'Lentejas', cat: 'pantry', tags: ['vegan', 'vegetarian', 'gluten_free', 'lactose_free', 'healthy'] },
    { name: 'Garbanzos', cat: 'pantry', tags: ['vegan', 'vegetarian', 'gluten_free', 'lactose_free', 'healthy'] },
    { name: 'Huevo', cat: 'dairy', tags: ['vegetarian', 'keto', 'paleo', 'gluten_free', 'lactose_free', 'healthy'] },
];

const STYLES = [
    { name: 'al Curry', cuisine: 'asian', sauce: ['leche de coco', 'curry'], time: 20 },
    { name: 'al Ajillo', cuisine: 'spanish', sauce: ['ajo', 'aceite', 'guindilla'], time: 15 },
    { name: 'a la Boloñesa', cuisine: 'italian', sauce: ['tomate frito', 'orégano', 'cebolla'], time: 30 },
    { name: 'con Soja y Jengibre', cuisine: 'asian', sauce: ['salsa de soja', 'jengibre'], time: 15 },
    { name: 'al Limón', cuisine: 'mediterranean', sauce: ['limón', 'perejil'], time: 15 },
    { name: 'con Pesto', cuisine: 'italian', sauce: ['albahaca', 'queso', 'nueces'], time: 10 },
    { name: 'Estofado', cuisine: 'spanish', sauce: ['caldo', 'zanahoria', 'patata'], time: 45 },
    { name: 'Tex-Mex', cuisine: 'mexican', sauce: ['pimiento', 'comino', 'maíz'], time: 20 },
    { name: 'a la Crema', cuisine: 'french', sauce: ['nata', 'pimienta'], time: 25 },
    { name: 'Salteado Rústico', cuisine: 'healthy', sauce: ['aceite', 'pimentón'], time: 20 }
];

const BREAKFAST_BASES = [
    { name: 'Tortitas', ing: ['harina', 'leche', 'huevo'], tags: ['vegetarian'] },
    { name: 'Porridge', ing: ['avena', 'leche'], tags: ['vegetarian', 'gluten_free'] },
    { name: 'Tostadas', ing: ['pan'], tags: ['vegetarian', 'vegan', 'lactose_free'] },
    { name: 'Revuelto', ing: ['huevo'], tags: ['keto', 'vegetarian', 'gluten_free'] },
    { name: 'Batido', ing: ['leche', 'fruta'], tags: ['vegetarian', 'gluten_free'] },
];

const BREAKFAST_TOPPINGS = [
    { name: 'con Plátano y Miel', ing: ['plátano', 'miel'], tags: ['vegetarian'] },
    { name: 'con Aguacate', ing: ['aguacate'], tags: ['vegan', 'keto', 'paleo'] },
    { name: 'con Frutos Rojos', ing: ['frutos rojos'], tags: ['vegan', 'keto', 'paleo'] },
    { name: 'con Jamón', ing: ['jamón'], tags: ['keto', 'paleo'] },
    { name: 'con Queso Fresco', ing: ['queso fresco'], tags: ['vegetarian', 'keto'] },
    { name: 'con Chocolate Negro', ing: ['chocolate'], tags: ['vegetarian'] },
];

function generateProceduralRecipes(): Recipe[] {
    const recipes: Recipe[] = [...CORE_RECIPES];
    let idCounter = 100;

    // Generar Comidas/Cenas (Bases * Proteínas * Estilos)
    BASES.forEach(base => {
        PROTEINS.forEach(prot => {
            STYLES.forEach(style => {
                // Lógica de compatibilidad básica
                if (base.name.includes('Ensalada') && style.name.includes('Estofado')) return; // Skip ilógicos
                if (base.name.includes('Puré') && style.name.includes('Boloñesa')) return;
                if (base.name.includes('Puré') && style.name.includes('Salteado')) return;

                // Combinar Tags (Intersección o Unión según lógica estricta)
                // Un plato es vegano solo si base Y proteína son veganos.
                const combinedTags = [...new Set([...base.tags, ...prot.tags])].filter(tag => {
                    // Verificar si este tag aplica a ambos componentes para ser válido globalmente
                    // Excepción: 'healthy' se mantiene si alguno lo tiene
                    const baseHas = base.tags.includes(tag);
                    const protHas = prot.tags.includes(tag);
                    
                    if (tag === 'vegan') return baseHas && protHas;
                    if (tag === 'vegetarian') return baseHas && protHas;
                    if (tag === 'keto') return baseHas && protHas; // Arroz (no keto) + Pollo (keto) != Keto
                    if (tag === 'paleo') return baseHas && protHas;
                    if (tag === 'gluten_free') return baseHas && protHas;
                    if (tag === 'lactose_free') return baseHas && protHas;
                    return true;
                });

                const ingredients = [
                    { name: base.name, quantity: 100, unit: 'g', category: base.cat },
                    { name: prot.name, quantity: 150, unit: 'g', category: prot.cat },
                    ...style.sauce.map(s => ({ name: s, quantity: 50, unit: 'g', category: 'pantry' }))
                ];

                recipes.push({
                    id: `gen-main-${idCounter++}`,
                    title: `${base.name} con ${prot.name} ${style.name}`,
                    description: `Una combinación deliciosa de ${base.name} y ${prot.name} al estilo ${style.cuisine}.`,
                    meal_category: Math.random() > 0.5 ? 'lunch' : 'dinner',
                    cuisine_type: style.cuisine as CuisineType,
                    difficulty: 'easy',
                    prep_time: style.time,
                    servings: 2,
                    calories: 400 + Math.floor(Math.random() * 200),
                    ingredients: ingredients as any,
                    instructions: [
                        `Preparar ${base.name} según instrucciones.`,
                        `Cocinar ${prot.name} en la sartén.`,
                        `Añadir ${style.sauce.join(', ')} y mezclar todo.`,
                        "Servir caliente."
                    ],
                    dietary_tags: combinedTags as DietPreference[],
                    image_url: `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&sig=${idCounter}` // Random sig to vary img cache
                });
            });
        });
    });

    // Generar Desayunos (Base * Topping)
    BREAKFAST_BASES.forEach(base => {
        BREAKFAST_TOPPINGS.forEach(top => {
            const combinedTags = [...new Set([...base.tags, ...top.tags])].filter(tag => {
                 const baseHas = base.tags.includes(tag);
                 const topHas = top.tags.includes(tag);
                 if (['vegan', 'vegetarian', 'keto', 'paleo', 'gluten_free', 'lactose_free'].includes(tag)) {
                     return baseHas && topHas;
                 }
                 return true;
            });

            const ingredients = [
                ...base.ing.map(i => ({ name: i, quantity: 1, unit: 'ud', category: 'pantry' })),
                ...top.ing.map(i => ({ name: i, quantity: 50, unit: 'g', category: 'pantry' }))
            ];

            recipes.push({
                id: `gen-bf-${idCounter++}`,
                title: `${base.name} ${top.name}`,
                description: `Desayuno rápido de ${base.name}.`,
                meal_category: 'breakfast',
                cuisine_type: 'healthy',
                difficulty: 'easy',
                prep_time: 10,
                servings: 1,
                calories: 300,
                ingredients: ingredients as any,
                instructions: ["Preparar la base.", "Añadir los toppings.", "Disfrutar."],
                dietary_tags: combinedTags as DietPreference[],
                image_url: `https://images.unsplash.com/photo-1494859802809-d069c3b71a8a?auto=format&fit=crop&q=80&sig=${idCounter}`
            });
        });
    });

    return recipes;
}

// Exportamos la lista generada masiva
export const STATIC_RECIPES = generateProceduralRecipes();
export const FALLBACK_RECIPES = STATIC_RECIPES;
