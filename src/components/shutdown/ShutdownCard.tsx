import { type ReactNode } from "react";
import { AlertTriangle, Loader, Trash2 } from "lucide-react";
import { ServiceAccountCard } from "../ui/ServiceAccountCard";
import { useApp } from "../../context/AppContext";
import type { TeardownCardState } from "../../hooks/useTeardown";
import type { TeardownService } from "../../types/teardown";
import { CardStatus } from "./CardStatus";
import { StatusBox } from "./StatusBox";

interface ShutdownCardProps {
  service: TeardownService;
  title: string;
  icon: ReactNode;
  /** What the deletion removes — and, by omission, what it keeps. */
  what: string;
  target: string;
  targetLabel: string;
  /** A caveat on how the target was found. */
  note?: string;
  /** Said before the button, in the warning colour. */
  warning?: string;
  /** The service has something to point at. */
  requested: boolean;
  state?: TeardownCardState;
  complete: boolean;
  /** Another deletion is running. */
  locked: boolean;
  /**
   * A follow-up run started from this card is in flight (the Scaleway volumes)
   * — the card holds the lock and stays above the dimmed screen meanwhile.
   */
  busy?: boolean;
  onDelete: () => void;
  /** Rendered under the status, whether or not the card is green. */
  extra?: ReactNode;
}

/**
 * One provider on "Arrêt du site": what will be deleted, what the provider
 * last said about it, and the button that deletes it — on the footer row,
 * level with "Learn more".
 */
export function ShutdownCard({
  service,
  title,
  icon,
  what,
  target,
  targetLabel,
  note,
  warning,
  requested,
  state,
  complete,
  locked,
  busy = false,
  onDelete,
  extra,
}: ShutdownCardProps) {
  const { t } = useApp();
  const status = state?.status;
  const deleting = status === "deleting";
  // Only something the provider says is there can be deleted. "Unknown" does
  // not qualify: the same missing key or unreachable API would fail the
  // deletion too, and the box above already says why.
  const canDelete =
    requested && (status === "present" || status === "error") && !locked;

  const deleteButton = requested && !complete && (
    <button
      type="button"
      className="btn btn-danger"
      onClick={onDelete}
      disabled={!canDelete}
      id={`btn-shutdown-${service}`}
    >
      {deleting ? (
        <Loader size={14} className="service-config-block__spinner" />
      ) : (
        <Trash2 size={14} />
      )}
      {deleting ? t("shutdown.btn.deleting") : t("shutdown.btn.delete")}
    </button>
  );

  return (
    <ServiceAccountCard
      serviceName={title}
      serviceIcon={icon}
      helpAnchor={`shutdown-${service}`}
      isComplete={complete}
      automationRunning={deleting || busy}
      footerAction={deleteButton || undefined}
    >
      <div className="form-section">
        <p className="shutdown-card__what">{what}</p>

        {requested && target && (
          <div className="shutdown-card__target">
            <span className="shutdown-card__target-label">{targetLabel}</span>
            <code>{target}</code>
          </div>
        )}
        {note && <p className="shutdown-card__note">{note}</p>}

        <CardStatus requested={requested} state={state} />

        {state?.warnings && state.warnings.length > 0 && (
          <div className="shutdown-card__warnings">
            <span className="shutdown-card__target-label">
              {t("shutdown.warnings")}
            </span>
            <ul>
              {state.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {extra}

        {warning && !complete && (
          <StatusBox tone="warning" icon={<AlertTriangle size={15} />}>
            {warning}
          </StatusBox>
        )}
      </div>
    </ServiceAccountCard>
  );
}
