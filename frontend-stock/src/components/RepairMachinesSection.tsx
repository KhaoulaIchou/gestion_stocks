import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../lib/api";
type Role = 'ADMIN' | 'MANAGER' | 'VIEWER';
const readRole = (): Role => {
  try {
    const raw = localStorage.getItem('user');
    const u = raw ? JSON.parse(raw) : null;
    const r = (u?.roles?.[0] || u?.role || 'VIEWER').toString().toUpperCase();
    return (['ADMIN','MANAGER','VIEWER'].includes(r) ? r : 'VIEWER') as Role;
  } catch { return 'VIEWER'; }
};

type HistoryRow = {
  id: number;
  machineId: number;
  from?: string | null;
  to: string;
  changedAt: string; // ISO
};

type DestinationLite = {
  juridiction?: string | null;
  composante?: string | null;
};

interface RepairMachine {
  id: number;
  type: string;
  reference: string;
  numSerie: string;
  numInventaire: string;
  status: string; // 'réparation' | 'en réparation' | etc.
  createdAt: string;
  destination?: DestinationLite | null;
  histories?: { from?: string | null; to: string; changedAt: string }[];
}

const REPAIR_KEYS = ["réparation", "en réparation", "reparation"];
const isRepairStatus = (s: string) =>
  REPAIR_KEYS.some((k) => (s || "").toLowerCase().includes(k));

/** Helpers sémantiques */
const tl = (s?: string | null) => (s || "").trim().toLowerCase();
const isStock = (s?: string | null) => {
  const x = tl(s);
  return x === "stock" || x.includes("stock");
};
const isDelivered = (s?: string | null) =>
  tl(s).includes("machines délivrées") || tl(s).includes("délivr");
const isRepair = (s?: string | null) =>
  REPAIR_KEYS.some((k) => tl(s).includes(k));

function computeSourceFromHistory(rows: HistoryRow[]): string {
  const H = rows
    .slice()
    .sort((a, b) => +new Date(a.changedAt) - +new Date(b.changedAt));

  let lastMeaningfulTo = "";

  for (let i = 0; i < H.length; i++) {
    const ev = H[i];
    const to = (ev.to || "").trim();
    if (isRepair(to)) {
      // entrée en réparation -> la source est la dernière destination non-stock/non-réparation/non-délivrance
      return lastMeaningfulTo || "";
    }

    // Met à jour le "dernier lieu pertinent"
    if (to && !isStock(to) && !isRepair(to) && !isDelivered(to)) {
      lastMeaningfulTo = to;
    }
  }

  // Fallback si jamais on n'a pas trouvé d'entrée en réparation dans H
  return lastMeaningfulTo || "";
}

