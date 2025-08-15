// src/components/DelivreeMachineList.tsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";

/** Types */
interface Machine {
  id: number;
  reference: string;
  type: string;
  numSerie: string;
  numInventaire: string;
  status: string;
  createdAt: string; 
  histories?: Array<{
    from?: string | null;
    to: string;
    changedAt: string;
}>;
}

type History = {
  id: number;
  from?: string | null;
  to: string;
  changedAt: string; // ISO
  machine: { id: number; reference: string };
};

/** Utils */
const tl = (s: string) => (s || "").trim().toLowerCase();
const isDeliveredTo = (to: string) =>
  tl(to).includes("machines délivrées") || tl(to).includes("délivr");
const isStockFrom = (from?: string | null) =>
  !from || tl(from) === "stock" || tl(from).includes("stock");
const getDeliveredAt = (m: Machine): Date | null => {
  const h =
    m.histories?.find((x) => isDeliveredTo(x.to)) ??
    (m.histories && m.histories[0]);
  return h ? new Date(h.changedAt) : null;
};

/** -------- Modal : Détails d'UNE machine + timeline -------- */
function MachineTimelineModal({
  open,
  onClose,
  machine,
}: {
  open: boolean;
  onClose: () => void;
  machine: Machine | null;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hist, setHist] = useState<History[]>([]);

  useEffect(() => {
    if (!open || !machine) return;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        // On récupère tout l'historique et on filtre côté client sur machine.id
        const r = await fetch("/history");
        if (!r.ok) throw new Error(`GET /history ${r.status}`);
        const all: History[] = await r.json();
        setHist(all.filter((h) => h.machine?.id === machine.id));
      } catch (e: any) {
        setErr(e?.message || "Erreur lors du chargement de l'historique");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, machine]);

  if (!open || !machine) return null;

  // Tri historique croissant
  const ordered = useMemo(
    () => hist.slice().sort((a, b) => +new Date(a.changedAt) - +new Date(b.changedAt)),
    [hist]
  );

  // 1) Stock : on affiche createdAt
  const stockDate = machine.createdAt ? new Date(machine.createdAt) : null;

  // 2) Affectation : premier mouvement depuis le stock (ou from null)
  const firstAssign = ordered.find((h) => isStockFrom(h.from) && !isDeliveredTo(h.to));
  const assignDate = firstAssign ? new Date(firstAssign.changedAt) : null;
  const assignTo = firstAssign?.to ?? "";

  // 3) Délivrance : dernier mouvement vers "Machines délivrées"
  const deliveredEvt = [...ordered].reverse().find((h) => isDeliveredTo(h.to));
  const deliveredDate = deliveredEvt ? new Date(deliveredEvt.changedAt) : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.2 }}
        className="relative z-[61] w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {machine.reference}
            </div>
            <div className="mt-1 grid grid-cols-1 gap-x-6 text-xs text-gray-600 sm:grid-cols-2">
              <div>
                <span className="text-gray-500">S/N: </span>
                {machine.numSerie}
              </div>
              <div>
                <span className="text-gray-500">Inv.: </span>
                {machine.numInventaire}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded p-2 text-gray-500 hover:bg-gray-100">
            ✕
          </button>
        </div>

        {/* Timeline */}
        <div className="mb-4">
  <div className="mb-3 text-sm font-medium text-gray-900">Parcours</div>

  {(() => {
    const steps = [
      { key: "stock",   title: "Stock",       desc: "Ajout au stock",       date: stockDate },
      { key: "affect",  title: "Affectation", desc: assignTo || "—",        date: assignDate },
      { key: "deliver", title: "Délivrance",  desc: "Machines délivrées",   date: deliveredDate },
    ] as const;

    // Couleurs par étape (actives) + fallback gris si inactive
    const colorMap: Record<typeof steps[number]["key"], { dot: string; ring: string; bg: string }> = {
      stock:   { dot: "text-slate-600",   ring: "sm:ring-slate-200",   bg: "bg-slate-100"   },
      affect:  { dot: "text-emerald-600", ring: "sm:ring-emerald-100", bg: "bg-emerald-50"  },
      deliver: { dot: "text-indigo-600",  ring: "sm:ring-indigo-100",  bg: "bg-indigo-50"   },
    };

    const dotWrap = (active: boolean, key: typeof steps[number]["key"]) => {
      const colors = colorMap[key];
      return [
        "z-10 flex items-center justify-center w-6 h-6 rounded-full shrink-0 ring-0 ring-white",
        active ? `${colors.bg} ${colors.ring}` : "bg-gray-100 sm:ring-gray-200",
      ].join(" ");
    };

    const dotIcon = (active: boolean, key: typeof steps[number]["key"]) => {
      const colors = colorMap[key];
      return (
        <svg
          className={["w-2.5 h-2.5", active ? colors.dot : "text-gray-400"].join(" ")}
          viewBox="0 0 8 8"
          aria-hidden="true"
          fill="currentColor"
        >
          <circle cx="4" cy="4" r="4" />
        </svg>
      );
    };

    return (
      <ol className="items-center sm:flex">
        {steps.map((s, i) => {
          const active = !!s.date;
          return (
            <li key={s.key} className="relative mb-6 sm:mb-0 sm:flex-1">
              <div className="flex items-center">
                <div className={dotWrap(active, s.key)}>
                  {dotIcon(active, s.key)}
                </div>
                {/* barre de liaison (cachée sur mobile) */}
                {i < steps.length - 1 && (
                  <div className="hidden sm:flex w-full bg-gray-200 h-0.5" />
                )}
              </div>
              <div className="mt-3 sm:pe-8">
                <h3 className="text-sm font-semibold text-gray-900">
                  {s.title}
                </h3>
                <time className="block mb-1 text-xs font-normal leading-none text-gray-500">
                  {s.date ? s.date.toLocaleString() : "—"}
                </time>
                <p className="text-xs font-normal text-gray-600">{s.desc}</p>
              </div>
            </li>
          );
        })}
      </ol>
    );
  })()}
