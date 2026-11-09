import { type ReactNode } from "react";

export type StatusBoxTone = "success" | "error" | "running" | "warning";

interface StatusBoxProps {
  tone: StatusBoxTone;
  icon: ReactNode;
  children: ReactNode;
}

/**
 * One line of state inside a shutdown card — what the provider last said, or
 * a caveat. Reuses the info-box look of the step 2 blocks so a status reads
 * the same wherever it appears.
 */
export function StatusBox({ tone, icon, children }: StatusBoxProps) {
  return (
    <div
      className={`service-config-block__info-box service-config-block__info-box--${tone} shutdown-card__status`}
    >
      {icon}
      <div className="shutdown-card__status-text">{children}</div>
    </div>
  );
}
