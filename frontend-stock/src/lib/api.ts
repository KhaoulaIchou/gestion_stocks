// src/lib/api.ts
const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');

  const isString = typeof options.body === 'string';
  if (options.body && !isString && !(options.body instanceof FormData)) {
    options.body = JSON.stringify(options.body);
  }
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    const txt = await res.text().catch(() => '');
    // ⬇️ ne redirige PAS pour /auth/login
    if (!path.includes('/auth/login')) {
      localStorage.removeItem('token');
      try { window.location.assign('/login'); } catch {}
    }
    throw new Error(txt || '401 Unauthorized');
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(txt || `${res.status} ${res.statusText}`);
  }

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  const txt = await res.text().catch(() => '');
  throw new Error(`Réponse inattendue (pas JSON): ${txt.slice(0, 200)}`);
}
