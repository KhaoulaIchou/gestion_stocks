// src/components/MachinesAffectees.tsx
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import * as XLSX from "xlsx";
import AssignDestinationModal from "./AssignDestinationModal";
import { api } from "../lib/api";

type Role = "ADMIN" | "MANAGER" | "VIEWER";

interface Machine {
  id: number;
  type: string;
  marque?: string | null;
  reference: string;
  numSerie: string;
  numInventaire: string;
  referenceMarche?: string | null;
  etat?: string | null;
  createdAt: string;
  status: string;
  destinationId?: number | null;
  affectataireId?: number | null;

  destination?: {
    id: number;
    bureau?: string | null;
    etablissement?: {
      id: number;
      nom: string;
    } | null;
    service?: {
      id: number;
      nom: string;
    } | null;
  } | null;

  affectataire?: {
    id: number;
    nom: string;
    type: string;
  } | null;
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

  imprimante: "imprimante",

  écran: "écran",
  ecran: "écran",

  scanner: "scanner",

  telephone: "téléphone",
  téléphone: "téléphone",

  pc: "pc portable",
  "pc portable": "pc portable",
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

function isDeliveredStatus(status?: string | null) {
  const value = String(status || "").trim().toLowerCase();

  return (
    value.includes("délivr") ||
    value.includes("delivr") ||
    value === "delivree" ||
    value === "délivrée"
  );
}

function isRepairStatus(status?: string | null) {
  const value = String(status || "").trim().toLowerCase();

  return (
    value.includes("réparation") ||
    value.includes("reparation") ||
    value.includes("repair")
  );
}

function isAffectedMachine(machine: Machine) {
  const status = String(machine.status || "").trim().toLowerCase();

  const affectedByStatus =
    status === "affectée" ||
    status === "affectee" ||
    status.includes("affect");

  return (
    !isDeliveredStatus(machine.status) &&
    !isRepairStatus(machine.status) &&
    (affectedByStatus || Boolean(machine.destinationId))
  );
}

function destinationLabel(machine: Machine) {
  const etablissement = machine.destination?.etablissement?.nom?.trim();
  const service = machine.destination?.service?.nom?.trim();
  const bureau = machine.destination?.bureau?.trim();

  const parts: string[] = [];

  if (etablissement) {
    parts.push(etablissement);
  }

  if (service) {
    parts.push(service);
  }

  if (
    bureau &&
    bureau.toLowerCase() !== service?.toLowerCase() &&
    bureau.toLowerCase() !== etablissement?.toLowerCase()
  ) {
    parts.push(bureau);
  }

  return parts.join(" - ") || "Stock";
}

function affectataireLabel(machine: Machine) {
  return machine.affectataire?.nom || "—";
}

export default function MachinesAffectees() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [activeCat, setActiveCat] = useState<string>("unité centrale");
  const [search, setSearch] = useState("");
  const [assignTargetId, setAssignTargetId] = useState<number | null>(null);
  const [deliverTargetId, setDeliverTargetId] = useState<number | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("VIEWER");

  const canAssign = role === "ADMIN" || role === "MANAGER";
  const canEdit = role === "ADMIN" || role === "MANAGER";

  const loadMachines = async () => {
    try {
      const data = await api<Machine[]>("/machines");
      const affectees = data.filter((machine) => isAffectedMachine(machine));

      setMachines(affectees);
    } catch {
      setMachines([]);
    }
  };

