
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
  "aceitunas": 1.20, "calabacin": 1.10, "default": 1.50, "lentejas": 2.00, "garbanzos": 1.80,
  "espinacas": 1.50, "atun": 1.00, "merluza": 12.00, "gbas": 15.00
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

// REPOSITORIO ESTÁTICO DE RECETAS (AMPLIADO)
export const STATIC_RECIPES: Recipe[] = [
  // --- DESAYUNOS (VARIEDAD Y EQUILIBRIO) ---
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
    id: "bf-2",
    title: "Yogur con Granola y Frutos Rojos",
    description: "Fresco, rápido y crujiente.",
    meal_category: "breakfast",
    cuisine_type: "healthy",
    difficulty: "easy",
    prep_time: 5,
    servings: 1,
    calories: 300,
    dietary_tags: ["vegetarian"],
    ingredients: [{ name: "yogur griego", quantity: 1, unit: "unidad", category: "dairy" }, { name: "granola", quantity: 30, unit: "g", category: "grains" }, { name: "frutos rojos", quantity: 50, unit: "g", category: "fruits" }],
    instructions: ["Servir yogur", "Añadir toppings"],
    image_url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&q=80"
  },
  {
    id: "bf-3",
    title: "Tortitas de Avena y Plátano",
    description: "Sin azúcar, ideales para niños y adultos.",
    meal_category: "breakfast",
    cuisine_type: "healthy",
    difficulty: "easy",
    prep_time: 15,
    servings: 2,
    calories: 320,
    dietary_tags: ["vegetarian"],
    ingredients: [{ name: "avena", quantity: 100, unit: "g", category: "grains" }, { name: "platano", quantity: 1, unit: "unidad", category: "fruits" }, { name: "leche", quantity: 100, unit: "ml", category: "dairy" }, { name: "huevo", quantity: 1, unit: "unidad", category: "dairy" }],
    instructions: ["Triturar todo", "Hacer a la plancha"],
    image_url: "https://images.unsplash.com/photo-1506084868230-bb9d95c24759?auto=format&fit=crop&q=80"
  },
  {
    id: "bf-4",
    title: "Huevos Revueltos con Espinacas",
    description: "Proteína pura para la mañana.",
    meal_category: "breakfast",
    cuisine_type: "healthy",
    difficulty: "easy",
    prep_time: 10,
    servings: 1,
    calories: 250,
    dietary_tags: ["vegetarian", "keto", "gluten_free"],
    ingredients: [{ name: "huevos", quantity: 2, unit: "unidades", category: "dairy" }, { name: "espinacas", quantity: 50, unit: "g", category: "vegetables" }, { name: "aceite", quantity: 1, unit: "cucharada", category: "pantry" }],
    instructions: ["Saltear espinacas", "Añadir huevos batidos", "Cuajar al gusto"],
    image_url: "https://images.unsplash.com/photo-1510629954389-c1e0da47d414?auto=format&fit=crop&q=80"
  },
  {
    id: "bf-5",
    title: "Porridge de Avena y Canela",
    description: "Reconfortante y saciante.",
    meal_category: "breakfast",
    cuisine_type: "healthy",
    difficulty: "easy",
    prep_time: 10,
    servings: 1,
    calories: 300,
    dietary_tags: ["vegetarian", "vegan"],
    ingredients: [{ name: "avena", quantity: 50, unit: "g", category: "grains" }, { name: "leche o bebida vegetal", quantity: 200, unit: "ml", category: "dairy" }, { name: "canela", quantity: 1, unit: "pizca", category: "spices" }],
    instructions: ["Calentar leche", "Añadir avena y canela", "Cocer 5 min removiendo"],
    image_url: "https://images.unsplash.com/photo-1517673400267-0251440c45dc?auto=format&fit=crop&q=80"
  },

  // --- COMIDAS/CENAS VEGETARIANAS (20-30% DEL TOTAL) ---
  {
    id: "veg-1",
    title: "Lentejas Estofadas con Verduras",
    description: "Hierro y sabor tradicional sin carne.",
    meal_category: "lunch",
    cuisine_type: "spanish",
    difficulty: "medium",
    prep_time: 40,
    servings: 2,
    calories: 350,
    dietary_tags: ["vegan", "vegetarian", "gluten_free"],
    ingredients: [{ name: "lentejas", quantity: 200, unit: "g", category: "pantry" }, { name: "zanahoria", quantity: 1, unit: "unidad", category: "vegetables" }, { name: "patata", quantity: 1, unit: "unidad", category: "vegetables" }, { name: "pimiento", quantity: 1, unit: "unidad", category: "vegetables" }],
    instructions: ["Sofreír verduras picadas", "Añadir lentejas y agua", "Cocer 30-40 min"],
    image_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80"
  },
  {
    id: "veg-2",
    title: "Curry de Garbanzos y Espinacas",
    description: "Exótico, cremoso y lleno de proteínas.",
    meal_category: "lunch",
    cuisine_type: "asian",
    difficulty: "medium",
    prep_time: 25,
    servings: 2,
    calories: 400,
    dietary_tags: ["vegan", "vegetarian", "gluten_free"],
    ingredients: [{ name: "garbanzos", quantity: 400, unit: "g", category: "pantry" }, { name: "leche de coco", quantity: 200, unit: "ml", category: "pantry" }, { name: "espinacas", quantity: 100, unit: "g", category: "vegetables" }, { name: "curry", quantity: 1, unit: "cucharada", category: "spices" }],
    instructions: ["Sofreír especias", "Añadir garbanzos y leche coco", "Cocer 10 min", "Añadir espinacas al final"],
    image_url: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&q=80"
  },
  {
    id: "veg-3",
    title: "Ensalada Griega con Feta",
    description: "Fresca, rápida y llena de color.",
    meal_category: "dinner",
    cuisine_type: "mediterranean",
    difficulty: "easy",
    prep_time: 15,
    servings: 2,
    calories: 300,
    dietary_tags: ["vegetarian", "gluten_free", "keto"],
    ingredients: [{ name: "tomate", quantity: 2, unit: "unidades", category: "vegetables" }, { name: "pepino", quantity: 1, unit: "unidad", category: "vegetables" }, { name: "queso feta", quantity: 100, unit: "g", category: "dairy" }, { name: "aceitunas", quantity: 50, unit: "g", category: "pantry" }],
    instructions: ["Cortar todo en cubos", "Mezclar y aliñar con aceite y orégano"],
    image_url: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&q=80"
  },
  {
    id: "veg-4",
    title: "Wok de Tofu y Verduras",
    description: "Cena ligera asiática.",
    meal_category: "dinner",
    cuisine_type: "asian",
    difficulty: "easy",
    prep_time: 20,
    servings: 2,
    calories: 320,
    dietary_tags: ["vegan", "vegetarian", "lactose_free"],
    ingredients: [{ name: "tofu", quantity: 200, unit: "g", category: "pantry" }, { name: "brocoli", quantity: 1, unit: "unidad", category: "vegetables" }, { name: "zanahoria", quantity: 1, unit: "unidad", category: "vegetables" }, { name: "soja", quantity: 2, unit: "cucharada", category: "pantry" }],
    instructions: ["Dorar tofu", "Saltear verduras al dente", "Mezclar con salsa de soja"],
    image_url: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&q=80"
  },
  {
    id: "veg-5",
    title: "Crema de Calabaza y Jengibre",
    description: "Suave, dulce y picante.",
    meal_category: "dinner",
    cuisine_type: "healthy",
    difficulty: "easy",
    prep_time: 30,
    servings: 2,
    calories: 200,
    dietary_tags: ["vegan", "vegetarian", "gluten_free"],
    ingredients: [{ name: "calabaza", quantity: 500, unit: "g", category: "vegetables" }, { name: "patata", quantity: 1, unit: "unidad", category: "vegetables" }, { name: "jengibre", quantity: 1, unit: "trozo", category: "vegetables" }],
    instructions: ["Cocer todo", "Triturar", "Ajustar sal y pimienta"],
    image_url: "https://images.unsplash.com/photo-1476718406336-bb5a9690ee2b?auto=format&fit=crop&q=80"
  },
  {
    id: "veg-6",
    title: "Tortilla de Patatas",
    description: "El clásico español que nunca falla.",
    meal_category: "dinner",
    cuisine_type: "spanish",
    difficulty: "medium",
    prep_time: 30,
    servings: 2,
    calories: 350,
    dietary_tags: ["vegetarian", "gluten_free"],
    ingredients: [{ name: "huevos", quantity: 4, unit: "unidades", category: "dairy" }, { name: "patata", quantity: 2, unit: "unidades", category: "vegetables" }, { name: "cebolla", quantity: 1, unit: "unidad", category: "vegetables" }, { name: "aceite", quantity: 100, unit: "ml", category: "pantry" }],
    instructions: ["Pochar patata y cebolla", "Mezclar con huevo batido", "Cuajar en sartén"],
    image_url: "https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&q=80"
  },
  {
    id: "veg-7",
    title: "Espaguetis al Pesto",
    description: "Italiano, rápido y aromático.",
    meal_category: "lunch",
    cuisine_type: "italian",
    difficulty: "easy",
    prep_time: 15,
    servings: 2,
    calories: 450,
    dietary_tags: ["vegetarian"],
    ingredients: [{ name: "pasta", quantity: 200, unit: "g", category: "grains" }, { name: "albahaca", quantity: 1, unit: "manojo", category: "vegetables" }, { name: "nueces", quantity: 30, unit: "g", category: "pantry" }, { name: "parmesano", quantity: 50, unit: "g", category: "dairy" }],
    instructions: ["Cocer pasta", "Triturar salsa", "Mezclar"],
    image_url: "https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&q=80"
  },

  // --- CARNES Y PESCADOS (DIETA VARIADA) ---
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
  {
    id: "main-2",
    title: "Salmón a la Plancha con Verduritas",
    description: "Omega 3 y ligero para cenar.",
    meal_category: "dinner",
    cuisine_type: "healthy",
    difficulty: "easy",
    prep_time: 15,
    servings: 1,
    calories: 400,
    dietary_tags: ["keto", "gluten_free"],
    ingredients: [{ name: "salmon", quantity: 150, unit: "g", category: "fish" }, { name: "calabacin", quantity: 0.5, unit: "unidad", category: "vegetables" }, { name: "esparragos", quantity: 5, unit: "unidades", category: "vegetables" }],
    instructions: ["Hacer verduras a la plancha", "Marcar salmón", "Servir caliente"],
    image_url: "https://images.unsplash.com/photo-1467003909585-2f8a7270028d?auto=format&fit=crop&q=80"
  },
  {
    id: "main-3",
    title: "Macarrones con Tomate y Chorizo",
    description: "Favorito de los niños.",
    meal_category: "lunch",
    cuisine_type: "spanish",
    difficulty: "easy",
    prep_time: 20,
    servings: 2,
    calories: 550,
    dietary_tags: [],
    ingredients: [{ name: "pasta", quantity: 200, unit: "g", category: "grains" }, { name: "tomate frito", quantity: 200, unit: "ml", category: "pantry" }, { name: "chorizo", quantity: 50, unit: "g", category: "meat" }],
    instructions: ["Cocer pasta", "Sofreír chorizo", "Añadir tomate y mezclar"],
    image_url: "https://images.unsplash.com/photo-1622973536968-3ead9e780960?auto=format&fit=crop&q=80"
  },
  {
    id: "main-4",
    title: "Fajitas de Pollo y Pimientos",
    description: "Divertido y sabroso.",
    meal_category: "dinner",
    cuisine_type: "mexican",
    difficulty: "easy",
    prep_time: 20,
    servings: 2,
    calories: 450,
    dietary_tags: ["lactose_free"],
    ingredients: [{ name: "pechuga de pollo", quantity: 300, unit: "g", category: "meat" }, { name: "pimiento", quantity: 1, unit: "unidad", category: "vegetables" }, { name: "cebolla", quantity: 1, unit: "unidad", category: "vegetables" }, { name: "tortillas", quantity: 4, unit: "unidades", category: "grains" }],
    instructions: ["Saltear tiras de pollo y verduras", "Sazonar", "Servir en tortillas calientes"],
    image_url: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&q=80"
  },
  {
    id: "main-5",
    title: "Merluza en Salsa Verde",
    description: "Clásico marinero saludable.",
    meal_category: "dinner",
    cuisine_type: "spanish",
    difficulty: "medium",
    prep_time: 25,
    servings: 2,
    calories: 300,
    dietary_tags: ["healthy", "paleo"],
    ingredients: [{ name: "merluza", quantity: 300, unit: "g", category: "fish" }, { name: "ajo", quantity: 2, unit: "dientes", category: "vegetables" }, { name: "perejil", quantity: 1, unit: "manojo", category: "vegetables" }, { name: "guisantes", quantity: 50, unit: "g", category: "vegetables" }],
    instructions: ["Sofreír ajo", "Añadir harina y caldo", "Cocinar pescado en la salsa"],
    image_url: "https://images.unsplash.com/photo-1551061956-613d07802874?auto=format&fit=crop&q=80"
  },
  {
    id: "main-6",
    title: "Arroz a la Cubana",
    description: "Rápido, barato y rico.",
    meal_category: "lunch",
    cuisine_type: "spanish",
    difficulty: "easy",
    prep_time: 20,
    servings: 1,
    calories: 500,
    dietary_tags: ["vegetarian"],
    ingredients: [{ name: "arroz", quantity: 100, unit: "g", category: "grains" }, { name: "tomate frito", quantity: 100, unit: "ml", category: "pantry" }, { name: "huevo", quantity: 1, unit: "unidad", category: "dairy" }, { name: "platano", quantity: 1, unit: "unidad", category: "fruits" }],
    instructions: ["Cocer arroz", "Freír huevo y plátano", "Servir con tomate"],
    image_url: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80"
  },
  {
    id: "main-7",
    title: "Albóndigas Jardineras",
    description: "Carne con verduras en salsa.",
    meal_category: "lunch",
    cuisine_type: "spanish",
    difficulty: "medium",
    prep_time: 45,
    servings: 4,
    calories: 450,
    dietary_tags: [],
    ingredients: [{ name: "carne picada", quantity: 500, unit: "g", category: "meat" }, { name: "zanahoria", quantity: 2, unit: "unidades", category: "vegetables" }, { name: "guisantes", quantity: 100, unit: "g", category: "vegetables" }, { name: "cebolla", quantity: 1, unit: "unidad", category: "vegetables" }],
    instructions: ["Hacer albóndigas y freír", "Hacer salsa con verduras", "Guisar todo junto"],
    image_url: "https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&q=80"
  }
];

export const FALLBACK_RECIPES = STATIC_RECIPES;
