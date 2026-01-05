
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

// REPOSITORIO ESTÁTICO DE RECETAS (OPTIMIZADO Y EXPANDIDO)
// Tipologías: Vegetarian, Vegan, Keto, Paleo, Gluten Free, Lactose Free, Meat, Fish
export const STATIC_RECIPES: Recipe[] = [
  // --- DESAYUNOS ---
  {
    id: "static-1",
    title: "Tostada de Aguacate y Huevo",
    description: "Clásico desayuno energético.",
    meal_category: "breakfast",
    cuisine_type: "healthy",
    difficulty: "easy",
    prep_time: 10,
    servings: 1,
    calories: 350,
    dietary_tags: ["vegetarian", "lactose_free"],
    ingredients: [
      { name: "pan integral", quantity: 1, unit: "rebanada", category: "grains" },
      { name: "aguacate", quantity: 0.5, unit: "unidad", category: "fruits" },
      { name: "huevo", quantity: 1, unit: "unidad", category: "dairy" }
    ],
    instructions: ["Tostar pan", "Chafar aguacate", "Poner huevo encima"],
    image_url: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80"
  },
  {
    id: "static-2",
    title: "Yogur con Fruta y Nueces",
    description: "Rápido y probiótico.",
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
    instructions: ["Mezclar todo en un bol"],
    image_url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&q=80"
  },
  {
    id: "static-b3",
    title: "Tortitas de Avena y Plátano",
    description: "Sin azúcar añadido y muy esponjosas.",
    meal_category: "breakfast",
    cuisine_type: "healthy",
    difficulty: "easy",
    prep_time: 15,
    servings: 2,
    calories: 320,
    dietary_tags: ["vegetarian"],
    ingredients: [
      { name: "avena", quantity: 100, unit: "g", category: "grains" },
      { name: "platano", quantity: 1, unit: "unidad", category: "fruits" },
      { name: "leche", quantity: 100, unit: "ml", category: "dairy" },
      { name: "huevo", quantity: 1, unit: "unidad", category: "dairy" }
    ],
    instructions: ["Triturar todo", "Hacer a la plancha vuelta y vuelta"],
    image_url: "https://images.unsplash.com/photo-1506084868230-bb9d95c24759?auto=format&fit=crop&q=80"
  },
  {
    id: "static-b4",
    title: "Pudin de Chía con Mango",
    description: "Prepáralo la noche anterior.",
    meal_category: "breakfast",
    cuisine_type: "healthy",
    difficulty: "easy",
    prep_time: 5,
    servings: 1,
    calories: 250,
    dietary_tags: ["vegan", "vegetarian", "gluten_free", "keto", "lactose_free"],
    ingredients: [
      { name: "semillas de chia", quantity: 3, unit: "cucharada", category: "pantry" },
      { name: "leche de almendras", quantity: 200, unit: "ml", category: "dairy" },
      { name: "mango", quantity: 0.5, unit: "unidad", category: "fruits" }
    ],
    instructions: ["Mezclar chía y leche", "Dejar reposar 4h o noche", "Añadir mango"],
    image_url: "https://images.unsplash.com/photo-1551800262-1b6b47c0936f?auto=format&fit=crop&q=80"
  },

  // --- ALMUERZOS Y CENAS VEGETARIANOS/VEGANOS ---
  {
    id: "static-3",
    title: "Ensalada Mediterránea de Quinoa",
    description: "Fresca y completa.",
    meal_category: "lunch",
    cuisine_type: "mediterranean",
    difficulty: "easy",
    prep_time: 20,
    servings: 2,
    calories: 420,
    dietary_tags: ["vegetarian", "vegan", "gluten_free", "lactose_free"],
    ingredients: [
      { name: "quinoa", quantity: 150, unit: "g", category: "grains" },
      { name: "pepino", quantity: 1, unit: "unidad", category: "vegetables" },
      { name: "tomate", quantity: 2, unit: "unidad", category: "vegetables" },
      { name: "aceitunas", quantity: 50, unit: "g", category: "pantry" }
    ],
    instructions: ["Cocer quinoa", "Picar verduras", "Mezclar y aliñar"],
    image_url: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&q=80"
  },
  {
    id: "static-v1",
    title: "Curry de Garbanzos y Espinacas",
    description: "Plato reconfortante lleno de proteína vegetal.",
    meal_category: "lunch",
    cuisine_type: "asian",
    difficulty: "medium",
    prep_time: 25,
    servings: 2,
    calories: 380,
    dietary_tags: ["vegan", "vegetarian", "gluten_free", "lactose_free"],
    ingredients: [
      { name: "garbanzos", quantity: 400, unit: "g", category: "pantry" },
      { name: "leche de coco", quantity: 200, unit: "ml", category: "pantry" },
      { name: "espinacas", quantity: 100, unit: "g", category: "vegetables" },
      { name: "curry", quantity: 1, unit: "cucharada", category: "spices" }
    ],
    instructions: ["Sofreír especias", "Añadir garbanzos y leche de coco", "Cocinar 10 min", "Añadir espinacas al final"],
    image_url: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&q=80"
  },
  {
    id: "static-v2",
    title: "Tacos Veganos de Lentejas",
    description: "Sabor mexicano sin carne.",
    meal_category: "dinner",
    cuisine_type: "mexican",
    difficulty: "medium",
    prep_time: 20,
    servings: 2,
    calories: 350,
    dietary_tags: ["vegan", "vegetarian", "lactose_free"],
    ingredients: [
      { name: "lentejas", quantity: 200, unit: "g", category: "pantry" },
      { name: "tortillas", quantity: 4, unit: "unidades", category: "grains" },
      { name: "pimiento", quantity: 1, unit: "unidad", category: "vegetables" },
      { name: "cebolla", quantity: 1, unit: "unidad", category: "vegetables" }
    ],
    instructions: ["Saltear verduras", "Añadir lentejas y sazonar tipo taco", "Servir en tortillas"],
    image_url: "https://images.unsplash.com/photo-1504544750208-dc0358e63f7f?auto=format&fit=crop&q=80"
  },
  {
    id: "static-v3",
    title: "Espaguetis de Calabacín al Pesto",
    description: "Ligero, fresco y muy rápido.",
    meal_category: "dinner",
    cuisine_type: "italian",
    difficulty: "easy",
    prep_time: 15,
    servings: 2,
    calories: 220,
    dietary_tags: ["vegetarian", "keto", "gluten_free", "paleo"],
    ingredients: [
      { name: "calabacin", quantity: 2, unit: "unidades", category: "vegetables" },
      { name: "albahaca", quantity: 1, unit: "manojo", category: "vegetables" },
      { name: "nueces", quantity: 30, unit: "g", category: "pantry" },
      { name: "aceite", quantity: 50, unit: "ml", category: "pantry" }
    ],
    instructions: ["Hacer espirales de calabacín", "Triturar albahaca, nueces y aceite", "Mezclar"],
    image_url: "https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&q=80"
  },

  // --- CARNES Y PESCADOS (NO VEGETARIANO) ---
  {
    id: "static-4",
    title: "Tortilla de Patatas Express",
    description: "La versión rápida para el día a día.",
    meal_category: "dinner",
    cuisine_type: "spanish",
    difficulty: "medium",
    prep_time: 25,
    servings: 2,
    calories: 350,
    dietary_tags: ["vegetarian", "gluten_free"],
    ingredients: [
      { name: "huevos", quantity: 4, unit: "unidades", category: "dairy" },
      { name: "patata", quantity: 2, unit: "unidades", category: "vegetables" },
      { name: "cebolla", quantity: 1, unit: "unidad", category: "vegetables" },
      { name: "aceite", quantity: 2, unit: "cucharada", category: "pantry" }
    ],
    instructions: ["Pochar patata y cebolla", "Batir huevos", "Cuajar en sartén"],
    image_url: "https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&q=80"
  },
  {
    id: "static-new-1",
    title: "Albóndigas en Salsa",
    description: "Receta de la abuela, versión fácil.",
    meal_category: "lunch",
    cuisine_type: "spanish",
    difficulty: "medium",
    prep_time: 40,
    servings: 4,
    calories: 450,
    dietary_tags: [],
    ingredients: [
      { name: "carne picada", quantity: 500, unit: "g", category: "meat" },
      { name: "cebolla", quantity: 1, unit: "unidad", category: "vegetables" },
      { name: "tomate frito", quantity: 200, unit: "ml", category: "pantry" },
      { name: "harina", quantity: 50, unit: "g", category: "pantry" }
    ],
    instructions: ["Formar bolas, enharinar y freír", "Hacer sofrito con cebolla y tomate", "Cocer albóndigas en la salsa 15 min"],
    image_url: "https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&q=80"
  },
  {
    id: "static-new-2",
    title: "Merluza a la Romana",
    description: "Pescado jugoso y crujiente.",
    meal_category: "dinner",
    cuisine_type: "spanish",
    difficulty: "easy",
    prep_time: 20,
    servings: 2,
    calories: 320,
    dietary_tags: ["healthy", "paleo"],
    ingredients: [
      { name: "merluza", quantity: 300, unit: "g", category: "fish" },
      { name: "harina", quantity: 50, unit: "g", category: "pantry" },
      { name: "huevo", quantity: 1, unit: "unidad", category: "dairy" },
      { name: "aceite", quantity: 100, unit: "ml", category: "pantry" }
    ],
    instructions: ["Pasar pescado por harina y huevo", "Freír en aceite caliente"],
    image_url: "https://images.unsplash.com/photo-1551061956-613d07802874?auto=format&fit=crop&q=80"
  },
  {
    id: "static-k1",
    title: "Pollo al Horno con Verduras",
    description: "Todo en una bandeja, fácil limpieza.",
    meal_category: "lunch",
    cuisine_type: "healthy",
    difficulty: "easy",
    prep_time: 45,
    servings: 2,
    calories: 400,
    dietary_tags: ["gluten_free", "paleo", "keto", "lactose_free"],
    ingredients: [
      { name: "muslos de pollo", quantity: 2, unit: "unidades", category: "meat" },
      { name: "calabacin", quantity: 1, unit: "unidad", category: "vegetables" },
      { name: "pimiento", quantity: 1, unit: "unidad", category: "vegetables" },
      { name: "cebolla", quantity: 1, unit: "unidad", category: "vegetables" }
    ],
    instructions: ["Cortar verduras", "Poner todo en bandeja", "Hornear 45 min a 200ºC"],
    image_url: "https://images.unsplash.com/photo-1588723205368-200f3ec9f54b?auto=format&fit=crop&q=80"
  },
  
  // --- PASTA Y ARROZ ---
  {
    id: "static-6",
    title: "Pasta Caprese",
    description: "Simpleza italiana en su máxima expresión.",
    meal_category: "lunch",
    cuisine_type: "italian",
    difficulty: "easy",
    prep_time: 15,
    servings: 2,
    calories: 450,
    dietary_tags: ["vegetarian"],
    ingredients: [
      { name: "pasta", quantity: 200, unit: "g", category: "grains" },
      { name: "tomate", quantity: 2, unit: "unidades", category: "vegetables" },
      { name: "mozzarella", quantity: 125, unit: "g", category: "dairy" },
      { name: "albahaca", quantity: 1, unit: "puñado", category: "vegetables" }
    ],
    instructions: ["Cocer pasta", "Mezclar con tomate y mozzarella en cubos", "Añadir albahaca fresca"],
    image_url: "https://images.unsplash.com/photo-1529312266912-b33cf6227e2f?auto=format&fit=crop&q=80"
  },
  {
    id: "static-7",
    title: "Risotto de Champiñones",
    description: "Cremoso y reconfortante.",
    meal_category: "dinner",
    cuisine_type: "italian",
    difficulty: "medium",
    prep_time: 30,
    servings: 2,
    calories: 500,
    dietary_tags: ["vegetarian", "gluten_free"],
    ingredients: [
      { name: "arroz", quantity: 200, unit: "g", category: "grains" },
      { name: "champiñones", quantity: 200, unit: "g", category: "vegetables" },
      { name: "caldo", quantity: 500, unit: "ml", category: "pantry" },
      { name: "cebolla", quantity: 1, unit: "unidad", category: "vegetables" }
    ],
    instructions: ["Sofreír cebolla y setas", "Añadir arroz y nacarar", "Añadir caldo poco a poco removiendo"],
    image_url: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&q=80"
  },
  {
    id: "static-new-3",
    title: "Espaguetis a la Boloñesa",
    description: "Un clásico que nunca falla.",
    meal_category: "lunch",
    cuisine_type: "italian",
    difficulty: "medium",
    prep_time: 30,
    servings: 4,
    calories: 550,
    dietary_tags: [],
    ingredients: [
      { name: "pasta", quantity: 400, unit: "g", category: "grains" },
      { name: "carne picada", quantity: 300, unit: "g", category: "meat" },
      { name: "tomate frito", quantity: 300, unit: "ml", category: "pantry" },
      { name: "cebolla", quantity: 1, unit: "unidad", category: "vegetables" }
    ],
    instructions: ["Sofreír cebolla y carne", "Añadir tomate y reducir", "Mezclar con la pasta cocida"],
    image_url: "https://images.unsplash.com/photo-1622973536968-3ead9e780960?auto=format&fit=crop&q=80"
  },

  // --- KETO / LOW CARB ---
  {
    id: "static-12",
    title: "Salmón al Horno con Espárragos",
    description: "Cena elegante y ligera.",
    meal_category: "dinner",
    cuisine_type: "healthy",
    difficulty: "medium",
    prep_time: 25,
    servings: 2,
    calories: 480,
    dietary_tags: ["keto", "gluten_free", "paleo", "lactose_free"],
    ingredients: [
      { name: "salmon", quantity: 300, unit: "g", category: "fish" },
      { name: "esparragos", quantity: 1, unit: "manojo", category: "vegetables" },
      { name: "limon", quantity: 1, unit: "unidad", category: "fruits" },
      { name: "aceite", quantity: 1, unit: "cucharada", category: "pantry" }
    ],
    instructions: ["Poner todo en bandeja de horno", "Hornear a 200ºC durante 15-20 min"],
    image_url: "https://images.unsplash.com/photo-1467003909585-2f8a7270028d?auto=format&fit=crop&q=80"
  },
  {
    id: "static-13",
    title: "Calabacín Carbonara (Zoodles)",
    description: "La pasta sin culpa.",
    meal_category: "dinner",
    cuisine_type: "italian",
    difficulty: "medium",
    prep_time: 20,
    servings: 2,
    calories: 350,
    dietary_tags: ["keto", "gluten_free"],
    ingredients: [
      { name: "calabacin", quantity: 2, unit: "unidades", category: "vegetables" },
      { name: "bacon", quantity: 100, unit: "g", category: "meat" },
      { name: "huevos", quantity: 2, unit: "unidades", category: "dairy" },
      { name: "queso", quantity: 50, unit: "g", category: "dairy" }
    ],
    instructions: ["Hacer tiras de calabacín", "Dorar bacon", "Mezclar huevo y queso fuera del fuego", "Unir todo"],
    image_url: "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&q=80"
  },
  {
    id: "static-k2",
    title: "Revuelto de Gambas y Ajetes",
    description: "Cena proteica y ligera.",
    meal_category: "dinner",
    cuisine_type: "spanish",
    difficulty: "easy",
    prep_time: 15,
    servings: 2,
    calories: 250,
    dietary_tags: ["keto", "gluten_free", "paleo"],
    ingredients: [
      { name: "gambas", quantity: 200, unit: "g", category: "fish" },
      { name: "huevos", quantity: 3, unit: "unidades", category: "dairy" },
      { name: "ajo", quantity: 2, unit: "dientes", category: "vegetables" },
      { name: "aceite", quantity: 1, unit: "cucharada", category: "pantry" }
    ],
    instructions: ["Saltear gambas y ajo", "Añadir huevos batidos", "Cocinar removiendo hasta cuajar"],
    image_url: "https://images.unsplash.com/photo-1510629954389-c1e0da47d414?auto=format&fit=crop&q=80"
  },

  // --- SIN GLUTEN (Extra Specific) ---
  {
    id: "static-gf1",
    title: "Arroz con Pollo y Verduras",
    description: "Plato único completo y seguro.",
    meal_category: "lunch",
    cuisine_type: "spanish",
    difficulty: "medium",
    prep_time: 35,
    servings: 2,
    calories: 450,
    dietary_tags: ["gluten_free", "lactose_free"],
    ingredients: [
      { name: "arroz", quantity: 200, unit: "g", category: "grains" },
      { name: "pollo", quantity: 200, unit: "g", category: "meat" },
      { name: "pimiento", quantity: 1, unit: "unidad", category: "vegetables" },
      { name: "azafran", quantity: 1, unit: "pizca", category: "spices" }
    ],
    instructions: ["Dorar pollo y verduras", "Añadir arroz y agua (doble cantidad)", "Cocer 18 min"],
    image_url: "https://images.unsplash.com/photo-1604908177453-7462950a6a3b?auto=format&fit=crop&q=80"
  },

  // --- ASIÁTICA & MEXICANA ---
  {
    id: "static-8",
    title: "Stir Fry de Pollo y Verduras",
    description: "Salteado rápido al wok.",
    meal_category: "dinner",
    cuisine_type: "asian",
    difficulty: "easy",
    prep_time: 15,
    servings: 2,
    calories: 380,
    dietary_tags: ["lactose_free"],
    ingredients: [
      { name: "pollo", quantity: 300, unit: "g", category: "meat" },
      { name: "pimiento", quantity: 1, unit: "unidad", category: "vegetables" },
      { name: "zanahoria", quantity: 1, unit: "unidad", category: "vegetables" },
      { name: "soja", quantity: 2, unit: "cucharada", category: "pantry" }
    ],
    instructions: ["Cortar todo en tiras", "Saltear pollo a fuego fuerte", "Añadir verduras y soja"],
    image_url: "https://images.unsplash.com/photo-1603133872878-684f10842619?auto=format&fit=crop&q=80"
  },
  {
    id: "static-10",
    title: "Tacos de Pollo",
    description: "Fiesta mexicana saludable.",
    meal_category: "dinner",
    cuisine_type: "mexican",
    difficulty: "easy",
    prep_time: 20,
    servings: 2,
    calories: 450,
    dietary_tags: [],
    ingredients: [
      { name: "tortillas", quantity: 4, unit: "unidades", category: "grains" },
      { name: "pollo", quantity: 250, unit: "g", category: "meat" },
      { name: "pimiento", quantity: 1, unit: "unidad", category: "vegetables" },
      { name: "cebolla", quantity: 1, unit: "unidad", category: "vegetables" }
    ],
    instructions: ["Saltear pollo y verduras con especias", "Calentar tortillas", "Montar tacos"],
    image_url: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&q=80"
  },
  {
    id: "static-new-6",
    title: "Burritos de Ternera",
    description: "Comida completa en un rollo.",
    meal_category: "dinner",
    cuisine_type: "mexican",
    difficulty: "medium",
    prep_time: 25,
    servings: 2,
    calories: 600,
    dietary_tags: [],
    ingredients: [
      { name: "tortillas", quantity: 2, unit: "unidades", category: "grains" },
      { name: "ternera", quantity: 200, unit: "g", category: "meat" },
      { name: "arroz", quantity: 100, unit: "g", category: "grains" },
      { name: "queso", quantity: 50, unit: "g", category: "dairy" }
    ],
    instructions: ["Cocinar carne picada", "Mezclar con arroz cocido", "Rellenar tortilla, añadir queso y enrollar"],
    image_url: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80"
  }
];

export const FALLBACK_RECIPES = STATIC_RECIPES;
