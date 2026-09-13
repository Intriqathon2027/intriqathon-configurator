import type { BrowserWindow } from 'electron'
import { STORAGE_BUCKETS } from '../../shared/supabaseBuckets'
import { SupabaseApiClient, SupabaseApiError } from './supabase/SupabaseApiClient'
import { buildPostgresUrls, projectUrl } from './supabase/connectionStrings'
import { MANAGED_KEY_NAME, describeKeyFormat, needsKeyProvisioning, resolveKeyPair } from './supabase/keys'
import { Redactor } from './supabase/redact'
import type { SupabaseApiKey, SupabaseOrganization, SupabaseProject } from './supabase/types'
import type { SupabaseProjectVerification } from '../../types/provision'

const SERVICE = 'supabase'

/** A fresh project reports COMING_UP for a minute or two before it answers. */
const READY_POLL_INTERVAL_MS = 5_000
const READY_TIMEOUT_MS = 6 * 60_000

export interface SupabaseProvisionRequest {
  /**
   * Passed in from the renderer rather than read from the vault: the vault on
   * disk is only as fresh as the last step change, and the user can press
   * "Lancer" straight after typing the token. The renderer already holds these
   * values in state — crossing the IPC boundary adds no exposure.
   */
  accessToken: string
  dbPassword: string
  /** `existing` adopts a project the user created; `create` provisions a new one. */
  mode: 'existing' | 'create'
  ref?: string
  projectName?: string
  organizationSlug?: string
  regionCode?: string
  /** Stop once the project is ready — used by step 1's "create the project" button. */
  stopAfterProject?: boolean
}

/**
 * Config keys this service fills in — applied by the renderer. A
 * `stopAfterProject` run resolves only the first two: the rest is what step 2
 * goes on to retrieve.
 */
export interface SupabaseProvisionPatch {
  /**
   * The run reports which project it resolved and *how* — never which one is in
   * force. A run outlives the screen that started it: by the time it lands the
   * reader may have switched modes, and a patch asserting the reference in
   * force would then point the wizard at a project the current mode does not
   * designate. The renderer derives that field from the mode instead.
   */
  /** Present only for a `create` run — the project this app brought into being. */
  SUPABASE_CREATED_PROJECT_REF?: string
  /** Present only for an `existing` run — the project adopted from the account. */
  SUPABASE_SELECTED_PROJECT_REF?: string
  SUPABASE_URL: string
  SUPABASE_ANON_KEY?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  DATABASE_URL?: string
  DIRECT_URL?: string
}

export class SupabaseProvisionService {
  private controller: AbortController | null = null
  private redactor = new Redactor()

  isRunning(): boolean {
    return this.controller !== null
  }

  cancel(): void {
    this.controller?.abort()
    this.controller = null
  }

  // ── Event plumbing ───────────────────────────────────────────────────────

  private log(win: BrowserWindow, message: string, level: 'info' | 'done' | 'error' = 'info'): void {
    win.webContents.send('provision:log', {
      service: SERVICE,
      message: this.redactor.redact(message),
      level,
    })
  }

  private progress(win: BrowserWindow, value: number): void {
    win.webContents.send('provision:progress', { service: SERVICE, value })
  }

  private wasCancelled(): boolean {
    return this.controller?.signal.aborted ?? false
  }

  // ── Read-only helpers, used by the UI selectors ──────────────────────────

  async listOrganizations(accessToken: string): Promise<SupabaseOrganization[]> {
    return new SupabaseApiClient({ accessToken }).listOrganizations()
  }

  async listProjects(accessToken: string): Promise<SupabaseProject[]> {
    return new SupabaseApiClient({ accessToken }).listProjects()
  }

  /**
   * Confirms the configurator is looking at the project the user meant, by
   * fetching it by reference and asking it how it is doing. Listing projects
   * only proves the token works; this proves that *this* ref resolves, belongs
   * to the account, and has services that answer — which is what step 2 is
   * about to depend on.
   */
  async verifyProject(accessToken: string, ref: string): Promise<SupabaseProjectVerification> {
    const client = new SupabaseApiClient({ accessToken })
    const project = await client.getProject(ref)

    // A project that is still starting has no health to report yet; that is a
    // state to display, not a failure to raise.
    let services: { name: string; healthy: boolean }[] = []
    try {
      const health = await client.getHealth(ref, ['db', 'rest', 'storage', 'auth'])
      services = health.map(h => ({ name: h.name, healthy: h.healthy }))
    } catch {
      // Left empty: `ready` below then reports the project as not fully ready.
    }

    return {
      ref: project.ref,
      name: project.name,
      region: project.region,
      status: project.status,
      organizationSlug: project.organization_slug,
      services,
      ready: project.status === 'ACTIVE_HEALTHY' && services.length > 0 && services.every(s => s.healthy),
    }
  }

  // ── The run ──────────────────────────────────────────────────────────────

