import { useState, useEffect } from 'react';
import { collaborators } from '../api';

interface Collaborator {
  id: number;
  user_id: number;
  username: string;
  role: 'editor' | 'viewer';
}

interface ShareListModalProps {
  listId: number;
  onClose: () => void;
}

export default function ShareListModal({ listId, onClose }: ShareListModalProps) {
  const [collaboratorsList, setCollaboratorsList] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    fetchCollaborators();
  }, [listId]);

  const fetchCollaborators = async () => {
    try {
      setLoading(true);
      const data = await collaborators.getAll(listId);
      setCollaboratorsList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Kollaboratoren');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!inviteEmail.trim()) {
      setError('Email erforderlich');
      return;
    }

    setInviting(true);
    try {
      // Backend wird Email in User-ID umwandeln
      await collaborators.invite(listId, inviteEmail, inviteRole);
      setSuccess('Einladung erfolgreich versendet!');
      setInviteEmail('');
      setInviteRole('viewer');
      // Neu laden
      setTimeout(() => fetchCollaborators(), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Versenden der Einladung');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: number) => {
    if (!confirm('Diesen Nutzer entfernen?')) return;

    try {
      await collaborators.remove(listId, collaboratorId);
      setSuccess('Nutzer entfernt');
      fetchCollaborators();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Entfernen');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-[#14141f]/95 to-[#1a1a2e]/95 backdrop-blur-xl border border-purple-500/30 rounded-3xl max-w-md w-full shadow-2xl shadow-purple-500/30">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Liste teilen</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-300 text-2xl leading-none"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm mb-4 backdrop-blur-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl text-sm mb-4 backdrop-blur-sm">
              {success}
            </div>
          )}

          {/* Einladungsformular */}
          <form onSubmit={handleInvite} className="mb-6 pb-6 border-b border-purple-500/20">
            <label className="block text-gray-300 text-sm font-medium mb-2">Email des Nutzers</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-4 py-2 bg-[#1a1a2e] border border-purple-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all mb-3"
              required
            />

            <label className="block text-gray-300 text-sm font-medium mb-2">Berechtigung</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
              className="w-full px-4 py-2 bg-[#1a1a2e] border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all mb-4"
            >
              <option value="viewer">Betrachter (nur lesen)</option>
              <option value="editor">Bearbeiter (bearbeiten)</option>
            </select>

            <button
              type="submit"
              disabled={inviting}
              className="w-full px-4 py-2 text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 rounded-xl font-bold transition-all shadow-lg shadow-purple-500/40"
            >
              {inviting ? 'Wird eingeladen...' : 'Einladen'}
            </button>
          </form>

          {/* Kollaboratoren */}
          <div>
            <h3 className="text-sm font-bold text-gray-300 mb-3">
              Kollaboratoren ({collaboratorsList.length})
            </h3>

            {loading ? (
              <p className="text-gray-400 text-sm">Lädt...</p>
            ) : collaboratorsList.length === 0 ? (
              <p className="text-gray-400 text-sm">Keine Kollaboratoren</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {collaboratorsList.map((collab) => (
                  <div
                    key={collab.id}
                    className="flex items-center justify-between p-3 bg-[#1a1a2e] border border-purple-500/20 rounded-xl"
                  >
                    <div>
                      <p className="text-white text-sm font-medium">{collab.username}</p>
                      <p className="text-gray-400 text-xs">
                        {collab.role === 'editor' ? 'Bearbeiter' : 'Betrachter'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveCollaborator(collab.id)}
                      className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-all"
                      title="Entfernen"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
