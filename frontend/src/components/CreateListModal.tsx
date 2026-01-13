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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Neue Liste erstellen</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Titel</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Wochenmarkt"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Beschreibung (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="z.B. Einkaufen für die Woche"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 rounded-lg font-medium"
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