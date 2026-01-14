'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/api';

interface UserData {
  id: number;
  email: string;
  username: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isClient, setIsClient] = useState(false);
  
  // Form states
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    checkAuth();
    fetchUserData();
  }, [isClient]);

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  };

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const data = await auth.me();
      setUser(data);
      setEmail(data.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden des Profils');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword) {
      setError('Aktuelles Passwort erforderlich zur Bestätigung');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return;
    }

    if (newPassword && newPassword.length < 3) {
      setError('Neues Passwort muss mindestens 3 Zeichen lang sein');
      return;
    }

    setIsSaving(true);
    try {
      await auth.updateProfile(email, currentPassword, newPassword || undefined);
      setSuccess('Profil erfolgreich aktualisiert!');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
      // Neu laden
      setTimeout(() => fetchUserData(), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Aktualisieren');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    auth.logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Lädt Profil...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <p className="text-gray-400 text-lg">Profil konnte nicht geladen werden</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-b from-[#14141f] to-transparent border-b border-[#2d2d3f]/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex justify-between items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition-all group flex-shrink-0"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Zurück zum Dashboard</span>
              <span className="sm:hidden">Zurück</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent text-center flex-1">Profil</h1>
            <div className="w-0 sm:w-20"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="w-full max-w-2xl">
          {/* Benutzerinformationen */}
          <div className="bg-gradient-to-br from-[#14141f]/90 to-[#1a1a2e]/90 backdrop-blur-sm border border-purple-500/30 rounded-3xl p-8 mb-8 shadow-2xl shadow-purple-500/20">
            <div className="border-t border-purple-500/20 pt-6">
              <div className="mb-4">
                <label className="text-gray-400 text-sm">Benutzername</label>
                <p className="text-white text-lg font-semibold">{user.username}</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">User ID</label>
                <p className="text-white text-lg font-semibold">#{user.id}</p>
              </div>
            </div>
          </div>

          {/* Formular zum Ändern von Email und Passwort */}
          <div className="bg-gradient-to-br from-[#14141f]/90 to-[#1a1a2e]/90 backdrop-blur-sm border border-purple-500/30 rounded-3xl p-8 shadow-2xl shadow-purple-500/20">
            <h3 className="text-xl font-bold text-white mb-6">Einstellungen ändern</h3>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-2xl mb-6 flex items-center justify-between backdrop-blur-sm">
                <span className="text-sm">{error}</span>
                <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">✕</button>
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-2xl mb-6 flex items-center justify-between backdrop-blur-sm">
                <span className="text-sm">{success}</span>
                <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-300">✕</button>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a1a2e] border border-purple-500/30 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all"
                  required
                />
              </div>

              {/* Aktuelles Passwort */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Aktuelles Passwort (zur Bestätigung)</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a1a2e] border border-purple-500/30 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              {/* Neues Passwort */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Neues Passwort (optional)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a1a2e] border border-purple-500/30 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all"
                  placeholder="••••••••"
                />
                {newPassword && (
                  <p className="text-xs text-gray-400 mt-1">Mindestens 3 Zeichen erforderlich</p>
                )}
              </div>

              {/* Passwort wiederholen */}
              {newPassword && (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Passwort wiederholen</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-[#1a1a2e] border border-purple-500/30 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="flex-1 px-4 py-3 text-gray-300 bg-[#1a1a2e] border border-purple-500/20 hover:border-purple-500/50 hover:bg-[#14141f] rounded-2xl font-medium transition-all"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 rounded-2xl font-bold transition-all shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60 hover:scale-[1.02] active:scale-95"
                >
                  {isSaving ? 'Wird gespeichert...' : 'Änderungen speichern'}
                </button>
              </div>
            </form>
          </div>

          {/* Logout Button */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleLogout}
              className="px-8 py-3 text-red-400 border border-red-500/30 hover:border-red-500/60 hover:bg-red-500/10 rounded-2xl font-medium transition-all"
            >
              Abmelden
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
