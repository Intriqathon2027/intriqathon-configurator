import { Copy } from "lucide-react";
import type { DnsRecord } from "../../shared/dnsRecords";

interface DnsTableProps {
  records: DnsRecord[];
  labels: {
    type: string;
    host: string;
    answer: string;
    ttl: string;
    copy: string;
    copyRow: string;
  };
}

/** One row, in the order a registrar's form asks for it. */
function rowText(record: DnsRecord): string {
  const value =
    record.priority === undefined
      ? record.answer
      : `${record.priority} ${record.answer}`;
  return `${record.type},${record.host},${value},${record.ttl}`;
}

/**
 * The records to publish, whether they are the deployment's own or the ones
 * Resend asked for. Rendered even when an automation is going to write them:
 * a run can be locked, a registrar can be somebody else's, and the reader who
 * has to type them in needs to see the same list the API would have sent.
 */
export function DnsTable({ records, labels }: DnsTableProps) {
  return (
    <table className="dns-table">
      <thead>
        <tr>
          <th>{labels.type}</th>
          <th>{labels.host}</th>
          <th>{labels.answer}</th>
          <th>{labels.ttl}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {records.map((record, i) => (
          <tr key={`${record.type}-${record.host}-${i}`}>
            <td>
              <span className="dns-table__type">{record.type}</span>
            </td>
            <td>{record.host}</td>
            <td>
              {record.answer}
              {record.priority !== undefined && (
                <span className="dns-table__priority"> · {record.priority}</span>
              )}
            </td>
            <td>{record.ttl}</td>
            <td>
              <button
                className="btn btn-copy"
                onClick={() => navigator.clipboard.writeText(rowText(record))}
                title={labels.copyRow}
              >
                <Copy size={11} />
                {labels.copy}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
