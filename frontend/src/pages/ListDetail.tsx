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
            setItems(listData);

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
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <p className="text-gray-600 text-lg">Lädt... </p>
            </div>
        );
    }

    if (!list) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <p className="text-gray-600 text-lg">Liste nicht gefunden</p>
            </div>
        );
    }

    const completedCount = items.filter(i => i.completed).length;

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-4xl mx-auto px-4 py-6 flex justify-between items-center">
                    <div>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="text-blue-500 hover:underline mb-2"
                        >
                            ← Zurück
                        </button>
                        <h1 className="text-3xl font-bold text-gray-800">{list.title}</h1>
                        {list.description && (
                            <p className="text-gray-600 mt-1">{list.description}</p>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 py-8">
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                        {error}
                        <button
                            onClick={() => setError('')}
                            className="ml-2 font-bold hover: underline"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Progress Bar */}
                <div className="mb-6 bg-white p-4 rounded-lg shadow">
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">Fortschritt</span>
                        <span className="text-sm text-gray-600">
                            {completedCount} von {items.length} erledigt
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{
                                width: items.length === 0 ? '0%' : `${(completedCount / items.length) * 100}%`,
                            }}
                        />
                    </div>
                </div>

                {/* Add Item Form */}
                <form onSubmit={handleAddItem} className="mb-6 bg-white p-4 rounded-lg shadow">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            placeholder="Neuer Eintrag..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg"
                        >
                            ➕ Hinzufügen
                        </button>
                    </div>
                </form>

                {/* Items List */}
                {items.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg shadow">
                        <p className="text-gray-600">Keine Einträge vorhanden</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <ul className="divide-y">
                            {items.map((item) => (
                                <li key={item.id} className="p-4 hover:bg-gray-50 flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={item.completed}
                                        onChange={() => handleToggleItem(item.id, item.completed)}
                                        className="w-5 h-5 cursor-pointer accent-green-500"
                                    />
                                    <span
                                        className={`flex-1 ${item.completed
                                            ? 'line-through text-gray-400'
                                            : 'text-gray-800'
                                            }`}
                                    >
                                        {item.name}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded"
                                    >
                                        🗑️
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </main>
        </div>
    );
}