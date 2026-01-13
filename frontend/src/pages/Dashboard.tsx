import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lists } from '../api';
import ListCard from '../components/ListCard';
import CreateListModal from '../components/CreateListModal';

interface List {
    id: number;
    title: string;
    description: string;
    created_at: string;
}

export default function Dashboard() {
    const navigate = useNavigate();
    const [userLists, setUserLists] = useState<List[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        checkAuth();
        fetchLists();
    },[]);

    const checkAuth = () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
        }
    };

    const fetchLists = async () => {
        try {
            setLoading(true);
            const data = await lists.getAll();
            setUserLists(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateList = async (title: string, description: string) => {
        try {
            await lists.create(title,description);
            setShowModal(false);
            fetchLists();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fehler beim Erstellen der Liste');
        }
    };

    const handleDeleteList = async (id: number) => {
        if (confirm('Liste wirklich Löschen?')) {
            try {
                await lists.delete(id);
                fetchLists();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Fehler beim Löschen der Liste')
            }
        } 
    };

    return (
        <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-800">🛒 Meine Einkaufslisten</h1>
            <button
                onClick={() => navigate('/profile')}
                className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg"
            >
                👤 Profil
            </button>
            </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
            {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                {error}
                <button
                onClick={() => setError('')}
                className="ml-2 font-bold hover:underline"
                >
                ✕
                </button>
            </div>
            )}

            {/* Create Button */}
            <button
            onClick={() => setShowModal(true)}
            className="mb-6 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2"
            >
            ➕ Neue Liste
            </button>

            {/* Lists Grid */}
            {loading ?  (
            <div className="text-center py-12">
                <p className="text-gray-600 text-lg">Lädt...</p>
            </div>
            ) : userLists.length === 0 ? (
            <div className="text-center py-12">
                <p className="text-gray-600 text-lg">Keine Listen vorhanden</p>
                <p className="text-gray-500 text-sm">Erstelle eine neue Liste um zu starten! </p>
            </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userLists.map((list) => (
                <ListCard
                    key={list.id}
                    list={list}
                    onDelete={handleDeleteList}
                />
                ))}
            </div>
            )}
        </main>

        {/* Modal */}
        {showModal && (
            <CreateListModal
            onClose={() => setShowModal(false)}
            onCreate={handleCreateList}
            />
        )}
        </div>
    );
}