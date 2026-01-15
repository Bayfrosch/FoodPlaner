import { useState, useEffect } from 'react';
import { lists } from '@/api';

interface CategoryManagerProps {
  listId: number;
  categories: string[];
  onCategoriesReordered: (categories: string[]) => void;
  isViewer?: boolean;
}

export default function CategoryManager({
  listId,
  categories,
  onCategoriesReordered,
  isViewer = false,
}: CategoryManagerProps) {
  const [orderedCategories, setOrderedCategories] = useState<string[]>(categories);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setOrderedCategories(categories);
  }, [categories]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, category: string) => {
    setDraggedItem(category);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (!draggedItem) return;

    const draggedIndex = orderedCategories.indexOf(draggedItem);
    if (draggedIndex === dropIndex) {
      setDraggedItem(null);
      return;
    }

    const newCategories = [...orderedCategories];
    newCategories.splice(draggedIndex, 1);
    newCategories.splice(dropIndex, 0, draggedItem);

    setOrderedCategories(newCategories);
    setDraggedItem(null);

    // Save new order
    setSaving(true);
    setError('');
    try {
      await lists.updateCategoryOrder(listId, newCategories);
      onCategoriesReordered(newCategories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
      // Revert on error
      setOrderedCategories(categories);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm text-gray-400 font-medium">Kategorien sortieren</p>
        {orderedCategories.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Keine Kategorien vorhanden</p>
        ) : (
          <div className="space-y-2">
            {orderedCategories.map((category, index) => (
              <div
                key={category}
                draggable={!isViewer}
                onDragStart={(e) => !isViewer && handleDragStart(e, category)}
                onDragOver={handleDragOver}
                onDrop={(e) => !isViewer && handleDrop(e, index)}
                className={`
                  p-3 bg-[#1a1a2e] border border-[#2d2d3f] rounded-lg
                  flex items-center gap-3 transition-all
                  ${!isViewer ? 'cursor-move hover:border-purple-500/50 hover:bg-[#1e1e35]' : ''}
                  ${draggedItem === category ? 'opacity-50 border-purple-500' : ''}
                  ${isViewer ? 'opacity-60' : ''}
                `}
              >
                {!isViewer && (
                  <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 3h2v2H9V3zm0 4h2v2H9V7zm0 4h2v2H9v-2zm4-8h2v2h-2V3zm0 4h2v2h-2V7zm0 4h2v2h-2v-2z" />
                  </svg>
                )}
                <span className="text-gray-300 font-medium flex-1">{category}</span>
                {saving && draggedItem === category && (
                  <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-4">
        {isViewer ? 'Sie können Kategorien nicht sortieren' : 'Ziehen Sie Kategorien, um sie neu zu ordnen'}
      </p>
    </div>
  );
}
