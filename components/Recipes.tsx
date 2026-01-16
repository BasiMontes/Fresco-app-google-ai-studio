
import React, { useState, useMemo, useEffect } from 'react';
import { Recipe, UserProfile, PantryItem, ShoppingItem, MealCategory } from '../types';
import { Search, Sparkles, Clock, Users, Flame, PackageCheck, Zap, X, Heart, Eye, ImageOff, Wand2, Leaf, WifiOff, CheckCircle2, ChevronDown, CalendarPlus, BookX, FilterX, ChefHat, Play, PlusCircle } from 'lucide-react';
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
  favoriteIds?: string[];
  onToggleFavorite?: (id: string) => void;
}

const ITEMS_PER_PAGE = 16;

const RecipeSkeleton = () => (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex flex-col h-full min-h-[280px]">
        <div className="aspect-[3/2] w-full skeleton-bg relative" />
        <div className="p-4 flex-1 flex flex-col gap-2">
            <div className="w-16 h-3 rounded-md skeleton-bg" />
            <div className="w-full h-4 rounded-md skeleton-bg" />
            <div className="w-2/3 h-4 rounded-md skeleton-bg" />
        </div>
    </div>
);

export const Recipes: React.FC<RecipesProps> = ({ 
    recipes, user, pantry, onAddRecipes, onAddToPlan, onCookFinish, 
    onAddToShoppingList, isOnline = true, initialRecipeId,
    favoriteIds = [], onToggleFavorite
}) => {
  const [loadingAI, setLoadingAI] = useState(false);
  const [initialMode, setInitialMode] = useState<'view' | 'plan'>('view');
  const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem('recipes_search') || '');
  const [activeCategory, setActiveCategory] = useState<string>(() => sessionStorage.getItem('recipes_category') || 'all');
  const [showOnlyCookable, setShowOnlyCookable] = useState(() => sessionStorage.getItem('recipes_cookable') === 'true');
  const [visibleCount, setVisibleCount] = useState(() => parseInt(sessionStorage.getItem('recipes_count') || String(ITEMS_PER_PAGE))); 
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
      sessionStorage.setItem('recipes_search', searchTerm);
      sessionStorage.setItem('recipes_category', activeCategory);
      sessionStorage.setItem('recipes_cookable', String(showOnlyCookable));
      sessionStorage.setItem('recipes_count', String(visibleCount));
  }, [searchTerm, activeCategory, showOnlyCookable, visibleCount]);

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

  const filteredRecipes = useMemo(() => {
    let result = recipes.filter(r => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = r.title.toLowerCase().includes(searchLower) || r.cuisine_type.toLowerCase().includes(searchLower) || r.ingredients.some(i => i.name.toLowerCase().includes(searchLower));
        const matchesCategory = activeCategory === 'all' || r.meal_category === activeCategory;
        const stock = checkPantryStock(r);
        const isCookable = !showOnlyCookable || (stock.count / stock.total >= 0.6); 
        
        let matchesDiet = true;
        if (user.dietary_preferences.length > 0 && !user.dietary_preferences.includes('none')) {
            for (const pref of user.dietary_preferences) {
                if (pref === 'vegetarian') {
                    if (!r.dietary_tags.includes('vegetarian') && !r.dietary_tags.includes('vegan')) matchesDiet = false;
                }
                else {
                    if (!r.dietary_tags.includes(pref)) matchesDiet = false;
                }
            }
        }
        return matchesSearch && matchesCategory && isCookable && matchesDiet;
    });
    return result;
  }, [recipes, searchTerm, activeCategory, showOnlyCookable, pantry, user.dietary_preferences]);

  return (
    <div className="space-y-6 animate-fade-in pb-48">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-xl font-black text-teal-900 tracking-tight leading-none mb-1">Biblioteca</h1>
          <p className="text-gray-400 font-bold uppercase text-[10px] md:text-[9px] tracking-widest">Inspiración basada en tu stock</p>
        </div>
        
        <div className="flex gap-2">
            <button
                onClick={() => alert("Función 'Crear Manualmente' próximamente.")}
                className="flex items-center justify-center gap-2 bg-white text-teal-900 border border-teal-100 px-4 py-2 rounded-xl font-black text-xs md:text-[9px] uppercase tracking-widest hover:bg-teal-50 transition-all"
            >
                <PlusCircle className="w-4 h-4" /> <span className="hidden md:inline">Crear Propia</span>
            </button>

            <button
            onClick={handleGenerate}
            disabled={loadingAI || !isOnline}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-teal-900 text-white px-6 py-3 md:py-2 md:px-4 rounded-xl shadow-lg hover:bg-teal-800 transition-all disabled:opacity-50 font-black text-xs md:text-[9px] uppercase tracking-widest active:scale-95 group disabled:bg-gray-400"
            >
            {isOnline ? <><Sparkles className={`w-4 h-4 md:w-3 md:h-3 text-orange-400 ${loadingAI ? 'animate-spin' : ''}`} /> Generar con IA</> : <><WifiOff className="w-4 h-4" /> Offline</>}
            </button>
        </div>
      </header>

      <div className="space-y-3">
          <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4 group-focus-within:text-teal-600 transition-colors" />
              <input
                  type="text"
                  placeholder="Buscar receta, ingrediente..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setVisibleCount(ITEMS_PER_PAGE); }}
                  className="w-full pl-10 pr-4 py-3 md:py-2 rounded-full bg-white border border-gray-100 focus:border-teal-500 focus:outline-none text-sm md:text-xs shadow-sm focus:shadow-md transition-all font-bold placeholder-gray-300"
              />
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
              <div className="bg-white p-1 rounded-xl flex gap-1 shadow-sm border border-gray-100 overflow-x-auto no-scrollbar max-w-full">
                  {['all', 'breakfast', 'lunch', 'dinner'].map(cat => (
                      <button
                      key={cat}
                      onClick={() => { setActiveCategory(cat); setVisibleCount(ITEMS_PER_PAGE); }}
                      className={`px-4 py-1.5 md:px-3 md:py-1 rounded-lg whitespace-nowrap capitalize font-black text-[10px] md:text-[9px] tracking-widest transition-all ${
                          activeCategory === cat 
                          ? 'bg-teal-900 text-white shadow-sm' 
                          : 'text-gray-400 hover:text-teal-600 hover:bg-gray-50'
                      }`}
                      >
                      {cat === 'all' ? 'Todo' : cat === 'breakfast' ? 'Desayuno' : cat === 'lunch' ? 'Comida' : 'Cena'}
                      </button>
                  ))}
              </div>
              
              <button 
                  onClick={() => { setShowOnlyCookable(!showOnlyCookable); setVisibleCount(ITEMS_PER_PAGE); }}
                  className={`px-4 py-2 md:py-1.5 rounded-xl font-black text-[10px] md:text-[9px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm border ${
                      showOnlyCookable ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:bg-teal-50 hover:text-teal-900'
                  }`}
              >
                  <Zap className={`w-3 h-3 ${showOnlyCookable ? 'fill-white' : ''}`} />
                  Cocinar Ya
              </button>
          </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-4 auto-rows-fr">
          {loadingAI && <><RecipeSkeleton /><RecipeSkeleton /><RecipeSkeleton /><RecipeSkeleton /></>}
          {!loadingAI && filteredRecipes.slice(0, visibleCount).map((recipe) => {
            const stock = checkPantryStock(recipe);
            const compatibility = Math.round((stock.count / stock.total) * 100);
            const isHighMatch = compatibility >= 80;
            const isFav = favoriteIds.includes(recipe.id);

            return (
                <div 
                    key={recipe.id} 
                    onClick={() => { setInitialMode('view'); setSelectedRecipe(recipe); }}
                    className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer relative h-full min-h-[280px] animate-fade-in"
                >
                    {isHighMatch && (
                        <div className="absolute top-2 left-2 z-20 bg-green-500 text-white text-[9px] font-black px-2 py-1 rounded-full shadow-lg border border-white/20 flex items-center gap-1">
                            <PackageCheck className="w-3 h-3" /> {compatibility}%
                        </div>
                    )}

                    <div className="relative aspect-[3/2] overflow-hidden bg-gray-100 flex-shrink-0">
                        <SmartImage 
                            src={recipe.image_url} 
                            alt={recipe.title} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onToggleFavorite) onToggleFavorite(recipe.id);
                            }}
                            className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-md z-10 hover:scale-110 transition-transform"
                        >
                            <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                        </button>
                    </div>
                    
                    <div className="p-3 flex-1 flex flex-col">
                        <h3 className="text-sm md:text-xs font-bold text-gray-900 leading-tight mb-2 line-clamp-2 group-hover:text-teal-700 transition-colors">
                            {recipe.title}
                        </h3>
                        <div className="mt-auto flex items-center gap-2 pt-2 border-t border-gray-50">
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 truncate max-w-[80px]">
                                {recipe.cuisine_type}
                            </span>
                            <div className="flex-1" />
                            <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setInitialMode('plan');
                                    setSelectedRecipe(recipe);
                                }}
                                className="w-8 h-8 md:w-7 md:h-7 bg-teal-50 text-teal-700 rounded-lg flex items-center justify-center hover:bg-teal-900 hover:text-white transition-all active:scale-90 flex-shrink-0"
                            >
                                <CalendarPlus className="w-4 h-4 md:w-3.5 md:h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            );
          })}
      </div>
      
      {/* Redesigned Load More Button */}
      {visibleCount < filteredRecipes.length && (
          <div className="flex justify-center pt-8 animate-fade-in">
              <button 
                onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
                className="group flex items-center gap-5 px-10 py-5 bg-white border border-gray-100 rounded-[2rem] shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
              >
                  <div className="flex flex-col text-left">
                      <span className="fresco-label !text-teal-900 !text-[10px] mb-1">Cargar más inspiración</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Explorado {visibleCount} de {filteredRecipes.length}</span>
                  </div>
                  <div className="w-10 h-10 bg-teal-900 rounded-2xl flex items-center justify-center text-white group-hover:rotate-180 transition-transform duration-700">
                      <ChevronDown className="w-5 h-5" />
                  </div>
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
            isFavorite={favoriteIds.includes(selectedRecipe.id)}
            onToggleFavorite={onToggleFavorite}
        />
      )}
    </div>
  );
};
