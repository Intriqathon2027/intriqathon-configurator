import { describe, it, expect, vi } from 'vitest'
import { SupabaseSiteSetupService } from '../src/electron/services/SupabaseSiteSetupService'
import type { SupabaseApiClient } from '../src/electron/services/supabase/SupabaseApiClient'
import {
  RLS_ENABLE_SQL,
  realtimeAddSql,
  withPublicSchema,
} from '../src/shared/supabaseSiteSetup'

/** The window the service reports to, borrowed from its own signature. */
type ProvisionWindow = Parameters<SupabaseSiteSetupService['start']>[0]

interface ProvisionEvent {
  channel: string
  payload: { service: string; message?: string; patch?: Record<string, string> }
}

/** Captures everything the run sends to the renderer. */
function makeWindow() {
  const events: ProvisionEvent[] = []
  const win = {
    webContents: {
      send: (channel: string, payload: ProvisionEvent['payload']) => events.push({ channel, payload }),
    },
  } as unknown as ProvisionWindow

  return {
    win,
    events,
    logs: () => events.filter(e => e.channel === 'provision:log').map(e => e.payload.message ?? ''),
    done: () => events.find(e => e.channel === 'provision:done'),
    error: () => events.find(e => e.channel === 'provision:error'),
  }
}

/**
 * A project in whatever state the test needs. `runQuery` answers by inspecting
 * the SQL, the way Postgres would: the checks return rows, the DDL returns none.
 */
function makeClient(state: {
  publicTables?: string[]
  matchedTable?: string | null
  publicationExists?: boolean
  alreadyPublished?: boolean
  exposedSchemas?: string
  autoconfirm?: boolean
  tablesWithoutRls?: string[]
  /** The project's API keys, as `reveal=true` would return them. */
  apiKeys?: Array<{ name: string; type: string; api_key: string | null }>
  /** null stands for the 404 the endpoint returns once legacy is gone. */
  legacyEnabled?: boolean | null
}) {
  const s = {
    publicTables: ['Announcement', 'Team'],
    matchedTable: 'Announcement' as string | null,
    publicationExists: true,
    alreadyPublished: false,
    exposedSchemas: 'public, graphql_public',
    autoconfirm: false,
    tablesWithoutRls: ['Announcement', 'Team'],
    apiKeys: [
      { name: 'service_role', type: 'legacy', api_key: 'eyJlegacy.service' },
      { name: 'intriqathon_configurator', type: 'secret', api_key: 'sb_secret_xyz' },
    ],
    legacyEnabled: true as boolean | null,
    ...state,
  }

  const runQuery = vi.fn(async (_ref: string, query: string) => {
    // Checked first: the DO block contains the very predicate the listing uses.
    if (query === RLS_ENABLE_SQL) {
      s.tablesWithoutRls = []
      return []
    }
    if (query.includes('AS public_tables') && !query.includes('matched_table')) {
      return [{ public_tables: s.publicTables.length }]
    }
    if (query.includes('matched_table')) {
      return [{
        public_tables: s.publicTables.length,
        matched_table: s.matchedTable,
        publication_exists: s.publicationExists,
        already_published: s.alreadyPublished,
      }]
    }
    if (query.includes('AND NOT rowsecurity')) {
      return s.tablesWithoutRls.map(tablename => ({ tablename }))
    }
    if (query.startsWith('SELECT tablename')) {
      return s.publicTables.map(tablename => ({ tablename }))
    }
    return []
  })

  const client = {
    getProject: vi.fn(async (ref: string) => ({ ref, name: 'demo', status: 'ACTIVE_HEALTHY' })),
    runQuery,
    getPostgrestConfig: vi.fn(async () => ({ db_schema: s.exposedSchemas })),
    updatePostgrestConfig: vi.fn(async () => ({ db_schema: 'public' })),
    getAuthConfig: vi.fn(async () => ({ mailer_autoconfirm: s.autoconfirm })),
    updateAuthConfig: vi.fn(async () => ({ mailer_autoconfirm: true })),
    // A project with legacy disabled hides the keys rather than listing them
    // without a value — which is what makes re-enabling them worth a try.
    listApiKeys: vi.fn(async () => (s.legacyEnabled === false
      ? s.apiKeys.filter(k => k.type !== 'legacy')
      : s.apiKeys)),
    getLegacyKeysEnabled: vi.fn(async () => (s.legacyEnabled === null ? null : { enabled: s.legacyEnabled })),
    setLegacyKeysEnabled: vi.fn(async (_ref: string, enabled: boolean) => {
      s.legacyEnabled = enabled
      return { enabled }
    }),
  }

  return client
}

