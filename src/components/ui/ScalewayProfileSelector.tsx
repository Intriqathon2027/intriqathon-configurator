import { Users } from "lucide-react";
import { useApp } from "../../context/AppContext";
import {
  SCALEWAY_PROFILES,
  scalewayProfileFor,
  scalewayProfileLabel,
} from "../../shared/scalewayProfiles";

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
            onChange={(e) => setField("SCW_SIZING_PROFILE", e.target.value)}
          >
            {SCALEWAY_PROFILES.map((p) => (
              <option key={p.id} value={p.id}>
                {scalewayProfileLabel(p, isEn)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
