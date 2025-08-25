// src/components/AssignDestinationModal.tsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  machineId: number | null;
  onAssigned?: () => void;
};

// Hiérarchie (Safi)
const COUR_APPEL = "Cour d'appel de Safi";
const TPI_SAFI = "TPI Safi";
const TPI_ESSAOUIRA = "TPI Essaouira";
const TPI_YOUSSOUIFIA = "TPI Youssoufia";

const COMPONENTS_CA = [
  "Parquet général",
  "Greffe",
  "Chambre civile",
  "Chambre correctionnelle",
  "Chambre criminelle",
  "Chambre sociale",
  "Juge d’instruction",
  "Exécution des décisions",
  "Casier judiciaire",
  "Bureau d’ordre",
  "Informatique / Logistique",
  "Archives / Scellés",
  "Comptabilité / Matériel",
];

const COMPONENTS_TPI = [
  "Parquet",
  "Greffe",
  "Section de la famille",
  "Juge d’instruction",
  "Exécution des décisions",
  "Casier judiciaire",
  "Bureau d’ordre",
  "Informatique / Logistique",
  "Archives / Scellés",
  "Comptabilité / Matériel",
];

const COMPONENTS_CENTRE = [
  "Greffe",
  "Bureau d’ordre",
  "Salle d’audience",
  "Informatique / Logistique",
  "Archives",
];

const CENTRES_SAFI = ["Jmaa Shaim", "Sebt Gzoula"];
const CENTRES_ESSAOUIRA = ["Talmsst", "Hanchane", "Tamanar"];
const CENTRES_YOUSSOUIFIA = ["Chmaia"];

// 1er niveau
const LEVEL1 = [
  { key: COUR_APPEL, label: COUR_APPEL, type: "CA" as const },
  { key: TPI_SAFI, label: TPI_SAFI, type: "TPI" as const },
  { key: TPI_ESSAOUIRA, label: TPI_ESSAOUIRA, type: "TPI" as const },
  { key: TPI_YOUSSOUIFIA, label: TPI_YOUSSOUIFIA, type: "TPI" as const },
];

export default function AssignDestinationModal({
  open,
  onClose,
  machineId,
  onAssigned,
}: Props) {
  const [lv1, setLv1] = useState<string>("");
  const [lv2, setLv2] = useState<string>("");
  const [lv3, setLv3] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setLv1("");
      setLv2("");
      setLv3("");
      setSubmitting(false);
    }
  }, [open]);

  const isCA = useMemo(() => lv1 === COUR_APPEL, [lv1]);
  const isTPI = useMemo(
    () => [TPI_SAFI, TPI_ESSAOUIRA, TPI_YOUSSOUIFIA].includes(lv1),
    [lv1]
  );

  // 2e niveau (sous-entité d’un TPI)
  const level2Options = useMemo(() => {
    if (isCA) return ["— Composante de la Cour —"];
    if (lv1 === TPI_SAFI)
      return ["Tribunal", ...CENTRES_SAFI.map((c) => `Centre Juge Résident ${c}`)];
    if (lv1 === TPI_ESSAOUIRA)
      return ["Tribunal", ...CENTRES_ESSAOUIRA.map((c) => `Centre Juge Résident ${c}`)];
    if (lv1 === TPI_YOUSSOUIFIA)
      return ["Tribunal", ...CENTRES_YOUSSOUIFIA.map((c) => `Centre Juge Résident ${c}`)];
    return [];
  }, [lv1, isCA]);

  // 3e niveau (composante)
  const level3Options = useMemo(() => {
    if (isCA) return COMPONENTS_CA;
    if (isTPI && lv2 === "Tribunal") return COMPONENTS_TPI;
    if (isTPI && lv2.startsWith("Centre Juge Résident")) return COMPONENTS_CENTRE;
    return [];
  }, [isCA, isTPI, lv2]);

  const buildDestinationName = () => {
    if (isCA && lv3) return `${COUR_APPEL} – ${lv3}`;
    if (isTPI && lv2 === "Tribunal" && lv3) return `${lv1} – ${lv3}`;
    if (isTPI && lv2.startsWith("Centre Juge Résident") && lv3)
      return `${lv2} – ${lv3}`;
    return "";
  };

  // — API helpers (utilise le wrapper api) —
  const findDestination = async (name: string) => {
    const list = await api<{ id: number; name: string }[]>("/destinations");
    return (
      list.find(
        (d) => d.name.trim().toLowerCase() === name.trim().toLowerCase()
      ) ?? null
    );
  };

  const createDestination = async (name: string) => {
    return await api<{ id: number; name: string }>("/destinations", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  };

  const ensureDestinationId = async (name: string) => {
    const found = await findDestination(name);
    if (found) return found.id;
    const created = await createDestination(name);
    return created.id;
  };

  const handleAssign = async () => {
    if (!machineId) return;
    const fullName = buildDestinationName();
    if (!fullName) {
      alert("Veuillez compléter la sélection.");
      return;
    }
    try {
      setSubmitting(true);
      const destinationId = await ensureDestinationId(fullName);
      await api(`/machines/${machineId}/assign`, {
        method: "PUT",
        body: JSON.stringify({ destinationId }),
      });
      onAssigned?.();
      onClose();
    } catch (e: any) {
      alert(e?.message || "Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Affecter par hiérarchie (Safi)</h3>
          <button
            className="rounded p-1 text-gray-500 hover:bg-gray-100"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {/* Niveau 1 */}
          <label className="block text-sm">
            Juridiction
            <select
              className="mt-1 w-full rounded border p-2"
              value={lv1}
              onChange={(e) => {
                setLv1(e.target.value);
                setLv2("");
                setLv3("");
              }}
            >
              <option value="">-- Sélectionner --</option>
              {LEVEL1.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {/* Niveau 2 (si TPI) */}
          {isTPI && (
            <label className="block text-sm">
              Sous-entité
              <select
                className="mt-1 w-full rounded border p-2"
                value={lv2}
                onChange={(e) => {
                  setLv2(e.target.value);
                  setLv3("");
                }}
              >
                <option value="">-- Sélectionner --</option>
                {level2Options.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Niveau 3 (composante) */}
          {(isCA || (isTPI && lv2)) && (
            <label className="block text-sm">
              Composante
              <select
                className="mt-1 w-full rounded border p-2"
                value={lv3}
                onChange={(e) => setLv3(e.target.value)}
              >
                <option value="">-- Sélectionner --</option>
                {level3Options.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Résumé */}
          <div className="rounded bg-gray-50 p-2 text-sm text-gray-700">
            <span className="font-medium">Destination finale :</span>{" "}
            {buildDestinationName() || "—"}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border px-4 py-2 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleAssign}
            disabled={submitting || !buildDestinationName()}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Affectation..." : "Affecter"}
          </button>
        </div>
      </div>
    </div>
  );
}
