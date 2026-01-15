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

export default function ListDetailPage() {
    const router = useRouter();
    const params = useParams();
    const listId = params?.listId as string;
    
    const [list, setList] = useState<List | null>(null);
    const [items, setItems] = useState<Item[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showShareModal, setShowShareModal] = useState(false);
    const [customCategories, setCustomCategories] = useState<string[]>([]);
    const [isClient, setIsClient] = useState(false);
    const [userRole, setUserRole] = useState<UserRole>({ isOwner: false, isEditor: true, isViewer: false });

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient || !listId) return;
        fetchData();

        // Subscribe to SSE updates for this list
        const listIdNum = Number(listId);
        const unsubscribe = sseService.subscribe(listIdNum, (message) => {
            // Only refresh on actual data changes
            if (message.type !== 'connected') {
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
                    const collabs = await collaborators.getAll(listId_num);
                    const isOwner = listData.ownerId === me.id;
                    const collaborator = collabs?.find((c: any) => c.userId === me.id);
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

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div>
                    <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-400 mt-4">Lädt...</p>
                </div>
            </div>
        );
    }

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
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
                    <div className="flex justify-between items-center mb-4">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition-all group"
                        >
                            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Zurück zu Listen
                        </button>
                        <button
                            onClick={() => setShowShareModal(true)}
                            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition-all group"
                            title="Liste teilen"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            Teilen
                        </button>
                    </div>
                    <div className="flex items-center justify-center gap-4">
                        <div className="flex-1 text-center max-w-md">
                            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">{list.title}</h1>
                            {list.description && (
                                <p className="text-gray-400 text-sm">{list.description}</p>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
                <div className="w-full max-w-3xl">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-2xl mb-6 flex items-center justify-between backdrop-blur-sm">
                        <span className="text-sm">{error}</span>
                        <button
                            onClick={() => setError('')}
                            className="text-red-400 hover:text-red-300 font-bold ml-2"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Add Item Form */}
                <form onSubmit={handleAddItem} className="mb-6">
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                placeholder="Neuen Artikel hinzufügen..."
                                disabled={userRole.isViewer}
                                className="w-full px-5 py-4 bg-[#14141f] border border-[#2d2d3f] rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={userRole.isViewer}
                            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-4 px-6 sm:px-8 rounded-2xl transition-all shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60 hover:scale-[1.03] active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="hidden sm:inline">Hinzufügen</span>
                        </button>
                    </div>
                    {userRole.isViewer && (
                        <p className="text-yellow-500 text-sm mt-2">Du hast nur Zugriff als Zuschauer</p>
                    )}
                </form>

                {/* Items List */}
                {items.length === 0 ? (
                    <div className="text-center py-20 bg-gradient-to-br from-[#14141f] to-[#1a1a2e] border border-[#2d2d3f] rounded-2xl">
                        <h3 className="text-lg font-semibold text-white mb-2">Liste ist leer</h3>
                        <p className="text-gray-400 text-sm">Füge deinen ersten Artikel hinzu</p>
                    </div>
                ) : (
                    <div className="space-y-4">
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

                            // Sortiere Kategorien (Ohne Kategorie zuletzt)
                            const sortedCategories = Object.keys(grouped).sort((a, b) => {
                                if (a === 'Ohne Kategorie') return 1;
                                if (b === 'Ohne Kategorie') return -1;
                                return a.localeCompare(b);
                            });

                            return sortedCategories.map((category) => (
                                <div key={category} className="bg-gradient-to-br from-[#14141f] to-[#1a1a2e] border border-[#2d2d3f] rounded-2xl shadow-xl">
                                    <div className="bg-purple-500/10 border-b border-[#2d2d3f] px-4 py-3 rounded-t-2xl">
                                        <h3 className="text-sm font-semibold text-purple-400">{category}</h3>
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
