// src/components/HistoryPage.tsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import { api } from "../lib/api";

/** ---- Rôles (lecture depuis localStorage) ---- */
type Role = "ADMIN" | "MANAGER" | "VIEWER";
const readRole = (): Role => {
  try {
    const raw = localStorage.getItem("user");
    const u = raw ? JSON.parse(raw) : null;
    const r = (u?.roles?.[0] || u?.role || "VIEWER").toString().toUpperCase();
    return (["ADMIN", "MANAGER", "VIEWER"].includes(r) ? r : "VIEWER") as Role;
  } catch {
    return "VIEWER";
  }
};

/** ---- Types ---- */
type History = {
  id: number;
  from?: string | null;
  to: string;
  changedAt: string; // ISO
  machine: { id: number; reference: string; type?: string | null };
};

type MachineRow = {
  id: number;
  reference: string;
  numSerie: string;
  numInventaire: string;
};

/** ---- Utils ---- */
const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return isNaN(+d) ? iso : d.toLocaleString();
};
const ymd = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(+d)) return "0000-00-00";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};
const tl = (s: string) => (s || "").trim().toLowerCase();

/** ---- Livraison helpers ---- */
const IS_DELIVERED_LABEL = "machines délivrées";
function isDeliveredTo(to: string) {
  return tl(to).includes(tl(IS_DELIVERED_LABEL)) || tl(to).includes("délivr");
}
// Résumé par référence
function buildRefMilestones(items: History[]) {
  const sorted = items
    .slice()
    .sort((a, b) => +new Date(a.changedAt) - +new Date(b.changedAt));
  const affectEvt = sorted.find(
    (h) => (!h.from || tl(h.from) === "stock") && !isDeliveredTo(h.to)
  );
  const deliveredEvt = [...sorted].reverse().find((h) => isDeliveredTo(h.to));
  return {
    affectDate: affectEvt ? new Date(affectEvt.changedAt) : null,
    deliveredDate: deliveredEvt ? new Date(deliveredEvt.changedAt) : null,
  };
}

