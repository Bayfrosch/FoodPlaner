import { useState, useRef, useEffect } from 'react';
import { items as itemsApi, lists } from '../api';

interface ListItemWithCategoryProps {
  id: number;
  name: string;
  category: string | null;
  completed: boolean;
  listId: number;
  customCategories: string[];
  onToggle: (itemId: number, completed: boolean) => void;
  onDelete: (itemId: number) => void;
  onCategoryChange: () => void;
  onAddCategory: (categoryName: string) => void;
  onDeleteCategory: (categoryName: string) => void;
  isViewer?: boolean;
}

const DEFAULT_CATEGORIES: string[] = [];

export default function ListItemWithCategory({
  id,
  name,
  category,
  completed,
  listId,
  customCategories,
  onToggle,
  onDelete,
  onCategoryChange,
  onAddCategory,
  onDeleteCategory,
  isViewer = false,
}: ListItemWithCategoryProps) {
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [updatingCategory, setUpdatingCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Schließe Menü wenn außerhalb geklickt
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (buttonRef.current) {
        const isClickOnButton = buttonRef.current.contains(e.target as Node);
        const isClickOnMenu = (e.target as Node).nodeType === 1 && 
          (e.target as HTMLElement).closest('[data-category-menu]');
        
        if (!isClickOnMenu && !isClickOnButton && showCategoryMenu) {
          setShowCategoryMenu(false);
        }
      }
    };

    if (showCategoryMenu) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showCategoryMenu]);

  const handleCategorySelect = async (newCategory: string | null) => {
    setUpdatingCategory(true);
    try {
      await itemsApi.updateCategory(listId, id, newCategory);
      // Also sync the category mapping for this item name
      await lists.syncCategory(listId, name, newCategory);
      setShowCategoryMenu(false);
      setNewCategoryInput('');
      onCategoryChange();
    } catch (err) {
      console.error('Fehler beim Aktualisieren der Kategorie:', err);
    } finally {
      setUpdatingCategory(false);
    }
  };

  const handleAddNewCategory = async () => {
    if (!newCategoryInput.trim()) return;
    await handleCategorySelect(newCategoryInput.trim());
    onAddCategory(newCategoryInput.trim());
  };

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];
  const uniqueCategories = [...new Set(allCategories)];

  return (
    <li
      className="p-4 hover:bg-[#1a1a2e] flex items-center gap-4 transition-all group relative overflow-visible"
    >
      <label className="flex items-center gap-4 flex-1 cursor-pointer min-w-0">
        <div className="relative flex-shrink-0">
          <input
            type="checkbox"
            checked={completed}
            onChange={() => !isViewer && onToggle(id, completed)}
            disabled={isViewer}
            className="peer w-6 h-6 cursor-pointer appearance-none bg-[#1a1a2e] border-2 border-[#2d2d3f] rounded-lg checked:bg-gradient-to-br checked:from-purple-500 checked:to-purple-600 checked:border-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <span
            className={`block transition-all truncate ${
              completed ? 'text-gray-500 line-through' : 'text-gray-200'
            }`}
          >
            {name}
          </span>
          {category && (
            <span className="text-xs text-purple-400 block mt-1">{category}</span>
          )}
        </div>
      </label>

      {/* Category Button */}
      <div className="relative flex-shrink-0">
        <button
          ref={buttonRef}
          onClick={() => !isViewer && setShowCategoryMenu(!showCategoryMenu)}
          disabled={isViewer}
          className="p-2 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Kategorie ändern"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </button>

        {/* Category Menu - Fixed positioning to break out of overflow containers */}
        {showCategoryMenu && buttonRef.current && (() => {
          const rect = buttonRef.current.getBoundingClientRect();
          return (
            <div
              ref={menuRef}
              data-category-menu
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                top: `${rect.bottom + 8}px`,
                right: `${window.innerWidth - rect.right}px`,
              }}
              className="bg-[#1a1a2e] border border-[#2d2d3f] rounded-lg shadow-2xl z-50 min-w-40 max-h-64 overflow-y-auto"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCategorySelect(null);
                }}
                disabled={updatingCategory}
                className="w-full text-left px-4 py-2 text-gray-400 hover:text-white hover:bg-purple-500/10 transition-all text-sm border-b border-[#2d2d3f] disabled:opacity-50"
              >
                Keine Kategorie
              </button>
              {uniqueCategories.map((cat) => (
                <div key={cat} className="border-b border-[#2d2d3f] flex items-center group">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCategorySelect(cat);
                    }}
                    disabled={updatingCategory}
                    className={`flex-1 text-left px-4 py-2 transition-all text-sm disabled:opacity-50 ${
                      category === cat
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'text-gray-400 hover:text-white hover:bg-purple-500/10'
                    }`}
                  >
                    {cat}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (confirm(`Kategorie "${cat}" löschen?`)) {
                        onDeleteCategory(cat);
                      }
                    }}
                    className="text-red-400 hover:text-red-300 p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded transition-all mx-1"
                    title="Kategorie löschen"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                    </svg>
                  </button>
                </div>
              ))}
              <div className="px-4 py-3 border-t border-[#2d2d3f] bg-[#0a0a0f]">
                <input
                  type="text"
                  placeholder="Neue Kategorie"
                  value={newCategoryInput}
                  onChange={(e) => {
                    e.stopPropagation();
                    setNewCategoryInput(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') handleAddNewCategory();
                  }}
                  className="w-full bg-[#1a1a2e] border border-[#2d2d3f] rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddNewCategory();
                  }}
                  disabled={updatingCategory || !newCategoryInput.trim()}
                  className="w-full mt-2 px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-sm rounded transition-all disabled:opacity-50"
                >
                  Hinzufügen
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Delete Button */}
      <button
        onClick={() => !isViewer && onDelete(id)}
        disabled={isViewer}
        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Löschen"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </li>
  );
}
