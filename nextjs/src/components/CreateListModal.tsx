import { useState } from 'react';

interface CreateListModalProps {
  onClose: () => void;
  onCreate: (title: string, description: string) => void;
}

export default function CreateListModal({ onClose, onCreate }: CreateListModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await onCreate(title, description);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-gradient-to-br from-[#14141f]/95 to-[#1a1a2e]/95 backdrop-blur-xl border border-purple-500/30 rounded-3xl max-w-md w-full shadow-2xl shadow-purple-500/30 animate-slideUp">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500/30 to-purple-700/30 border border-purple-500/50 rounded-2xl flex items-center justify-center">
              <span className="text-xl font-bold text-purple-400">+</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Neue Liste erstellen</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Titel</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Wochenmarkt"
                className="w-full px-4 py-3 bg-[#1a1a2e] border border-purple-500/30 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Beschreibung (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="z.B. Einkaufen für die Woche"
                className="w-full px-4 py-3 bg-[#1a1a2e] border border-purple-500/30 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 text-gray-300 bg-[#1a1a2e] border border-purple-500/20 hover:border-purple-500/50 hover:bg-[#14141f] rounded-2xl font-medium transition-all"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 rounded-2xl font-bold transition-all shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60 hover:scale-[1.02] active:scale-95"
              >
                {loading ? 'Wird erstellt...' : 'Erstellen'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}