/** The fakes stand in for a live project — one cast, at the seam. */
function run(client: Partial<Record<keyof SupabaseApiClient, unknown>>) {
  const service = new SupabaseSiteSetupService(() => client as unknown as SupabaseApiClient)
  const ctx = makeWindow()
  return {
    service,
    ctx,
    start: (awaitMigrations = false) =>
      service.start(ctx.win, { accessToken: 'sbp_test', ref: 'abcdefghijklmnopqrst', awaitMigrations }),
  }
}

describe('withPublicSchema', () => {
  it('leaves a list that already exposes public alone', () => {
    expect(withPublicSchema('public, graphql_public')).toBeNull()
  })

  it('adds public without dropping the schemas already exposed', () => {
    expect(withPublicSchema('graphql_public')).toBe('graphql_public, public')
  })

  it('handles an empty or missing list', () => {
    expect(withPublicSchema('')).toBe('public')
    expect(withPublicSchema(undefined)).toBe('public')
  })
})

describe('SupabaseSiteSetupService', () => {
  it('applies the five settings and reports done', async () => {
    const client = makeClient({})
    const { ctx, start } = run(client)
    await start()

    expect(client.updatePostgrestConfig).not.toHaveBeenCalled() // public already exposed
    expect(client.updateAuthConfig).toHaveBeenCalledWith('abcdefghijklmnopqrst', { mailer_autoconfirm: true })
    expect(client.runQuery.mock.calls.some(([, q]) => q === realtimeAddSql('Announcement'))).toBe(true)
    expect(client.runQuery.mock.calls.some(([, q]) => q === RLS_ENABLE_SQL)).toBe(true)

    const done = ctx.done()
    expect(done).toBeDefined()
    expect(done?.payload.service).toBe('supabase-site')
    expect(done?.payload.patch?.SUPABASE_SITE_SETUP_AT).toBeTruthy()
    expect(ctx.error()).toBeUndefined()
  })

  it('hands back the legacy service_role key, not the secret one', async () => {
    const client = makeClient({})
    const { ctx, start } = run(client)
    await start()

    // The secret key is the one in the .env, and the one a browser may not use.
    expect(ctx.done()?.payload.patch?.SUPABASE_PANEL_SERVICE_KEY).toBe('eyJlegacy.service')
  })

  it('re-enables the legacy keys when the project has them switched off', async () => {
    const client = makeClient({ legacyEnabled: false })
    const { ctx, start } = run(client)
    await start()

    expect(client.setLegacyKeysEnabled).toHaveBeenCalledWith('abcdefghijklmnopqrst', true)
    expect(ctx.done()?.payload.patch?.SUPABASE_PANEL_SERVICE_KEY).toBe('eyJlegacy.service')
  })

  it('still reports done when no legacy key can be had', async () => {
    const client = makeClient({
      apiKeys: [{ name: 'intriqathon_configurator', type: 'secret', api_key: 'sb_secret_xyz' }],
      legacyEnabled: null,
    })
    const { ctx, start } = run(client)
    await start()

    // The five settings applied; only the copy-ready value is missing, and the
    // card falls back to naming the dashboard page.
    expect(ctx.done()).toBeDefined()
    expect(ctx.done()?.payload.patch?.SUPABASE_PANEL_SERVICE_KEY).toBeUndefined()
    expect(ctx.error()).toBeUndefined()
    expect(ctx.logs().some(m => m.includes('Aucune clé service_role legacy'))).toBe(true)
  })

  it('does not fail the run when the key lookup throws', async () => {
    const client = makeClient({})
    client.listApiKeys = vi.fn(async () => { throw new Error('boom') })
    const { ctx, start } = run(client)
    await start()

    expect(ctx.done()).toBeDefined()
    expect(ctx.error()).toBeUndefined()
    expect(ctx.logs().some(m => m.includes('Clé service_role legacy indisponible'))).toBe(true)
  })

  it('exposes the public schema when it is missing, keeping the others', async () => {
    const client = makeClient({ exposedSchemas: 'graphql_public' })
    const { start } = run(client)
    await start()

    expect(client.updatePostgrestConfig).toHaveBeenCalledWith('abcdefghijklmnopqrst', {
      db_schema: 'graphql_public, public',
    })
  })

  it('changes nothing that is already right — a second run is a no-op', async () => {
    const client = makeClient({ alreadyPublished: true, autoconfirm: true, tablesWithoutRls: [] })
    const { ctx, start } = run(client)
    await start()

    expect(client.updateAuthConfig).not.toHaveBeenCalled()
    expect(client.runQuery.mock.calls.some(([, q]) => q === realtimeAddSql('Announcement'))).toBe(false)
    expect(client.runQuery.mock.calls.some(([, q]) => q === RLS_ENABLE_SQL)).toBe(false)
    expect(ctx.done()).toBeDefined()
  })

  it('publishes the table under the name Postgres actually reports', async () => {
    const client = makeClient({ publicTables: ['announcement'], matchedTable: 'announcement' })
    const { ctx, start } = run(client)
    await start()

    expect(client.runQuery.mock.calls.some(([, q]) => q === realtimeAddSql('announcement'))).toBe(true)
    expect(ctx.done()).toBeDefined()
  })

  it('says the deployment has not run yet when the public schema is empty', async () => {
    const client = makeClient({ publicTables: [], matchedTable: null, tablesWithoutRls: [] })
    const { ctx, start } = run(client)
    await start()

    // The independent settings still went through…
    expect(client.updateAuthConfig).toHaveBeenCalled()
    // …but the run reports the gap rather than claiming success.
    expect(ctx.done()).toBeUndefined()
    expect(ctx.error()?.payload.message).toContain('déploiement')
  })

  it('names the tables it did find when the expected one is not among them', async () => {
    const client = makeClient({ publicTables: ['Team', 'User'], matchedTable: null, tablesWithoutRls: [] })
    const { ctx, start } = run(client)
    await start()

    const message = ctx.error()?.payload.message ?? ''
    expect(message).toContain('Team, User')
    expect(message).toContain('projet')
  })

  it('raises the tables RLS could not be enabled on', async () => {
    const client = makeClient({})
    // The DO block leaves one table behind — silently half-protected is the
    // failure this check exists to catch.
    client.runQuery = vi.fn(async (_ref: string, query: string) => {
      if (query.includes('matched_table')) {
        return [{
          public_tables: 1,
          matched_table: 'Announcement',
          publication_exists: true,
          already_published: true,
        }]
      }
      if (query.includes('AND NOT rowsecurity')) return [{ tablename: 'Team' }]
      return []
    })

    const { ctx, start } = run(client)
    await start()

    expect(ctx.error()?.payload.message).toContain('Team')
  })

  it('never sends the access token to the log pane', async () => {
    const client = makeClient({})
    client.getProject = vi.fn(async () => { throw new Error('Jeton sbp_test refusé') })

    const { ctx, start } = run(client)
    await start()

    expect(ctx.error()?.payload.message).not.toContain('sbp_test')
  })
})

