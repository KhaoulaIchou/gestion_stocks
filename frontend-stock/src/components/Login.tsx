import { useState } from 'react';
import { api } from '../lib/api';

export default function Login() {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const data = await api<{ access_token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/5 backdrop-blur border border-white/10 rounded-2xl shadow-2xl p-8">
        <h1 className="text-2xl font-semibold text-white mb-2">Connexion</h1>
        <p className="text-slate-300 mb-6">Accédez à votre espace de gestion.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-200 mb-1">Email</label>
            <input
              type="email"
              className="w-full px-3 py-2 rounded-lg bg-white/10 text-white border border-white/10 focus:outline-none focus:ring focus:ring-indigo-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="block text-slate-200 mb-1">Mot de passe</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                className="w-full px-3 py-2 rounded-lg bg-white/10 text-white border border-white/10 focus:outline-none focus:ring focus:ring-indigo-500 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute inset-y-0 right-2 my-auto text-slate-300 hover:text-white"
                title={show ? 'Masquer' : 'Afficher'}
              >
                {show ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          {error && <div className="text-red-300 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-2">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition disabled:opacity-60"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
        <p className="text-xs text-slate-400 mt-6">
          Astuce : admin@example.com / admin123 (si tu as gardé le seed).
        </p>
      </div>
    </div>
  );
}