export default function RepairMachinesSection({ onDone }: { onDone?: () => void }) {
  const [data, setData] = useState<RepairMachine[]>([]);
  const [historyByMachine, setHistoryByMachine] = useState<Record<number, HistoryRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [role, setRole] = useState<Role>('VIEWER');
  useEffect(() => { setRole(readRole()); }, []);
  const canFinish = role === 'ADMIN' || role === 'MANAGER';

  async function loadRepairs() {
    try {
      setLoading(true);
      setErr(null);

      // 1) machines en réparation
      /*let list: RepairMachine[] | null = null;
      try {
        const r = await fetch("/machines/repairs");
        if (r.ok) list = await r.json();
      } catch {
        
      }

      if (!list) {
        const rAll = await fetch("/machines");
        if (!rAll.ok) throw new Error(`GET /machines ${rAll.status}`);
        const all: RepairMachine[] = await rAll.json();
        list = all.filter((m) => isRepairStatus(m.status));
      }
      setData(list || []);*/
      let list: RepairMachine[] | null = null;
      try {
        list = await api<RepairMachine[]>("/machines/repairs");
      } catch { /* noop */ }

      if (!list) {
        const all = await api<RepairMachine[]>("/machines");
        list = all.filter((m) => isRepairStatus(m.status));
      }
      setData(list || []);

      // 2) historique complet (une seule fois)
      /*const rh = await fetch("/history");
      if (rh.ok) {
        const allH: HistoryRow[] = await rh.json();
        const grouped: Record<number, HistoryRow[]> = {};
        for (const h of allH) {
          if (!grouped[h.machineId]) grouped[h.machineId] = [];
          grouped[h.machineId].push(h);
        }
        setHistoryByMachine(grouped);
      } else {
        setHistoryByMachine({});
      }*/
     try {
      const allH = await api<HistoryRow[]>("/history");
      const grouped: Record<number, HistoryRow[]> = {};
      for (const h of allH) {
        if (!grouped[h.machineId]) grouped[h.machineId] = [];
        grouped[h.machineId].push(h);
      }
      setHistoryByMachine(grouped);
    } catch {
      setHistoryByMachine({});
    }

    } catch (e: any) {
      setErr(e?.message || "Erreur de chargement des réparations");
      setData([]);
      setHistoryByMachine({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRepairs();
  }, []);

  // Source calculée (juridiction – composante) pour chaque machine
  const sourceCache = useMemo(() => {
    const map: Record<number, string> = {};
    for (const m of data) {
      let source = "";

      // si le backend renvoie déjà un historique embarqué
      if (m.histories?.length) {
        const rows: HistoryRow[] = m.histories.map((h, idx) => ({
          id: idx,
          machineId: m.id,
          from: h.from,
          to: h.to,
          changedAt: h.changedAt,
        }));
        source = computeSourceFromHistory(rows);
      }

      // sinon, on lit le gros /history groupé
      if (!source) {
        const rows = historyByMachine[m.id] || [];
        source = computeSourceFromHistory(rows);
      }

      map[m.id] = source;
    }
    return map;
  }, [data, historyByMachine]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter((m) =>
      [m.reference, m.numSerie, m.numInventaire, sourceCache[m.id] || ""]
        .join(" ")
        .toLowerCase()
        .includes(s)
    );
  }, [data, q, sourceCache]);

  const byType = useMemo(() => {
    const g: Record<string, RepairMachine[]> = {};
    for (const m of filtered) {
      const key = (m.type || "Divers").trim();
      if (!g[key]) g[key] = [];
      g[key].push(m);
    }
    Object.values(g).forEach((arr) =>
      arr.sort((a, b) => a.reference.localeCompare(b.reference, "fr"))
    );
    return g;
  }, [filtered]);

  const types = useMemo(
    () => Object.keys(byType).sort((a, b) => a.localeCompare(b, "fr")),
    [byType]
  );

  async function finishRepair(id: number) {
  if (!canFinish) return;            // ← bloque VIEWER
  setBusy(id);
  try {
    await api<void>(`/machines/${id}/finish-repair`, { method: "PUT" });
    await loadRepairs();
    onDone?.();
  } finally {
    setBusy(null);
  }
}


  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-gray-500">
          Total: <span className="font-medium">{data.length}</span>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher (réf / série / inventaire / source)…"
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 sm:w-72"
        />
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-40 rounded bg-gray-200" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="h-28 rounded-xl bg-gray-100" />
            <div className="h-28 rounded-xl bg-gray-100" />
          </div>
        </div>
      ) : err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {err}
        </div>
      ) : types.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500">
          Aucune machine en réparation.
        </div>
      ) : (
        <AnimatePresence>
          {types.map((t) => {
            const list = byType[t] || [];
            return (
              <motion.section
                key={t}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl bg-white p-4 ring-1 ring-gray-200"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">{t}</div>
                  <div className="text-xs text-gray-500">{list.length} élément(s)</div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {list.map((m) => {
                    const source = sourceCache[m.id] || "—";
                    return (
                      <div
                        key={m.id}
                        className="rounded-xl border border-gray-200 p-4 hover:shadow-sm"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div className="truncate text-sm font-semibold text-gray-900">
                            {m.reference}
                          </div>
                          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                            en réparation
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-x-6 text-xs text-gray-600 sm:grid-cols-2">
                          <div>
                            <span className="text-gray-500">S/N: </span>
                            {m.numSerie}
                          </div>
                          <div>
                            <span className="text-gray-500">Inv.: </span>
                            {m.numInventaire}
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-gray-500">Source: </span>
                            {source}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-end gap-2">
                          <button
                            disabled={!canFinish || busy === m.id}
                            onClick={() => canFinish && finishRepair(m.id)}
                            className={[
                              "rounded-lg px-3 py-1.5 text-xs font-medium text-white",
                              !canFinish
                                ? "bg-emerald-600 opacity-50 cursor-not-allowed"
                                : (busy === m.id ? "bg-emerald-400" : "bg-emerald-600 hover:bg-emerald-700")
                            ].join(" ")}
                            title={
                              !canFinish
                                ? "Permission requise (ADMIN ou MANAGER)"
                                : (busy === m.id ? "Traitement…" : "Fin réparation")
                            }
                          >
                            {busy === m.id ? "Traitement…" : "Fin réparation"}
                          </button>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.section>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}
