// src/components/Navbar.tsx
import { NavLink, useNavigate } from "react-router-dom";
import type { SVGProps } from "react";

// Icônes inline
const IconUser = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width={16}
    height={16}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    {...props}
  >
    <circle cx="12" cy="7" r="4" />
    <path d="M5.5 21a8.38 8.38 0 0 1 13 0" />
  </svg>
);

const IconLogout = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width={16}
    height={16}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    {...props}
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const IconLogin = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width={16}
    height={16}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    {...props}
  >
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </svg>
);

const USER_NAMES: Record<string, string> = {
  "majdadik@gmail.com": "MAJDA DIK",
  "khaoulaichoukade@gmail.com": "KHAOULA ICHOUKADE",
  "mouadmouchtarai@gmail.com": "MOUAD MOUCHTARAI",
};

function getDisplayName(user: any) {
  const email = String(user?.email || "").toLowerCase();

  return (
    user?.name ||
    user?.fullName ||
    USER_NAMES[email] ||
    user?.email ||
    "Utilisateur"
  );
}

export default function Navbar() {
  const navigate = useNavigate();

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const rawUser =
    typeof window !== "undefined" ? localStorage.getItem("user") : null;

  let parsedUser: any = null;

  try {
    parsedUser = rawUser ? JSON.parse(rawUser) : null;
  } catch {
    parsedUser = null;
  }

  const isAuthed = Boolean(token && parsedUser?.email);
  const userEmail: string = parsedUser?.email || "";
  const displayName = getDisplayName(parsedUser);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    [
      "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition",
      isActive
        ? "bg-indigo-50 text-indigo-700"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    ].join(" ");

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-8 px-6 py-3">
        {/* Logo + titre */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <span className="text-sm font-bold">GS</span>
          </div>

          <h1 className="whitespace-nowrap text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
            Gestion de Stock
          </h1>
        </div>

        {/* Navigation */}
        <nav className="hidden flex-1 items-center justify-center gap-3 text-sm lg:flex">
          <NavLink to="/" className={navClass}>
            Stock
          </NavLink>

          <NavLink to="/destinations" className={navClass}>
            Destinations
          </NavLink>

          <NavLink to="/history" className={navClass}>
            Historique
          </NavLink>

          <NavLink to="/machines-affectees" className={navClass}>
            Machines Affectées
          </NavLink>

          <NavLink to="/delivrees" className={navClass}>
            Machines délivrées
          </NavLink>
        </nav>

        {/* Zone droite */}
        <div className="flex shrink-0 items-center gap-3">
          {isAuthed ? (
            <>
              <div className="flex min-w-[230px] items-center gap-3 rounded-xl bg-slate-100 px-4 py-2 ring-1 ring-slate-200">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-600 text-white">
                  <IconUser />
                </div>

                <div className="min-w-0 leading-4">
                  <div className="truncate text-[13px] font-semibold text-slate-900">
                    {displayName}
                  </div>

                  <div className="truncate text-xs text-slate-500">
                    {userEmail}
                  </div>
                </div>
              </div>

              <button
                onClick={logout}
                title="Se déconnecter"
                className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-white shadow-sm transition hover:bg-red-600"
              >
                <IconLogout />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-white shadow-sm transition hover:bg-indigo-700"
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