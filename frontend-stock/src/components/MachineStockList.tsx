// src/components/MachineStockList.tsx
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import * as XLSX from "xlsx";
import AddMachineModal from "./AddMachineModal";
import EditMachineModal from "./EditMachineModal";
import AssignDestinationModal from "./AssignDestinationModal";
import { api } from "../lib/api";
type Role = 'ADMIN' | 'MANAGER' | 'VIEWER';

function readRoleFromStorage(): Role {
  try {
    const raw = localStorage.getItem('user');
    const u = raw ? JSON.parse(raw) : null;
    const r = (u?.roles?.[0] || u?.role || 'VIEWER').toString().toUpperCase();
    return (['ADMIN','MANAGER','VIEWER'].includes(r) ? r : 'VIEWER') as Role;
  } catch { return 'VIEWER'; }
}


const RepairMachinesSection = lazy(() => import("./RepairMachinesSection"));

interface Machine {
  id: number;
  type: string;
  reference: string;
  numSerie: string;
  numInventaire: string;
  createdAt: string;
  status: string;
  destinationId?: number | null;
}

const CATEGORIES = [
  { key: "unité centrale", label: "Unités Centraux" },
  { key: "imprimante", label: "Imprimantes" },
  { key: "écran", label: "Écrans" },
  { key: "scanner", label: "Scanners" },
  { key: "téléphone", label: "Téléphones" },
  { key: "pc portable", label: "PCs Portables" },
];

// Normalisation pour filtre / onglets
const NORMALIZE: Record<string, string> = {
  "unite centrale": "unité centrale",
  "unité centrale": "unité centrale",
  uc: "unité centrale",
  pc: "pc portable",
  "pc portable": "pc portable",
  imprimante: "imprimante",
  écran: "écran",
  ecran: "écran",
  scanner: "scanner",
  telephone: "téléphone",
  téléphone: "téléphone",
};

