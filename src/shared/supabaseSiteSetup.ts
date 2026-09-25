/**
 * The Supabase settings the stack needs once the deployment has created its
 * tables — the four dashboard clicks and the grant script of the "Configuration
 * du site" step, expressed as the SQL and the Management API calls that perform
 * them.
 *
 * Shared between the renderer and the main process: the card shows the very
 * statements the automation runs, so the manual fallback and the automated run
 * can never drift apart.
 */

/**
 * Default privileges on the public schema. Re-runnable: a GRANT that is already
 * held is a no-op, so a second run changes nothing.
 */
export const GRANTS_SQL = `GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon,
    authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon,
    authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO
    postgres, anon, authenticated, service_role;`

/** The table the Discord bot subscribes to, and the publication Realtime reads. */
export const REALTIME_TABLE = 'Announcement'
export const REALTIME_PUBLICATION = 'supabase_realtime'

/** The schema the Data API has to expose for the app to read anything at all. */
export const REQUIRED_EXPOSED_SCHEMA = 'public'

/**
 * What the realtime step is up against, before it changes anything.
 *
 * The table only exists once the deployment has migrated the database, and its
 * name is matched case-insensitively: knowing whether the schema is empty or
 * merely spells the table differently is the difference between "run the
 * deployment" and "you are pointed at the wrong project", and the run has to
 * say which.
 */
export const REALTIME_CHECK_SQL = `SELECT
  (SELECT count(*)::int FROM pg_tables WHERE schemaname = 'public') AS public_tables,
  (
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND lower(tablename) = lower('${REALTIME_TABLE}')
    ORDER BY tablename LIMIT 1
  ) AS matched_table,
  EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = '${REALTIME_PUBLICATION}'
  ) AS publication_exists,
  EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = '${REALTIME_PUBLICATION}'
      AND schemaname = 'public'
      AND lower(tablename) = lower('${REALTIME_TABLE}')
  ) AS already_published;`

/**
 * Whether the public schema holds anything at all — the cheapest form of the
 * check above, for the wait that precedes the run.
 */
export const PUBLIC_TABLE_COUNT_SQL = `SELECT count(*)::int AS public_tables
FROM pg_tables WHERE schemaname = 'public';`

export interface PublicTableCountRow {
  public_tables: number
}

/** The public tables, to name them when the expected one is not among them. */
export const PUBLIC_TABLES_SQL = `SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename
LIMIT 20;`

/**
 * Publishes the table the check actually found, rather than the name this file
 * expects — `%I`-style quoting, so a name with a quote in it cannot break out.
 */
export function realtimeAddSql(table: string): string {
  return `ALTER PUBLICATION ${REALTIME_PUBLICATION} ADD TABLE public."${table.replace(/"/g, '""')}";`
}

/** The public tables still without row level security — the list to report. */
export const RLS_PENDING_SQL = `SELECT tablename
FROM pg_tables
WHERE schemaname = 'public' AND NOT rowsecurity
ORDER BY tablename;`

/**
 * Enables RLS on every public table that lacks it. `format('%I')` quotes the
 * identifier, so Prisma's PascalCase table names survive.
 */
export const RLS_ENABLE_SQL = `DO $$
DECLARE target record;
BEGIN
  FOR target IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target.tablename);
  END LOOP;
END $$;`

/**
 * Whether the privileges `GRANTS_SQL` hands out are in fact held — the read-only
 * half of that block, for the box that claims it was run.
 *
 * Asked of the roles rather than of the grant statements: a reader who applied
 * the same privileges some other way has done the thing the box says, and the
 * point is what is true of the schema, not how it got that way.
 */
export const GRANTS_CHECK_SQL = `SELECT
  (SELECT count(*)::int FROM pg_tables WHERE schemaname = 'public') AS public_tables,
  (
    has_schema_privilege('anon', 'public', 'USAGE')
    AND has_schema_privilege('authenticated', 'public', 'USAGE')
    AND has_schema_privilege('service_role', 'public', 'USAGE')
  ) AS schema_granted,
  NOT EXISTS (
    SELECT 1 FROM pg_tables t
    WHERE t.schemaname = 'public'
      AND NOT (
        has_table_privilege('anon', format('public.%I', t.tablename), 'SELECT')
        AND has_table_privilege('authenticated', format('public.%I', t.tablename), 'SELECT')
        AND has_table_privilege('service_role', format('public.%I', t.tablename), 'SELECT')
      )
  ) AS tables_granted;`

export interface GrantsCheckRow {
  public_tables: number
  schema_granted: boolean
  tables_granted: boolean
}

/** Rows returned by `REALTIME_CHECK_SQL`. */
export interface RealtimeCheckRow {
  /** How many tables the public schema holds — 0 means nothing is migrated yet. */
  public_tables: number
  /** The table as Postgres actually spells it, or null when there is none. */
  matched_table: string | null
  publication_exists: boolean
  already_published: boolean
}

/** Rows returned by `RLS_PENDING_SQL`. */
export interface PendingRlsRow {
  tablename: string
}

/**
 * Adds `public` to the Data API's exposed schemas without dropping the ones
 * already there (`graphql_public` in particular). Returns `null` when the list
 * already covers it — nothing to PATCH.
 */
export function withPublicSchema(current: string | undefined | null): string | null {
  const schemas = (current ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  if (schemas.includes(REQUIRED_EXPOSED_SCHEMA)) return null
  return [...schemas, REQUIRED_EXPOSED_SCHEMA].join(', ')
}
