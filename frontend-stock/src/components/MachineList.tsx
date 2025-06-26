import { useEffect, useState } from 'react';


type Machine = {
  id: number;
  type: string;
  reference: string;
  numSerie: string;
  numInventaire: string;
  createdAt: string;
};

const MachineList = () => {
  const [machines, setMachines] = useState<Machine[]>([]);

  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const response = await fetch('http://localhost:3000/machines');
        const data = await response.json();
        setMachines(data);
      } catch (error) {
        console.error('Erreur lors du chargement des machines', error);
      }
    };

    fetchMachines();
  }, []);

  return (
    <div className="max-w-4xl mx-auto mt-10 bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Liste des machines</h2>
      {machines.length === 0 ? (
        <p>Aucune machine enregistrée.</p>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Type</th>
              <th className="p-2 border">Référence</th>
              <th className="p-2 border">N° Série</th>
              <th className="p-2 border">N° Inventaire</th>
              <th className="p-2 border">Créée le</th>
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
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default MachineList;
