import { useEffect, useState } from "react";
import axios from "axios";

interface History {
  id: number;
  machine: {
    reference: string;
  };
  from: string;
  to: string;
  changedAt: string;
}

const HistoryList = () => {
  const [histories, setHistories] = useState<History[]>([]);

  useEffect(() => {
    axios.get<History[]>("http://localhost:3000/history").then((res) => {
    setHistories(res.data);
    });
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Historique des affectations</h2>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2">Machine</th>
            <th className="p-2">De</th>
            <th className="p-2">À</th>
            <th className="p-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {histories.map((h) => (
            <tr key={h.id} className="text-center border-t">
              <td className="p-2">{h.machine.reference}</td>
              <td className="p-2">{h.from}</td>
              <td className="p-2">{h.to}</td>
              <td className="p-2">{new Date(h.changedAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HistoryList;
