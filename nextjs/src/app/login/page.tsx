'use client';

import { useState } from 'react';
import { auth } from '@/api'
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) {
            setError('Benutzername und Passwort erforderlich');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await auth.login(username, password);
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', String(data.userId));
            setError(null);
            router.push('/dashboard');
        } catch (err) {
            // Expected error on auth pages - just show to user, don't log to console
            const errorMessage = err instanceof Error ? err.message : 'Login fehlgeschlagen';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };
    
    return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-8 shadow-2xl">
            <img src="/FoodPlaner.png" alt="FoodPlaner Logo" className="w-22 h-22 rounded-2xl" />
          </div>
          <h1 className="text-5xl font-black bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent mb-3">
            FoodPlaner
          </h1>
          <p className="text-gray-400 text-lg">Einkaufslisten verwalten leicht gemacht</p>
        </div>

        <div className="bg-gradient-to-br from-[#14141f]/80 to-[#1a1a2e]/80 backdrop-blur-xl border border-purple-500/20 rounded-3xl p-8 shadow-2xl shadow-purple-500/20 hover:shadow-purple-500/30 transition-shadow">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Benutzername</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-[#1a1a2e] border border-[#2d2d3f] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                placeholder="dein-benutzername"
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Passwort</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#1a1a2e] border border-[#2d2d3f] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm backdrop-blur-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-4 rounded-2xl transition-all duration-200 shadow-xl shadow-purple-500/40 hover:shadow-purple-500/60 hover:scale-[1.02] active:scale-95"
            >
              {loading ?  'Wird eingeloggt...' : 'Einloggen'}
            </button>
          </form>
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm">
            Noch keinen Account? {' '}
            <a href="/register" className="text-purple-400 hover:text-purple-300 font-bold transition hover:underline underline-offset-2">
              Hier registrieren
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
