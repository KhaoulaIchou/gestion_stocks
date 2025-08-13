import React, { useEffect, useState } from "react";

interface Machine {
  id: number;
  type: string;
  reference: string;
  numSerie: string;
  numInventaire: string;
  status: string;
  destinationId?: number | null;
}

const TYPE_OPTIONS = [
  "unité centrale",
  "imprimante",
  "écran",
  "scanner",
  "téléphone",
  "pc portable",
];

export default function EditMachineModal({
  open,
  machine,
  onClose,
  onSaved,
}: {
  open: boolean;
  machine: Machine | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [form, setForm] = useState({
    type: "",
    reference: "",
    numSerie: "",
    numInventaire: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (machine) {
      setForm({
        type: machine.type || "",
        reference: machine.reference || "",
        numSerie: machine.numSerie || "",
        numInventaire: machine.numInventaire || "",
      });
    }
  }, [machine]);

  if (!open || !machine) return null;

  const onChange = (k: keyof typeof form, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  const save = async () => {
    if (!form.reference.trim()) return alert("Référence obligatoire");
    setSaving(true);
    try {
      const res = await fetch(`http://localhost:3000/machines/${machine.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      await onSaved();
    } catch (e) {
      alert("Échec de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Modifier la machine #{machine.id}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm">Type</label>
            <select
              value={form.type}
              onChange={(e) => onChange("type", e.target.value)}
              className="w-full rounded border px-3 py-2"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm">Référence</label>
            <input
              value={form.reference}
              onChange={(e) => onChange("reference", e.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="Référence"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm">N° Série</label>
              <input
                value={form.numSerie}
                onChange={(e) => onChange("numSerie", e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="N° Série"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm">N° Inventaire</label>
              <input
                value={form.numInventaire}
                onChange={(e) => onChange("numInventaire", e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="N° Inventaire"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded border px-4 py-2 hover:bg-gray-50">
            Annuler
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
