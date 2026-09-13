import { describe, it, expect, vi } from 'vitest'
import { SupabaseSiteSetupService } from '../src/electron/services/SupabaseSiteSetupService'
import type { SupabaseApiClient } from '../src/electron/services/supabase/SupabaseApiClient'
import {
  REALTIME_ADD_SQL,
  RLS_ENABLE_SQL,
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
  tableExists?: boolean
  publicationExists?: boolean
  alreadyPublished?: boolean
  exposedSchemas?: string
  autoconfirm?: boolean
  tablesWithoutRls?: string[]
}) {
  const s = {
    tableExists: true,
    publicationExists: true,
    alreadyPublished: false,
    exposedSchemas: 'public, graphql_public',
    autoconfirm: false,
    tablesWithoutRls: ['Announcement', 'Team'],
    ...state,
  }

  const runQuery = vi.fn(async (_ref: string, query: string) => {
    if (query.includes('to_regclass')) {
      return [{
        table_exists: s.tableExists,
        publication_exists: s.publicationExists,
        already_published: s.alreadyPublished,
      }]
    }
    if (query.startsWith('SELECT tablename')) {
      return s.tablesWithoutRls.map(tablename => ({ tablename }))
    }
    if (query === RLS_ENABLE_SQL) {
      s.tablesWithoutRls = []
      return []
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
  }

  return client
}

/** The fakes stand in for a live project — one cast, at the seam. */
function run(client: Partial<Record<keyof SupabaseApiClient, unknown>>) {
  const service = new SupabaseSiteSetupService(() => client as unknown as SupabaseApiClient)
  const ctx = makeWindow()
  return { service, ctx, start: () => service.start(ctx.win, { accessToken: 'sbp_test', ref: 'abcdefghijklmnopqrst' }) }
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
    expect(client.runQuery.mock.calls.some(([, q]) => q === REALTIME_ADD_SQL)).toBe(true)
    expect(client.runQuery.mock.calls.some(([, q]) => q === RLS_ENABLE_SQL)).toBe(true)

    const done = ctx.done()
    expect(done).toBeDefined()
    expect(done?.payload.service).toBe('supabase-site')
    expect(done?.payload.patch?.SUPABASE_SITE_SETUP_AT).toBeTruthy()
    expect(ctx.error()).toBeUndefined()
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
    expect(client.runQuery.mock.calls.some(([, q]) => q === REALTIME_ADD_SQL)).toBe(false)
    expect(client.runQuery.mock.calls.some(([, q]) => q === RLS_ENABLE_SQL)).toBe(false)
    expect(ctx.done()).toBeDefined()
  })

  it('fails with what is left to do when the deployment has not created the tables', async () => {
    const client = makeClient({ tableExists: false, tablesWithoutRls: [] })
    const { ctx, start } = run(client)
    await start()

    // The independent settings still went through…
    expect(client.updateAuthConfig).toHaveBeenCalled()
    // …but the run reports the gap rather than claiming success.
    expect(ctx.done()).toBeUndefined()
    expect(ctx.error()?.payload.message).toContain('Realtime')
  })

  it('raises the tables RLS could not be enabled on', async () => {
    const client = makeClient({})
    // The DO block leaves one table behind — silently half-protected is the
    // failure this check exists to catch.
    client.runQuery = vi.fn(async (_ref: string, query: string) => {
      if (query.includes('to_regclass')) {
        return [{ table_exists: true, publication_exists: true, already_published: true }]
      }
      if (query.startsWith('SELECT tablename')) return [{ tablename: 'Team' }]
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
