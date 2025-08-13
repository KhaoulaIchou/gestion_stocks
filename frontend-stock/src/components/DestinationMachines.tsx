import { useEffect, useMemo, useState } from "react";

/** --- Types --- */
interface Machine {
  id: number;
  type: string;
  reference: string;
  numSerie: string;
  numInventaire: string;
  status: string; // stocké, affectée, délivrée...
}

interface Destination {
  id: number;
  name: string;      // ex: "TPI Safi – Greffe" / "Cour d'appel de Safi – Parquet général" / "Centre Juge Résident Jmaa Shaim – Greffe"
  machines?: Machine[];
}

/** --- Utils --- */
const trimLower = (s: string) => s.trim().toLowerCase();

type ParsedDest = {
  juridiction: string;    // "TPI Safi", "Cour d'appel de Safi", "Centre Juge Résident Jmaa Shaim"
  composante: string;     // "Greffe", "Parquet", ...
  tier: "CA" | "TPI" | "CENTRE" | "AUTRE";
};

function parseDestinationName(name: string): ParsedDest {
  // Nom attendu : "<Juridiction> – <Composante>"
  const [rawJur, rawComp = ""] = name.split("–").map((s) => s.trim());
  const j = rawJur || name;
  const c = rawComp || "";

  let tier: ParsedDest["tier"] = "AUTRE";
  const jl = trimLower(j);
  if (jl.includes("cour d'appel")) tier = "CA";
  else if (jl.startsWith("tpi ") || jl.includes("tribunal de première instance")) tier = "TPI";
  else if (jl.startsWith("centre juge résident")) tier = "CENTRE";

  return { juridiction: j, composante: c, tier };
}

/** --- Badges/UI helpers --- */
function TypeBadge({ t }: { t: string }) {
  const color =
    t.toLowerCase() === "imprimante"
      ? "bg-amber-100 text-amber-800"
      : t.toLowerCase() === "écran" || t.toLowerCase() === "ecran"
      ? "bg-cyan-100 text-cyan-800"
      : t.toLowerCase() === "pc portable"
      ? "bg-purple-100 text-purple-800"
      : t.toLowerCase() === "unité centrale" || t.toLowerCase() === "unite centrale"
      ? "bg-blue-100 text-blue-800"
      : "bg-slate-100 text-slate-800";
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>{t}</span>;
}

function StatusBadge({ s }: { s: string }) {
  const sl = s.toLowerCase();
  const map: Record<string, string> = {
    "stocké": "bg-slate-100 text-slate-700",
    "stocke": "bg-slate-100 text-slate-700",
    "affectée": "bg-emerald-100 text-emerald-800",
    "affectee": "bg-emerald-100 text-emerald-800",
    "délivrée": "bg-indigo-100 text-indigo-800",
    "delivree": "bg-indigo-100 text-indigo-800",
  };
  const color = map[sl] ?? "bg-gray-100 text-gray-700";
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>{s}</span>;
}

