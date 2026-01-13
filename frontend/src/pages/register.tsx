import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../api';

export default function Register() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
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
            const data = await auth.register(email, username, password);
            localStorage.setItem('token',data.token);
            localStorage.setItem('userId',data.userId);
            navigate('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message :  'Registrierung fehlgeschlagen')
        } finally {
            setLoading(false);
        }
    };

    return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
          🛒 FoodPlaner
        </h1>
        <p className="text-gray-600 text-center mb-6">Neuer Account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="deine@email. com"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Benutzername</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="dein-name"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Passwort wiederholen</label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            {loading ? 'Wird registriert...' : 'Registrieren'}
          </button>

          <div className="border-t pt-4 text-center">
            <p className="text-gray-600">
              Bereits registriert? {' '}
              <a href="/login" className="text-green-500 hover:underline font-bold">
                Hier einloggen
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}