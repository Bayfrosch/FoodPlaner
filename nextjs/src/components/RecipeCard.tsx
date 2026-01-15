import { useState } from 'react';
import { recipes } from '../api';

interface RecipeItem {
  id?: number;
  name: string;
}

interface Recipe {
  id: number;
  title: string;
  description: string;
  items: RecipeItem[];
}

interface RecipeCardProps {
  recipe: Recipe;
  shoppingLists: Array<{ id: number; title: string }>;
  onDelete: () => void;
  onEdit: (recipe: Recipe) => void;
}

export default function RecipeCard({ recipe, shoppingLists, onDelete, onEdit }: RecipeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Ensure items is always an array
  const items = recipe.items || [];

  const handleAddToList = async () => {
    if (!selectedListId) {
      setError('Bitte wählen Sie eine Liste aus');
      return;
    }

    setAdding(true);
    setError('');
    setSuccess('');

    try {
      await recipes.addToList(recipe.id, selectedListId);
      setSuccess(`${items.length} Zutat(en) hinzugefügt!`);
      setSelectedListId(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Hinzufügen');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`"${recipe.title}" wirklich löschen?`)) {
      try {
        await recipes.delete(recipe.id);
        onDelete();
      } catch (err) {
        console.error('Error deleting recipe:', err);
      }
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#14141f]/90 to-[#1a1a2e]/90 backdrop-blur-sm border border-purple-500/30 rounded-3xl p-6 shadow-lg hover:shadow-purple-500/20 transition-all">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-1">{recipe.title}</h3>
          <p className="text-gray-400 text-sm">{items.length} Zutat(en)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(recipe)}
            className="px-3 py-2 bg-blue-500/20 border border-blue-500/50 hover:bg-blue-500/30 text-blue-400 rounded-xl text-sm font-medium transition-all"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-2 bg-red-500/20 border border-red-500/50 hover:bg-red-500/30 text-red-400 rounded-xl text-sm font-medium transition-all"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Description */}
      {recipe.description && (
        <p className="text-gray-300 text-sm mb-4 line-clamp-2">{recipe.description}</p>
      )}

      {/* Items Preview / Expanded */}
      {!expanded && items.length > 0 && (
        <div className="mb-4">
          <div className="flex gap-2">
            {items.slice(0, 3).map((item, index) => (
              <span key={index} className="px-3 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full border border-purple-500/30">
                {item.name}
              </span>
            ))}
            {items.length > 3 && (
              <span className="px-3 py-1 bg-purple-500/10 text-purple-300 text-xs rounded-full">
                +{items.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {expanded && items.length > 0 && (
        <div className="mb-4 bg-[#1a1a2e]/50 rounded-2xl p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Zutaten:</h4>
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-gray-400 text-sm">
                <span className="text-purple-400 font-bold">-</span>
                {item.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toggle Expanded */}
      {items.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-purple-400 hover:text-purple-300 text-sm font-medium mb-4 transition-colors flex items-center gap-2"
        >
          <span className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>▼</span>
          {expanded ? 'Show less' : 'Show all'}
        </button>
      )}

      {/* Add to Shopping List Section */}
      {shoppingLists.length > 0 && (
        <div className="border-t border-purple-500/20 pt-4 mt-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-xl text-xs mb-3 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">Close</button>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-3 py-2 rounded-xl text-xs mb-3 flex items-center justify-between">
              <span>{success}</span>
              <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-300">Close</button>
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full px-4 py-2 bg-[#1a1a2e] border border-purple-500/30 hover:border-purple-500/60 rounded-xl text-sm text-gray-300 font-medium transition-all flex items-center justify-between group"
              >
                <span>
                  {selectedListId 
                    ? shoppingLists.find(l => l.id === selectedListId)?.title 
                    : 'Select a list...'}
                </span>
                <span className={`transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#14141f] border border-purple-500/40 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="max-h-64 overflow-y-auto">
                    {shoppingLists.length === 0 ? (
                      <div className="px-4 py-3 text-gray-400 text-sm text-center">
                        No lists available
                      </div>
                    ) : (
                      shoppingLists.map((list, index) => (
                        <button
                          key={list.id}
                          onClick={() => {
                            setSelectedListId(list.id);
                            setShowDropdown(false);
                          }}
                          className={`w-full px-4 py-3 text-left text-sm transition-all border-b border-purple-500/10 last:border-b-0 ${
                            selectedListId === list.id
                              ? 'bg-purple-500/30 text-purple-300 font-medium'
                              : 'text-gray-300 hover:bg-purple-500/20 hover:text-purple-300'
                          }`}
                          style={{
                            animation: `slideInUp 0.2s ease-out ${index * 30}ms both`
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">List</span>
                            <span>{list.title}</span>
                            {selectedListId === list.id && <span className="ml-auto text-purple-400 font-bold">Checked</span>}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleAddToList}
              disabled={!selectedListId || adding}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-green-500/30 hover:shadow-green-500/50 disabled:shadow-none flex items-center gap-2 active:scale-95"
            >
              <span className={adding ? 'animate-spin' : ''}>+</span>
              <span className="hidden sm:inline">{adding ? 'Adding...' : 'Add'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
