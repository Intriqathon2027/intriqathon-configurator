/**
 * Shapes returned by the Supabase Management API, narrowed to the fields the
 * automation actually reads. Mirrors https://api.supabase.com/api/v1-json —
 * everything here is optional or nullable where the spec says it can be, so a
 * response that drops a field degrades into a readable error rather than a
 * `undefined is not an object` three frames deeper.
 */

export type ProjectStatus =
  | 'INACTIVE'
  | 'ACTIVE_HEALTHY'
  | 'ACTIVE_UNHEALTHY'
  | 'COMING_UP'
  | 'UNKNOWN'
  | 'GOING_DOWN'
  | 'INIT_FAILED'
  | 'REMOVED'
  | 'RESTORING'
  | 'UPGRADING'
  | 'PAUSING'
  | 'RESTORE_FAILED'
  | 'RESTARTING'
  | 'PAUSE_FAILED'

export interface SupabaseOrganization {
  id: string
  slug: string
  name: string
}

export interface SupabaseProject {
  id: string
  ref: string
  name: string
  organization_id?: string
  organization_slug?: string
  region?: string
  created_at?: string
  status: ProjectStatus
  database?: {
    host?: string
    version?: string
  }
}

/** `type` discriminates the two key generations; `api_key` is null when masked. */
export interface SupabaseApiKey {
  name: string
  api_key?: string | null
  id?: string | null
  type?: 'legacy' | 'publishable' | 'secret' | null
  prefix?: string | null
  hash?: string | null
  description?: string | null
}

export interface SupabasePoolerConfig {
  identifier?: string
  database_type?: 'PRIMARY' | 'READ_REPLICA'
  db_user?: string
  db_host?: string
  db_port?: number
  db_name?: string
  connection_string?: string
  connectionString?: string
  pool_mode?: 'transaction' | 'session'
}

export interface SupabaseBucket {
  id: string
  name: string
  public?: boolean
}

export interface SupabaseServiceHealth {
  name: 'auth' | 'db' | 'db_postgres_user' | 'pooler' | 'realtime' | 'rest' | 'storage' | 'pg_bouncer'
  healthy: boolean
  status?: 'COMING_UP' | 'ACTIVE_HEALTHY' | 'UNHEALTHY'
  error?: string
}

/**
 * PostgREST settings — `db_schema` is the comma-separated list of schemas the
 * Data API exposes.
 */
export interface SupabasePostgrestConfig {
  db_schema?: string
  max_rows?: number
  db_extra_search_path?: string
  db_pool?: number | null
}

/**
 * Auth settings, narrowed to the one flag the site setup flips.
 * `mailer_autoconfirm` true means a sign-up is confirmed on the spot — which is
 * how "Confirm email" gets turned off.
 */
export interface SupabaseAuthConfig {
  mailer_autoconfirm?: boolean
}
