import { useState, useEffect } from 'react';
import { recipes } from '../api';

interface RecipeItem {
  id?: number;
  name: string;
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (recipe) {
      setTitle(recipe.title);
      setDescription(recipe.description);
      setItems(recipe.items || []);
    } else {
      resetForm();
    }
  }, [recipe, isOpen]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setItems([]);
    setNewItemName('');
    setError('');
  };

  const handleAddItem = () => {
    if (newItemName.trim()) {
      setItems([...items, { name: newItemName }]);
      setNewItemName('');
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
        await recipes.update(recipe.id, title, description);
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
      <div className="bg-gradient-to-br from-[#14141f]/95 to-[#1a1a2e]/95 backdrop-blur-sm border border-purple-500/30 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6">
          {recipe ? 'Rezept bearbeiten' : 'Neues Rezept'}
        </h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-2xl mb-6 flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
              ✕
            </button>
          </div>
        )}

        {/* Title Input */}
        <div className="mb-6">
          <label className="block text-gray-300 text-sm font-medium mb-2">Rezeptname</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z.B. Spaghetti Carbonara"
            className="w-full px-4 py-3 bg-[#1a1a2e] border border-purple-500/30 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all"
          />
        </div>

        {/* Description Input */}
        <div className="mb-6">
          <label className="block text-gray-300 text-sm font-medium mb-2">Beschreibung</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beschreiben Sie das Rezept..."
            rows={4}
            className="w-full px-4 py-3 bg-[#1a1a2e] border border-purple-500/30 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all"
          />
        </div>

        {/* Items Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Zutaten</h3>

          {/* Add Item Input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
              placeholder="Zutat hinzufügen..."
              className="flex-1 px-4 py-3 bg-[#1a1a2e] border border-purple-500/30 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all"
            />
            <button
              onClick={handleAddItem}
              className="px-6 py-3 bg-purple-500/20 border border-purple-500/50 hover:bg-purple-500/30 text-purple-400 rounded-2xl font-medium transition-all"
            >
              + Hinzufügen
            </button>
          </div>

          {/* Items List */}
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex items-center justify-between bg-[#1a1a2e] border border-purple-500/20 rounded-2xl px-4 py-3">
                <span className="text-gray-300">{item.name}</span>
                <button
                  onClick={() => handleRemoveItem(index)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {items.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">Noch keine Zutaten hinzugefügt</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="flex-1 px-4 py-3 text-gray-300 bg-[#1a1a2e] border border-purple-500/20 hover:border-purple-500/50 hover:bg-[#14141f] rounded-2xl font-medium transition-all"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-3 text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 rounded-2xl font-bold transition-all shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60 hover:scale-[1.02] active:scale-95"
          >
            {saving ? 'Wird gespeichert...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}
