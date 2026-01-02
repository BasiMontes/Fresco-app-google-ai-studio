
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

// REPOSITORIO ESTÁTICO DE RECETAS (AMPLIADO A 30+ RECETAS)
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
    dietary_tags: ["vegetarian"],
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
    title: "Gachas de Avena (Porridge)",
    description: "Desayuno caliente y reconfortante.",
    meal_category: "breakfast",
    cuisine_type: "healthy",
    difficulty: "easy",
    prep_time: 10,
    servings: 1,
    calories: 300,
    dietary_tags: ["vegetarian", "vegan"],
    ingredients: [
      { name: "avena", quantity: 50, unit: "g", category: "grains" },
      { name: "leche", quantity: 200, unit: "ml", category: "dairy" },
      { name: "canela", quantity: 1, unit: "pizca", category: "spices" }
    ],
    instructions: ["Cocer avena con leche a fuego lento", "Añadir canela al final"],
    image_url: "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&q=80"
  },

  // --- MEDITERRÁNEA / ESPAÑOLA ---
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
    dietary_tags: ["vegetarian", "vegan", "gluten_free"],
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
    id: "static-5",
    title: "Gazpacho Andaluz",
    description: "Bomba de vitaminas fría.",
    meal_category: "lunch",
    cuisine_type: "spanish",
    difficulty: "easy",
    prep_time: 15,
    servings: 2,
    calories: 180,
    dietary_tags: ["vegan", "vegetarian", "gluten_free"],
    ingredients: [
      { name: "tomate", quantity: 5, unit: "unidades", category: "vegetables" },
      { name: "pimiento", quantity: 1, unit: "unidad", category: "vegetables" },
      { name: "pepino", quantity: 1, unit: "unidad", category: "vegetables" },
      { name: "ajo", quantity: 1, unit: "diente", category: "vegetables" },
      { name: "aceite", quantity: 50, unit: "ml", category: "pantry" }
    ],
    instructions: ["Triturar todo muy bien", "Enfriar en nevera"],
    image_url: "https://images.unsplash.com/photo-1557844352-761f2565b576?auto=format&fit=crop&q=80"
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
    dietary_tags: ["healthy"],
    ingredients: [
      { name: "merluza", quantity: 300, unit: "g", category: "fish" },
      { name: "harina", quantity: 50, unit: "g", category: "pantry" },
      { name: "huevo", quantity: 1, unit: "unidad", category: "dairy" },
      { name: "aceite", quantity: 100, unit: "ml", category: "pantry" }
    ],
    instructions: ["Pasar pescado por harina y huevo", "Freír en aceite caliente"],
    image_url: "https://images.unsplash.com/photo-1551061956-613d07802874?auto=format&fit=crop&q=80"
  },

  // --- ITALIANA ---
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
  {
    id: "static-new-9",
    title: "Ensalada César con Pollo",
    description: "Crujiente, cremosa y deliciosa.",
    meal_category: "dinner",
    cuisine_type: "italian",
    difficulty: "easy",
    prep_time: 15,
    servings: 2,
    calories: 380,
    dietary_tags: [],
    ingredients: [
      { name: "lechuga", quantity: 1, unit: "unidad", category: "vegetables" },
      { name: "pollo", quantity: 200, unit: "g", category: "meat" },
      { name: "pan", quantity: 1, unit: "rebanada", category: "grains" },
      { name: "queso", quantity: 30, unit: "g", category: "dairy" }
    ],
    instructions: ["Hacer pollo a la plancha", "Tostar pan en cubos", "Mezclar todo con lechuga"],
    image_url: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&q=80"
  },

  // --- ASIÁTICA ---
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
    id: "static-9",
    title: "Curry de Garbanzos (Chana Masala)",
    description: "Sabores de la India, vegano y barato.",
    meal_category: "lunch",
    cuisine_type: "asian",
    difficulty: "medium",
    prep_time: 25,
    servings: 2,
    calories: 400,
    dietary_tags: ["vegan", "vegetarian", "gluten_free"],
    ingredients: [
      { name: "garbanzos", quantity: 400, unit: "g", category: "pantry" },
      { name: "tomate frito", quantity: 200, unit: "ml", category: "pantry" },
      { name: "cebolla", quantity: 1, unit: "unidad", category: "vegetables" },
      { name: "curry", quantity: 1, unit: "cucharada", category: "spices" }
    ],
    instructions: ["Sofreír cebolla", "Añadir tomate y especias", "Incorporar garbanzos y cocinar 10 min"],
    image_url: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&q=80"
  },
  {
    id: "static-new-4",
    title: "Arroz Tres Delicias Casero",
    description: "Mejor que el del restaurante.",
    meal_category: "dinner",
    cuisine_type: "asian",
    difficulty: "easy",
    prep_time: 20,
    servings: 2,
    calories: 350,
    dietary_tags: [],
    ingredients: [
      { name: "arroz", quantity: 200, unit: "g", category: "grains" },
      { name: "guisantes", quantity: 50, unit: "g", category: "vegetables" },
      { name: "jamon", quantity: 50, unit: "g", category: "meat" },
      { name: "huevo", quantity: 1, unit: "unidad", category: "dairy" }
    ],
    instructions: ["Cocer arroz", "Hacer tortilla francesa y trocear", "Saltear todo junto"],
    image_url: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&q=80"
  },
  {
    id: "static-new-5",
    title: "Poké Bowl de Salmón",
    description: "Fresco, saludable y rápido.",
    meal_category: "lunch",
    cuisine_type: "asian",
    difficulty: "easy",
    prep_time: 15,
    servings: 1,
    calories: 450,
    dietary_tags: ["healthy"],
    ingredients: [
      { name: "arroz", quantity: 100, unit: "g", category: "grains" },
      { name: "salmon", quantity: 100, unit: "g", category: "fish" },
      { name: "aguacate", quantity: 0.5, unit: "unidad", category: "fruits" },
      { name: "pepino", quantity: 0.5, unit: "unidad", category: "vegetables" }
    ],
    instructions: ["Montar base de arroz", "Colocar ingredientes encima troceados", "Aliñar al gusto"],
    image_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80"
  },
  {
    id: "static-new-10",
    title: "Pollo al Limón Chino",
    description: "Crujiente con salsa pegajosa.",
    meal_category: "lunch",
    cuisine_type: "asian",
    difficulty: "medium",
    prep_time: 30,
    servings: 2,
    calories: 420,
    dietary_tags: [],
    ingredients: [
      { name: "pollo", quantity: 300, unit: "g", category: "meat" },
      { name: "limon", quantity: 2, unit: "unidades", category: "fruits" },
      { name: "azucar", quantity: 2, unit: "cucharada", category: "pantry" },
      { name: "harina", quantity: 50, unit: "g", category: "pantry" }
    ],
    instructions: ["Rebozar y freír pollo", "Hacer salsa con zumo de limón y azúcar", "Mezclar"],
    image_url: "https://images.unsplash.com/photo-1562967960-f55499ad7704?auto=format&fit=crop&q=80"
  },

  // --- MEXICANA ---
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
    id: "static-11",
    title: "Huevos Rancheros Simplificados",
    description: "Desayuno o cena contundente.",
    meal_category: "lunch",
    cuisine_type: "mexican",
    difficulty: "medium",
    prep_time: 15,
    servings: 1,
    calories: 400,
    dietary_tags: ["vegetarian"],
    ingredients: [
      { name: "huevos", quantity: 2, unit: "unidades", category: "dairy" },
      { name: "tortillas", quantity: 2, unit: "unidades", category: "grains" },
      { name: "tomate frito", quantity: 100, unit: "ml", category: "pantry" },
      { name: "frijoles", quantity: 100, unit: "g", category: "pantry" }
    ],
    instructions: ["Freír huevos", "Calentar tortillas y frijoles", "Montar con salsa por encima"],
    image_url: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&q=80"
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
  },

  // --- KETO / BAJO CARBOHIDRATO ---
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
    dietary_tags: ["keto", "gluten_free", "paleo"],
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

  // --- VEGANO ---
  {
    id: "static-14",
    title: "Lentejas con Verduras",
    description: "El guiso de toda la vida, 100% vegetal.",
    meal_category: "lunch",
    cuisine_type: "spanish",
    difficulty: "easy",
    prep_time: 40,
    servings: 4,
    calories: 350,
    dietary_tags: ["vegan", "vegetarian", "gluten_free"],
    ingredients: [
      { name: "lentejas", quantity: 300, unit: "g", category: "pantry" },
      { name: "zanahoria", quantity: 2, unit: "unidades", category: "vegetables" },
      { name: "patata", quantity: 1, unit: "unidad", category: "vegetables" },
      { name: "cebolla", quantity: 1, unit: "unidad", category: "vegetables" }
    ],
    instructions: ["Poner todo en crudo en olla", "Cubrir de agua", "Cocer hasta que estén tiernas (30-40 min)"],
    image_url: "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&q=80"
  },
  {
    id: "static-new-7",
    title: "Crema de Calabaza",
    description: "Suave, ligera y nutritiva.",
    meal_category: "dinner",
    cuisine_type: "healthy",
    difficulty: "easy",
    prep_time: 30,
    servings: 4,
    calories: 150,
    dietary_tags: ["vegan", "vegetarian", "gluten_free", "healthy"],
    ingredients: [
      { name: "calabaza", quantity: 500, unit: "g", category: "vegetables" },
      { name: "zanahoria", quantity: 2, unit: "unidades", category: "vegetables" },
      { name: "cebolla", quantity: 1, unit: "unidad", category: "vegetables" },
      { name: "patata", quantity: 1, unit: "unidad", category: "vegetables" }
    ],
    instructions: ["Cocer verduras troceadas 20 min", "Triturar hasta que quede fino", "Añadir un chorrito de aceite"],
    image_url: "https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?auto=format&fit=crop&q=80"
  },
  {
    id: "static-new-8",
    title: "Berenjenas Rellenas",
    description: "Plato principal vegetal y saciante.",
    meal_category: "lunch",
    cuisine_type: "mediterranean",
    difficulty: "medium",
    prep_time: 40,
    servings: 2,
    calories: 250,
    dietary_tags: ["vegetarian", "gluten_free"],
    ingredients: [
      { name: "berenjena", quantity: 2, unit: "unidades", category: "vegetables" },
      { name: "tomate frito", quantity: 100, unit: "ml", category: "pantry" },
      { name: "cebolla", quantity: 1, unit: "unidad", category: "vegetables" },
      { name: "queso", quantity: 50, unit: "g", category: "dairy" }
    ],
    instructions: ["Asar berenjenas partidas", "Vaciar y sofreír carne con cebolla y tomate", "Rellenar, queso y gratinar"],
    image_url: "https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf?auto=format&fit=crop&q=80"
  },

  // --- FAST FOOD SALUDABLE ---
  {
    id: "static-15",
    title: "Pizza Casera Integral",
    description: "Date un capricho el fin de semana.",
    meal_category: "dinner",
    cuisine_type: "fast",
    difficulty: "medium",
    prep_time: 25,
    servings: 2,
    calories: 600,
    dietary_tags: ["vegetarian"],
    ingredients: [
      { name: "pan", quantity: 2, unit: "unidades", category: "grains" }, // Base de pan o tortilla
      { name: "tomate frito", quantity: 100, unit: "ml", category: "pantry" },
      { name: "mozzarella", quantity: 100, unit: "g", category: "dairy" },
      { name: "oregano", quantity: 1, unit: "cucharada", category: "spices" }
    ],
    instructions: ["Usar pan o tortilla como base", "Añadir tomate y queso", "Hornear hasta dorar"],
    image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80"
  },
  {
    id: "static-16",
    title: "Hamburguesa de Pollo Casera",
    description: "Jugosa y sin ingredientes extraños.",
    meal_category: "dinner",
    cuisine_type: "fast",
    difficulty: "medium",
    prep_time: 20,
    servings: 2,
    calories: 450,
    dietary_tags: [],
    ingredients: [
      { name: "carne picada", quantity: 250, unit: "g", category: "meat" }, // Pollo picado
      { name: "pan", quantity: 2, unit: "unidades", category: "grains" },
      { name: "lechuga", quantity: 2, unit: "hojas", category: "vegetables" },
      { name: "tomate", quantity: 1, unit: "unidad", category: "vegetables" }
    ],
    instructions: ["Formar hamburguesas y hacer a la plancha", "Montar en pan con verduras"],
    image_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80"
  },
  
  // --- EXTRAS Y POSTRES ---
  {
    id: "static-new-11",
    title: "Brochetas de Fruta",
    description: "Postre o merienda ligera y divertida.",
    meal_category: "breakfast",
    cuisine_type: "healthy",
    difficulty: "easy",
    prep_time: 10,
    servings: 2,
    calories: 120,
    dietary_tags: ["vegan", "vegetarian", "gluten_free"],
    ingredients: [
      { name: "platano", quantity: 1, unit: "unidad", category: "fruits" },
      { name: "manzana", quantity: 1, unit: "unidad", category: "fruits" },
      { name: "yogur", quantity: 1, unit: "unidad", category: "dairy" }
    ],
    instructions: ["Cortar fruta en dados", "Ensartar en palillos", "Servir con yogur para mojar"],
    image_url: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&q=80"
  },
  {
    id: "static-new-12",
    title: "Brownie de Aguacate",
    description: "Versión saludable y cremosa.",
    meal_category: "breakfast",
    cuisine_type: "healthy",
    difficulty: "medium",
    prep_time: 35,
    servings: 6,
    calories: 200,
    dietary_tags: ["gluten_free", "vegetarian"],
    ingredients: [
      { name: "aguacate", quantity: 1, unit: "unidad", category: "fruits" },
      { name: "huevo", quantity: 2, unit: "unidades", category: "dairy" },
      { name: "azucar", quantity: 100, unit: "g", category: "pantry" },
      { name: "harina", quantity: 50, unit: "g", category: "pantry" } // Cacao en polvo simulado
    ],
    instructions: ["Triturar aguacate", "Mezclar con resto de ingredientes", "Hornear 25 min a 180ºC"],
    image_url: "https://images.unsplash.com/photo-1606313564200-e75d5e30476d?auto=format&fit=crop&q=80"
  }
];

export const FALLBACK_RECIPES = STATIC_RECIPES;