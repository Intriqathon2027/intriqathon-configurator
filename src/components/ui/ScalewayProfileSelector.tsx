import { useState } from "react";
import { Check, Users } from "lucide-react";
import { useApp } from "../../context/AppContext";
import {
  SCALEWAY_PROFILES,
  scalewayProfileFor,
  scalewayProfileLabel,
  type ScalewayProfile,
} from "../../shared/scalewayProfiles";
import { WarningDialog } from "./WarningDialog";

interface ScalewayProfileSelectorProps {
  id: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * The instance size, by expected participants. Laid out like the SSH key row
 * next to it — a label above one box — and bound to the one config field both
 * the automation and the manual recommendations read, so changing it in one
 * place changes it in the other.
 *
 * A change is confirmed first: another size is another instance type, billed
 * at another rate, and a select is too easy to change by accident.
 */
export function ScalewayProfileSelector({
  id,
  label,
  disabled,
  className = "",
}: ScalewayProfileSelectorProps) {
  const { config, setField, state } = useApp();
  const isEn = state.language === "en";
  const current = scalewayProfileFor(config.SCW_SIZING_PROFILE);
  const [pending, setPending] = useState<ScalewayProfile | null>(null);
  const gb = isEn ? "GB" : "Go";
  const specs = (p: ScalewayProfile) =>
    `${p.commercialType} · ${p.vcpu} vCPU / ${p.ramGb} ${gb} RAM · ${p.storageGb} ${gb}`;

  return (
    <div className={`scaleway-profile-selector ${className}`}>
      {label && (
        <label className="form-label" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="form-input-row">
        <div className="scaleway-profile-selector__box">
          <Users size={14} color="var(--color-primary)" />
          <select
            id={id}
            className="scaleway-profile-selector__select"
            value={current.id}
            disabled={disabled}
            onChange={(e) => {
              const next = scalewayProfileFor(e.target.value);
              if (next.id !== current.id) setPending(next);
            }}
          >
            {SCALEWAY_PROFILES.map((p) => (
              <option key={p.id} value={p.id}>
                {scalewayProfileLabel(p, isEn)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {pending && (
        <WarningDialog
          idPrefix="scaleway-profile"
          title={
            isEn
              ? "The instance price will change"
              : "Le prix de l'instance va changer"
          }
          intro={
            isEn
              ? "This sizing creates another Scaleway instance type, billed at a different rate:"
              : "Ce dimensionnement crée un autre type d'instance Scaleway, facturé à un tarif différent :"
          }
          items={[
            {
              key: "from",
              chip: isEn ? "Current" : "Actuel",
              label: specs(current),
            },
            {
              key: "to",
              chip: isEn ? "New" : "Nouveau",
              label: specs(pending),
            },
          ]}
          cancelLabel={isEn ? "Cancel" : "Annuler"}
          proceedLabel={isEn ? "Change sizing" : "Changer le dimensionnement"}
          proceedIcon={<Check size={14} />}
          onCancel={() => setPending(null)}
          onProceed={() => {
            setField("SCW_SIZING_PROFILE", pending.id);
            setPending(null);
          }}
        />
      )}
    </div>
  );
}
