
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

// --- CONFIGURACIÓN DE SUPERMERCADOS ---
export const SUPERMARKETS = [
  { id: 'merc-1', name: 'Mercadona', multiplier: 1.0 },
  { id: 'carr-1', name: 'Carrefour', multiplier: 1.12 },
  { id: 'lidl-1', name: 'Lidl', multiplier: 0.95 },
  { id: 'aldi-1', name: 'Aldi', multiplier: 0.96 }
];

// --- ESTIMACIÓN DE CADUCIDAD POR CATEGORÍA ---
export const EXPIRY_DAYS_BY_CATEGORY: Record<string, number> = {
    "vegetables": 7,
    "fruits": 10,
    "dairy": 12,
    "meat": 4,
    "fish": 2,
    "grains": 180,
    "spices": 365,
    "pantry": 180,
    "other": 30
};

// --- REGLAS DE CATEGORIZACIÓN PREDICTIVA ---
export const PREDICTIVE_CATEGORY_RULES: Record<string, { category: string, unit: string }> = {
    "leche": { category: "dairy", unit: "l" },
    "huevo": { category: "dairy", unit: "uds" },
    "queso": { category: "dairy", unit: "g" },
    "yogur": { category: "dairy", unit: "uds" },
    "pollo": { category: "meat", unit: "g" },
    "ternera": { category: "meat", unit: "g" },
    "cerdo": { category: "meat", unit: "g" },
    "salmon": { category: "fish", unit: "g" },
    "tomate": { category: "vegetables", unit: "uds" },
    "cebolla": { category: "vegetables", unit: "uds" },
    "ajo": { category: "vegetables", unit: "dientes" },
    "patata": { category: "vegetables", unit: "kg" },
    "arroz": { category: "grains", unit: "g" },
    "pasta": { category: "grains", unit: "g" },
    "aceite": { category: "pantry", unit: "l" },
    "pan": { category: "grains", unit: "uds" }
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

// --- CATÁLOGO DE RECETAS REALES (LÓGICAS) ---
const REAL_RECIPES: Recipe[] = [
  // ITALIANAS
  {
    id: "it-1",
    title: "Pasta a la Boloñesa Clásica",
    description: "Salsa de carne tradicional italiana cocinada a fuego lento.",
    meal_category: "lunch",
    cuisine_type: "italian",
    difficulty: "medium",
    prep_time: 45,
    servings: 2,
    ingredients: [
        { name: "pasta", quantity: 200, unit: "g", category: "grains" },
        { name: "carne picada", quantity: 250, unit: "g", category: "meat" },
        { name: "tomate frito", quantity: 200, unit: "g", category: "pantry" },
        { name: "cebolla", quantity: 1, unit: "ud", category: "vegetables" }
    ],
    instructions: ["Sofreír la cebolla", "Añadir la carne y dorar", "Verter el tomate y reducir", "Cocer la pasta y mezclar"],
    dietary_tags: ["lactose_free"],
    image_url: "https://images.unsplash.com/photo-1598866594230-a7c12756260f?auto=format&fit=crop&q=80"
  },
  {
    id: "it-2",
    title: "Pasta al Pesto Genovés",
    description: "Salsa fresca de albahaca, piñones y queso.",
    meal_category: "lunch",
    cuisine_type: "italian",
    difficulty: "easy",
    prep_time: 15,
    servings: 2,
    ingredients: [
        { name: "pasta", quantity: 200, unit: "g", category: "grains" },
        { name: "albahaca fresca", quantity: 30, unit: "g", category: "vegetables" },
        { name: "aceite de oliva", quantity: 50, unit: "ml", category: "pantry" },
        { name: "queso parmesano", quantity: 40, unit: "g", category: "dairy" }
    ],
    instructions: ["Triturar albahaca, aceite y queso", "Cocer la pasta al dente", "Mezclar en frío con la salsa"],
    dietary_tags: ["vegetarian"],
    image_url: "https://images.unsplash.com/photo-1473093226795-af9932fe5856?auto=format&fit=crop&q=80"
  },
  // MEDITERRÁNEAS / ESPAÑOLAS
  {
    id: "es-1",
    title: "Lentejas Estofadas con Verduras",
    description: "Plato de cuchara nutritivo y reconfortante.",
    meal_category: "lunch",
    cuisine_type: "spanish",
    difficulty: "medium",
    prep_time: 40,
    servings: 2,
    ingredients: [
        { name: "lentejas", quantity: 150, unit: "g", category: "pantry" },
        { name: "zanahoria", quantity: 2, unit: "ud", category: "vegetables" },
        { name: "patata", quantity: 1, unit: "ud", category: "vegetables" },
        { name: "pimentón", quantity: 5, unit: "g", category: "spices" }
    ],
    instructions: ["Lavar las lentejas", "Cortar verduras en dados", "Cocer todo junto con pimentón 30 min"],
    dietary_tags: ["vegetarian", "vegan", "gluten_free", "lactose_free", "healthy"],
    image_url: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80"
  },
  {
    id: "es-2",
    title: "Pollo al Ajillo",
    description: "Pollo jugoso con mucho sabor a ajo y vino blanco.",
    meal_category: "dinner",
    cuisine_type: "spanish",
    difficulty: "easy",
    prep_time: 25,
    servings: 2,
    ingredients: [
        { name: "pechuga de pollo", quantity: 300, unit: "g", category: "meat" },
        { name: "ajo", quantity: 4, unit: "dientes", category: "vegetables" },
        { name: "aceite de oliva", quantity: 30, unit: "ml", category: "pantry" }
    ],
    instructions: ["Dorar los ajos laminados", "Añadir el pollo troceado", "Cocinar a fuego fuerte hasta dorar"],
    dietary_tags: ["gluten_free", "lactose_free", "keto", "paleo"],
    image_url: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80"
  },
  // ASIÁTICAS
  {
    id: "as-1",
    title: "Pollo al Curry con Coco",
    description: "Sabor exótico con leche de coco y especias orientales.",
    meal_category: "lunch",
    cuisine_type: "asian",
    difficulty: "medium",
    prep_time: 30,
    servings: 2,
    ingredients: [
        { name: "pollo", quantity: 300, unit: "g", category: "meat" },
        { name: "leche de coco", quantity: 200, unit: "ml", category: "pantry" },
        { name: "curry en polvo", quantity: 10, unit: "g", category: "spices" },
        { name: "arroz", quantity: 100, unit: "g", category: "grains" }
    ],
    instructions: ["Dorar el pollo", "Añadir curry y leche de coco", "Cocinar 15 min", "Servir con arroz cocido"],
    dietary_tags: ["lactose_free", "gluten_free"],
    image_url: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&q=80"
  },
  {
    id: "as-2",
    title: "Salmón Teriyaki",
    description: "Salmón glaseado con salsa de soja y jengibre.",
    meal_category: "dinner",
    cuisine_type: "asian",
    difficulty: "easy",
    prep_time: 20,
    servings: 2,
    ingredients: [
        { name: "salmón", quantity: 300, unit: "g", category: "fish" },
        { name: "salsa de soja", quantity: 30, unit: "ml", category: "pantry" },
        { name: "jengibre", quantity: 5, unit: "g", category: "spices" }
    ],
    instructions: ["Marinar el salmón en soja y jengibre", "Hacer a la plancha 4 min por lado", "Glasear con el resto de salsa"],
    dietary_tags: ["lactose_free", "healthy"],
    image_url: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80"
  },
  // DESAYUNOS
  {
    id: "bf-1",
    title: "Porridge de Avena y Plátano",
    description: "Desayuno saciante y energético.",
    meal_category: "breakfast",
    cuisine_type: "healthy",
    difficulty: "easy",
    prep_time: 10,
    servings: 1,
    ingredients: [
        { name: "avena", quantity: 50, unit: "g", category: "grains" },
        { name: "leche", quantity: 200, unit: "ml", category: "dairy" },
        { name: "plátano", quantity: 1, unit: "ud", category: "fruits" }
    ],
    instructions: ["Cocer avena con leche", "Remover hasta espesar", "Añadir plátano troceado"],
    dietary_tags: ["vegetarian", "healthy"],
    image_url: "https://images.unsplash.com/photo-1517673400267-0251440c45dc?auto=format&fit=crop&q=80"
  },
  {
    id: "bf-2",
    title: "Revuelto de Espinacas",
    description: "Proteína ligera para empezar el día.",
    meal_category: "breakfast",
    cuisine_type: "healthy",
    difficulty: "easy",
    prep_time: 8,
    servings: 1,
    ingredients: [
        { name: "huevo", quantity: 2, unit: "ud", category: "dairy" },
        { name: "espinacas", quantity: 50, unit: "g", category: "vegetables" }
    ],
    instructions: ["Saltear espinacas", "Añadir huevos batidos", "Cocinar a fuego lento removiendo"],
    dietary_tags: ["vegetarian", "keto", "gluten_free", "healthy"],
    image_url: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80"
  }
];

// Generamos un pool de 50 recetas basadas en variaciones lógicas (mismo estilo, distinta proteína compatible)
function generateLogicalRecipes(): Recipe[] {
    const pool: Recipe[] = [...REAL_RECIPES];
    const bases = [
        { name: 'Arroz Integral', cat: 'grains' },
        { name: 'Quinoa', cat: 'grains' },
        { name: 'Cuscús', cat: 'grains' }
    ];
    const styles = [
        { name: 'Salteado con Verduras', cuisine: 'healthy', tags: ['vegan', 'vegetarian', 'healthy'] },
        { name: 'con Curry Suave', cuisine: 'indian', tags: ['gluten_free'] },
        { name: 'al Wok', cuisine: 'asian', tags: ['lactose_free'] }
    ];
    const prots = [
        { name: 'Tofu', tags: ['vegan', 'vegetarian'] },
        { name: 'Pechuga de Pollo', tags: ['keto', 'paleo'] },
        { name: 'Gambas', tags: ['healthy'] }
    ];

    let idCount = 100;
    
    // Generamos 42 variaciones adicionales con sentido
    for (let i = 0; i < 42; i++) {
        const b = bases[i % bases.length];
        const s = styles[i % styles.length];
        const p = prots[i % prots.length];

        pool.push({
            id: `gen-log-${idCount++}`,
            title: `${b.name} ${s.name} y ${p.name}`,
            description: `Una opción equilibrada de ${b.name} cocinado ${s.name}.`,
            meal_category: i % 2 === 0 ? 'lunch' : 'dinner',
            cuisine_type: s.cuisine as CuisineType,
            difficulty: 'easy',
            prep_time: 20,
            servings: 2,
            ingredients: [
                { name: b.name, quantity: 100, unit: 'g', category: b.cat as any },
                { name: p.name, quantity: 120, unit: 'g', category: 'meat' },
                { name: 'verduras variadas', quantity: 100, unit: 'g', category: 'vegetables' }
            ],
            instructions: [`Cocer ${b.name}`, `Saltear ${p.name} con las verduras`, `Mezclar todo y disfrutar`],
            dietary_tags: [...s.tags, ...p.tags] as DietPreference[],
            image_url: `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&sig=${idCount}`
        });
    }

    return pool;
}

export const STATIC_RECIPES = generateLogicalRecipes();
export const FALLBACK_RECIPES = STATIC_RECIPES;
