import { useEffect, useState } from 'react';


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

const MachineStockList = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedDestinations, setSelectedDestinations] = useState<Record<number, number>>({});

  const fetchMachines = async () => {
    const res = await fetch('http://localhost:3000/machines');
    const data = await res.json();
    setMachines(data.filter((m: Machine) => m.status === 'stocké'));
  };

  const fetchDestinations = async () => {
    const res = await fetch('http://localhost:3000/destinations');
    const data = await res.json();
    setDestinations(data);
  };

  const assignDestination = async (machineId: number) => {
    const destinationId = selectedDestinations[machineId];
    if (!destinationId) return alert('Veuillez sélectionner une destination');

    const res = await fetch(`http://localhost:3000/machines/${machineId}/assign`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destinationId })
    });

    if (res.ok) {
      alert('Machine affectée avec succès');
      fetchMachines();
    } else {
      alert("Erreur lors de l'affectation");
    }
  };

  const handleChange = (machineId: number, destinationId: number) => {
    setSelectedDestinations({ ...selectedDestinations, [machineId]: destinationId });
  };

  useEffect(() => {
    fetchMachines();
    fetchDestinations();
  }, []);

  return (
    <div className="max-w-6xl mx-auto mt-10 bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Machines en stock</h2>
      {machines.length === 0 ? (
        <p>Aucune machine en stock.</p>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Type</th>
              <th className="p-2 border">Référence</th>
              <th className="p-2 border">N° Série</th>
              <th className="p-2 border">N° Inventaire</th>
              <th className="p-2 border">Créée le</th>
              <th className="p-2 border">Destination</th>
              <th className="p-2 border">Action</th>
            </tr>
          </thead>
          <tbody>
            {machines.map((machine) => (
              <tr key={machine.id}>
                <td className="p-2 border">{machine.type}</td>
                <td className="p-2 border">{machine.reference}</td>
                <td className="p-2 border">{machine.numSerie}</td>
                <td className="p-2 border">{machine.numInventaire}</td>
                <td className="p-2 border">{new Date(machine.createdAt).toLocaleString()}</td>
                <td className="p-2 border">
                  <select
                    onChange={(e) => handleChange(machine.id, parseInt(e.target.value))}
                    className="border rounded p-1"
                  >
                    <option value="">-- Choisir --</option>
                    {destinations.map((dest) => (
                      <option key={dest.id} value={dest.id}>{dest.name}</option>
                    ))}
                  </select>
                </td>
                <td className="p-2 border">
                  <button
                    onClick={() => assignDestination(machine.id)}
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  >
                    Affecter
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default MachineStockList;
