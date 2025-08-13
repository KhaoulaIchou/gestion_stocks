// src/components/HistoryPage.tsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";

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
// Résumé par référence : "Affectée le … / Délivrée le …"
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

/** ---- Modal détails machines ---- */
function DetailsModal({
  open,
  onClose,
  title,
  machineIds,
  machineIndex,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  machineIds: number[];
  machineIndex: Map<number, MachineRow>;
}) {
  if (!open) return null;
  const list = machineIds
    .map((id) => machineIndex.get(id))
    .filter(Boolean) as MachineRow[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="mb-3 flex items-start justify-between">
          <div className="text-lg font-semibold text-gray-900">{title}</div>
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
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-3 py-2">{m.reference}</td>
                  <td className="px-3 py-2">{m.numSerie}</td>
                  <td className="px-3 py-2">{m.numInventaire}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-500">
              Aucune donnée série/inventaire trouvée.
            </div>
          )}
        </div>

        <div className="mt-4 text-right">
          <button
            onClick={onClose}
            className="rounded border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Fermer
          </button>
        </div>
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

  // recherches
  const [q, setQ] = useState(""); // ref/serie/inventaire
  const [dateFrom, setDateFrom] = useState<string>(""); // yyyy-mm-dd
  const [dateTo, setDateTo] = useState<string>(""); // yyyy-mm-dd

  // vues + tris
  const [mode, setMode] = useState<"timeline" | "reference">("timeline");
  const [timelineOrder, setTimelineOrder] = useState<"desc" | "asc">("desc"); // Récent → Ancien
  const [refSort, setRefSort] = useState<"asc" | "desc">("asc"); // A→Z

  // pagination
  const [limit, setLimit] = useState(PAGE);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalIds, setModalIds] = useState<number[]>([]);

  // fetchers
  const loadAll = async () => {
    setLoading(true);
    try {
      const r1 = await fetch("/history");
      if (!r1.ok) throw new Error(`GET /history ${r1.status}`);
      const d1: History[] = await r1.json();

      const r2 = await fetch("/machines");
      if (!r2.ok) throw new Error(`GET /machines ${r2.status}`);
      const d2: any[] = await r2.json();

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
      // filtre date
      const ch = new Date(h.changedAt);
      if (from && ch < from) return false;
      if (to && ch > to) return false;

      // filtre texte
      if (!refq) return true;
      const ref = tl(h.machine.reference);
      if (ref.includes(refq)) return true;

      const mi = machineIndex.get(h.machine.id);
      if (!mi) return false;
      return tl(mi.numSerie).includes(refq) || tl(mi.numInventaire).includes(refq);
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

  /** ---- TIMELINE : Groupes Date -> Référence -> (from||to) ---- */
  type TLByDateRef = Record<
    string, // yyyy-mm-dd
    Record<
      string, // reference
      Record<
        string, // `${from}||${to}`
        { items: History[]; machineIds: number[] }
      >
    >
  >;

  const timelineGroupedByDateRef = useMemo(() => {
    const g: TLByDateRef = {};
    for (const h of paged) {
      const day = ymd(h.changedAt);
      const ref = h.machine.reference;
      const ft = `${h.from || ""}||${h.to}`;

      if (!g[day]) g[day] = {};
      if (!g[day][ref]) g[day][ref] = {};
      if (!g[day][ref][ft]) g[day][ref][ft] = { items: [], machineIds: [] };

      g[day][ref][ft].items.push(h);
      if (!g[day][ref][ft].machineIds.includes(h.machine.id)) {
        g[day][ref][ft].machineIds.push(h.machine.id);
      }
    }

    // tri jours selon timelineOrder
    return Object.entries(g).sort(([a], [b]) =>
      timelineOrder === "desc" ? (a < b ? 1 : -1) : (a < b ? -1 : 1)
    );
  }, [paged, timelineOrder]);

  /** ---- Vue PAR RÉFÉRENCE (réf -> date -> from-to) ---- */
  type ByRef = Record<
    string,
    Record<
      string /* day */,
      Record<string /* `${from}||${to}` */, { items: History[]; machineIds: number[] }>
    >
  >;

  const groupedByReference: ByRef = useMemo(() => {
    const g: ByRef = {};
    for (const h of paged) {
      const R = h.machine.reference;
      const D = ymd(h.changedAt);
      const FT = `${h.from || ""}||${h.to}`;
      if (!g[R]) g[R] = {};
      if (!g[R][D]) g[R][D] = {};
      if (!g[R][D][FT]) g[R][D][FT] = { items: [], machineIds: [] };
      g[R][D][FT].items.push(h);
      if (!g[R][D][FT].machineIds.includes(h.machine.id)) {
        g[R][D][FT].machineIds.push(h.machine.id);
      }
    }
    return g;
  }, [paged]);

  // tri des références (vue "Par Référence")
  const sortedRefs = useMemo(() => {
    const refs = Object.keys(groupedByReference);
    refs.sort((a, b) =>
      refSort === "asc" ? a.localeCompare(b, "fr") : b.localeCompare(a, "fr")
    );
    return refs;
  }, [groupedByReference, refSort]);

  // ouvrir le modal (groupe ref/jour/parcours)
  const openDetails = (reference: string, day: string, from: string, to: string, machineIds: number[]) => {
    setModalTitle(`${reference} • ${new Date(day).toLocaleDateString()} • ${from || "—"} → ${to}`);
    setModalIds(machineIds);
    setModalOpen(true);
  };

  /** ---- Export Excel (vue filtrée & tri appliqués) ---- */
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
            <h2 className="text-2xl font-bold text-gray-900">Historique des affectations</h2>
            <p className="mt-1 text-sm text-gray-600">
              Recherchez par <span className="font-medium">référence / série / inventaire</span>, par{" "}
              <span className="font-medium">date</span>, ou combinez les deux.
            </p>
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
          {(q || dateFrom || dateTo) ? (
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

        {/* Sélecteurs de vue + tri dépendant du mode */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setMode("timeline")}
            className={[
              "rounded-full px-3 py-1 text-xs font-medium",
              mode === "timeline" ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            ].join(" ")}
          >
            Timeline
          </button>
          <button
            onClick={() => setMode("reference")}
            className={[
              "rounded-full px-3 py-1 text-xs font-medium",
              mode === "reference" ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200",
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
                  timelineOrder === "desc" ? "bg-indigo-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                ].join(" ")}
              >
                Récent → Ancien
              </button>
              <button
                onClick={() => setTimelineOrder("asc")}
                className={[
                  "rounded-full px-3 py-1 text-xs font-medium",
                  timelineOrder === "asc" ? "bg-indigo-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200",
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
                  refSort === "asc" ? "bg-indigo-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                ].join(" ")}
              >
                A → Z
              </button>
              <button
                onClick={() => setRefSort("desc")}
                className={[
                  "rounded-full px-3 py-1 text-xs font-medium",
                  refSort === "desc" ? "bg-indigo-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200",
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
                          acc + Object.values(byFT).reduce((s: number, v) => s + v.items.length, 0),
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
                      <div key={reference} className="rounded-xl border border-gray-100 p-4">
                        <div className="mb-2 text-sm font-semibold text-gray-900">{reference}</div>

                        <div className="space-y-2">
                          {Object.entries(byFT)
                            .sort(([a], [b]) => a.localeCompare(b, "fr"))
                            .map(([ft, payload]) => {
                              const [from, to] = ft.split("||");
                              const count = payload.items.length;
                              const uniqIds = payload.machineIds;
                              const canAggregate = uniqIds.length > 1;

                              // heure (premier mvt du groupe, selon tri)
                              const first = payload.items
                                .slice()
                                .sort((A, B) =>
                                  timelineOrder === "desc"
                                    ? +new Date(B.changedAt) - +new Date(A.changedAt)
                                    : +new Date(A.changedAt) - +new Date(B.changedAt)
                                )[0];

                              const delivered = isDeliveredTo(to);

                              return (
                                <div
                                  key={ft}
                                  className={[
                                    "flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3",
                                    delivered ? "border-indigo-200 bg-indigo-50" : "border-gray-100 bg-gray-50",
                                  ].join(" ")}
                                >
                                  <div className="min-w-0">
                                    <div className="text-sm">
                                      <span className="font-medium text-gray-800">{from || "—"}</span>
                                      <span className="mx-2 text-gray-400">→</span>
                                      {delivered ? (
                                        <span className="inline-flex items-center rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
                                          DÉLIVRÉE
                                        </span>
                                      ) : (
                                        <span className="font-medium text-gray-800">{to}</span>
                                      )}
                                    </div>
                                    {first && (
                                      <div className="mt-0.5 text-xs text-gray-500">{fmtDateTime(first.changedAt)}</div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                      {count} mvt
                                    </span>
                                    {canAggregate && (
                                      <button
                                        onClick={() => openDetails(reference, day, from, to, uniqIds)}
                                        className="rounded-lg border px-3 py-1.5 text-xs hover:bg-white"
                                      >
                                        Voir détails ({uniqIds.length})
                                      </button>
                                    )}
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
        /* --- VUE PAR RÉFÉRENCE : Référence -> Jour -> Parcours --- */
        <div className="space-y-6">
          <AnimatePresence>
            {sortedRefs.map((reference) => {
              const byDay = groupedByReference[reference];
              const total = Object.values(byDay).reduce(
                (acc, byFT) => acc + Object.values(byFT).reduce((s, v) => s + v.items.length, 0),
                0
              );

              // Aplatir tous les items de la ref pour le résumé
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
                    <div className="text-sm font-semibold text-gray-900">{reference}</div>
                    <div className="text-xs text-gray-500">{total} mouvement(s)</div>
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
                        timelineOrder === "desc" ? (a < b ? 1 : -1) : (a < b ? -1 : 1)
                      )
                      .map(([day, byFT]) => (
                        <div key={day} className="rounded-xl border border-gray-100 p-4">
                          <div className="mb-2 text-xs font-medium text-gray-700">
                            {new Date(day).toLocaleDateString()}
                          </div>

                          <div className="space-y-2">
                            {Object.entries(byFT)
                              .sort(([a], [b]) => a.localeCompare(b, "fr"))
                              .map(([ft, payload]) => {
                                const [from, to] = ft.split("||");
                                const count = payload.items.length;
                                const uniqIds = payload.machineIds;
                                const canAggregate = uniqIds.length > 1;
                                const delivered = isDeliveredTo(to);

                                return (
                                  <div
                                    key={ft}
                                    className={[
                                      "flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3",
                                      delivered ? "border-indigo-200 bg-indigo-50" : "border-gray-100 bg-gray-50",
                                    ].join(" ")}
                                  >
                                    <div className="min-w-0 text-sm">
                                      <span className="font-medium text-gray-800">{from || "—"}</span>
                                      <span className="mx-2 text-gray-400">→</span>
                                      {delivered ? (
                                        <span className="inline-flex items-center rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
                                          DÉLIVRÉE
                                        </span>
                                      ) : (
                                        <span className="font-medium text-gray-800">{to}</span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-3">
                                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                        {count} mvt
                                      </span>
                                      {canAggregate && (
                                        <button
                                          onClick={() => openDetails(reference, day, from, to, uniqIds)}
                                          className="rounded-lg border px-3 py-1.5 text-xs hover:bg-white"
                                        >
                                          Voir détails ({uniqIds.length})
                                        </button>
                                      )}
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
            machineIds={modalIds}
            machineIndex={machineIndex}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
