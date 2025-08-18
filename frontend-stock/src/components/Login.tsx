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
  <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
    {/* Bandeau marque à gauche */}
    <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 text-white">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-white/20 grid place-items-center font-bold">GS</div>
        <div className="text-xl font-semibold">Gestion de Stock</div>
      </div>
      <div>
        <h2 className="text-3xl font-bold leading-tight">Bienvenue 👋</h2>
        <p className="mt-2 text-indigo-100">
          Connectez-vous pour gérer le stock, les affectations et les délivrances.
        </p>
      </div>
      <div className="text-xs text-indigo-100/80">© {new Date().getFullYear()} Ministère — DSI</div>
    </div>

    {/* Carte login à droite */}
    <div className="flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 p-8">
        <h1 className="text-2xl font-semibold text-slate-900">Connexion</h1>
        <p className="mt-1 text-sm text-slate-500">Accédez à votre espace de gestion.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" autoComplete="off">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              placeholder="vous@exemple.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute inset-y-0 right-2 my-auto rounded p-1 text-slate-500 hover:bg-slate-100"
                title={show ? 'Masquer' : 'Afficher'}
              >
                {show ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg p-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition disabled:opacity-60"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  </div>
);

}
