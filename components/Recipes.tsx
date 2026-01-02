
import React, { useState, useMemo, useEffect } from 'react';
import { Recipe, UserProfile, PantryItem, ShoppingItem, MealCategory } from '../types';
import { Search, Sparkles, Clock, Users, Flame, PackageCheck, Zap, X, Heart, Eye, ImageOff, Wand2, Leaf, WifiOff, CheckCircle2, ChevronDown, CalendarPlus, BookX, FilterX, ChefHat } from 'lucide-react';
import { generateRecipesAI } from '../services/geminiService';
import { RecipeDetail } from './RecipeDetail';
import { SmartImage } from './SmartImage';
import { differenceInDays } from 'date-fns';

interface RecipesProps {
  recipes: Recipe[];
  user: UserProfile;
  pantry: PantryItem[];
  onAddRecipes: (newRecipes: Recipe[]) => void;
  // AUDITORÍA 2: Callback extendido para fecha y tipo
  onAddToPlan: (recipe: Recipe, servings: number, date?: string, type?: MealCategory) => void;
  onCookFinish: (usedIngredients: { name: string, quantity: number }[], recipeId?: string) => void; 
  onAddToShoppingList: (items: ShoppingItem[]) => void;
  isOnline?: boolean;
  initialRecipeId?: string | null; 
}

const RecipeSkeleton = () => (
    <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm flex flex-col h-[400px]">
        <div className="h-48 w-full skeleton-bg relative">
            <div className="absolute top-4 left-4 w-16 h-6 rounded-xl bg-white/50" />
        </div>
        <div className="p-6 flex-1 flex flex-col gap-3">
            <div className="w-20 h-4 rounded-lg skeleton-bg" />
            <div className="w-full h-6 rounded-lg skeleton-bg" />
            <div className="w-2/3 h-6 rounded-lg skeleton-bg" />
            <div className="w-full h-3 rounded-lg skeleton-bg mt-2" />
            <div className="w-full h-12 rounded-xl skeleton-bg mt-auto" />
        </div>
    </div>
);

