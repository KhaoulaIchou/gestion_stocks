// src/components/DestinationList.tsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
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

/** --- Types --- */
interface Machine {
  id: number;
  type: string;
  reference: string;
  numSerie: string;
  numInventaire: string;
  status: string;
  createdAt?: string; // requis pour l’éligibilité “Délivrer”
}
interface Destination {
  id: number;
  name: string; // "TPI Safi – Greffe", ...
  machines?: Machine[];
}

/** --- Utils --- */
const tl = (s: string) => s.trim().toLowerCase();

function parseDestinationName(name: string) {
  const [rawJur, rawComp = ""] = name.split("–").map((s) => s.trim());
  const juridiction = rawJur || name;
  const composante = rawComp || "";
  return { juridiction, composante };
}

function Tag({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full px-3 py-1 text-xs font-medium transition",
        active ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    "stocké": "bg-slate-100 text-slate-700",
    "stocke": "bg-slate-100 text-slate-700",
    "affectée": "bg-emerald-100 text-emerald-800",
    "affectee": "bg-emerald-100 text-emerald-800",
    "en cours de réparation": "bg-amber-100 text-amber-800",
    "délivrée": "bg-indigo-100 text-indigo-800",
    "delivree": "bg-indigo-100 text-indigo-800",
  };
  const color = map[tl(s)] ?? "bg-gray-100 text-gray-700";
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>{s}</span>;
}

const PAGE_SIZE = 6;

function olderThanSixYears(createdAt?: string) {
  if (!createdAt) return false;
  const d = new Date(createdAt);
  if (Number.isNaN(+d)) return false;
  const now = new Date();
  const six = new Date(now.getFullYear() - 6, now.getMonth(), now.getDate());
  return d <= six;
}

/** --- Modal “Machine (double-clic)” --- */
function SingleMachineModal({
  open,
  onClose,
  item,
  onUpdated,
  canManage
}: {
  open: boolean;
  onClose: () => void;
  item: { m: Machine; destinationFull: string } | null;
  onUpdated: () => void;
  canManage: boolean;
}) {
  if (!open || !item) return null;
  const { m, destinationFull } = item;
  const eligible = olderThanSixYears(m.createdAt);

  const putRepair = async () => {
    if (!canManage) return;
    const ok = confirm("Confirmez-vous la mise en réparation ? Le statut passera à « en cours de réparation ».");
    if (!ok) return;
    await api<void>(`/machines/${m.id}`, { method: "PUT", body: JSON.stringify({ status: "en cours de réparation" }) });
    onUpdated();
    onClose();
  };

  const deliver = async () => {
    if (!canManage || !eligible) return;
    const ok = confirm("Confirmez-vous la délivrance de cette machine ?");
    if (!ok) return;
    await api<void>(`/machines/${m.id}/deliver`, { method: "PUT" });
    onUpdated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.2 }}
        className="relative z-[71] w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="text-lg font-semibold text-gray-900">{m.reference}</div>
            <div className="mt-1 text-xs text-gray-600">{destinationFull}</div>
          </div>
          <button onClick={onClose} className="rounded p-2 text-gray-500 hover:bg-gray-100">✕</button>
        </div>

        <div className="rounded-xl border bg-gray-50 p-4 text-sm">
          <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
            <div><span className="text-gray-500">Type : </span>{m.type}</div>
            <div><span className="text-gray-500">Statut : </span><StatusBadge s={m.status} /></div>
            <div><span className="text-gray-500">Série : </span>{m.numSerie}</div>
            <div><span className="text-gray-500">Inventaire : </span>{m.numInventaire}</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
        <button
          onClick={canManage ? putRepair : undefined}
          disabled={!canManage}
          className={`rounded border px-3 py-2 text-xs font-medium ${
            canManage ? "text-amber-700 hover:bg-amber-50" : "text-amber-500 opacity-50 cursor-not-allowed"
          }`}
          title={canManage ? "Mettre en réparation" : "Permission requise (ADMIN ou MANAGER)"}
        >
          Réparation
        </button>

        {eligible && (
          <button
            onClick={canManage ? deliver : undefined}
            disabled={!canManage}
            className={`rounded px-3 py-2 text-xs font-medium text-white ${
              canManage ? "bg-indigo-600 hover:bg-indigo-700" : "bg-indigo-300 cursor-not-allowed"
            }`}
            title={canManage ? "Délivrer (≥ 6 ans)" : "Permission requise (ADMIN ou MANAGER)"}
          >
            Délivrer
          </button>
        )}
        {!eligible && (
          <span className="text-xs text-gray-500" title="Non éligible (< 6 ans)">
            Non éligible à la délivrance
          </span>
        )}

        </div>
      </motion.div>
    </div>
  );
}

