// src/components/Navbar.tsx
import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, User } from "lucide-react";

export default function Navbar() {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem("userEmail") || "admin@example.com"; // tu peux le mettre après /auth/me
  const userRole  = localStorage.getItem("userRole")  || "ADMIN";

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    navigate("/login", { replace: true });
  }

  return (
    <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-500/90 shadow-md grid place-items-center">
            <span className="text-sm font-bold">GS</span>
          </div>
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Gestion de Stock</h1>
        </div>

        <nav className="hidden sm:flex items-center gap-6 text-sm">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `transition hover:text-indigo-300 ${isActive ? "text-indigo-300 font-semibold" : "text-slate-200"}`
            }
          >
            Stock
          </NavLink>
          <NavLink
            to="/destinations"
            className={({ isActive }) =>
              `transition hover:text-indigo-300 ${isActive ? "text-indigo-300 font-semibold" : "text-slate-200"}`
            }
          >
            Destinations
          </NavLink>
          <NavLink
            to="/history"
            className={({ isActive }) =>
              `transition hover:text-indigo-300 ${isActive ? "text-indigo-300 font-semibold" : "text-slate-200"}`
            }
          >
            Historique
          </NavLink>
          <NavLink
            to="/delivrees"
            className={({ isActive }) =>
              `transition hover:text-indigo-300 ${isActive ? "text-indigo-300 font-semibold" : "text-slate-200"}`
            }
          >
            Machines délivrées
          </NavLink>
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 ring-1 ring-white/10">
            <div className="h-7 w-7 rounded-full bg-indigo-500/90 grid place-items-center">
              <User size={16} />
            </div>
            <div className="leading-4">
              <div className="text-xs text-slate-300">{userRole}</div>
              <div className="text-[13px] font-medium">{userEmail}</div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Se déconnecter"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/90 hover:bg-red-500 transition text-white shadow"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  );
}
