import { useState, useEffect } from 'react';
import { recipes } from '../api';

interface RecipeItem {
  id?: number;
  name: string;
  category?: string;
}

interface RecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  recipe?: {
    id: number;
    title: string;
    description: string;
    items: RecipeItem[];
  };
}

export default function RecipeModal({ isOpen, onClose, onSave, recipe }: RecipeModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<RecipeItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [currentRecipeId, setCurrentRecipeId] = useState<number | undefined>();

  useEffect(() => {
    if (recipe && recipe.id !== currentRecipeId) {
      setCurrentRecipeId(recipe.id);
      setTitle(recipe.title);
      setDescription(recipe.description);
      setItems(recipe.items || []);
      // Sammle Kategorien aus existierenden Items
      const cats = recipe.items
        ?.filter(item => item.category)
        .map(item => item.category!)
        .filter((cat, idx, self) => self.indexOf(cat) === idx) || [];
      setCustomCategories(cats);
    } else if (!recipe && isOpen) {
      resetForm();
    }
  }, [recipe?.id, isOpen]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setItems([]);
    setNewItemName('');
    setNewItemCategory('');
    setError('');
  };

  const handleAddItem = () => {
    if (newItemName.trim()) {
      const newItem = { name: newItemName, category: newItemCategory || undefined };
      setItems([...items, newItem]);
      setNewItemName('');
      setNewItemCategory('');
    } else {
      setError('Bitte einen Zutatnamen eingeben');
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setError('');

    if (!title.trim()) {
      setError('Rezeptname ist erforderlich');
      return;
    }

    if (items.length === 0) {
      setError('Mindestens ein Zutat ist erforderlich');
      return;
    }

    setSaving(true);
    try {
      if (recipe) {
        await recipes.update(recipe.id, title, description, items);
      } else {
        await recipes.create(title, description, items);
      }
      onSave();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-[#14141f]/95 to-[#1a1a2e]/95 backdrop-blur-sm border border-purple-500/30 rounded-3xl p-4 md:p-8 max-w-2xl w-full max-h-[95vh] md:max-h-[90vh] overflow-y-auto shadow-2xl">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">
          {recipe ? 'Rezept bearbeiten' : 'Neues Rezept'}
        </h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 md:px-4 py-3 rounded-2xl mb-4 md:mb-6 flex items-center justify-between text-sm md:text-base">
            <span className="text-xs md:text-sm">{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
              Close
            </button>
          </div>
        )}

        {/* Title Input */}
        <div className="mb-4 md:mb-6">
          <label className="block text-gray-300 text-xs md:text-sm font-medium mb-2">Rezeptname</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z.B. Spaghetti Carbonara"
            className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base bg-[#1a1a2e] border border-purple-500/30 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all"
          />
        </div>

        {/* Description Input */}
        <div className="mb-4 md:mb-6">
          <label className="block text-gray-300 text-xs md:text-sm font-medium mb-2">Beschreibung</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beschreiben Sie das Rezept..."
            rows={4}
            className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base bg-[#1a1a2e] border border-purple-500/30 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all"
          />
        </div>

        {/* Items Section */}
        <div className="mb-4 md:mb-6">
          <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Zutaten</h3>

          {/* Add Item Input */}
          <div className="flex flex-col gap-2 mb-3 md:mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                placeholder="Zutat hinzufügen..."
                className="flex-1 px-3 md:px-4 py-2 md:py-3 text-sm md:text-base bg-[#1a1a2e] border border-purple-500/30 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all"
              />
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 md:px-6 py-2 md:py-3 text-sm md:text-base bg-purple-500/20 border border-purple-500/50 hover:bg-purple-500/30 text-purple-400 rounded-2xl font-medium transition-all whitespace-nowrap flex-shrink-0"
              >
                + Hinzufügen
              </button>
            </div>
            <input
              type="text"
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value)}
              placeholder="Kategorie wählen oder eingeben..."
              list="categoryList"
              className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base bg-[#1a1a2e] border border-purple-500/30 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all"
            />
            <datalist id="categoryList">
              {customCategories.map(cat => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          {/* Items List */}
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex items-center justify-between bg-[#1a1a2e] border border-purple-500/20 rounded-2xl px-3 md:px-4 py-2 md:py-3">
                <div className="flex-1 min-w-0">
                  <span className="text-gray-300 text-sm md:text-base break-words">{item.name}</span>
                  {item.category && (
                    <div className="text-xs text-purple-400 mt-1">{item.category}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all flex-shrink-0 ml-2 px-2 py-1 rounded"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {items.length === 0 && (
            <p className="text-gray-400 text-xs md:text-sm text-center py-4">Noch keine Zutaten hinzugefügt</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col md:flex-row gap-3">
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="flex-1 px-4 py-2 md:py-3 text-sm md:text-base text-gray-300 bg-[#1a1a2e] border border-purple-500/20 hover:border-purple-500/50 hover:bg-[#14141f] rounded-2xl font-medium transition-all"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 md:py-3 text-sm md:text-base text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 rounded-2xl font-bold transition-all shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60 hover:scale-[1.02] active:scale-95"
          >
            {saving ? 'Wird gespeichert...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}
