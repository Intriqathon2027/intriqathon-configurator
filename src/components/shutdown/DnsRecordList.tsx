import type { DnsRecord } from "../../shared/dnsRecords";

interface DnsRecordListProps {
  records: DnsRecord[];
  labels: { type: string; host: string; answer: string };
}

/**
 * The records to remove at another registrar, one compact line each.
 *
 * Deliberately lighter than step 2's `DnsTable`: nothing is being typed in
 * here, only recognised in a zone editor and deleted — so there is no copy
 * button, TTL or priority, and a long value (a DKIM key) is cut to one line,
 * whole on hover.
 */
export function DnsRecordList({ records, labels }: DnsRecordListProps) {
  return (
    <table className="dns-record-list">
      <thead>
        <tr>
          <th>{labels.type}</th>
          <th>{labels.host}</th>
          <th>{labels.answer}</th>
        </tr>
      </thead>
      <tbody>
        {records.map((record) => (
          <tr key={`${record.type}|${record.host}|${record.answer}`}>
            <td className="dns-record-list__type">{record.type}</td>
            <td>
              <code>{record.host}</code>
            </td>
            <td className="dns-record-list__answer" title={record.answer}>
              <code>{record.answer}</code>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
