import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import type { DnsRecord } from "../../shared/dnsRecords";

/**
 * `spaceship` is the registrar the automation writes to, and the table is
 * laid out the way its form asks. `generic` is for any other registrar: the
 * MX priority gets the field of its own most of them have, and every host
 * also carries its fully qualified name, for the ones that want it whole.
 */
export type DnsTableVariant = "spaceship" | "generic";

interface DnsTableProps {
  records: DnsRecord[];
  variant?: DnsTableVariant;
  /** Needed by the generic variant to spell each host out in full. */
  domain?: string;
  labels: {
    type: string;
    host: string;
    answer: string;
    ttl: string;
    copy: string;
    copyRow: string;
    copyCell: string;
    copied: string;
    priority: string;
    fullName: string;
  };
}

/** One row, in the order a registrar's form asks for it. */
function rowText(record: DnsRecord, variant: DnsTableVariant): string {
  if (variant === "generic") {
    return [
      record.type,
      record.host,
      record.answer,
      record.priority ?? "",
      record.ttl,
    ].join(",");
  }
  const value =
    record.priority === undefined
      ? record.answer
      : `${record.priority} ${record.answer}`;
  return `${record.type},${record.host},${value},${record.ttl}`;
}

/** `@` names the apex itself; anything else is relative to it. */
function fullName(host: string, domain: string): string {
  return host === "@" ? domain : `${host}.${domain}`;
}

/** Copies, then says so for a moment — long enough to be seen, no longer. */
function useCopy() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  };

  return { copied, copy };
}

interface CopyTarget {
  value: string;
  label: string;
  copiedLabel: string;
}

/** The icon that lifts one value — revealed by hovering the cell it sits in. */
function CellCopyButton({ value, label, copiedLabel }: CopyTarget) {
  const { copied, copy } = useCopy();

  return (
    <button
      type="button"
      className={`dns-table__cell-copy${copied ? " dns-table__cell-copy--copied" : ""}`}
      onClick={() => copy(value)}
      title={copied ? copiedLabel : `${label} : ${value}`}
      aria-label={`${label} : ${value}`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

/**
 * A cell whose value can be lifted on its own: registrars ask for each field
 * separately, and selecting a few hundred characters of DKIM by hand is where
 * a character goes missing. The button only shows on hover or keyboard focus,
 * so the table still reads as a table.
 */
function CopyCell({
  children,
  ...target
}: CopyTarget & { children: ReactNode }) {
  return (
    <td className="dns-table__cell">
      {children}
      <CellCopyButton {...target} />
    </td>
  );
}

/**
 * One of several values sharing a cell, each with a button of its own — the
 * generic host offers the short name and the full one, and which of the two a
 * registrar wants is the reader's call, not ours.
 */
function CopyLine({
  className,
  children,
  ...target
}: CopyTarget & { className?: string; children: ReactNode }) {
  return (
    <span className={`dns-table__line${className ? ` ${className}` : ""}`}>
      {children}
      <CellCopyButton {...target} />
    </span>
  );
}

function RowCopyButton({
  text,
  labels,
}: {
  text: string;
  labels: DnsTableProps["labels"];
}) {
  const { copied, copy } = useCopy();

  return (
    <button
      type="button"
      className={`btn btn-copy${copied ? " copied" : ""}`}
      onClick={() => copy(text)}
      title={labels.copyRow}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? labels.copied : labels.copy}
    </button>
  );
}

/**
 * The records to publish, whether they are the deployment's own or the ones
 * Resend asked for. Rendered even when an automation is going to write them:
 * a run can be locked, a registrar can be somebody else's, and the reader who
 * has to type them in needs to see the same list the API would have sent.
 */
export function DnsTable({
  records,
  variant = "spaceship",
  domain = "",
  labels,
}: DnsTableProps) {
  const isGeneric = variant === "generic";
  // The column only earns its place when a record actually has a priority.
  const showPriority = isGeneric && records.some((r) => r.priority !== undefined);
  const cell = (title: string) => ({
    label: `${labels.copyCell} — ${title}`,
    copiedLabel: labels.copied,
  });

  return (
    <table className={`dns-table dns-table--${variant}`}>
      <thead>
        <tr>
          <th>{labels.type}</th>
          <th>{labels.host}</th>
          <th>{labels.answer}</th>
          {showPriority && <th>{labels.priority}</th>}
          <th>{labels.ttl}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {records.map((record, i) => (
          <tr key={`${record.type}-${record.host}-${i}`}>
            <CopyCell value={record.type} {...cell(labels.type)}>
              <span className="dns-table__type">{record.type}</span>
            </CopyCell>
            {isGeneric && domain ? (
              <td className="dns-table__cell dns-table__cell--lines">
                <CopyLine value={record.host} {...cell(labels.host)}>
                  {record.host}
                </CopyLine>
                <CopyLine
                  className="dns-table__fqdn"
                  value={fullName(record.host, domain)}
                  {...cell(labels.fullName)}
                >
                  {fullName(record.host, domain)}
                </CopyLine>
              </td>
            ) : (
              <CopyCell value={record.host} {...cell(labels.host)}>
                {record.host}
              </CopyCell>
            )}
            <CopyCell value={record.answer} {...cell(labels.answer)}>
              {record.answer}
              {!isGeneric && record.priority !== undefined && (
                <span className="dns-table__priority"> · {record.priority}</span>
              )}
            </CopyCell>
            {showPriority &&
              (record.priority !== undefined ? (
                <CopyCell
                  value={String(record.priority)}
                  {...cell(labels.priority)}
                >
                  {record.priority}
                </CopyCell>
              ) : (
                <td className="dns-table__empty">—</td>
              ))}
            <CopyCell value={String(record.ttl)} {...cell(labels.ttl)}>
              {record.ttl}
            </CopyCell>
            <td>
              <RowCopyButton text={rowText(record, variant)} labels={labels} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
