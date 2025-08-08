import { useEffect, useMemo, useState } from "react";
import AddMachineModal from "./AddMachineModal";

interface Machine {
  id: number;
  type: string;
  reference: string;
  numSerie: string;
  numInventaire: string;
  createdAt: string;
  status: string;
  destinationId?: number;
}

interface Destination {
  id: number;
  name: string;
}

const CATEGORIES = [
  { key: "unité centrale", label: "Unités Centraux" },
  { key: "imprimante", label: "Imprimantes" },
  { key: "écran", label: "Écrans" },
  { key: "scanner", label: "Scanners" },
  { key: "téléphone", label: "Téléphones" },
  { key: "pc portable", label: "PCs Portables" },
];

// Pour compatibilités (si d’anciennes valeurs existent déjà en base)
const NORMALIZE: Record<string, string> = {
  "unite centrale": "unité centrale",
  "unité centrale": "unité centrale",
  "uc": "unité centrale",
  "pc": "pc portable", // si tu stockais "pc" avant
  "pc portable": "pc portable",
  "imprimante": "imprimante",
  "écran": "écran",
  "ecran": "écran",
  "scanner": "scanner",
  "telephone": "téléphone",
  "téléphone": "téléphone",
};

const MachineStockList = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedDestinations, setSelectedDestinations] = useState<Record<number, number>>({});
  const [activeCat, setActiveCat] = useState<string>(CATEGORIES[0].key);
  const [openAdd, setOpenAdd] = useState(false);
  const [search, setSearch] = useState("");

  const loadMachines = async () => {
    const res = await fetch("http://localhost:3000/machines");
    const data: Machine[] = await res.json();
    // On ne montre que le stock ici (non affectées)
    const onlyStock = data.filter((m) => m.status === "stocké" && !m.destinationId);
    setMachines(onlyStock);
  };

  const loadDestinations = async () => {
    const res = await fetch("http://localhost:3000/destinations");
    const data: Destination[] = await res.json();
    setDestinations(data);
  };

  useEffect(() => {
    loadMachines();
    loadDestinations();
  }, []);

  const handleChangeDestination = (machineId: number, destinationId: number) => {
    setSelectedDestinations({ ...selectedDestinations, [machineId]: destinationId });
  };

  const assignDestination = async (machineId: number) => {
    const destinationId = selectedDestinations[machineId];
    if (!destinationId) {
      alert("Veuillez sélectionner une destination");
      return;
    }
    const res = await fetch(`http://localhost:3000/machines/${machineId}/assign`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destinationId }),
    });
    if (res.ok) {
      await loadMachines();
      alert("Machine affectée avec succès");
    } else {
      alert("Erreur lors de l'affectation");
    }
  };

  const deliver = async (machineId: number) => {
    const res = await fetch(`http://localhost:3000/machines/${machineId}/deliver`, {
      method: "PUT",
    });
    if (res.ok) {
      await loadMachines();
      alert("Machine marquée comme délivrée");
    } else {
      alert("Erreur lors du changement de statut");
    }
  };

  const normalizedType = (t: string) => NORMALIZE[t.toLowerCase()] ?? t.toLowerCase();

  const filteredByCategory = useMemo(() => {
    return machines.filter((m) => normalizedType(m.type) === activeCat);
  }, [machines, activeCat]);

  const filteredBySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return filteredByCategory;
    return filteredByCategory.filter((m) => {
      return (
        m.reference.toLowerCase().includes(q) ||
        m.numSerie.toLowerCase().includes(q) ||
        m.numInventaire.toLowerCase().includes(q)
      );
    });
  }, [filteredByCategory, search]);

  return (
    <div className="mx-auto mt-8 max-w-7xl rounded bg-white p-6 shadow">
      {/* TAGS / TABS */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setActiveCat(c.key)}
            className={[
              "rounded-full px-3 py-1 text-sm",
              activeCat === c.key
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            ].join(" ")}
          >
            {c.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher (réf / série / inventaire)"
              className="w-72 rounded border px-3 py-1.5 text-sm"
            />
          </div>

          {/* Bouton + */}
          <button
            onClick={() => setOpenAdd(true)}
            title="Ajouter une machine dans cette catégorie"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700"
          >
            +
          </button>
        </div>
      </div>

      {/* EN-TÊTE TABLEAU */}
      <div className="relative overflow-x-auto rounded border">
        <table className="w-full text-left text-sm text-gray-700">
          <thead className="bg-gray-50 text-xs uppercase">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Référence</th>
              <th className="px-4 py-3">N° Série</th>
              <th className="px-4 py-3">N° Inventaire</th>
              <th className="px-4 py-3">Créée le</th>
              <th className="px-4 py-3">Destination</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredBySearch.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                  Aucune machine dans “{CATEGORIES.find(c => c.key === activeCat)?.label}”.
                </td>
              </tr>
            ) : (
              filteredBySearch.map((m) => (
                <tr key={m.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{m.type}</td>
                  <td className="px-4 py-2">{m.reference}</td>
                  <td className="px-4 py-2">{m.numSerie}</td>
                  <td className="px-4 py-2">{m.numInventaire}</td>
                  <td className="px-4 py-2">
                    {new Date(m.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <select
                      onChange={(e) =>
                        handleChangeDestination(m.id, parseInt(e.target.value))
                      }
                      className="rounded border p-1"
                      defaultValue=""
                    >
                      <option value="">-- Choisir --</option>
                      {destinations.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => assignDestination(m.id)}
                        className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
                      >
                        Affecter
                      </button>
                      <button
                        onClick={() => deliver(m.id)}
                        className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
                      >
                        Délivrer
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modale d’ajout */}
      <AddMachineModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        defaultType={activeCat} // pré-remplit selon le tag
        onCreated={loadMachines}
      />
    </div>
  );
};

export default MachineStockList;
