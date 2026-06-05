// src/components/MachineStockList.tsx
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import * as XLSX from "xlsx";
import AddMachineModal from "./AddMachineModal";
import EditMachineModal from "./EditMachineModal";
import AssignDestinationModal from "./AssignDestinationModal";
import { api } from "../lib/api";

type Role = "ADMIN" | "MANAGER" | "VIEWER";

interface Machine {
  id: number;
  type: string;
  reference: string;
  numSerie: string;
  numInventaire: string;
  createdAt: string;
  status: string;
  destinationId?: number | null;

  marque?: string | null;
  referenceMarche?: string | null;
  etat?: string | null;
}

const RepairMachinesSection = lazy(() => import("./RepairMachinesSection"));

const CATEGORIES = [
  { key: "unité centrale", label: "Unités Centraux" },
  { key: "imprimante", label: "Imprimantes" },
  { key: "écran", label: "Écrans" },
  { key: "scanner", label: "Scanners" },
  { key: "téléphone", label: "Téléphones" },
  { key: "pc portable", label: "PCs Portables" },
];

const NORMALIZE: Record<string, string> = {
  "unite centrale": "unité centrale",
  "unité centrale": "unité centrale",
  "unite_centrale": "unité centrale",
  unitecentrale: "unité centrale",
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

function readRoleFromStorage(): Role {
  try {
    const raw = localStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    const role = (user?.roles?.[0] || user?.role || "VIEWER")
      .toString()
      .toUpperCase();

    if (role === "ADMIN" || role === "MANAGER" || role === "VIEWER") {
      return role;
    }

    return "VIEWER";
  } catch {
    return "VIEWER";
  }
}

function normalizedType(type: string) {
  const key = String(type || "").trim().toLowerCase();
  return NORMALIZE[key] || key;
}

function isStockMachine(machine: Machine) {
  const status = String(machine.status || "").trim().toLowerCase();

  const isStockStatus =
    status === "stocké" ||
    status === "stocke" ||
    status === "en_stock" ||
    status === "stock";

  return isStockStatus && !machine.destinationId;
}

const MachineStockList = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [activeCat, setActiveCat] = useState<string>(CATEGORIES[0].key);
  const [openAdd, setOpenAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [assignTargetId, setAssignTargetId] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<Machine | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [showDeleteForId, setShowDeleteForId] = useState<number | null>(null);
  const [role, setRole] = useState<Role>("VIEWER");

  useEffect(() => {
    setRole(readRoleFromStorage());
  }, []);

  const canCreate = role === "ADMIN" || role === "MANAGER";
  const canAssign = role === "ADMIN" || role === "MANAGER";
  const canEdit = role === "ADMIN" || role === "MANAGER";
  const canDelete = role === "ADMIN";

  const loadMachines = async () => {
    try {
      const data = await api<Machine[]>("/machines");
      const onlyStock = data.filter((machine) => isStockMachine(machine));

      setMachines(onlyStock);
    } catch {
      setMachines([]);
    }
  };

  useEffect(() => {
    loadMachines();
  }, []);

  const filteredByCategory = useMemo(() => {
    return machines.filter(
      (machine) => normalizedType(machine.type) === activeCat
    );
  }, [machines, activeCat]);

  const filteredBySearch = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return filteredByCategory;

    return filteredByCategory.filter((machine) =>
      [
        machine.reference,
        machine.numSerie,
        machine.numInventaire,
        machine.marque,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(q)
      )
    );
  }, [filteredByCategory, search]);

  const deleteOne = async (id: number) => {
    const ok = confirm("Voulez-vous vraiment supprimer cette machine ?");
    if (!ok) return;

    await api<void>(`/machines/${id}`, { method: "DELETE" }).catch(() => {});
    await loadMachines();

    setShowDeleteForId(null);
    setBanner("La machine a été supprimée.");
    setTimeout(() => setBanner(null), 2500);
  };

  const exportStockExcel = () => {
    const byType = machines.reduce<Record<string, Machine[]>>((acc, machine) => {
      const key = normalizedType(machine.type) || "Divers";

      if (!acc[key]) acc[key] = [];
      acc[key].push(machine);

      return acc;
    }, {});

    const workbook = XLSX.utils.book_new();

    const knownOrder = CATEGORIES.map((category) => category.key);
    const allTypes = Array.from(
      new Set([...knownOrder, ...Object.keys(byType)])
    ).filter((type) => byType[type] && byType[type].length > 0);

    allTypes.forEach((typeKey) => {
      const rows = (byType[typeKey] || []).map((machine) => ({
        Marque: machine.marque || "",
        Référence: machine.reference || "",
        "N° Série": machine.numSerie || "",
        "N° Inventaire": machine.numInventaire || "",
        "Ajoutée le": machine.createdAt
          ? new Date(machine.createdAt).toLocaleDateString("fr-FR")
          : "",
        Type: machine.type || "",
        Statut: machine.status || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);

      const label =
        CATEGORIES.find((category) => category.key === typeKey)?.label ||
        typeKey ||
        "Divers";

      const safeName = label.slice(0, 30).replace(/[\\/?*\][:]/g, "-");

      XLSX.utils.book_append_sheet(workbook, worksheet, safeName || "Divers");
    });

    XLSX.writeFile(workbook, "machines_stock_par_type.xlsx");
  };

  return (
    <div className="mx-auto mt-8 max-w-7xl space-y-8">
      <div className="rounded-3xl bg-gradient-to-r from-slate-50 via-white to-emerald-50 p-6 shadow-sm ring-1 ring-gray-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Gestion du Stock
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Total en stock : {machines.length}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportStockExcel}
              className="rounded-xl border bg-gradient-to-b from-white to-gray-50 px-3 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-white"
              title="Exporter le stock par type"
            >
              Export Excel (stock)
            </button>

            <button
              onClick={canCreate ? () => setOpenAdd(true) : undefined}
              disabled={!canCreate}
              className={[
                "rounded-xl px-3 py-2 text-sm font-medium text-white shadow",
                canCreate
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "cursor-not-allowed bg-emerald-600 opacity-50",
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

      <section className="space-y-5 rounded-2xl bg-white p-6 shadow ring-1 ring-gray-200">
        <div className="rounded-2xl border bg-gradient-to-r from-white to-slate-50 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[260px] flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                🔍
              </span>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher dans le stock : marque, référence, n° série, n° inventaire"
                className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-9 text-sm outline-none focus:border-emerald-400"
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

            <div className="flex w-full flex-wrap gap-2 md:ml-auto md:w-auto">
              {CATEGORIES.map((category) => (
                <button
                  key={category.key}
                  onClick={() => {
                    setActiveCat(category.key);
                    setShowDeleteForId(null);
                  }}
                  className={[
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    activeCat === category.key
                      ? "bg-blue-600 text-white shadow"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  ].join(" ")}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 text-xs text-gray-500">
            {filteredBySearch.length} élément(s) dans “
            {CATEGORIES.find((category) => category.key === activeCat)?.label}”.
          </div>
        </div>

        <div className="relative overflow-x-auto rounded-2xl ring-1 ring-gray-200">
          <table className="w-full text-left text-sm text-gray-700">
            <thead className="bg-gray-50 text-xs uppercase">
              <tr>
                <th className="px-5 py-3">Marque</th>
                <th className="px-5 py-3">Référence</th>
                <th className="px-5 py-3">N° Série</th>
                <th className="px-5 py-3">N° Inventaire</th>
                <th className="px-5 py-3">Ajoutée le</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredBySearch.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Aucune machine dans le stock pour cette catégorie.
                  </td>
                </tr>
              ) : (
                filteredBySearch.map((machine) => {
                  const showDelete = showDeleteForId === machine.id;

                  return (
                    <tr
                      key={machine.id}
                      className="border-t transition hover:bg-gray-50"
                      onDoubleClick={() => {
                        if (!canDelete) return;

                        setShowDeleteForId((previous) =>
                          previous === machine.id ? null : machine.id
                        );
                      }}
                      title={
                        canDelete
                          ? "Double-cliquez pour afficher la suppression"
                          : "Suppression réservée à l'administrateur"
                      }
                    >
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {machine.marque || "—"}
                      </td>

                      <td className="px-5 py-3">{machine.reference || "—"}</td>

                      <td className="px-5 py-3">{machine.numSerie || "—"}</td>

                      <td className="px-5 py-3">
                        {machine.numInventaire || "—"}
                      </td>

                      <td className="px-5 py-3">
                        {machine.createdAt
                          ? new Date(machine.createdAt).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={
                              canAssign
                                ? () => setAssignTargetId(machine.id)
                                : undefined
                            }
                            disabled={!canAssign}
                            className={[
                              "rounded border px-2 py-1 text-xs",
                              canAssign
                                ? "text-blue-700 hover:bg-blue-50"
                                : "cursor-not-allowed opacity-50",
                            ].join(" ")}
                          >
                            Affecter
                          </button>

                          <button
                            className={[
                              "rounded border px-2 py-1 text-xs",
                              canEdit
                                ? "hover:bg-gray-100"
                                : "cursor-not-allowed opacity-50",
                            ].join(" ")}
                            title={
                              canEdit
                                ? "Modifier"
                                : "Permission requise (ADMIN ou MANAGER)"
                            }
                            onClick={
                              canEdit
                                ? () => setEditTarget(machine)
                                : undefined
                            }
                            disabled={!canEdit}
                          >
                            Modifier
                          </button>

                          {canDelete && showDelete && (
                            <button
                              onClick={() => deleteOne(machine.id)}
                              className="rounded border px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                              title="Supprimer"
                            >
                              Supprimer
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

      <section className="rounded-2xl bg-white p-6 shadow ring-1 ring-gray-200">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Machines en cours de réparation
          </h2>
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
              loadMachines();
              setBanner(
                "Réparation terminée : machine renvoyée à sa juridiction source."
              );
              setTimeout(() => setBanner(null), 2500);
            }}
          />
        </Suspense>
      </section>

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
        open={assignTargetId !== null && canAssign}
        machineId={assignTargetId}
        onClose={() => setAssignTargetId(null)}
        onAssigned={loadMachines}
      />
    </div>
  );
};

export default MachineStockList;