const MachineStockList = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [activeCat, setActiveCat] = useState<string>(CATEGORIES[0].key);
  const [openAdd, setOpenAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [assignTargetId, setAssignTargetId] = useState<number | null>(null);

  // Edition
  const [editTarget, setEditTarget] = useState<Machine | null>(null);

  // UI
  const [banner, setBanner] = useState<string | null>(null);
  const [showDeleteForId, setShowDeleteForId] = useState<number | null>(null); // affichage corbeille par double-clic
  const [role, setRole] = useState<Role>('VIEWER');

  useEffect(() => {
    setRole(readRoleFromStorage());
  }, []);

  const canCreate = role === 'ADMIN' || role === 'MANAGER';
  const canAssign = role === 'ADMIN' || role === 'MANAGER';
  const canEdit   = role === 'ADMIN' || role === 'MANAGER';
  const canDelete = role === 'ADMIN';

  /*const loadMachines = async () => {
    try {
      const res = await fetch("/machines");
      if (!res.ok) throw new Error(`GET /machines ${res.status}`);
      const txt = await res.text();
      const data: Machine[] = txt ? JSON.parse(txt) : [];
      // Section STOCK : status 'stocké' & pas de destination
      const onlyStock = data.filter((m) => m.status === "stocké" && !m.destinationId);
      setMachines(onlyStock);
    } catch {
      setMachines([]);
    }
  };*/
  const loadMachines = async () => {
  try {
    const data = await api<Machine[]>("/machines");
    const onlyStock = data.filter((m) => m.status === "stocké" && !m.destinationId);
    setMachines(onlyStock);
  } catch {
    setMachines([]);
  }
};


  useEffect(() => {
    loadMachines();
  }, []);

  const normalizedType = (t: string) => NORMALIZE[t.toLowerCase()] ?? t.toLowerCase();

  const filteredByCategory = useMemo(
    () => machines.filter((m) => normalizedType(m.type) === activeCat),
    [machines, activeCat]
  );

  const filteredBySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return filteredByCategory;
    return filteredByCategory.filter((m) =>
      [m.reference, m.numSerie, m.numInventaire].some((v) => v.toLowerCase().includes(q))
    );
  }, [filteredByCategory, search]);

  /*const deleteOne = async (id: number) => {
    const ok = confirm("Voulez-vous vraiment supprimer cette machine ?");
    if (!ok) return;
    await fetch(`/machines/${id}`, { method: "DELETE" }).catch(() => {});
    await loadMachines();
    setShowDeleteForId(null);
    setBanner("La machine a été supprimée.");
    setTimeout(() => setBanner(null), 2500);
  };*/
  const deleteOne = async (id: number) => {
  const ok = confirm("Voulez-vous vraiment supprimer cette machine ?");
  if (!ok) return;
  await api<void>(`/machines/${id}`, { method: "DELETE" }).catch(() => {});
  await loadMachines();
  setShowDeleteForId(null);
  setBanner("La machine a été supprimée.");
  setTimeout(() => setBanner(null), 2500);
};


  // Export Excel : un onglet par type, machines visibles en stock (toutes, pas seulement la catégorie active)
  const exportStockExcel = () => {
    // Regrouper par type normalisé
    const byType = machines.reduce<Record<string, Machine[]>>((acc, m) => {
      const key = normalizedType(m.type) || "Divers";
      if (!acc[key]) acc[key] = [];
      acc[key].push(m);
      return acc;
    }, {});

    const wb = XLSX.utils.book_new();
    // garder l'ordre des CATEGORIES pour les feuilles, puis les autres types
    const knownOrder = CATEGORIES.map((c) => c.key);
    const allTypes = Array.from(new Set([...knownOrder, ...Object.keys(byType)])).filter(
      (t) => byType[t] && byType[t].length > 0
    );

    allTypes.forEach((typeKey) => {
      const rows = (byType[typeKey] || []).map((m) => ({
        Référence: m.reference,
        "N° Série": m.numSerie,
        "N° Inventaire": m.numInventaire,
        Type: m.type,
        "Créée le": new Date(m.createdAt).toLocaleString(),
        Statut: m.status,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const label =
        CATEGORIES.find((c) => c.key === typeKey)?.label || typeKey || "Divers";
      const safeName = label.slice(0, 30).replace(/[\\/?*\][:]/g, "-");
      XLSX.utils.book_append_sheet(wb, ws, safeName || "Divers");
    });

    XLSX.writeFile(wb, "machines_stock_par_type.xlsx");
  };

  return (
    <div className="mx-auto mt-8 max-w-7xl space-y-8">
      {/* HEADER */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-50 via-white to-emerald-50 p-6 shadow-sm ring-1 ring-gray-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion du Stock</h1>

          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportStockExcel}
              className="rounded-xl border px-3 py-2 text-sm font-medium text-gray-800 hover:bg-white bg-gradient-to-b from-white to-gray-50 shadow-sm"
              title="Exporter le stock (onglets par type)"
            >
              Export Excel (stock)
            </button>
            <button
              onClick={canCreate ? () => setOpenAdd(true) : undefined}
              className={[
                "rounded-xl px-3 py-2 text-sm font-medium text-white shadow",
                canCreate ? "bg-emerald-600 hover:bg-emerald-700" : "bg-emerald-600 opacity-50 cursor-not-allowed"
              ].join(" ")}
            >
              + Nouvelle machine
            </button>

          </div>
        </div>
        {banner && (
          <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">
            {banner}
          </div>
        )}
      </div>

      {/* ===== SECTION STOCK (en premier) ===== */}
      <section className="rounded-2xl bg-white p-6 shadow ring-1 ring-gray-200 space-y-5">
        {/* Barre de recherche soignée */}
        <div className="rounded-2xl border bg-gradient-to-r from-white to-slate-50 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[260px]">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                {/* loupe */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l4.387 4.387-1.415 1.415-4.386-4.388zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clipRule="evenodd" />
                </svg>
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher dans le stock (référence, n° de série, n° inventaire)"
                className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-9 py-2 text-sm outline-none focus:border-emerald-400"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100"
                  title="Effacer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Onglets de types */}
            <div className="w-full md:w-auto flex flex-wrap gap-2 md:ml-auto">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => {
                    setActiveCat(c.key);
                    setShowDeleteForId(null);
                  }}
                  className={[
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    activeCat === c.key
                      ? "bg-blue-600 text-white shadow"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  ].join(" ")}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {filteredBySearch.length} élément(s) dans “{CATEGORIES.find((c) => c.key === activeCat)?.label}”.
          </div>
        </div>

        {/* Tableau aéré */}
        <div className="relative overflow-x-auto rounded-2xl ring-1 ring-gray-200">
          <table className="w-full text-left text-sm text-gray-700">
            <thead className="bg-gray-50 text-xs uppercase">
              <tr>
                <th className="px-5 py-3">Référence</th>
                <th className="px-5 py-3">N° Série</th>
                <th className="px-5 py-3">N° Inventaire</th>
                <th className="px-5 py-3">Créée le</th>
                <th className="px-5 py-3">Destination</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBySearch.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Aucune machine dans cette catégorie.
                  </td>
                </tr>
              ) : (
                filteredBySearch.map((m) => {
                  const showDelete = showDeleteForId === m.id;
                  return (
                    <tr
                      key={m.id}
                      className="border-t hover:bg-gray-50 transition"
                      onDoubleClick={() => {
                        if (!canDelete) return; 
                        setShowDeleteForId((prev) => (prev === m.id ? null : m.id));
                      }}
                      title={canDelete ? "Double-cliquez pour afficher la suppression" : "Suppression réservée à l'administrateur"}
>
                      <td className="px-5 py-3">
                        <span className="font-medium text-gray-900">{m.reference}</span>
                      </td>
                      <td className="px-5 py-3">{m.numSerie}</td>
                      <td className="px-5 py-3">{m.numInventaire}</td>
                      <td className="px-5 py-3">{new Date(m.createdAt).toLocaleString()}</td>

                      {/* Destination : bouton uniquement */}
                      <td className="px-5 py-3">
                        <button
                        onClick={canAssign ? () => setAssignTargetId(m.id) : undefined}
                        disabled={!canAssign}
                        className={[
                          "rounded-lg px-3 py-1.5 text-xs font-medium text-white",
                          canAssign ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-600 opacity-50 cursor-not-allowed"
                        ].join(" ")}
                        title={canAssign ? "Affecter par hiérarchie" : "Permission requise (ADMIN ou MANAGER)"}
                      >
                        Affecter
                      </button>
                                            </td>

                      {/* Actions : éditer + (optionnel) supprimer si double-clic */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            className={[
                              "rounded p-1",
                              canEdit ? "hover:bg-gray-100" : "opacity-50 cursor-not-allowed"
                            ].join(" ")}
                            title={canEdit ? "Modifier" : "Permission requise (ADMIN ou MANAGER)"}
                            onClick={canEdit ? () => setEditTarget(m) : undefined}
                            disabled={!canEdit}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm18-11.5a1 1 0 0 0 0-1.41l-1.59-1.59a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.08-1.08z" />
                            </svg>
                          </button>


                          {canDelete && showDelete && (
                          <button
                            onClick={() => deleteOne(m.id)}
                            className="rounded p-1 text-red-600 hover:bg-red-50"
                            title="Supprimer (ADMIN uniquement)"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 3h6a1 1 0 0 1 1 1v1h4v2h-1v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7H4V5h4V4a1 1 0 0 1 1-1zm1 4H7v12h10V7h-3H10zm1 3h2v7h-2V10zm-4 0h2v7H7v-7zm8 0h2v7h-2v-7zM10 5h4V4h-4v1z" />
                            </svg>
                          </button>
                        )}

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </section>

      {/* ===== SECTION RÉPARATIONS (en dessous) ===== */}
      <section className="rounded-2xl bg-white p-6 shadow ring-1 ring-gray-200">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Machines en cours de réparation</h2>

        </div>

        <Suspense
          fallback={
            <div className="animate-pulse space-y-3">
              <div className="h-5 w-40 rounded bg-gray-200" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="h-28 rounded-xl bg-gray-100" />
                <div className="h-28 rounded-xl bg-gray-100" />
              </div>
            </div>
          }
        >
          <RepairMachinesSection
            onDone={() => {
              // rafraîchir la partie stock si besoin
              loadMachines();
              setBanner("Réparation terminée : machine renvoyée à sa juridiction source.");
              setTimeout(() => setBanner(null), 2500);
            }}
          />
        </Suspense>
      </section>

      {/* Modales */}
      <AddMachineModal
        open={openAdd && canCreate}
        onClose={() => setOpenAdd(false)}
        defaultType={activeCat}
        onCreated={loadMachines}
      />

      <EditMachineModal
        open={!!editTarget && canEdit}
        machine={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={async () => {
          await loadMachines();
          setEditTarget(null);
        }}
      />

      <AssignDestinationModal
        open={assignTargetId != null && canAssign}
        machineId={assignTargetId}
        onClose={() => setAssignTargetId(null)}
        onAssigned={loadMachines}
      />
    </div>
  );
};

export default MachineStockList;