export const Recipes: React.FC<RecipesProps> = ({ recipes, user, pantry, onAddRecipes, onAddToPlan, onCookFinish, onAddToShoppingList, isOnline = true, initialRecipeId }) => {
  const [loadingAI, setLoadingAI] = useState(false);
  const [initialMode, setInitialMode] = useState<'view' | 'plan'>('view');
  
  const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem('recipes_search') || '');
  const [activeCategory, setActiveCategory] = useState<string>(() => sessionStorage.getItem('recipes_category') || 'all');
  const [showOnlyCookable, setShowOnlyCookable] = useState(() => sessionStorage.getItem('recipes_cookable') === 'true');
  const [sortByZeroWaste, setSortByZeroWaste] = useState(() => sessionStorage.getItem('recipes_zerowaste') === 'true');
  const [visibleCount, setVisibleCount] = useState(() => parseInt(sessionStorage.getItem('recipes_count') || '8'));

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
      sessionStorage.setItem('recipes_search', searchTerm);
      sessionStorage.setItem('recipes_category', activeCategory);
      sessionStorage.setItem('recipes_cookable', String(showOnlyCookable));
      sessionStorage.setItem('recipes_zerowaste', String(sortByZeroWaste));
      sessionStorage.setItem('recipes_count', String(visibleCount));
  }, [searchTerm, activeCategory, showOnlyCookable, sortByZeroWaste, visibleCount]);

  useEffect(() => {
      if (initialRecipeId) {
          const found = recipes.find(r => r.id === initialRecipeId);
          if (found) {
              setInitialMode('view');
              setSelectedRecipe(found);
          }
      }
  }, [initialRecipeId, recipes]);

  const handleGenerate = async () => {
    if(!isOnline) return;
    setLoadingAI(true);
    try {
        const newRecipes = await generateRecipesAI(user, pantry);
        if (newRecipes.length > 0) {
            onAddRecipes(newRecipes);
        }
    } catch (e) {
        // Error manejado globalmente por el servicio
    } finally {
        setLoadingAI(false);
    }
  };

  const handleSpecificGenerate = async () => {
      if(!isOnline) return;
      setLoadingAI(true);
      try {
          const prompt = `Una receta llamada ${searchTerm} o similar.`;
          const newRecipes = await generateRecipesAI(user, pantry, 1, prompt);
          if (newRecipes.length > 0) {
              onAddRecipes(newRecipes);
          }
      } catch (e) {
          // Error global
      } finally {
          setLoadingAI(false);
      }
  };

  const clearFilters = () => {
      setSearchTerm('');
      setActiveCategory('all');
      setShowOnlyCookable(false);
      setSortByZeroWaste(false);
  };

  const checkPantryStock = (recipe: Recipe) => {
    const totalIngredients = recipe.ingredients.length;
    const normalize = (s: string) => s.toLowerCase().trim().replace(/s$/, '').replace(/es$/, '');
    
    const itemsInPantry = recipe.ingredients.filter(ing => {
      const normalizedIng = normalize(ing.name);
      return pantry.some(p => {
        const normalizedP = normalize(p.name);
        return normalizedP === normalizedIng || normalizedP.includes(normalizedIng) || normalizedIng.includes(normalizedP);
      });
    }).length;
    
    return { count: itemsInPantry, total: totalIngredients };
  };

  const getExpiryScore = (recipe: Recipe): number => {
    const normalize = (s: string) => s.toLowerCase().trim().replace(/s$/, '').replace(/es$/, '');
    let score = 0;
    
    recipe.ingredients.forEach(ing => {
        const normalizedIng = normalize(ing.name);
        const match = pantry.find(p => {
            const normalizedP = normalize(p.name);
            return normalizedP === normalizedIng || normalizedP.includes(normalizedIng) || normalizedIng.includes(normalizedP);
        });

        if (match && match.expires_at) {
            const daysLeft = differenceInDays(new Date(match.expires_at), new Date());
            if (daysLeft <= 0) score += 100; // Crítico
            else if (daysLeft <= 3) score += 50; // Urgente
            else if (daysLeft <= 7) score += 10; // Próximo
        }
    });
    return score;
  };

  const filteredRecipes = useMemo(() => {
    let result = recipes.filter(r => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = r.title.toLowerCase().includes(searchLower) || 
                             r.cuisine_type.toLowerCase().includes(searchLower) ||
                             r.ingredients.some(i => i.name.toLowerCase().includes(searchLower));
        const matchesCategory = activeCategory === 'all' || r.meal_category === activeCategory;
        const stock = checkPantryStock(r);
        const isCookable = !showOnlyCookable || (stock.count / stock.total >= 0.6); 
        return matchesSearch && matchesCategory && isCookable;
    });

    if (sortByZeroWaste) {
        result = result.sort((a, b) => getExpiryScore(b) - getExpiryScore(a));
    }

    return result;
  }, [recipes, searchTerm, activeCategory, showOnlyCookable, sortByZeroWaste, pantry]);

  const checkDietMatch = (recipe: Recipe) => {
      if (!user.dietary_preferences || user.dietary_preferences.includes('none')) return true;
      return user.dietary_preferences.every(pref => recipe.dietary_tags?.includes(pref));
  };

  return (
    <div className="p-4 md:p-6 space-y-8 animate-fade-in pb-48">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-teal-900 tracking-tight leading-none mb-1">Biblioteca</h1>
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Inspiración basada en tu stock</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loadingAI || !isOnline}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-teal-900 text-white px-6 py-3 rounded-full shadow-lg hover:bg-teal-800 transition-all disabled:opacity-50 font-black text-xs uppercase tracking-widest active:scale-95 group disabled:bg-gray-400"
        >
          {isOnline ? <><Sparkles className={`w-4 h-4 text-orange-400 ${loadingAI ? 'animate-spin' : ''}`} /> Inspiración IA</> : <><WifiOff className="w-4 h-4" /> Offline</>}
        </button>
      </header>

      {/* Controles solo si hay recetas en la BD o estamos buscando */}
      {(recipes.length > 0 || searchTerm) && (
        <div className="space-y-4">
            <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 group-focus-within:text-teal-600 transition-colors" />
            <input
                type="text"
                placeholder="Buscar por plato, cocina o ingrediente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-6 py-3 rounded-full bg-white border border-gray-100 focus:border-teal-500 focus:outline-none text-sm shadow-sm focus:shadow-lg transition-all font-bold placeholder-gray-300"
            />
            </div>
            
            <div className="flex flex-wrap gap-2 items-center">
            <div className="bg-white p-1.5 rounded-full flex gap-1 shadow-sm border border-gray-100 overflow-x-auto no-scrollbar max-w-full">
                {['all', 'breakfast', 'lunch', 'dinner'].map(cat => (
                    <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-5 py-2 rounded-full whitespace-nowrap capitalize font-black text-[10px] tracking-widest transition-all ${
                        activeCategory === cat 
                        ? 'bg-teal-900 text-white shadow-md' 
                        : 'text-gray-400 hover:text-teal-600 hover:bg-gray-50'
                    }`}
                    >
                    {cat === 'all' ? 'Todo' : cat === 'breakfast' ? 'Desayuno' : cat === 'lunch' ? 'Comida' : 'Cena'}
                    </button>
                ))}
            </div>
            
            <button 
                onClick={() => setShowOnlyCookable(!showOnlyCookable)}
                className={`px-5 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm border ${
                    showOnlyCookable ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:bg-teal-50 hover:text-teal-900'
                }`}
            >
                <Zap className={`w-3 h-3 ${showOnlyCookable ? 'fill-white' : ''}`} />
                Cocinar Ya
            </button>
            
            <button 
                onClick={() => setSortByZeroWaste(!sortByZeroWaste)}
                className={`px-5 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm border ${
                    sortByZeroWaste ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:bg-green-50 hover:text-green-700'
                }`}
            >
                <Leaf className={`w-3 h-3 ${sortByZeroWaste ? 'fill-white' : ''}`} />
                Zero Waste
            </button>
            </div>
        </div>
      )}

      {/* Grid de Contenido Compacto */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          
          {loadingAI && (
              <>
                <RecipeSkeleton />
                <RecipeSkeleton />
                <RecipeSkeleton />
              </>
          )}

          {!loadingAI && recipes.length === 0 && (
              <div className="col-span-1 md:col-span-3 lg:col-span-4 py-20 text-center animate-fade-in flex flex-col items-center">
                  <div className="w-32 h-32 bg-teal-50 rounded-full flex items-center justify-center mb-8 border-4 border-teal-100">
                      <ChefHat className="w-16 h-16 text-teal-300" />
                  </div>
                  <h3 className="text-2xl font-black text-teal-900 mb-2">Tu recetario está vacío</h3>
                  <p className="text-gray-400 font-medium mb-8 max-w-sm mx-auto text-sm leading-relaxed">
                      Fresco usa IA para crear recetas basadas en lo que tienes.
                  </p>
                  <button 
                    onClick={handleGenerate}
                    disabled={!isOnline}
                    className="px-8 py-4 bg-teal-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-teal-800 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                  >
                      <Sparkles className="w-4 h-4 text-orange-400" /> Crear recetas
                  </button>
              </div>
          )}

          {!loadingAI && recipes.length > 0 && filteredRecipes.length === 0 && searchTerm && (
              <div className="col-span-1 md:col-span-3 lg:col-span-4 py-20 text-center animate-fade-in flex flex-col items-center">
                  <div className="w-24 h-24 bg-orange-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                      <Wand2 className="w-12 h-12 text-orange-400" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">¿Buscas "{searchTerm}"?</h3>
                  <p className="text-gray-400 font-medium mb-8 max-w-sm mx-auto text-sm">La IA puede crear esa receta específica para ti.</p>
                  <button 
                    onClick={handleSpecificGenerate}
                    disabled={!isOnline}
                    className="px-8 py-4 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-50 disabled:bg-gray-400"
                  >
                      {isOnline ? `Generar "${searchTerm}"` : 'Modo Offline'}
                  </button>
                  <button onClick={clearFilters} className="mt-4 text-teal-600 font-bold text-xs hover:underline">
                      Ver todas
                  </button>
              </div>
          )}

          {!loadingAI && recipes.length > 0 && filteredRecipes.length === 0 && !searchTerm && (
              <div className="col-span-1 md:col-span-3 lg:col-span-4 py-20 text-center animate-fade-in flex flex-col items-center">
                  <div className="w-24 h-24 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-gray-100">
                      <FilterX className="w-12 h-12 text-gray-300" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Nada por aquí</h3>
                  <p className="text-gray-400 font-medium mb-8 max-w-sm mx-auto text-sm">Prueba a relajar los filtros.</p>
                  <button 
                    onClick={clearFilters}
                    className="px-8 py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
                  >
                      Limpiar Filtros
                  </button>
              </div>
          )}

          {!loadingAI && filteredRecipes.slice(0, visibleCount).map((recipe) => {
            const stock = checkPantryStock(recipe);
            const compatibility = Math.round((stock.count / stock.total) * 100);
            const urgencyScore = getExpiryScore(recipe);
            const matchesDiet = checkDietMatch(recipe);

            return (
                <div 
                    key={recipe.id} 
                    onClick={() => { setInitialMode('view'); setSelectedRecipe(recipe); }}
                    className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 flex flex-col group cursor-pointer"
                >
                <div className="relative h-48 overflow-hidden bg-gray-100 flex items-center justify-center">
                    <SmartImage 
                        src={recipe.image_url} 
                        alt={recipe.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                    
                    <div className="absolute top-4 left-4 flex flex-col gap-1 z-20 items-start">
                        <div className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-sm backdrop-blur-md text-white border border-white/20 ${
                            recipe.difficulty === 'easy' ? 'bg-green-500/90' : recipe.difficulty === 'medium' ? 'bg-orange-500/90' : 'bg-red-500/90'
                        }`}>
                            {recipe.difficulty === 'easy' ? 'Fácil' : recipe.difficulty === 'medium' ? 'Medio' : 'Difícil'}
                        </div>
                        {urgencyScore > 40 && (
                            <div className="px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-sm backdrop-blur-md text-white bg-red-600/90 border border-white/20 animate-pulse">
                                Salva Comida
                            </div>
                        )}
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 z-20">
                        <div className="bg-white/20 backdrop-blur-md rounded-xl p-3 flex items-center justify-between text-white border border-white/30 shadow-lg">
                            <div className="flex items-center gap-2">
                                <PackageCheck className={`w-4 h-4 ${compatibility === 100 ? 'text-green-300' : 'text-orange-300'}`} />
                                <div className="text-[9px] font-black uppercase tracking-widest">{compatibility}% Stock</div>
                            </div>
                            <div className="h-1.5 w-16 bg-white/20 rounded-full overflow-hidden">
                                <div className={`h-full ${compatibility === 100 ? 'bg-green-400' : 'bg-orange-400'}`} style={{ width: `${compatibility}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[8px] font-black uppercase tracking-widest text-teal-600 bg-teal-50 px-2 py-1 rounded-lg border border-teal-100">{recipe.cuisine_type}</span>
                        {recipe.calories && (
                            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                                <Flame className="w-3 h-3 text-orange-400" /> {recipe.calories}
                            </span>
                        )}
                    </div>
                    
                    <h3 className="text-xl font-black text-gray-900 mb-2 line-clamp-2 leading-tight tracking-tight group-hover:text-teal-700 transition-colors">{recipe.title}</h3>
                    <p className="text-gray-400 text-xs line-clamp-2 mb-6 font-medium leading-relaxed">{recipe.description}</p>
                    
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setInitialMode('plan');
                            setSelectedRecipe(recipe);
                        }}
                        className="w-full py-3 bg-gray-50 text-teal-900 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-teal-900 hover:text-white transition-all active:scale-95 mt-auto border border-gray-100 flex items-center justify-center gap-2"
                    >
                        <CalendarPlus className="w-4 h-4" /> Planificar
                    </button>
                </div>
                </div>
            );
          })}
      </div>
      
      {/* Botón de Paginación */}
      {visibleCount < filteredRecipes.length && (
          <div className="flex justify-center pb-10">
              <button 
                onClick={() => setVisibleCount(prev => prev + 8)}
                className="bg-white text-teal-900 border border-gray-100 px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-sm hover:shadow-lg transition-all flex items-center gap-2"
              >
                  Ver más recetas <ChevronDown className="w-4 h-4" />
              </button>
          </div>
      )}

      {selectedRecipe && (
        <RecipeDetail 
            recipe={selectedRecipe} 
            pantry={pantry}
            userProfile={user} 
            initialMode={initialMode} 
            onClose={() => setSelectedRecipe(null)} 
            onAddToPlan={(servings, date, type) => { 
                onAddToPlan(selectedRecipe, servings, date, type); 
            }}
            onCookFinish={(used) => onCookFinish(used, selectedRecipe.id)} 
            onAddToShoppingList={(items) => { onAddToShoppingList(items); setSelectedRecipe(null); }}
        />
      )}
    </div>
  );
};
