import type { SupabasePoolerConfig } from './types'
import { ensurePgBouncerFlag } from '../../../shared/pgbouncer'

/**
 * Building DATABASE_URL and DIRECT_URL.
 *
 * The Management API hands back the pooler's host/port/user but leaves the
 * password out — its `connection_string` still carries the literal
 * `[YOUR-PASSWORD]`, exactly like the string copied by hand from the dashboard.
 * So we build the URLs from the parts rather than patching that placeholder,
 * and we URL-encode the password ourselves: `@`, `:`, `/`, `#` and `?` in a
 * password all break a connection string that was pasted raw, which is the
 * single most common way to end up with a deployment that cannot reach its
 * database.
 *
 *   DATABASE_URL — transaction mode (port 6543), what Prisma uses at runtime
 *   DIRECT_URL   — session mode (port 5432), what Prisma migrations need
 */

const SESSION_PORT = 5432

export interface PostgresUrls {
  databaseUrl: string
  directUrl: string
}

export interface BuildPostgresUrlsInput {
  ref: string
  password: string
  /** `GET /v1/projects/{ref}/config/database/pooler` */
  pooler: SupabasePoolerConfig[]
  /** `database.host` from `GET /v1/projects/{ref}` — the direct, non-pooled host. */
  databaseHost?: string
}

function buildUrl(user: string, password: string, host: string, port: number, dbName: string): string {
  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${dbName}`
}

/**
 * Read replicas carry their own pooler entry; only the primary is of interest.
 * Entries with no `database_type` are treated as primary — older responses
 * omitted the field.
 */
function primaryEntries(pooler: SupabasePoolerConfig[]): SupabasePoolerConfig[] {
  return pooler.filter(e => !e.database_type || e.database_type === 'PRIMARY')
}

export function buildPostgresUrls({ ref, password, pooler, databaseHost }: BuildPostgresUrlsInput): PostgresUrls {
  const entries = primaryEntries(pooler)
  const transaction = entries.find(e => e.pool_mode === 'transaction') ?? entries[0]
  const session = entries.find(e => e.pool_mode === 'session')

  if (!transaction?.db_host) {
    // No pooler at all: fall back to the direct connection for both. Works, but
    // the direct host is IPv6-only on some projects — hence the pooler first.
    const host = databaseHost || `db.${ref}.supabase.co`
    const direct = buildUrl('postgres', password, host, SESSION_PORT, 'postgres')
    return { databaseUrl: direct, directUrl: direct }
  }

  const user = transaction.db_user || `postgres.${ref}`
  const dbName = transaction.db_name || 'postgres'

  const databaseUrl = ensurePgBouncerFlag(
    buildUrl(user, password, transaction.db_host, transaction.db_port ?? 6543, dbName),
  )

  // Session mode usually shares the pooler host on port 5432. When the API does
  // not list a session entry, derive it rather than dropping to the direct host.
  const directUrl = session?.db_host
    ? buildUrl(session.db_user || user, password, session.db_host, session.db_port ?? SESSION_PORT, session.db_name || dbName)
    : buildUrl(user, password, transaction.db_host, SESSION_PORT, dbName)

  return { databaseUrl, directUrl }
}

/** The project's public REST/Storage origin. Derived — there is no endpoint for it. */
export function projectUrl(ref: string): string {
  return `https://${ref}.supabase.co`
}
