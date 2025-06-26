import { useEffect, useState } from 'react';


type Machine = {
  id: number;
  type: string;
  reference: string;
  numSerie: string;
  numInventaire: string;
  status: string;
  createdAt: string;
};

type Destination = {
  id: number;
  name: string;
  machines: Machine[];
};

const DestinationList = () => {
  const [destinations, setDestinations] = useState<Destination[]>([]);

  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const response = await fetch('http://localhost:3000/destinations');
        const data = await response.json();
        setDestinations(data);
      } catch (error) {
        console.error('Erreur lors du chargement des destinations', error);
      }
    };

    fetchDestinations();
  }, []);

  return (
    <div className="max-w-6xl mx-auto mt-10 bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-bold mb-6">Machines par Destination</h2>

      {destinations.length === 0 ? (
        <p>Aucune destination disponible.</p>
      ) : (
        destinations.map((destination) => (
          <div key={destination.id} className="mb-8">
            <h3 className="text-xl font-semibold text-blue-700 mb-2">{destination.name}</h3>
            {destination.machines.length === 0 ? (
              <p className="text-gray-500">Aucune machine affectée.</p>
            ) : (
              <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border">Type</th>
                    <th className="p-2 border">Référence</th>
                    <th className="p-2 border">N° Série</th>
                    <th className="p-2 border">N° Inventaire</th>
                    <th className="p-2 border">Statut</th>
                    <th className="p-2 border">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {destination.machines.map((machine) => (
                    <tr key={machine.id}>
                      <td className="p-2 border">{machine.type}</td>
                      <td className="p-2 border">{machine.reference}</td>
                      <td className="p-2 border">{machine.numSerie}</td>
                      <td className="p-2 border">{machine.numInventaire}</td>
                      <td className="p-2 border">{machine.status}</td>
                      <td className="p-2 border">{new Date(machine.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default DestinationList;
