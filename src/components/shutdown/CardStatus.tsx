import { AlertTriangle, CheckCircle, Loader } from "lucide-react";
import { useApp } from "../../context/AppContext";
import type { TeardownCardState } from "../../hooks/useTeardown";
import { StatusBox } from "./StatusBox";

interface CardStatusProps {
  /** The service has something to point at. */
  requested: boolean;
  state?: TeardownCardState;
}

const spinner = <Loader size={15} className="service-config-block__spinner" />;

/** What a shutdown card says about its resource, from the provider's last answer. */
export function CardStatus({ requested, state }: CardStatusProps) {
  const { t } = useApp();

  if (!requested) {
    return (
      <StatusBox tone="success" icon={<CheckCircle size={15} />}>
        {t("shutdown.status.nothing")}
      </StatusBox>
    );
  }

  switch (state?.status) {
    case undefined:
    case "checking":
      return (
        <StatusBox tone="running" icon={spinner}>
          {t("shutdown.status.checking")}
        </StatusBox>
      );
    case "deleting":
      return (
        <StatusBox tone="running" icon={spinner}>
          {t("shutdown.status.deleting")}
        </StatusBox>
      );
    case "pending":
      return (
        <StatusBox tone="running" icon={spinner}>
          {t("shutdown.status.pending")}
        </StatusBox>
      );
    case "absent":
      return (
        <StatusBox tone="success" icon={<CheckCircle size={15} />}>
          {t("shutdown.status.absent")}
        </StatusBox>
      );
    case "present":
      return (
        <StatusBox tone="running" icon={<AlertTriangle size={15} />}>
          {t("shutdown.status.present")}
          {state.detail && (
            <span className="shutdown-card__detail">{state.detail}</span>
          )}
        </StatusBox>
      );
    case "unknown":
      return (
        <StatusBox tone="error" icon={<AlertTriangle size={15} />}>
          {t("shutdown.status.unknown")}
          {state.error && (
            <span className="shutdown-card__detail">{state.error}</span>
          )}
        </StatusBox>
      );
    case "error":
      return (
        <StatusBox tone="error" icon={<AlertTriangle size={15} />}>
          {t("shutdown.status.error")}
          {state.error && (
            <span className="shutdown-card__detail">{state.error}</span>
          )}
        </StatusBox>
      );
  }
}
