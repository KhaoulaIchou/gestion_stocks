import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

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

const norm = (s: string) => (s || "").trim().toLowerCase();

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
  // ⛔️ Ne rien rendre tant que le modal est fermé (évite les hooks conditionnels)
  if (!open || !machine) return null;

  // Etats du formulaire
  const [form, setForm] = useState({
    type: machine.type || "",
    reference: machine.reference || "",
    numSerie: machine.numSerie || "",
    numInventaire: machine.numInventaire || "",
  });
  const [saving, setSaving] = useState(false);

  // Données pour vérification d’unicité
  const [allMachines, setAllMachines] = useState<Machine[]>([]);
  const [loadingCheck, setLoadingCheck] = useState(false);

  // Sync si la machine change pendant l’ouverture
  useEffect(() => {
    setForm({
      type: machine.type || "",
      reference: machine.reference || "",
      numSerie: machine.numSerie || "",
      numInventaire: machine.numInventaire || "",
    });
  }, [machine]);

  // Charger toutes les machines quand le modal est ouvert
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingCheck(true);
        const list = await api<Machine[]>("/machines");
        if (alive) setAllMachines(list || []);
      } catch {
        if (alive) setAllMachines([]);
      } finally {
        if (alive) setLoadingCheck(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const onChange = (k: keyof typeof form, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  // Valeurs d’origine (normalisées)
  const originalSerie = useMemo(() => norm(machine.numSerie), [machine.numSerie]);
  const originalInv   = useMemo(() => norm(machine.numInventaire), [machine.numInventaire]);

  // Est-ce que l’utilisateur a vraiment changé la valeur ?
  const serieChanged = useMemo(
    () => norm(form.numSerie) !== originalSerie,
    [form.numSerie, originalSerie]
  );
  const invChanged = useMemo(
    () => norm(form.numInventaire) !== originalInv,
    [form.numInventaire, originalInv]
  );

  // Doublons (on NE bloque QUE si l’utilisateur a changé la valeur)
  const serieTaken = useMemo(() => {
    if (!serieChanged) return false;
    const v = norm(form.numSerie);
    if (!v) return false;
    return allMachines.some(
      (m) => m.id !== machine.id && norm(m.numSerie) === v
    );
  }, [allMachines, form.numSerie, machine.id, serieChanged]);

  const invTaken = useMemo(() => {
    if (!invChanged) return false;
    const v = norm(form.numInventaire);
    if (!v) return false;
    return allMachines.some(
      (m) => m.id !== machine.id && norm(m.numInventaire) === v
    );
  }, [allMachines, form.numInventaire, machine.id, invChanged]);

  const canSave =
    !saving &&
    !loadingCheck &&
    form.type.trim() !== "" &&
    form.reference.trim() !== "" &&
    form.numSerie.trim() !== "" &&
    form.numInventaire.trim() !== "" &&
    !serieTaken &&
    !invTaken;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await api(`/machines/${machine.id}`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
      await onSaved();
      onClose();
    } catch (e: any) {
      alert(e?.message || "Échec de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Modifier la machine (série {machine.numSerie || "—"})
          </h2>
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
              <option value="">-- Sélectionner --</option>
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">N° Série</label>
              <input
                value={form.numSerie}
                onChange={(e) => onChange("numSerie", e.target.value)}
                className={[
                  "w-full rounded border px-3 py-2",
                  serieChanged && serieTaken ? "border-red-400" : "border-gray-300",
                ].join(" ")}
                placeholder="N° Série"
              />
              {serieChanged && serieTaken && (
                <div className="mt-1 text-xs text-red-600">
                  Ce n° de série existe déjà.
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm">N° Inventaire</label>
              <input
                value={form.numInventaire}
                onChange={(e) => onChange("numInventaire", e.target.value)}
                className={[
                  "w-full rounded border px-3 py-2",
                  invChanged && invTaken ? "border-red-400" : "border-gray-300",
                ].join(" ")}
                placeholder="N° Inventaire"
              />
              {invChanged && invTaken && (
                <div className="mt-1 text-xs text-red-600">
                  Ce n° d’inventaire existe déjà.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded border px-4 py-2 hover:bg-gray-50">
            Annuler
          </button>
          <button
            onClick={save}
            disabled={!canSave}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
            title={
              loadingCheck
                ? "Vérification en cours…"
                : serieTaken || invTaken
                ? "Corrigez les doublons"
                : undefined
            }
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
