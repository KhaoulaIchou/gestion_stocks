import React, { useState, useEffect, useMemo } from "react";
import { api } from "../lib/api";

type AddMachineModalProps = {
  open: boolean;
  onClose: () => void;
  defaultType?: string;
  onCreated?: () => void;
};

type MachineLite = {
  id: number;
  numInventaire: string;
  numSerie: string;
};

const norm = (s: string) =>
  (s || "").toString().trim().toLowerCase().replace(/\s+/g, "");

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
  const [loadingIdx, setLoadingIdx] = useState(false);
  const [existingInv, setExistingInv] = useState<Set<string>>(new Set());
  const [existingSer, setExistingSer] = useState<Set<string>>(new Set());
  const [fetchErr, setFetchErr] = useState<string | null>(null);

  // Charger tous les N° d’inventaire/série existants à l’ouverture
  useEffect(() => {
    if (!open) return;
    setMachine((m) => ({ ...m, type: defaultType || "" }));
    setFetchErr(null);
    (async () => {
      setLoadingIdx(true);
      try {
        const list = await api<MachineLite[] | any[]>("/machines");
        const inv = new Set<string>();
        const ser = new Set<string>();
        (list || []).forEach((m: any) => {
          if (m?.numInventaire) inv.add(norm(m.numInventaire));
          if (m?.numSerie) ser.add(norm(m.numSerie));
        });
        setExistingInv(inv);
        setExistingSer(ser);
      } catch (e: any) {
        setFetchErr(e?.message || "Impossible de vérifier les doublons.");
      } finally {
        setLoadingIdx(false);
      }
    })();
  }, [open, defaultType]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setMachine({ ...machine, [e.target.name]: e.target.value });

  const dupInventaire = useMemo(() => {
    const n = norm(machine.numInventaire);
    return !!n && existingInv.has(n);
  }, [machine.numInventaire, existingInv]);

  const dupSerie = useMemo(() => {
    const n = norm(machine.numSerie);
    return !!n && existingSer.has(n);
  }, [machine.numSerie, existingSer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machine.type.trim()) return alert("Type obligatoire");
    if (!machine.reference.trim()) return alert("Référence obligatoire");
    if (!machine.numSerie.trim()) return alert("N° de série obligatoire");
    if (!machine.numInventaire.trim()) return alert("N° d’inventaire obligatoire");

    if (dupInventaire) return alert("Ce N° d’inventaire existe déjà.");
    if (dupSerie) return alert("Ce N° de série existe déjà.");

    setSubmitting(true);
    try {
      // Re-vérification côté serveur (concurrence)
      const latest = await api<any[]>("/machines");
      const latestInv = new Set<string>();
      const latestSer = new Set<string>();
      (latest || []).forEach((m: any) => {
        if (m?.numInventaire) latestInv.add(norm(m.numInventaire));
        if (m?.numSerie) latestSer.add(norm(m.numSerie));
      });
      if (latestInv.has(norm(machine.numInventaire))) {
        alert("Ce N° d’inventaire existe déjà (vérification finale).");
        return;
      }
      if (latestSer.has(norm(machine.numSerie))) {
        alert("Ce N° de série existe déjà (vérification finale).");
        return;
      }

      await api("/machines", {
        method: "POST",
        body: JSON.stringify({
          type: machine.type,
          reference: machine.reference,
          numSerie: machine.numSerie,
          numInventaire: machine.numInventaire,
        }),
      });

      onCreated?.();
      setMachine({
        type: defaultType || "",
        reference: "",
        numSerie: "",
        numInventaire: "",
      });
      onClose();
    } catch (err: any) {
      const msg = err?.message || "Erreur réseau";
      if (/unique|duplicat|409/i.test(msg)) {
        alert("Conflit d’unicité (inventaire/série déjà utilisé).");
      } else {
        alert(msg);
      }
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

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              N° de série
              <input
                type="text"
                name="numSerie"
                value={machine.numSerie}
                onChange={handleChange}
                className={[
                  "mt-1 w-full rounded border p-2",
                  dupSerie ? "border-red-400 bg-red-50" : "",
                ].join(" ")}
                required
              />
              {loadingIdx && (
                <div className="mt-1 text-xs text-gray-500">Vérification…</div>
              )}
              {fetchErr && (
                <div className="mt-1 text-xs text-amber-600">
                  {fetchErr} — l’ajout peut échouer si un doublon existe.
                </div>
              )}
              {dupSerie && (
                <div className="mt-1 text-xs font-medium text-red-600">
                  Ce N° de série existe déjà.
                </div>
              )}
            </label>

            <label className="block text-sm">
              N° d’inventaire
              <input
                type="text"
                name="numInventaire"
                value={machine.numInventaire}
                onChange={handleChange}
                className={[
                  "mt-1 w-full rounded border p-2",
                  dupInventaire ? "border-red-400 bg-red-50" : "",
                ].join(" ")}
                required
              />
              {dupInventaire && (
                <div className="mt-1 text-xs font-medium text-red-600">
                  Ce N° d’inventaire existe déjà.
                </div>
              )}
            </label>
          </div>

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
              disabled={submitting || dupInventaire || dupSerie || loadingIdx}
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
