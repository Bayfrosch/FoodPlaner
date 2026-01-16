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
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setOrderedCategories(categories);
  }, [categories]);

  const moveCategory = async (index: number, direction: 'up' | 'down') => {
    if (isViewer) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= orderedCategories.length) return;

    const newCategories = [...orderedCategories];
    const [movedItem] = newCategories.splice(index, 1);
    newCategories.splice(newIndex, 0, movedItem);

    setOrderedCategories(newCategories);
    setSaving(movedItem);
    setError('');

    try {
      await lists.updateCategoryOrder(listId, newCategories);
      onCategoriesReordered(newCategories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
      // Revert on error
      setOrderedCategories(categories);
    } finally {
      setSaving(null);
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
          <div className="space-y-2" ref={containerRef}>
            {orderedCategories.map((category, index) => (
              <div
                key={category}
                draggable={!isViewer}
                onDragStart={(e) => !isViewer && handleDragStart(e, category)}
                onDragOver={handleDragOver}
                onDrop={(e) => !isViewer && handleDrop(e, index)}
                onTouchStart={(e) => handleTouchStart(e, category)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`
                  p-3 bg-[#1a1a2e] border border-[#2d2d3f] rounded-lg
                  flex items-center gap-3 transition-all
                  ${!isViewer ? 'cursor-move hover:border-purple-500/50 hover:bg-[#1e1e35] touch-none' : ''}
                  ${draggedItem === category ? 'opacity-50 border-purple-500 scale-105 shadow-lg shadow-purple-500/20' : ''}
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
>
            {orderedCategories.map((category, index) => (
              <div
                key={category}
                className={`
                  p-3 bg-[#1a1a2e] border border-[#2d2d3f] rounded-lg
                  flex items-center gap-3 transition-all
                  ${isViewer ? 'opacity-60' : 'hover:border-purple-500/50 hover:bg-[#1e1e35]'}
                `}
              >
                <span className="text-gray-300 font-medium flex-1">{category}</span>
                {!isViewer && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveCategory(index, 'up')}
                      disabled={index === 0 || saving === category}
                      className="p-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Nach oben"
                    >
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveCategory(index, 'down')}
                      disabled={index === orderedCategories.length - 1 || saving === category}
                      className="p-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Nach unten"
                    >
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                )}
                {saving === category && (
                  <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-4">
        {isViewer ? 'Sie können Kategorien nicht sortieren' : 'Verwenden Sie die Pfeile, um Kategorien