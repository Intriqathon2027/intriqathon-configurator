import { describe, it, expect, vi } from 'vitest'
import { SupabaseApiClient, SupabaseApiError } from '../src/electron/services/supabase/SupabaseApiClient'
import { Redactor } from '../src/electron/services/supabase/redact'

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers })
}

function makeClient(fetchImpl: typeof fetch, signal?: AbortSignal) {
  return new SupabaseApiClient({
    accessToken: 'sbp_test',
    fetchImpl,
    signal,
    sleepImpl: async () => {}, // retries must not actually wait in tests
  })
}

describe('SupabaseApiClient', () => {
  it('sends the PAT as a bearer token and reveals the keys', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse([])) as unknown as typeof fetch
    await makeClient(fetchImpl).listApiKeys('abcdefghijklmnopqrst')

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain('/v1/projects/abcdefghijklmnopqrst/api-keys')
    expect(url).toContain('reveal=true')
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer sbp_test' })
  })

  it('passes `enabled` as a query parameter when re-enabling the legacy keys', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ enabled: true })) as unknown as typeof fetch
    await makeClient(fetchImpl).setLegacyKeysEnabled('abcdefghijklmnopqrst', true)

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain('enabled=true')
    expect((init as RequestInit).body).toBeUndefined()
  })

  it('treats a 404 on the legacy endpoint as "legacy removed", not as a failure', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ message: 'Not Found' }, 404)) as unknown as typeof fetch
    await expect(makeClient(fetchImpl).getLegacyKeysEnabled('abcdefghijklmnopqrst')).resolves.toBeNull()
  })

  it('runs SQL through the database query endpoint', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse([])) as unknown as typeof fetch
    await makeClient(fetchImpl).runQuery('abcdefghijklmnopqrst', 'GRANT ALL ON SCHEMA public TO postgres;')

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain('/v1/projects/abcdefghijklmnopqrst/database/query')
    expect((init as RequestInit).method).toBe('POST')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      query: 'GRANT ALL ON SCHEMA public TO postgres;',
    })
  })

  it('patches only the postgrest fields it is given', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ db_schema: 'public' })) as unknown as typeof fetch
    await makeClient(fetchImpl).updatePostgrestConfig('abcdefghijklmnopqrst', { db_schema: 'public' })

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain('/v1/projects/abcdefghijklmnopqrst/postgrest')
    expect((init as RequestInit).method).toBe('PATCH')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ db_schema: 'public' })
  })

  it('turns email confirmation off through the auth config', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ mailer_autoconfirm: true })) as unknown as typeof fetch
    await makeClient(fetchImpl).updateAuthConfig('abcdefghijklmnopqrst', { mailer_autoconfirm: true })

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain('/v1/projects/abcdefghijklmnopqrst/config/auth')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ mailer_autoconfirm: true })
  })

  it('treats a 409 on bucket creation as already created', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ message: 'Duplicate' }, 409)) as unknown as typeof fetch
    const created = await makeClient(fetchImpl).createBucket(
      'https://abcdefghijklmnopqrst.supabase.co', 'service-key', { name: 'users', isPublic: false },
    )
    expect(created).toBe(false)
  })

  it('authenticates bucket creation with the service key, not the PAT', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ name: 'users' })) as unknown as typeof fetch
    await makeClient(fetchImpl).createBucket(
      'https://abcdefghijklmnopqrst.supabase.co', 'service-key', { name: 'users', isPublic: false },
    )

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('https://abcdefghijklmnopqrst.supabase.co/storage/v1/bucket')
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer service-key',
      apikey: 'service-key',
    })
  })

  it('retries a rate-limited call and honours Retry-After', async () => {
    const sleepImpl = vi.fn(async () => {})
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'rate limited' }, 429, { 'retry-after': '2' }))
      .mockResolvedValueOnce(jsonResponse([{ id: '1', slug: 'org', name: 'Org' }])) as unknown as typeof fetch

    const client = new SupabaseApiClient({ accessToken: 'sbp_test', fetchImpl, sleepImpl })
    await expect(client.listOrganizations()).resolves.toHaveLength(1)
    expect(sleepImpl).toHaveBeenCalledWith(2000, undefined)
  })

  it('surfaces the provider wording on a non-retryable failure', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ message: 'Your organization has reached its project limit' }, 403),
    ) as unknown as typeof fetch

    await expect(makeClient(fetchImpl).listProjects()).rejects.toThrowError(
      /reached its project limit/,
    )
    await expect(makeClient(fetchImpl).listProjects()).rejects.toBeInstanceOf(SupabaseApiError)
  })

  it('trims a token pasted with trailing whitespace', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse([])) as unknown as typeof fetch
    const client = new SupabaseApiClient({ accessToken: '  sbp_test\n', fetchImpl })
    await client.listOrganizations()

    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer sbp_test' })
  })

  it('replaces Supabase\'s bare "Unauthorized" with something actionable', async () => {
    // A well-formed but unknown token and a missing header both come back as
    // this single word, which tells the reader nothing on its own.
    const fetchImpl = vi.fn(async () => jsonResponse({ message: 'Unauthorized' }, 401)) as unknown as typeof fetch

    await expect(makeClient(fetchImpl).listOrganizations()).rejects.toThrowError(/révoqué ou régénéré/)
    await expect(makeClient(fetchImpl).listOrganizations()).rejects.not.toThrowError(/^HTTP 401/)
  })

  it('keeps the provider wording when it actually says something', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ message: 'Your organization has reached its project limit' }, 403),
    ) as unknown as typeof fetch

    const error = await makeClient(fetchImpl).listProjects().catch(e => e as Error)
    expect(error.message).toContain('reached its project limit')
    expect(error.message).toContain('limite de plan')
  })

  it('stops on abort instead of burning through retries', async () => {
    const controller = new AbortController()
    const fetchImpl = vi.fn(async () => {
      controller.abort()
      throw new DOMException('Aborted', 'AbortError')
    }) as unknown as typeof fetch

    await expect(makeClient(fetchImpl, controller.signal).listProjects()).rejects.toThrowError(/Abort/)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})

describe('Redactor', () => {
  it('masks every credential shape that can reach the log pane', () => {
    const r = new Redactor()
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.s1gnatureXXXXXXX'
    expect(r.redact(`token=sbp_0123456789abcdef01234567`)).not.toContain('sbp_0')
    expect(r.redact(`key=sb_secret_abcdef123456`)).not.toContain('sb_secret_abcdef')
    expect(r.redact(`anon=${jwt}`)).not.toContain('eyJhbGci')
    expect(r.redact('postgresql://postgres.x:pw@host:6543/postgres')).not.toContain('pw@host')
  })

  it('masks the database password, which has no recognisable shape', () => {
    const r = new Redactor().add('correct-horse-battery')
    expect(r.redact('db_pass=correct-horse-battery ok')).toBe('db_pass=•••••• ok')
  })

  it('leaves ordinary log lines untouched', () => {
    const line = 'Création du bucket submissions…'
    expect(new Redactor().add('hunter2').redact(line)).toBe(line)
  })
})