/**
 * The step that runs straight after a deployment used to arrive before its
 * migrations: every check ran against an empty schema, Realtime was reported
 * as impossible, and running the very same thing a minute later fixed it. The
 * minute now belongs to the run.
 */
describe('waiting for the deployment’s migrations', () => {
  /**
   * A healthy project whose table count reads 0 the first time it is asked —
   * the migration lands during the wait, and every later query sees it.
   */
  function latecomer() {
    const client = makeClient({})
    const answer = client.runQuery
    let counts = 0

    client.runQuery = vi.fn(async (ref: string, query: string) => {
      if (query.includes('AS public_tables') && !query.includes('matched_table')) {
        counts += 1
        if (counts === 1) return [{ public_tables: 0 }]
      }
      return answer(ref, query)
    }) as typeof client.runQuery

    return client
  }

  it('reports the empty schema at once when no deployment ran', async () => {
    const { ctx, start } = run(makeClient({ publicTables: [], matchedTable: null }))
    await start(false)

    expect(ctx.error()?.payload.message).toMatch(/le schéma public est vide/)
    expect(ctx.logs().some(l => l.includes('attente des tables'))).toBe(false)
  })

  it('waits for them when one did, and carries on once they land', async () => {
    vi.useFakeTimers()
    try {
      const { ctx, start } = run(latecomer())

      const running = start(true)
      await vi.advanceTimersByTimeAsync(5_000)
      await running

      expect(ctx.logs().some(l => l.includes('attente des tables'))).toBe(true)
      expect(ctx.logs().some(l => l.includes('2 table(s) trouvée(s)'))).toBe(true)
      expect(ctx.error()).toBeUndefined()
    } finally {
      vi.useRealTimers()
    }
  })
})
