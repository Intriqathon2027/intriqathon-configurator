/**
 * The DNS records the deployment needs, and how a hostname maps onto the
 * `Host` field a registrar shows.
 *
 * Shared between the table the wizard displays for a manual copy and the
 * Spaceship automation that writes the very same records over the API. They
 * have to come from one place: a reader who ticks "these records are added"
 * is confirming the table, and the run has to be pushing that same list.
 */

export type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT'

export interface DnsRecord {
  type: DnsRecordType
  /** Name without the domain part — `@` for the apex, as Spaceship documents it. */
  host: string
  /** The record's value, as a registrar's single "Answer" field takes it. */
  answer: string
  ttl: number
  /** MX only — the preference value. */
  priority?: number
}

export const DNS_TTL = 3600

/**
 * Spaceship's Host field takes the name *without* the domain — `@` for the
 * apex, `config` for the admin panel — which is also what its API documents
 * ("name of resource record excluding domain name part"). Pasting the full
 * hostname there creates `config.domain.fr.domain.fr`, a record that resolves
 * for nobody and looks right in the table.
 *
 * Also applied to what Resend hands back, which is relative to the registered
 * domain already — running it through here costs nothing and covers the case
 * where it answers with a fully qualified name instead.
 */
export function hostPart(hostname: string, domain: string): string {
  const name = hostname.trim().replace(/\.$/, '')
  if (!name || !domain || name === domain) return '@'
  return name.endsWith(`.${domain}`) ? name.slice(0, -(domain.length + 1)) : name
}

/**
 * The records that belong to the deployment itself: the site, the admin panel
 * and the DMARC policy for the sending subdomain. Resend's own records are not
 * in here — they only exist once its API has been asked for them.
 */
export function buildInfraDnsRecords(
  domain: string,
  ipv4: string,
  mailSubdomain: string,
): DnsRecord[] {
  const mailHost = hostPart(mailSubdomain, domain)
  return [
    { type: 'TXT', host: `_dmarc.${mailHost}`, answer: 'v=DMARC1;p=none;', ttl: DNS_TTL },
    { type: 'A', host: '@', answer: ipv4, ttl: DNS_TTL },
    { type: 'A', host: 'config', answer: ipv4, ttl: DNS_TTL },
  ]
}
