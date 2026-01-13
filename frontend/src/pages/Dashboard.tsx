import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lists } from '../api';
import { wsService } from '../services/websocket';
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

        // WebSocket verbinden für Live-Updates
        const token = localStorage.getItem('token');
        if (token) {
            wsService.connect(token).catch(err => {
                console.error('WebSocket-Verbindung fehlgeschlagen:', err);
            });

            // Abonniere List-Updates
            const unsubscribe = wsService.subscribe('list_updated', () => {
                console.log('Liste aktualisiert - neu laden');
                fetchLists();
            });

            return () => {
                unsubscribe();
                wsService.disconnect();
            };
        }
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
        <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
        {/* Header */}
        <header className="bg-gradient-to-b from-[#14141f] to-transparent border-b border-[#2d2d3f]/50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex justify-center items-center relative">
                    <div className="flex items-center gap-3">
                        <div>
                            <img src="/FoodPlaner.png" alt="FoodPlaner Logo" className="w-12 h-12 rounded-2xl" />
                        </div>
                        <div className="text-center">
                            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">FoodPlaner</h1>
                            <p className="text-xs text-gray-500 hidden sm:block">Einkaufslisten verwalten</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/profile')}
                        className="absolute right-0 p-3 bg-[#1a1a2e]/80 border border-[#2d2d3f] hover:border-purple-500/50 rounded-xl transition-all text-gray-400 hover:text-purple-400"
                        title="Profil"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </button>
                </div>
            </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full">
            <div className="w-full">
            {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-2xl mb-8 flex items-center justify-between backdrop-blur-sm max-w-2xl mx-auto">
                <span className="text-sm">{error}</span>
                <button
                onClick={() => setError('')}
                className="text-red-400 hover:text-red-300 font-bold ml-2"
                >
                ✕
                </button>
            </div>
            )}

            {/* Lists Section */}
            {loading ? (
            <div className="text-center py-32">
                <div className="inline-block w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-400">Lädt deine Listen...</p>
            </div>
            ) : userLists.length === 0 ? (
            <div className="text-center py-20">
                <div className="relative inline-block mb-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-purple-500/10 to-purple-700/10 border-2 border-purple-500/20 rounded-3xl flex items-center justify-center mx-auto">
                        <span className="text-5xl">📝</span>
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-white text-xl font-bold">0</span>
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Keine Listen vorhanden</h2>
                <p className="text-gray-400 mb-8">Erstelle deine erste Einkaufsliste</p>
                <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-xl shadow-purple-500/40 hover:shadow-purple-500/60 hover:scale-[1.03] active:scale-95"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Erste Liste erstellen
                </button>
            </div>
            ) : (
            <div className="w-full">
                <div className="flex justify-center items-center mb-8 flex-col gap-4">
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-white">Deine Listen</h2>
                        <p className="text-sm text-gray-400 mt-1">{userLists.length} {userLists.length === 1 ? 'Liste' : 'Listen'}</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60 hover:scale-[1.02] active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Neue Liste
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 justify-items-center max-w-5xl mx-auto">
                    {userLists.map((list) => (
                    <ListCard
                        key={list.id}
                        list={list}
                        onDelete={handleDeleteList}
                    />
                    ))}
                </div>
            </div>
            )}
            </div>
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