import { useState } from 'react';
import { auth } from '../api'
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Please enter both email and password');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const data = await auth.login(email,password);
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.userId);
            navigate('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message :  'Login fehlgeschlagen');
        } finally {
            setLoading(false);
        }
    };
    
    return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
          🛒 FoodPlaner
        </h1>
        <p className="text-gray-600 text-center mb-6">Einkaufslisten verwalten leicht gemacht</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="deine@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            {loading ?  'Wird eingeloggt...' : 'Einloggen'}
          </button>

          <div className="border-t pt-4 text-center">
            <p className="text-gray-600">
              Noch keinen Account? {' '}
              <a href="/register" className="text-blue-500 hover:underline font-bold">
                Hier registrieren
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}