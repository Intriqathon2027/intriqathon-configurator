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
 * What the realtime step is up against, before it changes anything: the table
 * only exists once the deployment has migrated the database, and the row may
 * already be in the publication from an earlier run.
 */
export const REALTIME_CHECK_SQL = `SELECT
  to_regclass('public."${REALTIME_TABLE}"') IS NOT NULL AS table_exists,
  EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = '${REALTIME_PUBLICATION}'
  ) AS publication_exists,
  EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = '${REALTIME_PUBLICATION}'
      AND schemaname = 'public'
      AND tablename = '${REALTIME_TABLE}'
  ) AS already_published;`

export const REALTIME_ADD_SQL =
  `ALTER PUBLICATION ${REALTIME_PUBLICATION} ADD TABLE public."${REALTIME_TABLE}";`

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

/** Rows returned by `REALTIME_CHECK_SQL`. */
export interface RealtimeCheckRow {
  table_exists: boolean
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
