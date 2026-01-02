
import { Recipe, UserProfile } from "./types";

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
  "aceitunas": 1.20, "calabacin": 1.10, "default": 1.50 
};

// Motor de equivalencias (Unidad -> Gramos)
export const UNIT_WEIGHTS: Record<string, number> = {
  "tomate": 150, "cebolla": 130, "ajo": 8, "huevo": 60, "pimiento": 180,
  "zanahoria": 90, "patata": 200, "aguacate": 220, "limon": 110, "pepino": 250,
  "calabacin": 320, "manzana": 180, "platano": 130, "rebanada": 40, "diente": 6
};

// Conversiones de volumen/medida a gramos
export const MEASURE_CONVERSIONS: Record<string, number> = {
  "pizca": 1, "cucharadita": 5, "cucharada": 15, "taza": 240, "chorrito": 10, "un": 1, "ud": 1, "unidad": 1
};

// AUDITORÍA 26: Reglas predictivas centralizadas
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

// HEURÍSTICA DE CADUCIDAD (Días por defecto según categoría)
export const EXPIRY_DAYS_BY_CATEGORY: Record<string, number> = {
    "vegetables": 7,
    "fruits": 7,
    "dairy": 14,
    "meat": 3,
    "fish": 2,
    "grains": 180, // 6 meses
    "pantry": 90,  // 3 meses
    "spices": 365, // 1 año
    "other": 30
};

// Supermercados para comparativa real de ahorro
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