/** ---- Modal détails machines (avec suppression) ---- */
function DetailsModal({
  open,
  onClose,
  title,
  items, // items d’historique du groupe (chaque ligne est un mouvement)
  machineIndex,
  onDeleted, // callback async après suppression
  canDelete,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  items: History[];
  machineIndex: Map<number, MachineRow>;
  onDeleted: (historyId: number) => Promise<void>;
  canDelete: boolean;
}) {
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [confirmLabel, setConfirmLabel] = useState<string>("");
  const [deleting, setDeleting] = useState(false);

  if (!open) return null;

  // Une ligne par élément d’historique (précis)
  const list = items
    .slice()
    .sort((a, b) => +new Date(b.changedAt) - +new Date(a.changedAt))
    .map((h) => {
      const m = machineIndex.get(h.machine.id);
      return {
        histId: h.id,
        reference: h.machine.reference,
        numSerie: m?.numSerie || "",
        numInventaire: m?.numInventaire || "",
        when: h.changedAt,
      };
    });

  function askDelete(row: (typeof list)[number]) {
    if (!canDelete) return; // VIEWER => no-op
    setConfirmId(row.histId);
    setConfirmLabel(
      `Réf: ${row.reference} — Inv: ${row.numInventaire} — ${fmtDateTime(
        row.when
      )}`
    );
  }

  async function doDelete() {
    if (!confirmId) return;
    try {
      setDeleting(true);
      await api<void>(`/history/${confirmId}`, { method: "DELETE" });
      // Attendre le rechargement côté parent avant de fermer le modal
      await onDeleted(confirmId);
    } finally {
      setDeleting(false);
      setConfirmId(null);
      setConfirmLabel("");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="text-lg font-semibold text-gray-900">{title}</div>
            <div className="mt-1 text-xs text-gray-500">
              {canDelete
                ? "Double-cliquez sur une ligne ou cliquez sur l’icône pour supprimer."
                : "Lecture seule : vous n’avez pas la permission de supprimer."}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-2 text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[60vh] overflow-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-600">
              <tr>
                <th className="px-3 py-2">Référence</th>
                <th className="px-3 py-2">N° Série</th>
                <th className="px-3 py-2">N° Inventaire</th>
                <th className="px-3 py-2">Date</th>
                {canDelete && <th className="px-3 py-2 text-right">Action</th>}
              </tr>
            </thead>
            <tbody>
              {list.map((row) => (
                <tr
                  key={row.histId}
                  className={`border-t ${
                    canDelete ? "cursor-pointer hover:bg-red-50" : "opacity-80"
                  }`}
                  onDoubleClick={() => canDelete && askDelete(row)}
                  title={
                    canDelete
                      ? "Double-cliquez pour supprimer"
                      : "Suppression non autorisée"
                  }
                >
                  <td className="px-3 py-2">{row.reference}</td>
                  <td className="px-3 py-2">{row.numSerie}</td>
                  <td className="px-3 py-2">{row.numInventaire}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {fmtDateTime(row.when)}
                  </td>
                  {canDelete && (
                    <td className="px-3 py-2">
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            canDelete && askDelete(row);
                          }}
                          disabled={!canDelete}
                          className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                            canDelete
                              ? "border-red-200 text-red-600 hover:bg-red-50"
                              : "border-gray-200 text-gray-400 cursor-not-allowed"
                          }`}
                          title={
                            canDelete
                              ? "Supprimer ce mouvement"
                              : "Permission requise (ADMIN ou MANAGER)"
                          }
                        >
                          {/* Icône poubelle inline */}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-4 w-4"
                            aria-hidden="true"
                          >
                            <path d="M9 3a1 1 0 0 0-1 1v1H5.5a1 1 0 1 0 0 2H6v12a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7h.5a1 1 0 1 0 0-2H16V4a1 1 0 0 0-1-1H9Zm2 2h2V5h-2v0ZM8 7h8v12a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V7Zm2 3a1 1 0 1 0-2 0v8a1 1 0 1 0 2 0v-8Zm6 0a1 1 0 1 0-2 0v8a1 1 0 1 0 2 0v-8Z" />
                          </svg>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td
                    colSpan={canDelete ? 5 : 4}
                    className="px-3 py-6 text-center text-gray-500"
                  >
                    Aucune donnée trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-right">
          <button
            onClick={onClose}
            className="rounded border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Fermer
          </button>
        </div>

        {/* Confirmation stylée */}
        <AnimatePresence>
          {confirmId !== null && (
            <div className="absolute inset-0 z-20 grid place-items-center">
              <div className="absolute inset-0 bg-black/30" />
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                className="relative z-30 w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-gray-200"
              >
                <div className="text-base font-semibold text-gray-900">
                  Confirmer la suppression
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  Voulez-vous vraiment supprimer ce mouvement ?
                </div>
                <div className="mt-2 rounded-md bg-gray-50 p-3 text-xs text-gray-700">
                  {confirmLabel}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setConfirmId(null);
                      setConfirmLabel("");
                    }}
                    className="rounded border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    disabled={deleting}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={doDelete}
                    disabled={deleting}
                    className={`rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white ${
                      deleting ? "opacity-70" : "hover:bg-red-700"
                    }`}
                  >
                    {deleting ? "Suppression…" : "Supprimer"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/** ---- Page ---- */
const PAGE = 30;

export default function HistoryPage() {
  const [hist, setHist] = useState<History[]>([]);
  const [machines, setMachines] = useState<MachineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // rôle & permission suppression
  const [role, setRole] = useState<Role>("VIEWER");
  useEffect(() => {
    setRole(readRole());
  }, []);
  const canDelete = role === "ADMIN" || role === "MANAGER";

  // recherches
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // vues + tris
  const [mode, setMode] = useState<"timeline" | "reference">("timeline");
  const [timelineOrder, setTimelineOrder] = useState<"desc" | "asc">("desc");
  const [refSort, setRefSort] = useState<"asc" | "desc">("asc");

  // pagination
  const [limit, setLimit] = useState(PAGE);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalItems, setModalItems] = useState<History[]>([]);

  // fetchers
  const loadAll = async () => {
    setLoading(true);
    try {
      const d1 = await api<History[]>("/history");
      const d2 = await api<any[]>("/machines");

      setHist(d1);
      setMachines(
        d2.map((m) => ({
          id: m.id,
          reference: m.reference,
          numSerie: m.numSerie,
          numInventaire: m.numInventaire,
        }))
      );
    } catch (e: any) {
      setErr(e?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const machineIndex = useMemo(() => {
    const map = new Map<number, MachineRow>();
    machines.forEach((m) => map.set(m.id, m));
    return map;
  }, [machines]);

  /** ---- Filtres combinés ---- */
  const filtered = useMemo(() => {
    const refq = tl(q);
    const from = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59") : null;

    return hist.filter((h) => {
      const ch = new Date(h.changedAt);
      if (from && ch < from) return false;
      if (to && ch > to) return false;

      if (!refq) return true;
      const ref = tl(h.machine.reference);
      if (ref.includes(refq)) return true;

      const mi = machineIndex.get(h.machine.id);
      if (!mi) return false;
      return (
        tl(mi.numSerie).includes(refq) || tl(mi.numInventaire).includes(refq)
      );
    });
  }, [hist, q, dateFrom, dateTo, machineIndex]);

  /** ---- Tri par date ---- */
  const sortedByDate = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const diff = +new Date(b.changedAt) - +new Date(a.changedAt);
      return timelineOrder === "desc" ? diff : -diff;
    });
  }, [filtered, timelineOrder]);

  const paged = useMemo(() => sortedByDate.slice(0, limit), [sortedByDate, limit]);
  const canMore = paged.length < sortedByDate.length;

  /** ---- TIMELINE : Date -> Réf -> (from||to) ---- */
  type TLByDateRef = Record<
    string,
    Record<string, Record<string, { items: History[] }>>
  >;

  const timelineGroupedByDateRef = useMemo(() => {
    const g: TLByDateRef = {};
    for (const h of paged) {
      const day = ymd(h.changedAt);
      const ref = h.machine.reference;
      const ft = `${h.from || ""}||${h.to}`;
      if (!g[day]) g[day] = {};
      if (!g[day][ref]) g[day][ref] = {};
      if (!g[day][ref][ft]) g[day][ref][ft] = { items: [] };
      g[day][ref][ft].items.push(h);
    }
    return Object.entries(g).sort(([a], [b]) =>
      timelineOrder === "desc" ? (a < b ? 1 : -1) : a < b ? -1 : 1
    );
  }, [paged, timelineOrder]);

  /** ---- Vue PAR RÉFÉRENCE ---- */
  type ByRef = Record<
    string,
    Record<string, Record<string, { items: History[] }>>
  >;

  const groupedByReference: ByRef = useMemo(() => {
    const g: ByRef = {};
    for (const h of paged) {
      const R = h.machine.reference;
      const D = ymd(h.changedAt);
      const FT = `${h.from || ""}||${h.to}`;
      if (!g[R]) g[R] = {};
      if (!g[R][D]) g[R][D] = {};
      if (!g[R][D][FT]) g[R][D][FT] = { items: [] };
      g[R][D][FT].items.push(h);
    }
    return g;
  }, [paged]);

  // tri des références
  const sortedRefs = useMemo(() => {
    const refs = Object.keys(groupedByReference);
    refs.sort((a, b) =>
      refSort === "asc" ? a.localeCompare(b, "fr") : b.localeCompare(a, "fr")
    );
    return refs;
  }, [groupedByReference, refSort]);

  // Ouvrir modal : on passe la liste d’items (précis)
  const openDetails = (
    reference: string,
    day: string,
    from: string,
    to: string,
    items: History[]
  ) => {
    setModalTitle(
      `${reference} • ${new Date(day).toLocaleDateString()} • ${
        from || "—"
      } → ${to}`
    );
    setModalItems(items);
    setModalOpen(true);
  };

  // Après suppression : recharger et fermer
  const handleDeleted = async (_historyId: number) => {
    await loadAll();
    setModalOpen(false);
  };

  /** ---- Export Excel ---- */
  const exportExcel = () => {
    const rows = sortedByDate.map((h) => {
      const m = machineIndex.get(h.machine.id);
      return {
        Date: fmtDateTime(h.changedAt),
        Référence: h.machine.reference,
        "N° Série": m?.numSerie || "",
        "N° Inventaire": m?.numInventaire || "",
        De: h.from || "",
        À: h.to,
        Type: h.machine.type || "",
      };
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Historique");
    XLSX.writeFile(wb, "historique_filtré.xlsx");
  };

  /** ---- UI ---- */
  if (loading) {
    return (
      <div className="mx-auto mt-10 max-w-7xl rounded-2xl bg-white p-8 shadow">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-56 rounded bg-gray-200" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="h-10 rounded bg-gray-100" />
            <div className="h-10 rounded bg-gray-100" />
            <div className="h-10 rounded bg-gray-100" />
            <div className="h-10 rounded bg-gray-100" />
          </div>
          <div className="h-40 rounded-xl bg-gray-100" />
        </div>
      </div>
    );
  }
  if (err) {
    return (
      <div className="mx-auto mt-10 max-w-3xl rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <div className="mb-2 text-lg font-semibold">Erreur</div>
        <div className="text-sm">{err}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-8 max-w-7xl space-y-6">
      {/* Header + Recherches + Actions */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-50 to-sky-50 p-6 shadow-sm ring-1 ring-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Historique des affectations
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAll}
              className="rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Rafraîchir
            </button>
            <button
              onClick={exportExcel}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Export Excel
            </button>
          </div>
        </div>

        {/* Barre de recherche + dates */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(PAGE);
            }}
            placeholder="Référence / Série / Inventaire…"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setLimit(PAGE);
            }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setLimit(PAGE);
            }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
          {q || dateFrom || dateTo ? (
            <button
              onClick={() => {
                setQ("");
                setDateFrom("");
                setDateTo("");
                setLimit(PAGE);
              }}
              className="rounded-xl border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Réinitialiser
            </button>
          ) : (
            <div />
          )}
        </div>

        {/* Sélecteurs de vue + tri */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setMode("timeline")}
            className={[
              "rounded-full px-3 py-1 text-xs font-medium",
              mode === "timeline"
                ? "bg-blue-600 text-white shadow"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            ].join(" ")}
          >
            Timeline
          </button>
          <button
            onClick={() => setMode("reference")}
            className={[
              "rounded-full px-3 py-1 text-xs font-medium",
              mode === "reference"
                ? "bg-blue-600 text-white shadow"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            ].join(" ")}
          >
            Par Référence
          </button>

          {mode === "timeline" ? (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-gray-600">Tri :</span>
              <button
                onClick={() => setTimelineOrder("desc")}
                className={[
                  "rounded-full px-3 py-1 text-xs font-medium",
                  timelineOrder === "desc"
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                ].join(" ")}
              >
                Récent → Ancien
              </button>
              <button
                onClick={() => setTimelineOrder("asc")}
                className={[
                  "rounded-full px-3 py-1 text-xs font-medium",
                  timelineOrder === "asc"
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                ].join(" ")}
              >
                Ancien → Récent
              </button>
            </div>
          ) : (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-gray-600">Trier références :</span>
              <button
                onClick={() => setRefSort("asc")}
                className={[
                  "rounded-full px-3 py-1 text-xs font-medium",
                  refSort === "asc"
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                ].join(" ")}
              >
                A → Z
              </button>
              <button
                onClick={() => setRefSort("desc")}
                className={[
                  "rounded-full px-3 py-1 text-xs font-medium",
                  refSort === "desc"
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                ].join(" ")}
              >
                Z → A
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contenu */}
      {mode === "timeline" ? (
        /* --- VUE TIMELINE : Jour -> Référence -> Parcours --- */
        <div className="space-y-6">
          <AnimatePresence>
            {timelineGroupedByDateRef.map(([day, byRef]) => (
              <motion.section
                key={day}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl bg-white p-5 shadow ring-1 ring-gray-200"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">
                    {new Date(day).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {
                      Object.values(byRef as TLByDateRef[string]).reduce(
                        (acc, byFT) =>
                          acc +
                          Object.values(byFT).reduce(
                            (s: number, v) => s + v.items.length,
                            0
                          ),
                        0
                      )
                    }{" "}
                    mouvement(s)
                  </div>
                </div>

                <div className="space-y-4">
                  {Object.entries(byRef as TLByDateRef[string])
                    .sort(([a], [b]) => a.localeCompare(b, "fr"))
                    .map(([reference, byFT]) => (
                      <div
                        key={reference}
                        className="rounded-xl border border-gray-100 p-4"
                      >
                        <div className="mb-2 text-sm font-semibold text-gray-900">
                          {reference}
                        </div>

                        <div className="space-y-2">
                          {Object.entries(byFT)
                            .sort(([a], [b]) => a.localeCompare(b, "fr"))
                            .map(([ft, payload]) => {
                              const [from, to] = ft.split("||");
                              const count = payload.items.length;
                              const delivered = isDeliveredTo(to);
                              const first = payload.items
                                .slice()
                                .sort(
                                  (A, B) =>
                                    +new Date(B.changedAt) -
                                    +new Date(A.changedAt)
                                )[0];

                              return (
                                <div
                                  key={ft}
                                  className={[
                                    "flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3",
                                    delivered
                                      ? "border-indigo-200 bg-indigo-50"
                                      : "border-gray-100 bg-gray-50",
                                  ].join(" ")}
                                >
                                  <div className="min-w-0">
                                    <div className="text-sm">
                                      <span className="font-medium text-gray-800">
                                        {from || "—"}
                                      </span>
                                      <span className="mx-2 text-gray-400">
                                        →
                                      </span>
                                      {delivered ? (
                                        <span className="inline-flex items-center rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
                                          DÉLIVRÉE
                                        </span>
                                      ) : (
                                        <span className="font-medium text-gray-800">
                                          {to}
                                        </span>
                                      )}
                                    </div>
                                    {first && (
                                      <div className="mt-0.5 text-xs text-gray-500">
                                        {fmtDateTime(first.changedAt)}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                      {count} mvt
                                    </span>
                                    <button
                                      onClick={() =>
                                        openDetails(
                                          reference,
                                          day,
                                          from,
                                          to,
                                          payload.items
                                        )
                                      }
                                      className="rounded-lg border px-3 py-1.5 text-xs hover:bg-white"
                                    >
                                      Voir détails
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                </div>
              </motion.section>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        /* --- VUE PAR RÉFÉRENCE : Réf -> Jour -> Parcours --- */
        <div className="space-y-6">
          <AnimatePresence>
            {sortedRefs.map((reference) => {
              const byDay = groupedByReference[reference];
              const total = Object.values(byDay).reduce(
                (acc, byFT) =>
                  acc + Object.values(byFT).reduce((s, v) => s + v.items.length, 0),
                0
              );

              const all = Object.values(byDay).flatMap((byFT) =>
                Object.values(byFT).flatMap((v) => v.items)
              );
              const { affectDate, deliveredDate } = buildRefMilestones(all);

              return (
                <motion.section
                  key={reference}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl bg-white p-5 shadow ring-1 ring-gray-200"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900">
                      {reference}
                    </div>
                    <div className="text-xs text-gray-500">
                      {total} mouvement(s)
                    </div>
                  </div>

                  {/* Résumé affectée / délivrée */}
                  <div className="mb-3 text-xs text-gray-600">
                    {affectDate && (
                      <>
                        Affectée le{" "}
                        <span className="font-medium">
                          {affectDate.toLocaleDateString()}
                        </span>
                      </>
                    )}
                    {deliveredDate && (
                      <>
                        {" "}
                        • Délivrée le{" "}
                        <span className="font-medium">
                          {deliveredDate.toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="space-y-4">
                    {Object.entries(byDay)
                      .sort(([a], [b]) =>
                        timelineOrder === "desc"
                          ? a < b
                            ? 1
                            : -1
                          : a < b
                          ? -1
                          : 1
                      )
                      .map(([day, byFT]) => (
                        <div
                          key={day}
                          className="rounded-xl border border-gray-100 p-4"
                        >
                          <div className="mb-2 text-xs font-medium text-gray-700">
                            {new Date(day).toLocaleDateString()}
                          </div>

                          <div className="space-y-2">
                            {Object.entries(byFT)
                              .sort(([a], [b]) => a.localeCompare(b, "fr"))
                              .map(([ft, payload]) => {
                                const [from, to] = ft.split("||");
                                const count = payload.items.length;
                                const delivered = isDeliveredTo(to);

                                return (
                                  <div
                                    key={ft}
                                    className={[
                                      "flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3",
                                      delivered
                                        ? "border-indigo-200 bg-indigo-50"
                                        : "border-gray-100 bg-gray-50",
                                    ].join(" ")}
                                  >
                                    <div className="min-w-0 text-sm">
                                      <span className="font-medium text-gray-800">
                                        {from || "—"}
                                      </span>
                                      <span className="mx-2 text-gray-400">
                                        →
                                      </span>
                                      {delivered ? (
                                        <span className="inline-flex items-center rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
                                          DÉLIVRÉE
                                        </span>
                                      ) : (
                                        <span className="font-medium text-gray-800">
                                          {to}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-3">
                                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                        {count} mvt
                                      </span>
                                      <button
                                        onClick={() =>
                                          openDetails(
                                            reference,
                                            day,
                                            from,
                                            to,
                                            payload.items
                                          )
                                        }
                                        className="rounded-lg border px-3 py-1.5 text-xs hover:bg-white"
                                      >
                                        Voir détails
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      ))}
                  </div>
                </motion.section>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      <div className="pb-8 text-center">
        {canMore ? (
          <button
            onClick={() => setLimit((n) => n + PAGE)}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-blue-600 shadow ring-1 ring-blue-200 hover:bg-blue-50"
          >
            Afficher plus
          </button>
        ) : (
          <div className="text-xs text-gray-500">Tout est affiché.</div>
        )}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <DetailsModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title={modalTitle}
            items={modalItems}
            machineIndex={machineIndex}
            onDeleted={handleDeleted}
            canDelete={canDelete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
