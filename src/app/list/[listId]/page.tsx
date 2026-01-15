'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { items as itemsApi, lists, auth, collaborators } from '@/api';
import { sseService } from '@/services/sse';
import ShareListModal from '@/components/ShareListModal';
import ListItemWithCategory from '@/components/ListItemWithCategory';

interface Item {
    id: number;
    name: string;
    category: string | null;
    completed: boolean;
    created_at: string;
}

interface List {
    id: number;
    title: string;
    description: string;
}

interface UserRole {
    isOwner: boolean;
    isEditor: boolean;
    isViewer: boolean;
}

interface Collaborator {
    id: number;
    userId: number;
    role: string;
    status: string;
    user: {
        id: number;
        username: string;
    };
}

export default function ListDetailPage() {
    const router = useRouter();
    const params = useParams();
    const listId = params?.listId as string;
    
    const [list, setList] = useState<List | null>(null);
    const [items, setItems] = useState<Item[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showShareModal, setShowShareModal] = useState(false);
    const [customCategories, setCustomCategories] = useState<string[]>([]);
    const [isClient, setIsClient] = useState(false);
    const [userRole, setUserRole] = useState<UserRole>({ isOwner: false, isEditor: true, isViewer: false });
    const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
    const [savingCategoryOrder, setSavingCategoryOrder] = useState(false);
    const [currentUserCollaborator, setCurrentUserCollaborator] = useState<Collaborator | null>(null);
    const [userId, setUserId] = useState<number | null>(null);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient || !listId) return;
        fetchData();

        // Subscribe to SSE updates for this list
        const listIdNum = Number(listId);
        const unsubscribe = sseService.subscribe(listIdNum, (message) => {
            // Handle category updates without full refresh
            if (message.type === 'category_updated') {
                console.log(`Category updated for item: ${message.itemName} -> ${message.category}`);
                // Add category to list if it's new
                setCustomCategories(prev => {
                    if (message.category && !prev.includes(message.category)) {
                        return [...prev, message.category].sort();
                    }
                    return prev;
                });
            } else if (message.type !== 'connected') {
                // For other updates, refresh data
                console.log(`List ${listId} updated - refreshing data`);
                fetchData();
            }
        });

        return () => {
            unsubscribe();
        };
    }, [listId, isClient]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const listId_num = Number(listId)

            const listData = await lists.getById(listId_num);
            setList(listData);

            // Fetch user info to determine role
            try {
                const me = await auth.me();
                if (me) {
                    setUserId(me.id);
                    const collabs = await collaborators.getAll(listId_num);
                    const isOwner = listData.ownerId === me.id;
                    const collaborator = collabs?.find((c: any) => c.userId === me.id);
                    setCurrentUserCollaborator(collaborator || null);
                    const isEditor = collaborator?.role === 'editor';
                    const isViewer = collaborator?.role === 'viewer' || (!isOwner && collaborator?.role !== 'editor');
                    
                    setUserRole({ isOwner, isEditor, isViewer });
                }
            } catch (err) {
                console.log('Could not fetch user role, assuming editor');
                setUserRole({ isOwner: false, isEditor: true, isViewer: false });
            }

            const itemsData = await itemsApi.getAll(listId_num);
            setItems(itemsData);
            
            // Lade alle persistenten Kategorien von diesem List
            try {
                const categories = await lists.getCategories(listId_num);
                setCustomCategories(categories);
            } catch (err) {
                // Falls Fehler beim Laden der Kategorien, nutze die aus den Items
                const categories = itemsData
                    .filter((item: any) => item.category)
                    .map((item: any) => item.category)
                    .filter((cat: string, index: number, self: string[]) => self.indexOf(cat) === index);
                
                setCustomCategories(categories);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Fehler beim Laden';
            // Only show non-permission errors
            if (!errorMessage.includes('Forbidden')) {
                setError(errorMessage);
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveList = async () => {
        if (!listId || !currentUserCollaborator) return;

        if (!confirm('Möchtest du diese Liste wirklich verlassen?')) {
            return;
        }

        try {
            await collaborators.remove(Number(listId), currentUserCollaborator.id);
            router.push('/dashboard');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Fehler beim Verlassen der Liste';
            setError(errorMessage);
        }
    };

    const handleAcceptInvitation = async () => {
        if (!listId || !currentUserCollaborator) return;

        try {
            const updated = await collaborators.accept(Number(listId), currentUserCollaborator.id);
            setCurrentUserCollaborator(updated);
            setError('');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Fehler beim Akzeptieren der Einladung';
            setError(errorMessage);
        }
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName.trim() || !listId) return;

        if (userRole.isViewer) {
            setError('Du kannst dieser Liste keine Artikel hinzufügen (Viewer-Zugriff)');
            return;
        }

        try {
            await itemsApi.create(Number(listId), newItemName);
            setNewItemName('');
            fetchData();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Fehler beim Hinzufügen';
            if (errorMessage.includes('Forbidden')) {
                setError('Du darfst diese Liste nicht bearbeiten');
            } else {
                setError(errorMessage);
            }
        }
    };

    const handleToggleItem = async (itemId: number, completed: boolean) => {
        if (!listId) return;

        try {
            await itemsApi.update(Number(listId), itemId, !completed);
            fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fehler beim Aktualisieren');
        }
    };

    const handleDeleteItem = async (itemId: number) => {
        if (!listId) return;

        try {
            await itemsApi.delete(Number(listId), itemId);
            fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
        }
    };

    const handleAddCategory = (categoryName: string) => {
        if (!customCategories.includes(categoryName)) {
            setCustomCategories([...customCategories, categoryName]);
        }
    };

    const handleDeleteCategory = async (categoryName: string) => {
        if (!listId) return;

        try {
            await lists.deleteCategory(Number(listId), categoryName);
            setCustomCategories(customCategories.filter(cat => cat !== categoryName));
            fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fehler beim Löschen der Kategorie');
        }
    };

    const handleCategoryDragStart = (e: React.DragEvent<HTMLDivElement>, category: string) => {
        if (userRole.isViewer) return;
        setDraggedCategory(category);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleCategoryDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleCategoryDrop = async (e: React.DragEvent<HTMLDivElement>, targetCategory: string) => {
        e.preventDefault();
        if (!draggedCategory || draggedCategory === targetCategory || userRole.isViewer) {
            setDraggedCategory(null);
            return;
        }

        const draggedIndex = customCategories.indexOf(draggedCategory);
        const targetIndex = customCategories.indexOf(targetCategory);

        if (draggedIndex === -1 || targetIndex === -1) {
            setDraggedCategory(null);
            return;
        }

        const newCategories = [...customCategories];
        newCategories.splice(draggedIndex, 1);
        newCategories.splice(targetIndex, 0, draggedCategory);

        setCustomCategories(newCategories);
        setDraggedCategory(null);

        // Save to backend
        setSavingCategoryOrder(true);
        try {
            await lists.updateCategoryOrder(Number(listId), newCategories);
        } catch (err) {
            // Revert on error
            setCustomCategories(customCategories);
            setError(err instanceof Error ? err.message : 'Fehler beim Speichern der Kategorie-Reihenfolge');
        } finally {
            setSavingCategoryOrder(false);
        }
    };

    if (!list) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <p className="text-gray-400 text-lg">Liste nicht gefunden</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
            {/* Header */}
            <header className="bg-gradient-to-b from-[#14141f] to-transparent border-b border-[#2d2d3f]/50">
                <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
                    <div className="flex justify-between items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="inline-flex items-center gap-1 sm:gap-2 text-purple-400 hover:text-purple-300 text-xs sm:text-sm font-medium transition-all group flex-shrink-0"
                        >
                            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="hidden sm:inline">Zurück zu Listen</span>
                            <span className="sm:hidden">Zurück</span>
                        </button>
                        <div className="flex gap-1 sm:gap-3 flex-shrink-0">
                            {currentUserCollaborator && currentUserCollaborator.status === 'pending' && (
                                <button
                                    onClick={handleAcceptInvitation}
                                    className="inline-flex items-center gap-1 sm:gap-2 text-green-400 hover:text-green-300 text-xs sm:text-sm font-medium transition-all group"
                                    title="Einladung akzeptieren"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="hidden sm:inline">Akzeptieren</span>
                                </button>
                            )}
                            {currentUserCollaborator && !userRole.isOwner && (
                                <button
                                    onClick={handleLeaveList}
                                    className="inline-flex items-center gap-1 sm:gap-2 text-red-400 hover:text-red-300 text-xs sm:text-sm font-medium transition-all group"
                                    title="Liste verlassen"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    <span className="hidden sm:inline">Verlassen</span>
                                </button>
                            )}
                            {userRole.isOwner && (
                                <button
                                    onClick={() => setShowShareModal(true)}
                                    className="inline-flex items-center gap-1 sm:gap-2 text-purple-400 hover:text-purple-300 text-xs sm:text-sm font-medium transition-all group"
                                    title="Liste teilen"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                    <span className="hidden sm:inline">Teilen</span>
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center justify-center gap-3 sm:gap-4">
                        <div className="flex-1 text-center">
                            <h1 className="text-lg sm:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-1 sm:mb-2 truncate">{list.title}</h1>
                            {list.description && (
                                <p className="text-gray-400 text-xs sm:text-sm line-clamp-2">{list.description}</p>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8 w-full">
                <div className="w-full max-w-3xl">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-2xl mb-4 sm:mb-6 flex items-center justify-between backdrop-blur-sm">
                        <span className="text-xs sm:text-sm">{error}</span>
                        <button
                            onClick={() => setError('')}
                            className="text-red-400 hover:text-red-300 font-bold ml-2 flex-shrink-0"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Add Item Form */}
                <form onSubmit={handleAddItem} className="mb-4 sm:mb-6 w-full">
                    <div className="flex gap-2 sm:gap-3">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                placeholder="Neuen Artikel hinzufügen..."
                                disabled={userRole.isViewer}
                                className="w-full px-3 sm:px-5 py-3 sm:py-4 bg-[#14141f] border border-[#2d2d3f] rounded-lg sm:rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={userRole.isViewer}
                            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-3 sm:py-4 px-3 sm:px-6 rounded-lg sm:rounded-2xl transition-all shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60 hover:scale-[1.03] active:scale-95 flex items-center gap-1 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex-shrink-0"
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="hidden sm:inline">Hinzufügen</span>
                        </button>
                    </div>
                    {userRole.isViewer && (
                        <p className="text-yellow-500 text-xs sm:text-sm mt-2">Du hast nur Zugriff als Zuschauer</p>
                    )}
                </form>

                {/* Items List */}
                {items.length === 0 ? (
                    <div className="text-center py-12 sm:py-20 bg-gradient-to-br from-[#14141f] to-[#1a1a2e] border border-[#2d2d3f] rounded-xl sm:rounded-2xl">
                        <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Liste ist leer</h3>
                        <p className="text-gray-400 text-xs sm:text-sm">Füge deinen ersten Artikel hinzu</p>
                    </div>
                ) : (
                    <div className="space-y-3 sm:space-y-4 w-full">
                        {(() => {
                            // Gruppiere Items nach Kategorie
                            const grouped = items.reduce((acc: any, item) => {
                                const cat = item.category || 'Ohne Kategorie';
                                if (!acc[cat]) acc[cat] = [];
                                acc[cat].push(item);
                                return acc;
                            }, {});

                            // Sortiere Items innerhalb jeder Kategorie (nicht erledigte zuerst, erledigte am Ende)
                            Object.keys(grouped).forEach((category) => {
                                grouped[category].sort((a: Item, b: Item) => {
                                    if (a.completed === b.completed) {
                                        return 0;
                                    }
                                    return a.completed ? 1 : -1;
                                });
                            });

                            // Sortiere Kategorien nach custom order, dann alphabetisch
                            const sortedCategories = Object.keys(grouped).sort((a, b) => {
                                const aIndex = customCategories.indexOf(a);
                                const bIndex = customCategories.indexOf(b);
                                
                                // If both are in custom order, use that order
                                if (aIndex !== -1 && bIndex !== -1) {
                                    return aIndex - bIndex;
                                }
                                // If only one is in custom order, it goes first
                                if (aIndex !== -1) return -1;
                                if (bIndex !== -1) return 1;
                                
                                // For categories not in custom order, put "Ohne Kategorie" last
                                if (a === 'Ohne Kategorie') return 1;
                                if (b === 'Ohne Kategorie') return -1;
                                return a.localeCompare(b);
                            });

                            return sortedCategories.map((category) => (
                                <div 
                                    key={category} 
                                    className="bg-gradient-to-br from-[#14141f] to-[#1a1a2e] border border-[#2d2d3f] rounded-2xl shadow-xl"
                                    onDragOver={handleCategoryDragOver}
                                    onDrop={(e) => handleCategoryDrop(e, category)}
                                >
                                    <div 
                                        draggable={!userRole.isViewer}
                                        onDragStart={(e) => handleCategoryDragStart(e, category)}
                                        className={`bg-purple-500/10 border-b border-[#2d2d3f] px-4 py-3 rounded-t-2xl flex items-center gap-3 transition-all ${
                                            !userRole.isViewer ? 'cursor-move hover:bg-purple-500/20' : ''
                                        } ${draggedCategory === category ? 'opacity-50 bg-purple-500/30' : ''}`}
                                        title={userRole.isViewer ? '' : 'Kategorie ziehen zum Umsortieren'}
                                    >
                                        {!userRole.isViewer && (
                                            <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M9 3h2v2H9V3zm0 4h2v2H9V7zm0 4h2v2H9v-2zm4-8h2v2h-2V3zm0 4h2v2h-2V7zm0 4h2v2h-2v-2z" />
                                            </svg>
                                        )}
                                        <h3 className="text-sm font-semibold text-purple-400 flex-1">{category}</h3>
                                    </div>
                                    <ul className="divide-y divide-[#2d2d3f]">
                                        {grouped[category].map((item: Item) => (
                                            <ListItemWithCategory
                                                key={item.id}
                                                id={item.id}
                                                name={item.name}
                                                category={item.category}
                                                completed={item.completed}
                                                listId={Number(listId)}
                                                customCategories={customCategories}
                                                recipeName={(item as any).recipeName}
                                                onToggle={handleToggleItem}
                                                onDelete={handleDeleteItem}
                                                onCategoryChange={fetchData}
                                                onAddCategory={handleAddCategory}
                                                onDeleteCategory={handleDeleteCategory}
                                                isViewer={userRole.isViewer}
                                            />
                                        ))}
                                    </ul>
                                </div>
                            ));
                        })()}
                    </div>
                )}
                </div>
            </main>

            {/* Share Modal */}
            {showShareModal && listId && (
                <ShareListModal
                    listId={Number(listId)}
                    onClose={() => setShowShareModal(false)}
                />
            )}
        </div>
    );
}