  async start(win: BrowserWindow, req: SupabaseProvisionRequest): Promise<void> {
    this.cancel()
    this.controller = new AbortController()

    // Everything we know to be secret, masked on its way to the log pane.
    this.redactor = new Redactor().add(req.accessToken, req.dbPassword)

    const client = new SupabaseApiClient({
      accessToken: req.accessToken,
      signal: this.controller.signal,
    })

    try {
      const ref = req.mode === 'create'
        ? await this.createProject(win, client, req)
        : await this.adoptProject(win, client, req)

      if (req.stopAfterProject) {
        this.progress(win, 100)
        this.log(win, 'Projet prêt. Les clés et les buckets seront récupérés à l\'étape 2.', 'done')
        win.webContents.send('provision:done', {
          service: SERVICE,
          patch: {
            // Recorded under the mode that produced it, so the two modes keep
            // their own reference and neither inherits the other's.
            ...(req.mode === 'create'
              ? { SUPABASE_CREATED_PROJECT_REF: ref }
              : { SUPABASE_SELECTED_PROJECT_REF: ref }),
            SUPABASE_URL: projectUrl(ref),
          },
        })
        return
      }

      const keys = await this.resolveKeys(win, client, ref)
      const urls = await this.buildUrls(win, client, ref, req.dbPassword)
      await this.ensureBuckets(win, client, ref, keys.service)

      const patch: SupabaseProvisionPatch = {
        ...(req.mode === 'create'
          ? { SUPABASE_CREATED_PROJECT_REF: ref }
          : { SUPABASE_SELECTED_PROJECT_REF: ref }),
        SUPABASE_URL: projectUrl(ref),
        SUPABASE_ANON_KEY: keys.anon,
        SUPABASE_SERVICE_ROLE_KEY: keys.service,
        ...urls,
      }

      this.progress(win, 100)
      this.log(win, 'Configuration Supabase terminée.', 'done')
      win.webContents.send('provision:done', { service: SERVICE, patch })
    } catch (err) {
      if (this.wasCancelled()) {
        this.log(win, 'Configuration annulée.', 'info')
        win.webContents.send('provision:cancelled', { service: SERVICE })
      } else {
        const message = err instanceof SupabaseApiError || err instanceof Error ? err.message : String(err)
        this.log(win, message, 'error')
        win.webContents.send('provision:error', { service: SERVICE, message: this.redactor.redact(message) })
      }
    } finally {
      this.controller = null
    }
  }

  // ── Step 1a — adopt the project the user already created ────────────────

  private async adoptProject(
    win: BrowserWindow,
    client: SupabaseApiClient,
    req: SupabaseProvisionRequest,
  ): Promise<string> {
    this.progress(win, 5)

    if (req.ref) {
      this.log(win, `Projet ${req.ref} : vérification…`)
      const project = await client.getProject(req.ref)
      await this.waitUntilReady(win, client, project)
      return project.ref
    }

    this.log(win, 'Recherche du projet Supabase…')
    const projects = await client.listProjects()
    const usable = projects.filter(p => p.status !== 'REMOVED' && p.status !== 'INIT_FAILED')

    if (usable.length === 0) {
      throw new Error("Aucun projet Supabase sur ce compte. Créez-en un depuis l'étape 1, ou renseignez les champs manuellement.")
    }
    if (usable.length > 1) {
      const names = usable.map(p => `${p.name} (${p.ref})`).join(', ')
      throw new Error(`Plusieurs projets Supabase trouvés — choisissez-en un à l'étape 1 : ${names}`)
    }

    this.log(win, `Projet trouvé : ${usable[0].name}`)
    await this.waitUntilReady(win, client, usable[0])
    return usable[0].ref
  }

  // ── Step 1b — create it ─────────────────────────────────────────────────

  private async createProject(
    win: BrowserWindow,
    client: SupabaseApiClient,
    req: SupabaseProvisionRequest,
  ): Promise<string> {
    this.progress(win, 5)

    // Idempotence guard: a ref already on file means the project exists and a
    // second click must not create (and bill) another one.
    if (req.ref) {
      this.log(win, `Projet ${req.ref} déjà créé — réutilisation.`)
      const existing = await client.getProject(req.ref)
      await this.waitUntilReady(win, client, existing)
      return existing.ref
    }

    if (!req.organizationSlug) throw new Error("Organisation Supabase non renseignée — impossible de créer le projet.")
    if (!req.projectName) throw new Error('Nom de projet non renseigné.')

    this.log(win, `Création du projet « ${req.projectName} »…`)
    const project = await client.createProject({
      name: req.projectName,
      organization_slug: req.organizationSlug,
      db_pass: req.dbPassword,
      region_selection: req.regionCode ? { type: 'specific', code: req.regionCode } : undefined,
    })

    this.log(win, `Projet créé : ${project.ref}`, 'done')
    await this.waitUntilReady(win, client, project)
    return project.ref
  }

