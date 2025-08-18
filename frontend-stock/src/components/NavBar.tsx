// src/components/Navbar.tsx
import { NavLink, useNavigate } from "react-router-dom";
import type { SVGProps } from "react";

// Icônes inline (pas de dépendance externe)
const IconUser = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <circle cx="12" cy="7" r="4" />
    <path d="M5.5 21a8.38 8.38 0 0 1 13 0" />
  </svg>
);
const IconLogout = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const IconLogin = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </svg>
);

export default function Navbar() {
  const navigate = useNavigate();

  // Récupère l'utilisateur connecté (stocké au login)
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const rawUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;

  let parsedUser: any = null;
  try {
    parsedUser = rawUser ? JSON.parse(rawUser) : null;
  } catch {
    parsedUser = null;
  }

  const isAuthed = Boolean(token && parsedUser?.email);
  const userEmail: string = parsedUser?.email || "";
  const userRole: string = ((parsedUser?.roles?.[0] || parsedUser?.role || "") + "").toUpperCase();

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-white/70 supports-[backdrop-filter]:bg-white/60 border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo + titre */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white grid place-items-center shadow-sm">
            <span className="text-sm font-bold">GS</span>
          </div>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">Gestion de Stock</h1>
        </div>

        {/* Navigation */}
        <nav className="hidden sm:flex items-center gap-6 text-sm">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `transition ${isActive ? "text-indigo-600 font-semibold" : "text-slate-600 hover:text-slate-900"}`
            }
          >
            Stock
          </NavLink>
          <NavLink
            to="/destinations"
            className={({ isActive }) =>
              `transition ${isActive ? "text-indigo-600 font-semibold" : "text-slate-600 hover:text-slate-900"}`
            }
          >
            Destinations
          </NavLink>
          <NavLink
            to="/history"
            className={({ isActive }) =>
              `transition ${isActive ? "text-indigo-600 font-semibold" : "text-slate-600 hover:text-slate-900"}`
            }
          >
            Historique
          </NavLink>
          <NavLink
            to="/delivrees"
            className={({ isActive }) =>
              `transition ${isActive ? "text-indigo-600 font-semibold" : "text-slate-600 hover:text-slate-900"}`
            }
          >
            Machines délivrées
          </NavLink>
        </nav>

        {/* Zone droite */}
        <div className="flex items-center gap-3">
          {isAuthed ? (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 ring-1 ring-slate-200">
                <div className="h-7 w-7 rounded-full bg-indigo-600 text-white grid place-items-center">
                  <IconUser />
                </div>
                <div className="leading-4">
                  {/* Rôle + email visibles uniquement si connecté */}
                  <div className="text-xs text-slate-600">{userRole}</div>
                  <div className="text-[13px] font-medium text-slate-900">{userEmail}</div>
                </div>
              </div>
              <button
                onClick={logout}
                title="Se déconnecter"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition shadow-sm"
              >
                <IconLogout />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm"
              title="Se connecter"
            >
              <IconLogin />
              <span className="hidden sm:inline">Connexion</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
