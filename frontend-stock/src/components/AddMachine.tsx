import React, { useState } from 'react';

const AddMachine = () => {
  const [machine, setMachine] = useState({
    type: '',
    reference: '',
    numSerie: '',
    numInventaire: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setMachine({ ...machine, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:3000/machines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(machine),
      });

      if (response.ok) {
        alert(' Machine ajoutée avec succès !');
        setMachine({
          type: '',
          reference: '',
          numSerie: '',
          numInventaire: '',
        });
      } else {
        const err = await response.json();
        alert(` Erreur : ${err.message || 'Impossible d’ajouter la machine.'}`);
      }
    } catch (error) {
      console.error('Erreur réseau :', error);
      alert(' Erreur réseau, impossible de contacter le serveur.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Ajouter une machine</h2>

      <label className="block mb-2">
        Type
        <select
          name="type"
          value={machine.type}
          onChange={handleChange}
          className="w-full border p-2 rounded mt-1"
          required
        >
          <option value="">-- Sélectionner --</option>
          <option value="imprimante">Imprimante</option>
          <option value="pc">PC</option>
          <option value="unité centrale">Unité centrale</option>
          <option value="écran">Écran</option>
        </select>
      </label>

      <label className="block mb-2">
        Référence
        <input
          type="text"
          name="reference"
          value={machine.reference}
          onChange={handleChange}
          className="w-full border p-2 rounded mt-1"
          required
        />
      </label>

      <label className="block mb-2">
        Numéro de série
        <input
          type="text"
          name="numSerie"
          value={machine.numSerie}
          onChange={handleChange}
          className="w-full border p-2 rounded mt-1"
          required
        />
      </label>

      <label className="block mb-4">
        Numéro d’inventaire
        <input
          type="text"
          name="numInventaire"
          value={machine.numInventaire}
          onChange={handleChange}
          className="w-full border p-2 rounded mt-1"
          required
        />
      </label>

      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
        Enregistrer
      </button>
    </form>
  );
};

export default AddMachine;
