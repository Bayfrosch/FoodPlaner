import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { items as itemsApi, lists } from '../api';

interface Item {
    id: number;
    name: string;
    completed: boolean;
    created_at: string;
}

interface List {
    id: number;
    title: string;
    description: string;
}

export default function ListDetail() {
    const navigate = useNavigate();
    const { listId } = useParams<{ listId: string }>();
    const [list, setList] = useState<List | null>(null);
    const [items, setItems] = useState<Item[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (listId) {
            fetchData();
        }
    }, [listId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const listId_num = Number(listId)

            const listData = await lists.getById(listId_num);
            setList(listData);

            const itemsData = await itemsApi.getAll(listId_num);
            setItems(itemsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fehler beim Laden');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName.trim() || !listId) return;

        try {
            await itemsApi.create(Number(listId), newItemName);
            setNewItemName('');
            fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fehler beim Hinzufügen');
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

    const completedCount = items.filter(i => i.completed).length;

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
            {/* Header */}
            <header className="bg-gradient-to-b from-[#14141f] to-transparent border-b border-[#2d2d3f]/50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
                    <div className="flex justify-center">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-4 text-sm font-medium transition-all group"
                        >
                            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Zurück zu Listen
                        </button>
                    </div>
                    <div className="flex items-center justify-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-purple-700/20 border border-purple-500/30 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl">📋</span>
                        </div>
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

                {/* Progress Bar */}
                <div className="mb-6 bg-gradient-to-br from-[#14141f] to-[#1a1a2e] border border-[#2d2d3f] p-6 rounded-2xl shadow-xl">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-semibold text-white">Fortschritt</span>
                        </div>
                        <span className="text-sm font-medium">
                            <span className="text-purple-400">{completedCount}</span>
                            <span className="text-gray-500"> / {items.length}</span>
                        </span>
                    </div>
                    <div className="relative w-full bg-[#1a1a2e] rounded-full h-3 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-purple-600/20"></div>
                        <div
                            className="relative bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500 shadow-lg shadow-purple-500/50"
                            style={{
                                width: items.length === 0 ? '0%' : `${(completedCount / items.length) * 100}%`,
                            }}
                        />
                    </div>
                    {items.length > 0 && (
                        <p className="text-xs text-gray-500 mt-2 text-center">
                            {Math.round((completedCount / items.length) * 100)}% abgeschlossen
                        </p>
                    )}
                </div>

                {/* Add Item Form */}
                <form onSubmit={handleAddItem} className="mb-6">
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                placeholder="Neuen Artikel hinzufügen..."
                                className="w-full px-5 py-4 bg-[#14141f] border border-[#2d2d3f] rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                            />
                        </div>
                        <button
                            type="submit"
                            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-4 px-6 sm:px-8 rounded-2xl transition-all shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60 hover:scale-[1.03] active:scale-95 flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="hidden sm:inline">Hinzufügen</span>
                        </button>
                    </div>
                </form>

                {/* Items List */}
                {items.length === 0 ? (
                    <div className="text-center py-20 bg-gradient-to-br from-[#14141f] to-[#1a1a2e] border border-[#2d2d3f] rounded-2xl">
                        <div className="w-20 h-20 bg-purple-500/10 border-2 border-purple-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                            <span className="text-4xl">📝</span>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Liste ist leer</h3>
                        <p className="text-gray-400 text-sm">Füge deinen ersten Artikel hinzu</p>
                    </div>
                ) : (
                    <div className="bg-gradient-to-br from-[#14141f] to-[#1a1a2e] border border-[#2d2d3f] rounded-2xl overflow-hidden shadow-xl">
                        <ul className="divide-y divide-[#2d2d3f]">
                            {items.map((item, index) => (
                                <li 
                                    key={item.id} 
                                    className="p-4 hover:bg-[#1a1a2e] flex items-center gap-4 transition-all group"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <label className="flex items-center gap-4 flex-1 cursor-pointer">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={item.completed}
                                                onChange={() => handleToggleItem(item.id, item.completed)}
                                                className="peer w-6 h-6 cursor-pointer appearance-none bg-[#1a1a2e] border-2 border-[#2d2d3f] rounded-lg checked:bg-gradient-to-br checked:from-purple-500 checked:to-purple-600 checked:border-purple-500 transition-all"
                                            />
                                            <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <span
                                            className={`flex-1 transition-all ${
                                                item.completed
                                                    ? 'line-through text-gray-500'
                                                    : 'text-gray-200 group-hover:text-white'
                                            }`}
                                        >
                                            {item.name}
                                        </span>
                                    </label>
                                    <button
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        title="Artikel löschen"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                </div>
            </main>
        </div>
    );
}