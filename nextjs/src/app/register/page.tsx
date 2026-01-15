'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/api';

export default function RegisterPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password != passwordConfirm) {
            setError('Passwörter stimmen nicht überein');
            return;
        }

        if (password.length <= 2) {
            setError('Passwort muss mindestens 3 Zeichen haben');
            return;
        }

        setLoading(true);

        try {
            const data = await auth.register(username, password);
            localStorage.setItem('token',data.token);
            localStorage.setItem('userId',data.userId);
            router.push('/dashboard');
        } catch (err) {
            // Expected error on auth pages - just show to user, don't log to console
            setError(err instanceof Error ? err.message :  'Registrierung fehlgeschlagen')
        } finally {
            setLoading(false);
        }
    };

    return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 rounded-3xl mb-8 shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/70 transition-shadow">
            <img src="/FoodPlaner.png" alt="FoodPlaner Logo" className="w-16 h-16" />
          </div>
          <h1 className="text-5xl font-black bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent mb-3">
            FoodPlaner
          </h1>
          <p className="text-gray-400 text-lg">Neuer Account erstellen</p>
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
                placeholder="dein-name"
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

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Passwort wiederholen</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
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
              {loading ? 'Wird registriert...' : 'Registrieren'}
            </button>
          </form>
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm">
            Bereits registriert? {' '}
            <a href="/login" className="text-purple-400 hover:text-purple-300 font-bold transition hover:underline underline-offset-2">
              Hier einloggen
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
