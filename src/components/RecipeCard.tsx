import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { recipes } from '../api';
import { parseLinks } from '@/lib/linkParser';
import ShareRecipeModal from './ShareRecipeModal';

interface RecipeItem {
  id?: number;
  name: string;
  count?: number;
}

interface Recipe {
  id: number;
  title: string;
  description: string;
  items: RecipeItem[];
  ownerId?: number;
  owner?: { id: number; username: string };
  collaborators?: Array<{ role: string }>;
}

interface RecipeCardProps {
  recipe: Recipe;
  shoppingLists: Array<{ id: number; title: string }>;
  onDelete: () => void;
  onEdit: (recipe: Recipe) => void;
  currentUserId?: number;
}

export default function RecipeCard({ recipe, shoppingLists, onDelete, onEdit, currentUserId }: RecipeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isOwner = currentUserId && (recipe.ownerId === currentUserId || recipe.owner?.id === currentUserId);
  const userRole = recipe.collaborators && recipe.collaborators.length > 0 ? recipe.collaborators[0].role : null;
  const canEdit = isOwner || userRole === 'editor';
  const canView = isOwner || userRole === 'viewer' || userRole === 'editor';

  // Ensure items is always an array
  const items = recipe.items || [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        dropdownButtonRef.current &&
        !dropdownButtonRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  // Update dropdown position when opened
  useEffect(() => {
    if (showDropdown && dropdownButtonRef.current) {
      const updatePosition = () => {
        if (!dropdownButtonRef.current) return;
        
        const rect = dropdownButtonRef.current.getBoundingClientRect();
        const dropdownHeight = 280; // max-h-64 = ~256px + padding
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        // If not enough space below but more space above, show above
        const showAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
        
        setDropdownPosition({
          top: showAbove ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
          left: rect.left,
          width: rect.width,
        });
      };

      updatePosition();

      // Update on scroll and resize
      const handleScrollOrResize = () => {
        updatePosition();
      };

      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [showDropdown]);

  // Initialize selected items to all items on first render
  const handleAddToList = async () => {
    if (!selectedListId) {
      setError('Bitte wählen Sie eine Liste aus');
      return;
    }

    const itemsToAdd = selectedItems.length > 0 ? selectedItems : items.map((_, idx) => idx);

    setAdding(true);
    setError('');
    setSuccess('');

    try {
      await recipes.addToList(recipe.id, selectedListId, itemsToAdd);
      setSuccess(`${itemsToAdd.length} Zutat(en) hinzugefügt!`);
      setSelectedListId(null);
      setSelectedItems([]);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Hinzufügen');
    } finally {
      setAdding(false);
    }
  };

  const toggleItemSelection = (index: number) => {
    setSelectedItems(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleDelete = async () => {
    if (window.confirm(`"${recipe.title}" wirklich löschen?`)) {
      setDeleting(true);
      try {
        await recipes.delete(recipe.id);
        onDelete();
      } catch (err) {
        console.error('Error deleting recipe:', err);
        setError(err instanceof Error ? err.message : 'Fehler beim Löschen des Rezepts');
        setDeleting(false);
      }
    }
  };

  const handleDropdownToggle = () => {
    if (!showDropdown && dropdownButtonRef.current) {
      const rect = dropdownButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }
    setShowDropdown(!showDropdown);
  };

  return (
    <>
      <div className="bg-gradient-to-br from-[#14141f]/90 to-[#1a1a2e]/90 backdrop-blur-sm border border-purple-500/30 rounded-3xl p-6 shadow-lg hover:shadow-purple-500/20 transition-all">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-1">{recipe.title}</h3>
            <div className="flex items-center gap-2">
              <p className="text-gray-400 text-sm">{items.length} Zutat(en)</p>
              {recipe.owner && !isOwner && (
                <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-full">
                  von {recipe.owner.username}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {isOwner && (
              <button
                onClick={() => setShowShareModal(true)}
                className="px-3 py-2 bg-purple-500/20 border border-purple-500/50 hover:bg-purple-500/30 text-purple-400 rounded-xl text-sm font-medium transition-all"
                title="Rezept teilen"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => onEdit(recipe)}
                className="px-3 py-2 bg-blue-500/20 border border-blue-500/50 hover:bg-blue-500/30 text-blue-400 rounded-xl text-sm font-medium transition-all"
              >
                Edit
              </button>
            )}
            {isOwner && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-2 bg-red-500/20 border border-red-500/50 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-red-400 rounded-xl text-sm font-medium transition-all"
              >
                {deleting ? 'Wird gelöscht...' : 'Delete'}
              </button>
            )}
          </div>
        </div>

      {/* Description */}
      {recipe.description && (
        <div>
          <div className={`text-gray-300 text-sm mb-2 whitespace-pre-wrap ${!descriptionExpanded ? 'line-clamp-2' : ''}`}>
            {parseLinks(recipe.description).map((part, index) => 
              part.type === 'link' ? (
                <a
                  key={index}
                  href={part.content.startsWith('www.') ? `https://${part.content}` : part.content}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {part.content}
                </a>
              ) : (
                <span key={index}>{part.content}</span>
              )
            )}
          </div>
          {recipe.description.split('\n').length > 2 && (
            <button
              onClick={() => setDescriptionExpanded(!descriptionExpanded)}
              className="text-purple-400 hover:text-purple-300 text-xs font-medium mb-4 transition-colors"
            >
              {descriptionExpanded ? 'weniger' : 'mehr'}
            </button>
          )}
        </div>
      )}

      {/* Items Preview / Expanded */}
      {!expanded && items.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {items.slice(0, 3).map((item, index) => {
              const isSelected = selectedItems.length === 0 || selectedItems.includes(index);
              return (
                <button
                  key={index}
                  onClick={() => toggleItemSelection(index)}
                  className={`px-3 py-1 text-xs rounded-full border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30'
                      : 'bg-gray-800/30 text-gray-500 border-gray-600/30 hover:bg-gray-800/50'
                  }`}
                  title={isSelected ? 'Click to deselect' : 'Click to select'}
                >
                  {item.name}
                </button>
              );
            })}
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
            {items.map((item, index) => {
              const isSelected = selectedItems.length === 0 || selectedItems.includes(index);
              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 text-sm p-2 rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                      : 'bg-gray-800/30 text-gray-500 hover:bg-gray-800/50'
                  }`}
                  onClick={() => toggleItemSelection(index)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleItemSelection(index)}
                    className="w-4 h-4 cursor-pointer accent-purple-500"
                  />
                  <span className={`font-bold ${isSelected ? 'text-purple-400' : 'text-gray-600'}`}>-</span>
                  <span>{item.name}</span>
                </div>
              );
            })}
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
                ref={dropdownButtonRef}
                onClick={handleDropdownToggle}
                className="w-full px-4 py-2 bg-[#1a1a2e] border border-purple-500/30 hover:border-purple-500/60 rounded-xl text-sm text-gray-300 font-medium transition-all flex items-center justify-between group"
              >
                <span>
                  {selectedListId 
                    ? shoppingLists.find(l => l.id === selectedListId)?.title 
                    : 'Select a list...'}
                </span>
                <span className={`transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`}>▼</span>
              </button>
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

      {/* Dropdown Portal */}
      {showDropdown && dropdownButtonRef.current && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed bg-[#14141f] border border-purple-500/40 rounded-2xl shadow-2xl z-[9999] overflow-hidden backdrop-blur-sm animate-in fade-in duration-200"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            maxHeight: 'min(16rem, calc(100vh - 16px))',
          }}
        >
                  <div className="max-h-full overflow-y-auto overscroll-contain">
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
        </div>,
        document.body
      )}
    </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareRecipeModal
          recipeId={recipe.id}
          recipeOwnerId={recipe.ownerId || recipe.owner?.id || 0}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  );
}