// REPOSITORIO ESTÁTICO DE RECETAS (Para evitar llamadas a IA iniciales)
export const STATIC_RECIPES: Recipe[] = [
  {
    id: "static-1",
    title: "Tostada de Aguacate y Huevo",
    description: "Desayuno energético con grasas saludables y proteína.",
    meal_category: "breakfast",
    cuisine_type: "healthy",
    difficulty: "easy",
    prep_time: 10,
    servings: 1,
    calories: 350,
    dietary_tags: ["vegetarian", "keto"],
    ingredients: [
      { name: "pan integral", quantity: 1, unit: "rebanada", category: "grains" },
      { name: "aguacate", quantity: 0.5, unit: "unidad", category: "fruits" },
      { name: "huevo", quantity: 1, unit: "unidad", category: "dairy" },
      { name: "sal", quantity: 1, unit: "pizca", category: "spices" }
    ],
    instructions: ["Tostar el pan.", "Chafar el aguacate con un tenedor sobre el pan.", "Cocinar el huevo a la plancha o poché.", "Colocar el huevo sobre el aguacate y salpimentar."],
    image_url: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80"
  },
  {
    id: "static-2",
    title: "Ensalada Mediterránea de Quinoa",
    description: "Fresca, nutritiva y perfecta para preparar con antelación.",
    meal_category: "lunch",
    cuisine_type: "mediterranean",
    difficulty: "easy",
    prep_time: 20,
    servings: 2,
    calories: 420,
    dietary_tags: ["vegetarian", "vegan", "gluten_free"],
    ingredients: [
      { name: "quinoa", quantity: 150, unit: "g", category: "grains" },
      { name: "pepino", quantity: 1, unit: "unidad", category: "vegetables" },
      { name: "tomate cherry", quantity: 10, unit: "unidades", category: "vegetables" },
      { name: "aceitunas negras", quantity: 50, unit: "g", category: "pantry" },
      { name: "aceite de oliva", quantity: 2, unit: "cucharada", category: "pantry" }
    ],
    instructions: ["Lavar y cocer la quinoa según instrucciones.", "Cortar pepino y tomates en cubos.", "Mezclar todo en un bol.", "Aliñar con aceite y sal."],
    image_url: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&q=80"
  },
  {
    id: "static-3",
    title: "Pollo al Limón Express",
    description: "Cena ligera y rápida llena de sabor cítrico.",
    meal_category: "dinner",
    cuisine_type: "healthy",
    difficulty: "medium",
    prep_time: 25,
    servings: 2,
    calories: 380,
    dietary_tags: ["keto", "gluten_free", "lactose_free"],
    ingredients: [
      { name: "pechuga de pollo", quantity: 300, unit: "g", category: "meat" },
      { name: "limon", quantity: 1, unit: "unidad", category: "fruits" },
      { name: "ajo", quantity: 2, unit: "diente", category: "vegetables" },
      { name: "perejil", quantity: 1, unit: "puñado", category: "spices" }
    ],
    instructions: ["Cortar el pollo en tiras.", "Dorar en sartén con ajo picado.", "Añadir zumo de limón y reducir.", "Espolvorear perejil fresco."],
    image_url: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80"
  },
  {
    id: "static-4",
    title: "Pasta con Salsa de Tomate y Albahaca",
    description: "Un clásico italiano infalible y económico.",
    meal_category: "lunch",
    cuisine_type: "italian",
    difficulty: "easy",
    prep_time: 15,
    servings: 2,
    calories: 450,
    dietary_tags: ["vegetarian"],
    ingredients: [
      { name: "pasta", quantity: 200, unit: "g", category: "grains" },
      { name: "tomate frito", quantity: 200, unit: "ml", category: "pantry" },
      { name: "queso parmesano", quantity: 30, unit: "g", category: "dairy" },
      { name: "albahaca", quantity: 5, unit: "hojas", category: "spices" }
    ],
    instructions: ["Hervir la pasta al dente.", "Calentar el tomate en una sartén.", "Mezclar pasta con salsa.", "Servir con queso y albahaca."],
    image_url: "https://images.unsplash.com/photo-1626844131082-256783844137?auto=format&fit=crop&q=80"
  },
  {
    id: "static-5",
    title: "Tortilla Francesa con Espinacas",
    description: "Cena rápida, proteica y ligera.",
    meal_category: "dinner",
    cuisine_type: "spanish",
    difficulty: "easy",
    prep_time: 10,
    servings: 1,
    calories: 220,
    dietary_tags: ["vegetarian", "keto", "gluten_free"],
    ingredients: [
      { name: "huevos", quantity: 2, unit: "unidades", category: "dairy" },
      { name: "espinacas", quantity: 50, unit: "g", category: "vegetables" },
      { name: "aceite", quantity: 1, unit: "cucharadita", category: "pantry" }
    ],
    instructions: ["Batir los huevos.", "Saltear espinacas un minuto.", "Añadir huevos y cuajar al gusto."],
    image_url: "https://images.unsplash.com/photo-1587132137056-bfbf0166836e?auto=format&fit=crop&q=80"
  },
  {
    id: "static-6",
    title: "Tacos de Ternera Rápidos",
    description: "Fiesta mexicana en casa en 20 minutos.",
    meal_category: "dinner",
    cuisine_type: "mexican",
    difficulty: "medium",
    prep_time: 20,
    servings: 2,
    calories: 550,
    dietary_tags: ["none"],
    ingredients: [
      { name: "carne picada", quantity: 250, unit: "g", category: "meat" },
      { name: "tortillas", quantity: 4, unit: "unidades", category: "grains" },
      { name: "cebolla", quantity: 0.5, unit: "unidad", category: "vegetables" },
      { name: "pimiento", quantity: 0.5, unit: "unidad", category: "vegetables" },
      { name: "comino", quantity: 1, unit: "cucharadita", category: "spices" }
    ],
    instructions: ["Sofreír cebolla y pimiento.", "Añadir carne y especias hasta dorar.", "Calentar tortillas y rellenar."],
    image_url: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&q=80"
  },
  {
    id: "static-7",
    title: "Yogur con Fruta y Nueces",
    description: "Merienda o desayuno probiótico.",
    meal_category: "breakfast",
    cuisine_type: "healthy",
    difficulty: "easy",
    prep_time: 5,
    servings: 1,
    calories: 280,
    dietary_tags: ["vegetarian", "gluten_free"],
    ingredients: [
      { name: "yogur natural", quantity: 1, unit: "unidad", category: "dairy" },
      { name: "manzana", quantity: 0.5, unit: "unidad", category: "fruits" },
      { name: "nueces", quantity: 20, unit: "g", category: "pantry" }
    ],
    instructions: ["Poner yogur en un bol.", "Añadir fruta troceada y nueces."],
    image_url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&q=80"
  },
  {
    id: "static-8",
    title: "Salmón al Horno con Verduras",
    description: "Plato principal elegante y sin esfuerzo.",
    meal_category: "dinner",
    cuisine_type: "healthy",
    difficulty: "medium",
    prep_time: 30,
    servings: 2,
    calories: 480,
    dietary_tags: ["keto", "paleo", "gluten_free"],
    ingredients: [
      { name: "salmon", quantity: 300, unit: "g", category: "fish" },
      { name: "calabacin", quantity: 1, unit: "unidad", category: "vegetables" },
      { name: "zanahoria", quantity: 2, unit: "unidades", category: "vegetables" },
      { name: "limon", quantity: 0.5, unit: "unidad", category: "fruits" }
    ],
    instructions: ["Precalentar horno a 180ºC.", "Colocar salmón y verduras cortadas en bandeja.", "Hornear 20-25 min."],
    image_url: "https://images.unsplash.com/photo-1467003909585-2f8a7270028d?auto=format&fit=crop&q=80"
  }
];

export const FALLBACK_RECIPES = STATIC_RECIPES;
