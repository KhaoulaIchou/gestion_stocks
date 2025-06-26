import { useEffect, useState } from 'react';

interface Machine {
  id: number;
  type: string;
  reference: string;
  numSerie: string;
  numInventaire: string;
  status: string;
}

interface Destination {
  id: number;
  name: string;
  machines: Machine[];
}

const DestinationMachines = () => {
  const [destinations, setDestinations] = useState<Destination[]>([]);

  useEffect(() => {
    fetch('http://localhost:3000/destinations')
      .then(res => res.json())
      .then(data => setDestinations(data))
      .catch(err => console.error('Erreur lors du chargement des destinations', err));
  }, []);

  return (
    <div className="max-w-6xl mx-auto mt-10 bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Machines par destination</h2>
      {destinations.map(dest => (
        <div key={dest.id} className="mb-8">
          <h3 className="text-xl font-semibold mb-2">{dest.name}</h3>
          {dest.machines.length === 0 ? (
            <p className="text-gray-500">Aucune machine affectée.</p>
          ) : (
            <table className="w-full border mb-4">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border">Type</th>
                  <th className="p-2 border">Référence</th>
                  <th className="p-2 border">N° Série</th>
                  <th className="p-2 border">N° Inventaire</th>
                  <th className="p-2 border">Statut</th>
                </tr>
              </thead>
              <tbody>
                {dest.machines.map(machine => (
                  <tr key={machine.id}>
                    <td className="p-2 border">{machine.type}</td>
                    <td className="p-2 border">{machine.reference}</td>
                    <td className="p-2 border">{machine.numSerie}</td>
                    <td className="p-2 border">{machine.numInventaire}</td>
                    <td className="p-2 border">{machine.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
};

export default DestinationMachines;
