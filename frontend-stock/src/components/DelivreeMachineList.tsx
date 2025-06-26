import { useEffect, useState } from "react";
import axios from "axios";

interface Machine {
  id: number;
  reference: string;
  type: string;
  numSerie: string;
  numInventaire: string;
  status: string;
  createdAt: string;
}

const DelivreeMachineList = () => {
  const [machines, setMachines] = useState<Machine[]>([]);

  useEffect(() => {
  axios.get<Machine[]>("http://localhost:3000/machines/delivrees")
    .then(res => setMachines(res.data))
    .catch(err => console.error("Erreur lors du chargement :", err));
}, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Machines à délivrer</h2>
      <table className="w-full border">
        <thead className="bg-gray-200">
          <tr>
            <th className="p-2">Type</th>
            <th className="p-2">Référence</th>
            <th className="p-2">N° Série</th>
            <th className="p-2">N° Inventaire</th>
            <th className="p-2">Statut</th>
            <th className="p-2">Date d'ajout</th>
          </tr>
        </thead>
        <tbody>
          {machines.map((m) => (
            <tr key={m.id} className="text-center border-t">
              <td className="p-2">{m.type}</td>
              <td className="p-2">{m.reference}</td>
              <td className="p-2">{m.numSerie}</td>
              <td className="p-2">{m.numInventaire}</td>
              <td className="p-2">{m.status}</td>
              <td className="p-2">{new Date(m.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DelivreeMachineList;
