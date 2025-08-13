import React, { useState, useEffect } from "react";

type AddMachineModalProps = {
  open: boolean;
  onClose: () => void;
  defaultType?: string;
  onCreated?: () => void;
};

const AddMachineModal: React.FC<AddMachineModalProps> = ({
  open,
  onClose,
  defaultType,
  onCreated,
}) => {
  const [machine, setMachine] = useState({
    type: "",
    reference: "",
    numSerie: "",
    numInventaire: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMachine((m) => ({ ...m, type: defaultType || "" }));
  }, [defaultType, open]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setMachine({ ...machine, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmitting(true);
  try {
    const res = await fetch("/machines", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        ...machine,
        status: "stocke",                    // SANS accent
        destinationId: null,
        createdAt: new Date().toISOString(), // requis si NOT NULL
      }),
    });

    const text = await res.text();
    if (!res.ok) throw new Error(text || `Échec de l’ajout (${res.status})`);

    onCreated?.();
    onClose();
  } catch (err: any) {
    alert(err?.message || "Erreur réseau");
  } finally {
    setSubmitting(false);
  }
};


  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Ajouter une machine</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-sm">
            Type
            <select
              name="type"
              value={machine.type}
              onChange={handleChange}
              className="mt-1 w-full rounded border p-2"
              required
            >
              <option value="">-- Sélectionner --</option>
              <option value="unité centrale">Unité centrale</option>
              <option value="imprimante">Imprimante</option>
              <option value="écran">Écran</option>
              <option value="scanner">Scanner</option>
              <option value="téléphone">Téléphone</option>
              <option value="pc portable">PC Portable</option>
            </select>
          </label>

          <label className="block text-sm">
            Référence
            <input
              type="text"
              name="reference"
              value={machine.reference}
              onChange={handleChange}
              className="mt-1 w-full rounded border p-2"
              required
            />
          </label>

          <label className="block text-sm">
            N° de série
            <input
              type="text"
              name="numSerie"
              value={machine.numSerie}
              onChange={handleChange}
              className="mt-1 w-full rounded border p-2"
              required
            />
          </label>

          <label className="block text-sm">
            N° d’inventaire
            <input
              type="text"
              name="numInventaire"
              value={machine.numInventaire}
              onChange={handleChange}
              className="mt-1 w-full rounded border p-2"
              required
            />
          </label>

          <div className="pt-2 text-right">
            <button
              type="button"
              onClick={onClose}
              className="mr-2 rounded border px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMachineModal;