  /** Provisioning is asynchronous — poll until the project answers. */
  private async waitUntilReady(
    win: BrowserWindow,
    client: SupabaseApiClient,
    project: SupabaseProject,
  ): Promise<void> {
    if (project.status === 'ACTIVE_HEALTHY') {
      this.progress(win, 45)
      return
    }

    const deadline = Date.now() + READY_TIMEOUT_MS
    this.log(win, 'Attente du démarrage du projet (1 à 2 minutes)…')

    let current = project
    while (current.status !== 'ACTIVE_HEALTHY') {
      if (this.wasCancelled()) throw new DOMException('Aborted', 'AbortError')
      if (current.status === 'INIT_FAILED') throw new Error(`Le projet ${current.ref} n'a pas pu démarrer (INIT_FAILED).`)
      if (Date.now() > deadline) {
        throw new Error(`Le projet ${current.ref} est toujours en ${current.status} après 6 minutes. Réessayez plus tard.`)
      }

      await new Promise(resolve => setTimeout(resolve, READY_POLL_INTERVAL_MS))
      current = await client.getProject(current.ref)
      this.progress(win, 30)
    }

    this.log(win, 'Projet actif.', 'done')
    this.progress(win, 45)
  }

  // ── Step 2 — the API keys, either generation ────────────────────────────

  private async resolveKeys(
    win: BrowserWindow,
    client: SupabaseApiClient,
    ref: string,
  ): Promise<{ anon: string; service: string }> {
    this.log(win, 'Récupération des clés API…')

    let keys = await client.listApiKeys(ref)
    let pair = resolveKeyPair(keys)

    // Cheapest repair first: re-enabling the legacy keys creates nothing.
    if (needsKeyProvisioning(pair)) {
      const legacy = await client.getLegacyKeysEnabled(ref)
      if (legacy && !legacy.enabled) {
        this.log(win, 'Clés JWT legacy désactivées — réactivation…')
        await client.setLegacyKeysEnabled(ref, true)
        keys = await client.listApiKeys(ref)
        pair = resolveKeyPair(keys)
      }
    }

    // Still missing: mint new-generation keys. Their value is captured from the
    // creation response, which is the only place a secret key is ever revealed.
    if (needsKeyProvisioning(pair)) {
      const minted: SupabaseApiKey[] = []
      if (!pair.anon) {
        this.log(win, 'Création d\'une clé publishable…')
        minted.push(await client.createApiKey(ref, 'publishable', MANAGED_KEY_NAME))
      }
      if (!pair.service) {
        this.log(win, 'Création d\'une clé secret…')
        minted.push(await client.createApiKey(ref, 'secret', MANAGED_KEY_NAME))
      }
      pair = resolveKeyPair([...minted, ...keys])
    }

    if (!pair.anon || !pair.service) {
      throw new Error(
        "Impossible de récupérer une paire de clés utilisable. Ouvrez « Configuration manuelle » et copiez-les depuis le dashboard.",
      )
    }

    this.redactor.add(pair.anon.value, pair.service.value)
    this.log(
      win,
      `Clés récupérées — anon : ${describeKeyFormat(pair.anon.format)}, service : ${describeKeyFormat(pair.service.format)}.`,
      'done',
    )
    this.progress(win, 60)

    return { anon: pair.anon.value, service: pair.service.value }
  }

  // ── Step 3 — the Postgres URLs ─────────────────────────────────────────

  private async buildUrls(
    win: BrowserWindow,
    client: SupabaseApiClient,
    ref: string,
    dbPassword: string,
  ): Promise<{ DATABASE_URL: string; DIRECT_URL: string }> {
    this.log(win, 'Récupération des URLs Postgres…')

    const pooler = await client.getPoolerConfig(ref)
    const project = await client.getProject(ref)
    const { databaseUrl, directUrl } = buildPostgresUrls({
      ref,
      password: dbPassword,
      pooler,
      databaseHost: project.database?.host,
    })

    this.log(win, 'URLs Postgres construites (mot de passe injecté et encodé).', 'done')
    this.progress(win, 75)

    return { DATABASE_URL: databaseUrl, DIRECT_URL: directUrl }
  }

  // ── Step 4 — the storage buckets ───────────────────────────────────────

  private async ensureBuckets(
    win: BrowserWindow,
    client: SupabaseApiClient,
    ref: string,
    serviceKey: string,
  ): Promise<void> {
    this.log(win, `Création des ${STORAGE_BUCKETS.length} buckets de stockage…`)
    const origin = projectUrl(ref)

    for (const bucket of STORAGE_BUCKETS) {
      if (this.wasCancelled()) throw new DOMException('Aborted', 'AbortError')
      const created = await client.createBucket(origin, serviceKey, bucket)
      this.log(win, created ? `  ${bucket.name} : créé` : `  ${bucket.name} : déjà présent`)
    }

    // Read the list back: a bucket created through the Storage API but missing
    // from the project's own listing means something is off, and silently
    // half-configured storage is worse than a visible failure.
    const existing = await client.listBuckets(ref)
    const names = new Set(existing.map(b => b.name))
    const missing = STORAGE_BUCKETS.filter(b => !names.has(b.name)).map(b => b.name)
    if (missing.length > 0) {
      throw new Error(`Buckets manquants après création : ${missing.join(', ')}`)
    }

    this.log(win, 'Buckets vérifiés.', 'done')
    this.progress(win, 90)
  }
}