</div>

        {/* Historique brut (optionnel) */}
        <div className="rounded-xl border">
          <div className="px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-50">
            Historique
          </div>
          {loading ? (
            <div className="p-4 text-sm text-gray-500">Chargement…</div>
          ) : err ? (
            <div className="p-4 text-sm text-red-600">{err}</div>
          ) : ordered.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">Aucun mouvement trouvé.</div>
          ) : (
            <ul className="divide-y">
              {ordered.map((h) => (
                <li key={h.id} className="px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <span className="font-medium text-gray-800">{h.from || "—"}</span>
                      <span className="mx-2 text-gray-400">→</span>
                      <span className="font-medium text-gray-800">
                        {isDeliveredTo(h.to) ? "Machines délivrées" : h.to}
                      </span>
                    </div>
                    <div className="shrink-0 text-xs text-gray-500">
                      {new Date(h.changedAt).toLocaleString()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 text-right">
          <button onClick={onClose} className="rounded border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Fermer
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/** -------- Modal de liste (toutes les machines d’un type) -------- */
function DetailsModal({
  open,
  onClose,
  title,
  items,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  items: Machine[];
}) {
  if (!open) return null;
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
          <div className="text-lg font-semibold text-gray-900">{title}</div>
          <button onClick={onClose} className="rounded p-2 text-gray-500 hover:bg-gray-100">✕</button>
        </div>
        <div className="max-h-[65vh] overflow-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-600">
              <tr>
                <th className="px-3 py-2">Référence</th>
                <th className="px-3 py-2">N° Série</th>
                <th className="px-3 py-2">N° Inventaire</th>
                <th className="px-3 py-2">Date délivrée</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-3 py-2">{m.reference}</td>
                  <td className="px-3 py-2">{m.numSerie}</td>
                  <td className="px-3 py-2">{m.numInventaire}</td>
                  <td className="px-3 py-2">
                    {(() => {
                      const d = getDeliveredAt(m);
                      return d ? d.toLocaleString() : "—";
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-500">Aucune donnée.</div>
          )}
        </div>
        <div className="mt-4 text-right">
          <button onClick={onClose} className="rounded border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Fermer
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/** -------- Page -------- */
const PAGE = 6; // nb visibles par groupe au départ
const STEP = 6; // incrément "Afficher plus"

export default function DelivreeMachineList() {
  const [data, setData] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // recherche + filtres + tris
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("__all__");
  const [dateOrder, setDateOrder] = useState<"desc" | "asc">("desc"); // récent → ancien
  const [refOrder, setRefOrder] = useState<"asc" | "desc">("asc"); // A → Z

  // "Afficher plus" par groupe (clé: type)
  const [visibleCount, setVisibleCount] = useState<Record<string, number>>({});

  // modals
  const [listModalOpen, setListModalOpen] = useState(false);
  const [listModalTitle, setListModalTitle] = useState("");
  const [listModalItems, setListModalItems] = useState<Machine[]>([]);

  const [oneModalOpen, setOneModalOpen] = useState(false);
  const [oneModalMachine, setOneModalMachine] = useState<Machine | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const r = await fetch("/machines/delivrees");
        if (!r.ok) throw new Error(`GET /machines/delivrees ${r.status}`);
        const list: Machine[] = await r.json();
        setData(list);
      } catch (e: any) {
        setErr(e?.message || "Erreur lors du chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // tags de type
  const typeTags = useMemo(
    () => Array.from(new Set(data.map((m) => m.type))).sort((a, b) => a.localeCompare(b, "fr")),
    [data]
  );

  // filtre recherche + type
  const filtered = useMemo(() => {
    const query = tl(q);
    return data.filter((m) => {
      if (typeFilter !== "__all__" && tl(m.type) !== tl(typeFilter)) return false;
      if (!query) return true;
      const hay = `${m.reference} ${m.numSerie} ${m.numInventaire}`.toLowerCase();
      return hay.includes(query);
    });
  }, [data, q, typeFilter]);

  // groupement par type
  const byType = useMemo(() => {
    const g: Record<string, Machine[]> = {};
    for (const m of filtered) {
      const T = m.type || "—";
      if (!g[T]) g[T] = [];
      g[T].push(m);
    }
    // tris dans chaque groupe
    Object.values(g).forEach((arr) => {
      // tri par date d'abord
      arr.sort((a, b) => {
        const da = getDeliveredAt(a)?.getTime() ?? 0;
        const db = getDeliveredAt(b)?.getTime() ?? 0;
        const diff = db - da;
        return dateOrder === "desc" ? diff : -diff;
      });
      // puis tri par référence
      arr.sort((a, b) =>
        refOrder === "asc"
          ? a.reference.localeCompare(b.reference, "fr")
          : b.reference.localeCompare(a.reference, "fr")
      );
    });
    return g;
  }, [filtered, dateOrder, refOrder]);

  const sortedTypes = useMemo(
    () => Object.keys(byType).sort((a, b) => a.localeCompare(b, "fr")),
    [byType]
  );

  const visibleFor = (type: string, total: number) => Math.min(visibleCount[type] ?? PAGE, total);
  const showMore = (type: string, total: number) =>
    setVisibleCount((prev) => ({ ...prev, [type]: Math.min((prev[type] ?? PAGE) + STEP, total) }));
  const collapse = (type: string) => setVisibleCount((prev) => ({ ...prev, [type]: PAGE }));

  const openListModal = (type: string, items: Machine[]) => {
    setListModalTitle(`Délivrées • ${type} (${items.length})`);
    setListModalItems(items);
    setListModalOpen(true);
  };

  const openOneModal = (m: Machine) => {
    setOneModalMachine(m);
    setOneModalOpen(true);
  };

  // Export Excel : un onglet par type
  const exportExcel = () => {
  const wb = XLSX.utils.book_new();

  sortedTypes.forEach((type) => {
    const rows = (byType[type] || []).map((m) => {
  const source = m.histories?.[0]?.from || ""; // ex: "TPI Safi – Greffe"
  const delivered = getDeliveredAt(m);
  return {
    Référence: m.reference,
    Série: m.numSerie,
    Inventaire: m.numInventaire,
    Statut: m.status,
    "Source (juridiction – composante)": source,
    "Date délivrée": delivered ? delivered.toLocaleString() : "",
  };
});


    const ws = XLSX.utils.json_to_sheet(rows);
    const safeName = (type || "Divers").slice(0, 30).replace(/[\\/?*\][:]/g, "-");
    XLSX.utils.book_append_sheet(wb, ws, safeName || "Divers");
  });

  XLSX.writeFile(wb, "machines_delivrees_par_type.xlsx");
};

  /** UI */
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
      {/* Header + actions */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-sky-50 p-6 shadow-sm ring-1 ring-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Machines délivrées</h2>
          </div>
          <button
            onClick={exportExcel}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Export Excel (par type)
          </button>
        </div>

        {/* Filtres & Recherches */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setVisibleCount({});
            }}
            placeholder="Référence / Série / Inventaire…"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
          />
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setVisibleCount({});
            }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
          >
            <option value="__all__">Tous les types</option>
            {typeTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={dateOrder}
            onChange={(e) => {
              setDateOrder(e.target.value as "desc" | "asc");
              setVisibleCount({});
            }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
          >
            <option value="desc">Récent → Ancien</option>
            <option value="asc">Ancien → Récent</option>
          </select>
          <select
            value={refOrder}
            onChange={(e) => {
              setRefOrder(e.target.value as "asc" | "desc");
              setVisibleCount({});
            }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
          >
            <option value="asc">Référence A → Z</option>
            <option value="desc">Référence Z → A</option>
          </select>
        </div>
      </div>

      {/* Contenu groupé par type */}
      <AnimatePresence>
        {sortedTypes.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500"
          >
            Aucune machine délivrée ne correspond à vos filtres.
          </motion.div>
        )}

        {sortedTypes.map((type) => {
          const list = byType[type] || [];
          const total = list.length;
          const visible = visibleFor(type, total);
          const showBtn = visible < total;

          return (
            <motion.section
              key={type}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl bg-white p-5 shadow ring-1 ring-gray-200"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="text-lg font-semibold text-gray-900">{type}</div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {visible}/{total} affichées
                  </span>
                  {total > 0 && (
                    <button
                      onClick={() => openListModal(type, list)}
                      className="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50"
                    >
                      Voir toutes ({total})
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {list.slice(0, visible).map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    onDoubleClick={() => openOneModal(m)}
                    className="rounded-xl border border-gray-200 p-4 cursor-zoom-in"
                    title="Double-cliquez pour voir le parcours"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="truncate text-sm font-semibold text-gray-900">
                        {m.reference}
                      </div>
                      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                        délivrée
                      </span>
                    </div>
                    <div className="mt-1 grid grid-cols-1 gap-x-6 text-xs text-gray-600 sm:grid-cols-2">
                      <div>
                        <span className="text-gray-500">S/N: </span>
                        {m.numSerie}
                      </div>
                      <div>
                        <span className="text-gray-500">Inv.: </span>
                        {m.numInventaire}
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-gray-500">Date délivrée: </span>
                        {(() => {
                          const d = getDeliveredAt(m);
                          return d ? d.toLocaleString() : "—";
                        })()}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-4 flex justify-end">
                {showBtn ? (
                  <button
                    onClick={() => showMore(type, total)}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Afficher plus
                  </button>
                ) : total > PAGE ? (
                  <button
                    onClick={() => collapse(type)}
                    className="text-xs font-medium text-gray-600 hover:underline"
                  >
                    Réduire
                  </button>
                ) : null}
              </div>
            </motion.section>
          );
        })}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {listModalOpen && (
          <DetailsModal
            open={listModalOpen}
            onClose={() => setListModalOpen(false)}
            title={listModalTitle}
            items={listModalItems}
          />
        )}
        {oneModalOpen && (
          <MachineTimelineModal
            open={oneModalOpen}
            onClose={() => setOneModalOpen(false)}
            machine={oneModalMachine}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