  useEffect(() => {
    setRole(readRoleFromStorage());
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

    return filteredByCategory.filter((machine) => {
      const text = [
        machine.reference,
        machine.numSerie,
        machine.numInventaire,
        machine.marque,
        machine.referenceMarche,
        machine.etat,
        machine.status,
        machine.affectataire?.nom,
        machine.destination?.etablissement?.nom,
        machine.destination?.service?.nom,
        machine.destination?.bureau,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return text.includes(q);
    });
  }, [filteredByCategory, search]);

  const addToDelivered = async (id: number) => {
    try {
      await api<void>(`/machines/${id}/deliver`, { method: "PUT" });

      await loadMachines();

      setDeliverTargetId(null);
      setBanner("La machine a été ajoutée aux délivrées avec succès.");
      setTimeout(() => setBanner(null), 2500);
    } catch {
      setBanner("Erreur lors de l'ajout aux délivrées.");
      setTimeout(() => setBanner(null), 2500);
    }
  };

  const exportStockExcel = () => {
    const byType = machines.reduce<Record<string, Machine[]>>(
      (acc, machine) => {
        const key = normalizedType(machine.type) || "Divers";

        if (!acc[key]) acc[key] = [];
        acc[key].push(machine);

        return acc;
      },
      {}
    );

    const workbook = XLSX.utils.book_new();

    const knownOrder = CATEGORIES.map((category) => category.key);
    const allTypes = Array.from(
      new Set([...knownOrder, ...Object.keys(byType)])
    ).filter((type) => byType[type] && byType[type].length > 0);

    allTypes.forEach((typeKey) => {
      const rows = byType[typeKey].map((machine) => ({
        Référence: machine.reference || "",
        Marque: machine.marque || "",
        "N° Série": machine.numSerie || "",
        "N° Inventaire": machine.numInventaire || "",
        "Référence Marché": machine.referenceMarche || "",
        Etat: machine.etat || "",
        Type: machine.type || "",
        Destination: destinationLabel(machine),
        Affectataire: affectataireLabel(machine),
        "Créée le": machine.createdAt
          ? new Date(machine.createdAt).toLocaleString()
          : "",
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

    XLSX.writeFile(workbook, "machines_affectees_par_type.xlsx");
  };

  return (
    <div className="mx-auto mt-8 max-w-7xl space-y-8">
      <div className="rounded-3xl bg-gradient-to-r from-slate-50 via-white to-emerald-50 p-6 shadow-sm ring-1 ring-gray-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Machines Affectées
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Total machines affectées : {machines.length}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportStockExcel}
              className="rounded-xl border bg-gradient-to-b from-white to-gray-50 px-3 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-white"
              title="Exporter les machines affectées"
            >
              Export Excel
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
                placeholder="Rechercher: référence, série, inventaire, affectataire, service..."
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
                  onClick={() => setActiveCat(category.key)}
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
                <th className="px-5 py-3">État</th>
                <th className="px-5 py-3">Destination / Affectataire</th>
                <th className="px-5 py-3">Statut</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredBySearch.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Aucune machine dans cette catégorie.
                  </td>
                </tr>
              ) : (
                filteredBySearch.map((machine) => (
                  <tr
                    key={machine.id}
                    className="border-t transition hover:bg-gray-50"
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {machine.marque || "—"}
                    </td>

                    <td className="px-5 py-3">{machine.reference || "—"}</td>

                    <td className="px-5 py-3">{machine.numSerie || "—"}</td>

                    <td className="px-5 py-3">
                      {machine.numInventaire || "—"}
                    </td>

                    <td className="px-5 py-3">{machine.etat || "—"}</td>

                    <td className="px-5 py-3">
                      <div className="text-xs text-gray-700">
                        <div className="font-medium">
                          {destinationLabel(machine)}
                        </div>

                        <div className="text-gray-500">
                          {affectataireLabel(machine)}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3">{machine.status || "—"}</td>

                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={
                            canAssign
                              ? () => setAssignTargetId(machine.id)
                              : undefined
                          }
                          disabled={!canAssign}
                          className={[
                            "rounded-lg px-3 py-1.5 text-xs font-medium text-white",
                            canAssign
                              ? "bg-blue-600 hover:bg-blue-700"
                              : "cursor-not-allowed bg-blue-600 opacity-50",
                          ].join(" ")}
                          title={
                            canAssign
                              ? "Affecter par hiérarchie"
                              : "Permission requise (ADMIN ou MANAGER)"
                          }
                        >
                          Affecter
                        </button>

                        <button
                          onClick={
                            canEdit
                              ? () => setDeliverTargetId(machine.id)
                              : undefined
                          }
                          disabled={!canEdit}
                          className={[
                            "rounded-lg px-3 py-1.5 text-xs font-medium text-white",
                            canEdit
                              ? "bg-indigo-600 hover:bg-indigo-700"
                              : "cursor-not-allowed bg-indigo-600 opacity-50",
                          ].join(" ")}
                          title={
                            canEdit
                              ? "Ajouter aux machines délivrées"
                              : "Permission requise (ADMIN ou MANAGER)"
                          }
                        >
                          Ajouter aux délivrées
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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

      {deliverTargetId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDeliverTargetId(null)}
          />

          <div className="relative z-50 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Confirmation
            </h3>

            <p className="mt-3 text-sm text-gray-600">
              Voulez-vous vraiment ajouter cette machine aux délivrées ?
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setDeliverTargetId(null)}
                className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>

              <button
                onClick={() => addToDelivered(deliverTargetId)}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      <AssignDestinationModal
        open={assignTargetId !== null && canAssign}
        machineId={assignTargetId}
        onClose={() => setAssignTargetId(null)}
        onAssigned={() => {
          loadMachines();
          setAssignTargetId(null);
          setBanner("Destination modifiée avec succès.");
          setTimeout(() => setBanner(null), 2500);
        }}
      />
    </div>
  );
}