/** --- Modal “Afficher plus” (liste) --- */
type MoreModalProps = {
  open: boolean;
  onClose: () => void;
  title: string; // ex. "TPI Safi • Greffe • Unité centrale"
  machines: Array<{ m: Machine; destinationFull: string }>;
  onRepaired: () => void;
  onDelivered: () => void;
  canManage: boolean;
};

function MoreModal({ open, onClose, title, machines, onRepaired, onDelivered, canManage }: MoreModalProps) {
  const [q, setQ] = useState(""); // recherche ref/inventaire
  useEffect(() => { if (!open) setQ(""); }, [open]);

  const visibleList = useMemo(() => {
    const qq = tl(q);
    if (!qq) return machines;
    return machines.filter(({ m }) =>
      `${m.reference} ${m.numInventaire}`.toLowerCase().includes(qq)
    );
  }, [machines, q]);

  const putRepair = async (id: number) => {
    if (!canManage) return;
    const ok = confirm("Confirmez-vous la mise en réparation ? Le statut passera à « en cours de réparation ».");
    if (!ok) return;
    await api<void>(`/machines/${id}`, { method: "PUT", body: JSON.stringify({ status: "en cours de réparation" }) });
    onRepaired();
  };

  const deliver = async (id: number) => {
    if (!canManage) return;
    const ok = confirm("Confirmez-vous la délivrance de cette machine ?");
    if (!ok) return;
    await api<void>(`/machines/${id}/deliver`, { method: "PUT" });
    onDelivered();
  };


  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.2 }}
        className="relative z-[61] w-full max-w-4xl rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-gray-900">{title}</div>
            <div className="text-xs text-gray-500">{visibleList.length} machine(s)</div>
          </div>
          <button onClick={onClose} className="rounded p-2 text-gray-500 hover:bg-gray-100">✕</button>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher par Référence ou Inventaire…"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
        </div>

        <div className="max-h-[60vh] overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left">Référence</th>
                <th className="px-3 py-2 text-left">Série</th>
                <th className="px-3 py-2 text-left">Inventaire</th>
                <th className="px-3 py-2 text-left">Statut</th>
                <th className="px-3 py-2 text-left">Lieu de fonctionnement</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleList.map(({ m, destinationFull }) => {
                const eligible = olderThanSixYears(m.createdAt);
                return (
                  <tr key={m.id} className="border-t">
                    <td className="px-3 py-2 font-medium text-gray-900">{m.reference}</td>
                    <td className="px-3 py-2">{m.numSerie}</td>
                    <td className="px-3 py-2">{m.numInventaire}</td>
                    <td className="px-3 py-2"><StatusBadge s={m.status} /></td>
                    <td className="px-3 py-2">{destinationFull}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-2">
                       <button
                          onClick={() => canManage && putRepair(m.id)}
                          disabled={!canManage}
                          className={`rounded border px-2 py-1 text-xs ${
                            canManage ? "text-amber-700 hover:bg-amber-50" : "text-amber-500 opacity-50 cursor-not-allowed"
                          }`}
                          title={canManage ? "Mettre en réparation" : "Permission requise (ADMIN ou MANAGER)"}
                        >
                          Réparation
                        </button>

                        <button
                          onClick={() => (canManage && eligible) && deliver(m.id)}
                          disabled={!canManage || !eligible}
                          className={`rounded px-2 py-1 text-xs text-white ${
                            canManage && eligible ? "bg-indigo-600 hover:bg-indigo-700" : "bg-indigo-300 cursor-not-allowed"
                          }`}
                          title={
                            !canManage
                              ? "Permission requise (ADMIN ou MANAGER)"
                              : (eligible ? "Délivrer (≥ 6 ans)" : "Non éligible (< 6 ans)")
                          }
                        >
                          Délivrer
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visibleList.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">Aucune machine.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-right">
          <button onClick={onClose} className="rounded border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Fermer</button>
        </div>
      </motion.div>
    </div>
  );
}

/** --- Page principale --- */
export default function DestinationList() {
  const [role, setRole] = useState<Role>('VIEWER');
  useEffect(() => { setRole(readRole()); }, []);
  const canManage = role === 'ADMIN' || role === 'MANAGER';

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Filtres
  const [juridFilter, setJuridFilter] = useState<string>("__all__");
  const [compFilter, setCompFilter] = useState<string>("__all__");
  const [typeFilter, setTypeFilter] = useState<string>("__all__");
  const [q, setQ] = useState("");

  // “Afficher plus” (modal de groupe)
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreTitle, setMoreTitle] = useState("");
  const [moreItems, setMoreItems] = useState<Array<{ m: Machine; destinationFull: string }>>([]);

  // Modal machine (double-clic)
  const [singleOpen, setSingleOpen] = useState(false);
  const [singleItem, setSingleItem] = useState<{ m: Machine; destinationFull: string } | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      setErr(null);
      /*const res = await fetch("/destinations");
      if (!res.ok) throw new Error(`GET /destinations ${res.status}`);
      const txt = await res.text();
      const list: Destination[] = txt ? JSON.parse(txt) : [];
      list.forEach((d) => { if (!Array.isArray(d.machines)) (d as any).machines = []; });
      setDestinations(list);*/
      const list = await api<Destination[]>("/destinations");
      list.forEach((d) => { if (!Array.isArray(d.machines)) (d as any).machines = []; });
      setDestinations(list);

    } catch (e: any) {
      setErr(e?.message || "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  /** flatten */
  const rows = useMemo(() => {
    return destinations.flatMap((d) => {
      const parsed = parseDestinationName(d.name);
      return (d.machines || []).map((m) => ({ dest: d, parsed, m }));
    });
  }, [destinations]);

  /** tags */
  const juridTags = useMemo(
    () => Array.from(new Set(rows.map((r) => r.parsed.juridiction))).sort((a, b) => a.localeCompare(b, "fr")),
    [rows]
  );
  const compTags = useMemo(
    () => Array.from(new Set(rows.map((r) => r.parsed.composante).filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr")),
    [rows]
  );
  const typeTags = useMemo(
    () => Array.from(new Set(rows.map((r) => r.m.type))).sort((a, b) => a.localeCompare(b, "fr")),
    [rows]
  );

  /** filters (en-tête) */
  const filtered = useMemo(() => {
    const query = tl(q);
    return rows.filter(({ m, parsed }) => {
      if (juridFilter !== "__all__" && tl(parsed.juridiction) !== tl(juridFilter)) return false;
      if (compFilter !== "__all__" && tl(parsed.composante) !== tl(compFilter)) return false;
      if (typeFilter !== "__all__" && tl(m.type) !== tl(typeFilter)) return false;
      if (!query) return true;
      const hay = `${m.reference} ${m.numInventaire}`.toLowerCase(); // recherche ref + inventaire
      return hay.includes(query);
    });
  }, [rows, juridFilter, compFilter, typeFilter, q]);

  /** group: Juridiction -> Composante -> Type -> Machines[] */
  type Group = Record<string, Record<string, Record<string, Array<{ m: Machine; destinationFull: string }>>>>;
  const grouped: Group = useMemo(() => {
    const g: Group = {};
    for (const { m, parsed, dest } of filtered) {
      const J = parsed.juridiction || "Autre juridiction";
      const C = parsed.composante || "—";
      const T = m.type || "—";
      if (!g[J]) g[J] = {};
      if (!g[J][C]) g[J][C] = {};
      if (!g[J][C][T]) g[J][C][T] = [];
      g[J][C][T].push({ m, destinationFull: dest.name });
    }
    return g;
  }, [filtered]);

  /** export par juridiction: fichier avec 1 feuille / type */
  const exportJurisdiction = (jurid: string, byComp: Group[string]) => {
    const byType: Record<string, Array<{ m: Machine; destinationFull: string }>> = {};
    for (const comp of Object.keys(byComp)) {
      for (const type of Object.keys(byComp[comp])) {
        if (!byType[type]) byType[type] = [];
        byType[type].push(...byComp[comp][type]);
      }
    }

    const wb = XLSX.utils.book_new();
    for (const type of Object.keys(byType).sort((a, b) => a.localeCompare(b, "fr"))) {
      const rows = byType[type].map(({ m, destinationFull }) => ({
        "Référence": m.reference,
        "Série": m.numSerie,
        "Inventaire": m.numInventaire,
        "Statut": normalizeStatusForExport(m.status),
        "Lieu de fonctionnement": destinationFull,
      }));
      const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
      XLSX.utils.book_append_sheet(wb, ws, safeSheetName(type));
    }
    XLSX.writeFile(wb, `machines_${sanitizeFile(jurid)}.xlsx`);
  };
  const normalizeStatusForExport = (s: string) => {
    const low = tl(s);
    if (low.includes("réparation")) return "En cours de réparation";
    if (low.includes("délivr")) return "Délivrée";
    return "En cours de fonctionnement"; // affectée
  };
  const safeSheetName = (s: string) => s.replace(/[\\/?*[\]]/g, " ").slice(0, 31) || "Feuille";
  const sanitizeFile = (s: string) => s.replace(/[^\p{L}\p{N}_-]+/gu, "_");

  /** handlers modal liste */
  const openMoreFor = (jurid: string, comp: string, type: string, items: Array<{ m: Machine; destinationFull: string }>) => {
    setMoreTitle(`${jurid} • ${comp} • ${type}`);
    setMoreItems(items);
    setMoreOpen(true);
  };

  /** refresh global */
  const refresh = async () => {
    await loadAll();
  };

  /** UI */
  if (loading) {
    return (
      <div className="mx-auto mt-12 max-w-7xl rounded-2xl bg-white p-8 shadow">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-64 rounded bg-gray-200" />
          <div className="h-10 w-full rounded bg-gray-100" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="h-40 rounded-xl bg-gray-100" />
            <div className="h-40 rounded-xl bg-gray-100" />
            <div className="h-40 rounded-xl bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }
  if (err) {
    return (
      <div className="mx-auto mt-12 max-w-3xl rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <div className="mb-2 text-lg font-semibold">Erreur</div>
        <div className="text-sm">{err}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-8 max-w-7xl">
      {/* Header / filters */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-50 to-sky-50 p-6 shadow-sm ring-1 ring-gray-200">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Machines par juridiction, composante et type</h2>
          </div>
        </div>

        {/* Tags */}
        <div className="mt-4 space-y-3">
          <div>
            <div className="mb-1 text-xs font-medium text-gray-600">Juridictions</div>
            <div className="flex flex-wrap gap-2">
              <Tag active={juridFilter === "__all__"} onClick={() => setJuridFilter("__all__")}>Toutes</Tag>
              {juridTags.map((j) => (
                <Tag key={j} active={tl(j) === tl(juridFilter)} onClick={() => setJuridFilter(j)}>{j}</Tag>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs font-medium text-gray-600">Composantes</div>
            <div className="flex flex-wrap gap-2">
              <Tag active={compFilter === "__all__"} onClick={() => setCompFilter("__all__")}>Toutes</Tag>
              {compTags.map((c) => (
                <Tag key={c} active={tl(c) === tl(compFilter)} onClick={() => setCompFilter(c)}>{c || "—"}</Tag>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs font-medium text-gray-600">Types</div>
            <div className="flex flex-wrap gap-2">
              <Tag active={typeFilter === "__all__"} onClick={() => setTypeFilter("__all__")}>Tous</Tag>
              {typeTags.map((t) => (
                <Tag key={t} active={tl(t) === tl(typeFilter)} onClick={() => setTypeFilter(t)}>{t}</Tag>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher: Référence / Inventaire"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
            {(juridFilter !== "__all__" || compFilter !== "__all__" || typeFilter !== "__all__" || q) && (
              <button
                onClick={() => { setJuridFilter("__all__"); setCompFilter("__all__"); setTypeFilter("__all__"); setQ(""); }}
                className="rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6 space-y-6">
        {Object.keys(grouped).length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
            Aucune machine ne correspond aux filtres.
          </div>
        )}

        <AnimatePresence>
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b, "fr"))
            .map(([jurid, byComp]) => {
              const jCount = Object.values(byComp).reduce(
                (acc, types) => acc + Object.values(types).reduce((x, arr) => x + arr.length, 0),
                0
              );

              return (
                <motion.section
                  key={jurid}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-2xl bg-white p-5 shadow ring-1 ring-gray-200"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-lg font-semibold text-gray-900">{jurid}</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => exportJurisdiction(jurid, byComp)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                      >
                        Exporter (par type)
                      </button>
                      <div className="text-xs text-gray-500">{jCount} machine(s)</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {Object.entries(byComp)
                      .sort(([a], [b]) => a.localeCompare(b, "fr"))
                      .map(([comp, byType]) => (
                        <div key={comp} className="rounded-xl border border-gray-100 p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <div className="text-sm font-medium text-gray-800">
                              {comp || <span className="italic text-gray-500">Sans composante</span>}
                            </div>
                            <div className="text-xs text-gray-500">
                              {Object.values(byType).reduce((n, arr) => n + arr.length, 0)} machine(s)
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {Object.entries(byType)
                              .sort(([a], [b]) => a.localeCompare(b, "fr"))
                              .map(([type, items]) => {
                                const preview = items.slice(0, Math.min(PAGE_SIZE, items.length));
                                return (
                                  <motion.div
                                    key={type}
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.2 }}
                                    className="rounded-xl border border-gray-200 p-4"
                                  >
                                    <div className="mb-2 flex items-center justify-between">
                                      <span className="text-sm font-semibold text-gray-900">{type}</span>
                                      <span className="text-xs text-gray-500">{items.length}</span>
                                    </div>

                                    <ul className="space-y-2">
                                      {preview.map((it) => (
                                        <li
                                          key={it.m.id}
                                          className="cursor-default rounded-lg border border-gray-100 bg-gray-50 p-3 transition hover:bg-gray-100"
                                          onDoubleClick={() => { setSingleItem(it); setSingleOpen(true); }}
                                          title="Double-cliquer pour actions"
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                              <div className="truncate text-sm font-semibold text-gray-900">
                                                {it.m.reference}
                                              </div>
                                              <div className="mt-0.5 grid grid-cols-1 gap-x-6 text-xs text-gray-600 sm:grid-cols-2">
                                                <div><span className="text-gray-500">S/N: </span>{it.m.numSerie}</div>
                                                <div><span className="text-gray-500">Inv.: </span>{it.m.numInventaire}</div>
                                              </div>
                                            </div>
                                            <StatusBadge s={it.m.status} />
                                          </div>
                                        </li>
                                      ))}
                                    </ul>

                                    {items.length > PAGE_SIZE && (
                                      <div className="mt-3 flex justify-end">
                                        <button
                                          onClick={() => openMoreFor(jurid, comp, type, items)}
                                          className="text-xs font-medium text-blue-600 hover:underline"
                                        >
                                          Afficher plus
                                        </button>
                                      </div>
                                    )}
                                  </motion.div>
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

      {/* Modals */}
      <AnimatePresence>
        {moreOpen && (
          <MoreModal
            open={moreOpen}
            onClose={() => setMoreOpen(false)}
            title={moreTitle}
            machines={moreItems}
            onRepaired={async () => { await refresh(); setMoreOpen(false); }}
            onDelivered={async () => { await refresh(); setMoreOpen(false); }}
            canManage={canManage}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {singleOpen && (
          <SingleMachineModal
            open={singleOpen}
            onClose={() => setSingleOpen(false)}
            item={singleItem}
            onUpdated={refresh}
            canManage={canManage}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
