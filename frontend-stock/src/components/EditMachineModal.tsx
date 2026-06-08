import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

interface Machine {
  id: number;
  type: string;
  marque?: string | null;
  reference: string;
  numSerie: string;
  numInventaire: string;
  status: string;
  createdAt?: string;
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

const todayDateInput = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const dateToInput = (date?: string | null) => {
  if (!date) return todayDateInput();

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return todayDateInput();
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

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
    marque: "",
    reference: "",
    numSerie: "",
    numInventaire: "",
    dateAjout: todayDateInput(),
  });

  const [saving, setSaving] = useState(false);
  const [allMachines, setAllMachines] = useState<Machine[]>([]);
  const [loadingCheck, setLoadingCheck] = useState(false);

  useEffect(() => {
    if (!open || !machine) return;

    setForm({
      type: machine.type || "",
      marque: machine.marque || "",
      reference: machine.reference || "",
      numSerie: machine.numSerie || "",
      numInventaire: machine.numInventaire || "",
      dateAjout: dateToInput(machine.createdAt),
    });
  }, [open, machine]);

  useEffect(() => {
    if (!open) return;

    let alive = true;

    (async () => {
      try {
        setLoadingCheck(true);

        const list = await api<Machine[]>("/machines");

        if (alive) {
          setAllMachines(list || []);
        }
      } catch {
        if (alive) {
          setAllMachines([]);
        }
      } finally {
        if (alive) {
          setLoadingCheck(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [open]);

  const onChange = (key: keyof typeof form, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const originalSerie = useMemo(
    () => norm(machine?.numSerie || ""),
    [machine?.numSerie]
  );

  const originalInv = useMemo(
    () => norm(machine?.numInventaire || ""),
    [machine?.numInventaire]
  );

  const serieChanged = useMemo(
    () => norm(form.numSerie) !== originalSerie,
    [form.numSerie, originalSerie]
  );

  const invChanged = useMemo(
    () => norm(form.numInventaire) !== originalInv,
    [form.numInventaire, originalInv]
  );

  const serieTaken = useMemo(() => {
    if (!machine) return false;
    if (!serieChanged) return false;

    const value = norm(form.numSerie);

    if (!value) return false;

    return allMachines.some(
      (item) => item.id !== machine.id && norm(item.numSerie) === value
    );
  }, [allMachines, form.numSerie, machine, serieChanged]);

  const invTaken = useMemo(() => {
    if (!machine) return false;
    if (!invChanged) return false;

    const value = norm(form.numInventaire);

    if (!value) return false;

    return allMachines.some(
      (item) => item.id !== machine.id && norm(item.numInventaire) === value
    );
  }, [allMachines, form.numInventaire, machine, invChanged]);

  const canSave =
    !!machine &&
    !saving &&
    !loadingCheck &&
    form.type.trim() !== "" &&
    form.reference.trim() !== "" &&
    form.numSerie.trim() !== "" &&
    form.numInventaire.trim() !== "" &&
    form.dateAjout.trim() !== "" &&
    !serieTaken &&
    !invTaken;

  const save = async () => {
    if (!machine || !canSave) return;

    setSaving(true);

    try {
      await api(`/machines/${machine.id}`, {
        method: "PUT",
        body: JSON.stringify({
          type: form.type,
          marque: form.marque,
          reference: form.reference,
          numSerie: form.numSerie,
          numInventaire: form.numInventaire,

          // Date d'ajout choisie par l'utilisateur, sans heure dans le formulaire
          createdAt: `${form.dateAjout}T00:00:00.000Z`,
        }),
      });

      await onSaved();
      onClose();
    } catch (error: any) {
      alert(error?.message || "Échec de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  if (!open || !machine) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Modifier la machine {machine.reference || "—"}
          </h2>

          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm">Type</label>

            <select
              value={form.type}
              onChange={(event) => onChange("type", event.target.value)}
              className="w-full rounded border px-3 py-2"
            >
              <option value="">-- Sélectionner --</option>

              {TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm">Marque</label>

            <input
              value={form.marque}
              onChange={(event) => onChange("marque", event.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="Ex: Dell, HP, Canon..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm">Référence</label>

            <input
              value={form.reference}
              onChange={(event) => onChange("reference", event.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="Référence"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">N° Série</label>

              <input
                value={form.numSerie}
                onChange={(event) => onChange("numSerie", event.target.value)}
                className={[
                  "w-full rounded border px-3 py-2",
                  serieChanged && serieTaken
                    ? "border-red-400 bg-red-50"
                    : "border-gray-300",
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
                onChange={(event) =>
                  onChange("numInventaire", event.target.value)
                }
                className={[
                  "w-full rounded border px-3 py-2",
                  invChanged && invTaken
                    ? "border-red-400 bg-red-50"
                    : "border-gray-300",
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

          <div>
            <label className="mb-1 block text-sm">Date d’ajout</label>

            <input
              type="date"
              value={form.dateAjout}
              onChange={(event) => onChange("dateAjout", event.target.value)}
              className="w-full rounded border bg-white px-3 py-2 text-gray-900"
            />
          </div>

          {loadingCheck && (
            <div className="text-xs text-gray-500">
              Vérification des doublons en cours…
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border px-4 py-2 hover:bg-gray-50"
          >
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