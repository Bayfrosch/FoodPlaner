import { useEffect, useState } from 'react';
import { recipes } from '../api';
import RecipeCard from '../components/RecipeCard';
import RecipeModal from '../components/RecipeModal';

interface Recipe {
  id: number;
  title: string;
  description: string;
  items: Array<{ id?: number; name: string }>;
}

interface ShoppingList {
  id: number;
  title: string;
}

interface RecipesPageProps {
  shoppingLists: ShoppingList[];
}

export default function RecipesPage({ shoppingLists }: RecipesPageProps) {
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | undefined>(undefined);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await recipes.getAll();
      setAllRecipes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Rezepte');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (recipe?: Recipe) => {
    setSelectedRecipe(recipe);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedRecipe(undefined);
  };

  const handleSaveRecipe = () => {
    handleCloseModal();
    fetchRecipes();
  };

  const handleDeleteRecipe = () => {
    fetchRecipes();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Lädt Rezepte...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Meine Rezepte</h2>
          <p className="text-gray-400">{allRecipes.length} Rezept(e) verfügbar</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-purple-500/40 hover:scale-[1.02] active:scale-95"
        >
          + Neues Rezept
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-2xl mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
            ✕
          </button>
        </div>
      )}

      {/* Recipes Grid */}
      {allRecipes.length === 0 ? (
        <div className="bg-gradient-to-br from-[#14141f]/50 to-[#1a1a2e]/50 border border-purple-500/20 rounded-3xl p-12 text-center">
          <svg className="w-16 h-16 text-purple-500/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m0 0h6m-6-6h6m0 0h6M6 12h6m0 0h6" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-300 mb-2">Noch keine Rezepte</h3>
          <p className="text-gray-400 mb-6">Erstellen Sie Ihr erstes Rezept, um es später zu Ihren Einkaufslisten hinzuzufügen</p>
          <button
            onClick={() => handleOpenModal()}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-2xl font-bold transition-all"
          >
            Rezept erstellen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              shoppingLists={shoppingLists}
              onDelete={handleDeleteRecipe}
              onEdit={handleOpenModal}
            />
          ))}
        </div>
      )}

      {/* Recipe Modal */}
      <RecipeModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveRecipe}
        recipe={selectedRecipe}
      />
    </div>
  );
}
