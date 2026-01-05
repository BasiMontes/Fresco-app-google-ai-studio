
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
  onAddToPlan: (recipe: Recipe, servings: number, date?: string, type?: MealCategory) => void;
  onCookFinish: (usedIngredients: { name: string, quantity: number }[], recipeId?: string) => void; 
  onAddToShoppingList: (items: ShoppingItem[]) => void;
  isOnline?: boolean;
  initialRecipeId?: string | null; 
}

const RecipeSkeleton = () => (
    <div className="bg-white rounded-3xl md:rounded-lg overflow-hidden border border-gray-100 shadow-sm flex flex-col h-auto">
        <div className="h-48 md:h-20 w-full skeleton-bg relative">
            <div className="absolute top-4 left-4 w-16 h-6 rounded-xl bg-white/50" />
        </div>
        <div className="p-6 md:p-1.5 flex-1 flex flex-col gap-3 md:gap-1">
            <div className="w-20 h-4 rounded-lg skeleton-bg" />
            <div className="w-full h-6 rounded-lg skeleton-bg" />
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
  const [visibleCount, setVisibleCount] = useState(() => parseInt(sessionStorage.getItem('recipes_count') || '14')); // Default 14
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
        if (newRecipes.length > 0) onAddRecipes(newRecipes);
    } catch (e) {
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
          if (newRecipes.length > 0) onAddRecipes(newRecipes);
      } catch (e) {
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
    let score = 0;
    // ... same logic ...
    return score;
  };

  const filteredRecipes = useMemo(() => {
    let result = recipes.filter(r => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = r.title.toLowerCase().includes(searchLower) || r.cuisine_type.toLowerCase().includes(searchLower) || r.ingredients.some(i => i.name.toLowerCase().includes(searchLower));
        const matchesCategory = activeCategory === 'all' || r.meal_category === activeCategory;
        const stock = checkPantryStock(r);
        const isCookable = !showOnlyCookable || (stock.count / stock.total >= 0.6); 
        return matchesSearch && matchesCategory && isCookable;
    });
    if (sortByZeroWaste) result = result.sort((a, b) => getExpiryScore(b) - getExpiryScore(a));
    return result;
  }, [recipes, searchTerm, activeCategory, showOnlyCookable, sortByZeroWaste, pantry]);

  return (
    <div className="space-y-4 md:space-y-2 animate-fade-in pb-48">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-2">
        <div>
          <h1 className="text-3xl md:text-xl font-black text-teal-900 tracking-tight leading-none mb-1">Biblioteca</h1>
          <p className="text-gray-400 font-bold uppercase text-[10px] md:text-[8px] tracking-widest">Inspiración basada en tu stock</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loadingAI || !isOnline}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-teal-900 text-white px-6 py-3 md:py-1.5 md:px-4 rounded-full shadow-lg hover:bg-teal-800 transition-all disabled:opacity-50 font-black text-xs md:text-[9px] uppercase tracking-widest active:scale-95 group disabled:bg-gray-400"
        >
          {isOnline ? <><Sparkles className={`w-4 h-4 md:w-3 md:h-3 text-orange-400 ${loadingAI ? 'animate-spin' : ''}`} /> Inspiración IA</> : <><WifiOff className="w-4 h-4" /> Offline</>}
        </button>
      </header>

      {/* Controles solo si hay recetas en la BD o estamos buscando */}
      {(recipes.length > 0 || searchTerm) && (
        <div className="space-y-4 md:space-y-2">
            <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 md:w-3 md:h-3 group-focus-within:text-teal-600 transition-colors" />
            <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-6 py-3 md:py-1.5 md:pl-10 rounded-full bg-white border border-gray-100 focus:border-teal-500 focus:outline-none text-sm md:text-xs shadow-sm focus:shadow-lg transition-all font-bold placeholder-gray-300"
            />
            </div>
            
            {/* Filtros más compactos */}
            <div className="flex flex-wrap gap-2 md:gap-1 items-center">
            <div className="bg-white p-1.5 md:p-1 rounded-full flex gap-1 shadow-sm border border-gray-100 overflow-x-auto no-scrollbar max-w-full">
                {['all', 'breakfast', 'lunch', 'dinner'].map(cat => (
                    <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-5 py-2 md:px-3 md:py-1 rounded-full whitespace-nowrap capitalize font-black text-[10px] md:text-[8px] tracking-widest transition-all ${
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
                className={`px-5 py-2.5 md:px-3 md:py-1 rounded-full font-black text-[10px] md:text-[8px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm border ${
                    showOnlyCookable ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:bg-teal-50 hover:text-teal-900'
                }`}
            >
                <Zap className={`w-3 h-3 md:w-2 md:h-2 ${showOnlyCookable ? 'fill-white' : ''}`} />
                Cocinar Ya
            </button>
            </div>
        </div>
      )}

      {/* Grid de Contenido Ultra Compacto */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-6 md:gap-2">
          
          {loadingAI && <><RecipeSkeleton /><RecipeSkeleton /><RecipeSkeleton /></>}

          {!loadingAI && filteredRecipes.slice(0, visibleCount).map((recipe) => {
            const stock = checkPantryStock(recipe);
            const compatibility = Math.round((stock.count / stock.total) * 100);

            return (
                <div 
                    key={recipe.id} 
                    onClick={() => { setInitialMode('view'); setSelectedRecipe(recipe); }}
                    className="bg-white rounded-3xl md:rounded-lg overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group cursor-pointer"
                >
                <div className="relative h-48 md:h-20 overflow-hidden bg-gray-100 flex items-center justify-center">
                    <SmartImage 
                        src={recipe.image_url} 
                        alt={recipe.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                    
                    <div className="absolute bottom-2 left-2 right-2 z-20">
                        <div className="bg-white/20 backdrop-blur-md rounded-md p-1 flex items-center justify-between text-white border border-white/30 shadow-lg">
                            <div className="flex items-center gap-1">
                                <PackageCheck className={`w-3 h-3 ${compatibility === 100 ? 'text-green-300' : 'text-orange-300'}`} />
                                <div className="text-[8px] font-black uppercase tracking-widest">{compatibility}%</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="p-6 md:p-1.5 flex-1 flex flex-col">
                    <div className="flex items-center justify-between gap-2 mb-3 md:mb-0.5">
                        <span className="text-[8px] md:text-[6px] font-black uppercase tracking-widest text-teal-600 bg-teal-50 px-2 py-1 md:px-1 md:py-0.5 rounded-lg border border-teal-100 truncate max-w-[60px]">{recipe.cuisine_type}</span>
                    </div>
                    
                    <h3 className="text-xl md:text-[9px] font-black text-gray-900 mb-2 md:mb-1 line-clamp-2 leading-tight tracking-tight group-hover:text-teal-700 transition-colors">{recipe.title}</h3>
                    
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setInitialMode('plan');
                            setSelectedRecipe(recipe);
                        }}
                        className="w-full py-3 md:py-1 bg-gray-50 text-teal-900 rounded-xl md:rounded-md font-black text-xs md:text-[8px] uppercase tracking-widest hover:bg-teal-900 hover:text-white transition-all active:scale-95 mt-auto border border-gray-100 flex items-center justify-center gap-1"
                    >
                        <CalendarPlus className="w-4 h-4 md:w-2 md:h-2" />
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
                onClick={() => setVisibleCount(prev => prev + 14)}
                className="bg-white text-teal-900 border border-gray-100 px-8 py-3 md:py-1 md:px-4 rounded-full font-black text-xs md:text-[9px] uppercase tracking-widest shadow-sm hover:shadow-lg transition-all flex items-center gap-2"
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