/** --- Main component --- */
const DestinationMachines = () => {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Filtres
  const [fType, setFType] = useState<string>("__all__");
  const [fJurid, setFJurid] = useState<string>("__all__");
  const [fComp, setFComp] = useState<string>("__all__");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch("/destinations");
        if (!res.ok) throw new Error(`GET /destinations ${res.status}`);
        // le backend peut renvoyer directement machines intégrées; sinon fallback par id
        const txt = await res.text();
        const list: Destination[] = txt ? JSON.parse(txt) : [];
        // S'assurer d'un champ machines toujours présent
        list.forEach((d) => {
          if (!Array.isArray(d.machines)) (d as any).machines = [];
        });
        setDestinations(list);
      } catch (e: any) {
        setErr(e?.message || "Erreur lors du chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /** --- Construire une collection (dest, parsed, machines) à plat --- */
  const rows = useMemo(() => {
    return destinations.flatMap((d) => {
      const parsed = parseDestinationName(d.name);
      return (d.machines || []).map((m) => ({
        dest: d,
        parsed,
        m,
      }));
    });
  }, [destinations]);

  /** --- Valeurs uniques pour filtres --- */
  const typeOptions = useMemo(() => {
    const s = new Set(rows.map((r) => r.m.type));
    return Array.from(s).sort((a, b) => a.localeCompare(b, "fr"));
  }, [rows]);

  const juridOptions = useMemo(() => {
    const s = new Set(rows.map((r) => r.parsed.juridiction));
    return Array.from(s).sort((a, b) => a.localeCompare(b, "fr"));
  }, [rows]);

  const compOptions = useMemo(() => {
    const s = new Set(rows.map((r) => r.parsed.composante).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b, "fr"));
  }, [rows]);

  /** --- Appliquer filtres/recherche --- */
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter(({ m, parsed }) => {
      if (fType !== "__all__" && trimLower(m.type) !== trimLower(fType)) return false;
      if (fJurid !== "__all__" && ParsedEq(parsed.juridiction, fJurid) === false) return false;
      if (fComp !== "__all__" && ParsedEq(parsed.composante, fComp) === false) return false;

      if (!query) return true;
      const hay = `${m.reference} ${m.numSerie} ${m.numInventaire} ${m.type} ${parsed.juridiction} ${parsed.composante}`.toLowerCase();
      return hay.includes(query);
    });
  }, [rows, fType, fJurid, fComp, q]);

  function ParsedEq(a?: string, b?: string) {
    return trimLower(a || "") === trimLower(b || "");
  }

  /** --- Grouping: Type -> Juridiction -> Composante --- */
  type GroupT = Record<
    string, // type
    Record<
      string, // juridiction
      Record<
        string, // composante
        Machine[] // machines
      >
    >
  >;

  const grouped: GroupT = useMemo(() => {
    const g: GroupT = {};
    for (const { m, parsed } of filtered) {
      const t = m.type;
      const j = parsed.juridiction || "Autre juridiction";
      const c = parsed.composante || "—";

      if (!g[t]) g[t] = {};
      if (!g[t][j]) g[t][j] = {};
      if (!g[t][j][c]) g[t][j][c] = [];
      g[t][j][c].push(m);
    }
    return g;
  }, [filtered]);

  /** --- UI --- */
  if (loading) {
    return (
      <div className="mx-auto mt-12 max-w-7xl rounded-xl bg-white p-8 shadow">
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
    <div className="mx-auto mt-10 max-w-7xl">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Machines par type, juridiction et composante</h2>
        <p className="mt-1 text-sm text-gray-600">
          Explorez et filtrez les affectations : choisissez un <span className="font-medium">type</span>, une{" "}
          <span className="font-medium">juridiction</span> ou une <span className="font-medium">composante</span>.
        </p>

        {/* Filters */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Type */}
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-gray-600">Type</label>
            <select
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-indigo-400"
              value={fType}
              onChange={(e) => setFType(e.target.value)}
            >
              <option value="__all__">Tous</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Juridiction */}
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-gray-600">Juridiction</label>
            <select
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
              value={fJurid}
              onChange={(e) => setFJurid(e.target.value)}
            >
              <option value="__all__">Toutes</option>
              {juridOptions.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>

          {/* Composante */}
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-gray-600">Composante</label>
            <select
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
              value={fComp}
              onChange={(e) => setFComp(e.target.value)}
            >
              <option value="__all__">Toutes</option>
              {compOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Recherche */}
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-gray-600">Recherche</label>
            <input
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
              placeholder="Référence / Série / Inventaire / ... "
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6 space-y-6">
        {Object.entries(grouped).length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
            Aucune machine ne correspond aux filtres.
          </div>
        )}

        {Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b, "fr"))
          .map(([type, byJurid]) => {
            const total = Object.values(byJurid).reduce(
              (acc, comps) => acc + Object.values(comps).reduce((x, ms) => x + ms.length, 0),
              0
            );

            return (
              <section key={type} className="rounded-2xl bg-white p-5 shadow ring-1 ring-gray-200">
                {/* Type header */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TypeBadge t={type} />
                    <span className="text-sm text-gray-500">{total} machine(s)</span>
                  </div>
                </div>

                {/* Juridictions */}
                <div className="space-y-4">
                  {Object.entries(byJurid)
                    .sort(([a], [b]) => a.localeCompare(b, "fr"))
                    .map(([jurid, byComp]) => {
                      const jCount = Object.values(byComp).reduce((acc, ms) => acc + ms.length, 0);

                      return (
                        <div key={jurid} className="rounded-xl border border-gray-100 p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <div className="text-base font-semibold text-gray-900">{jurid}</div>
                            <div className="text-xs text-gray-500">{jCount} machine(s)</div>
                          </div>

                          {/* Composantes: grid de cartes */}
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {Object.entries(byComp)
                              .sort(([a], [b]) => a.localeCompare(b, "fr"))
                              .map(([comp, machines]) => (
                                <div key={comp} className="rounded-xl border border-gray-200 p-4 hover:shadow-sm">
                                  <div className="mb-2 flex items-center justify-between">
                                    <div className="text-sm font-medium text-gray-800">
                                      {comp === "—" ? <span className="italic text-gray-500">Sans composante</span> : comp}
                                    </div>
                                    <span className="text-xs text-gray-500">{machines.length}</span>
                                  </div>

                                  <ul className="space-y-2">
                                    {machines.map((m) => (
                                      <li
                                        key={m.id}
                                        className="rounded-lg border border-gray-100 bg-gray-50 p-3 transition hover:bg-gray-100"
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-gray-900">
                                              {m.reference}
                                            </div>
                                            <div className="mt-0.5 grid grid-cols-1 gap-x-6 text-xs text-gray-600 sm:grid-cols-2">
                                              <div><span className="text-gray-500">S/N: </span>{m.numSerie}</div>
                                              <div><span className="text-gray-500">Inv.: </span>{m.numInventaire}</div>
                                            </div>
                                          </div>
                                          <StatusBadge s={m.status} />
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </section>
            );
          })}
      </div>
    </div>
  );
};

export default DestinationMachines;
