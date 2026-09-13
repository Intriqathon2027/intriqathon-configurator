import type {
  ProvisionCancelledPayload,
  ProvisionDonePayload,
  ProvisionErrorPayload,
  ProvisionLogPayload,
  ProvisionProgressPayload,
  ProvisionQueryResult,
  SupabaseOrganizationSummary,
  SupabaseProjectSummary,
  SupabaseProjectVerification,
  SupabaseProvisionRequest,
} from '../types/provision'

/**
 * Renderer-side access to the provisioning services, mirroring `deployBridge`.
 * The mock keeps the page usable under `npm run dev`, where the app runs in a
 * plain browser with no `window.electronAPI` at all.
 */
export interface ProvisionBridge {
  startSupabase(req: SupabaseProvisionRequest): Promise<void>
  listOrganizations(accessToken: string): Promise<ProvisionQueryResult<SupabaseOrganizationSummary[]>>
  listProjects(accessToken: string): Promise<ProvisionQueryResult<SupabaseProjectSummary[]>>
  verifyProject(accessToken: string, ref: string): Promise<ProvisionQueryResult<SupabaseProjectVerification>>
  cancel(service: string): Promise<void>
  onLog(cb: (payload: ProvisionLogPayload) => void): () => void
  onProgress(cb: (payload: ProvisionProgressPayload) => void): () => void
  onDone(cb: (payload: ProvisionDonePayload) => void): () => void
  onError(cb: (payload: ProvisionErrorPayload) => void): () => void
  onCancelled(cb: (payload: ProvisionCancelledPayload) => void): () => void
}

class ElectronProvisionBridge implements ProvisionBridge {
  startSupabase(req: SupabaseProvisionRequest) {
    return window.electronAPI.startSupabaseProvision(req)
  }
  listOrganizations(accessToken: string) {
    return window.electronAPI.listSupabaseOrganizations(accessToken)
  }
  listProjects(accessToken: string) {
    return window.electronAPI.listSupabaseProjects(accessToken)
  }
  verifyProject(accessToken: string, ref: string) {
    return window.electronAPI.verifySupabaseProject(accessToken, ref)
  }
  cancel(service: string) {
    return window.electronAPI.cancelProvision(service)
  }
  onLog(cb: (p: ProvisionLogPayload) => void) {
    return window.electronAPI.onProvisionLog(cb)
  }
  onProgress(cb: (p: ProvisionProgressPayload) => void) {
    return window.electronAPI.onProvisionProgress(cb)
  }
  onDone(cb: (p: ProvisionDonePayload) => void) {
    return window.electronAPI.onProvisionDone(cb)
  }
  onError(cb: (p: ProvisionErrorPayload) => void) {
    return window.electronAPI.onProvisionError(cb)
  }
  onCancelled(cb: (p: ProvisionCancelledPayload) => void) {
    return window.electronAPI.onProvisionCancelled(cb)
  }
}

class MockProvisionBridge implements ProvisionBridge {
  /**
   * Projects the fake account holds. A creation adds to it, so the mock answers
   * the same way the API would: the new project carries the requested name and
   * shows up in later listings. Without that, the mock silently misrepresents
   * the very rules the UI derives from a project's identity.
   */
  private accountProjects: SupabaseProjectSummary[] = [
    { id: '1', ref: 'abcdefghijklmnopqrst', name: 'demo', status: 'ACTIVE_HEALTHY', region: 'eu-west-3' },
    { id: '2', ref: 'bbcdefghijklmnopqrst', name: 'autre-projet', status: 'ACTIVE_HEALTHY', region: 'eu-west-1' },
  ]

  private logCbs: ((p: ProvisionLogPayload) => void)[] = []
  private progressCbs: ((p: ProvisionProgressPayload) => void)[] = []
  private doneCbs: ((p: ProvisionDonePayload) => void)[] = []
  private errorCbs: ((p: ProvisionErrorPayload) => void)[] = []
  private cancelledCbs: ((p: ProvisionCancelledPayload) => void)[] = []
  private cancelled = false

  async startSupabase(req: SupabaseProvisionRequest) {
    this.cancelled = false

    let ref = req.ref || this.accountProjects[0].ref
    if (req.mode === 'create' && !req.ref) {
      ref = `mock${Math.random().toString(36).slice(2, 10)}padded`.slice(0, 20)
      this.accountProjects = [
        ...this.accountProjects,
        { id: String(this.accountProjects.length + 1), ref, name: req.projectName || 'demo', status: 'ACTIVE_HEALTHY', region: req.regionCode || 'eu-west-3' },
      ]
    }

    // Mirrors the real service, including the early exit: step 1's button only
    // provisions the project, step 2 does the rest.
    const projectSteps: [string, number][] = [
      [req.mode === 'create' ? `Création du projet « ${req.projectName || 'demo'} »…` : 'Recherche du projet Supabase…', 10],
      ['Projet actif.', 45],
    ]

    if (req.stopAfterProject) {
      for (const [message, value] of projectSteps) {
        await new Promise(resolve => setTimeout(resolve, 500))
        if (this.cancelled) return
        this.logCbs.forEach(cb => cb({ service: 'supabase', message, level: 'info' }))
        this.progressCbs.forEach(cb => cb({ service: 'supabase', value }))
      }
      this.progressCbs.forEach(cb => cb({ service: 'supabase', value: 100 }))
      this.doneCbs.forEach(cb => cb({
        service: 'supabase',
        patch: {
          ...(req.mode === 'create'
            ? { SUPABASE_CREATED_PROJECT_REF: ref }
            : { SUPABASE_SELECTED_PROJECT_REF: ref }),
          SUPABASE_URL: `https://${ref}.supabase.co`,
        },
      }))
      return
    }

    const script: [string, number][] = [
      ...projectSteps,
      ['Récupération des clés API…', 55],
      ['Clés récupérées — anon : JWT legacy, service : JWT legacy.', 60],
      ['Récupération des URLs Postgres…', 70],
      ['URLs Postgres construites (mot de passe injecté et encodé).', 75],
      ['Création des 5 buckets de stockage…', 80],
      ['Buckets vérifiés.', 90],
    ]

    for (const [message, value] of script) {
      await new Promise(resolve => setTimeout(resolve, 500))
      if (this.cancelled) return
      this.logCbs.forEach(cb => cb({ service: 'supabase', message, level: 'info' }))
      this.progressCbs.forEach(cb => cb({ service: 'supabase', value }))
    }

    this.progressCbs.forEach(cb => cb({ service: 'supabase', value: 100 }))
    this.doneCbs.forEach(cb => cb({
      service: 'supabase',
      patch: {
        // Same rule as the real service: report what was resolved and how, and
        // leave the reference in force to be derived from the mode.
        ...(req.mode === 'create'
          ? { SUPABASE_CREATED_PROJECT_REF: ref }
          : { SUPABASE_SELECTED_PROJECT_REF: ref }),
        SUPABASE_URL: `https://${ref}.supabase.co`,
        SUPABASE_ANON_KEY: 'eyJmock.anon.key',
        SUPABASE_SERVICE_ROLE_KEY: 'eyJmock.service.key',
        DATABASE_URL: `postgresql://postgres.${ref}:mock@pooler.supabase.com:6543/postgres`,
        DIRECT_URL: `postgresql://postgres.${ref}:mock@pooler.supabase.com:5432/postgres`,
      },
    }))
  }

  async listOrganizations() {
    return { success: true, data: [{ id: '1', slug: 'demo-org', name: 'Demo Org' }] }
  }

  async listProjects() {
    return { success: true, data: this.accountProjects }
  }

  async verifyProject(_accessToken: string, ref: string) {
    await new Promise(resolve => setTimeout(resolve, 600))

    // Faithful to the real thing: a reference that is not on the account — a
    // deleted project, or one left over in a saved config — comes back 404.
    const known = this.accountProjects.find(p => p.ref === ref)
    if (!known) {
      return { success: false, error: 'Ressource introuvable chez Supabase. (Resource has been removed)' }
    }

    return {
      success: true,
      data: {
        ref,
        name: known.name,
        region: known.region,
        status: known.status,
        organizationSlug: 'demo-org',
        services: [
          { name: 'db', healthy: true },
          { name: 'rest', healthy: true },
          { name: 'storage', healthy: true },
          { name: 'auth', healthy: true },
        ],
        ready: true,
      },
    }
  }

  async cancel() {
    this.cancelled = true
    this.cancelledCbs.forEach(cb => cb({ service: 'supabase' }))
  }

  onLog(cb: (p: ProvisionLogPayload) => void) {
    this.logCbs.push(cb)
    return () => { this.logCbs = this.logCbs.filter(fn => fn !== cb) }
  }
  onProgress(cb: (p: ProvisionProgressPayload) => void) {
    this.progressCbs.push(cb)
    return () => { this.progressCbs = this.progressCbs.filter(fn => fn !== cb) }
  }
  onDone(cb: (p: ProvisionDonePayload) => void) {
    this.doneCbs.push(cb)
    return () => { this.doneCbs = this.doneCbs.filter(fn => fn !== cb) }
  }
  onError(cb: (p: ProvisionErrorPayload) => void) {
    this.errorCbs.push(cb)
    return () => { this.errorCbs = this.errorCbs.filter(fn => fn !== cb) }
  }
  onCancelled(cb: (p: ProvisionCancelledPayload) => void) {
    this.cancelledCbs.push(cb)
    return () => { this.cancelledCbs = this.cancelledCbs.filter(fn => fn !== cb) }
  }
}

/**
 * One mock per page load. The fake account it holds is the stand-in for state
 * that really lives at Supabase, so every caller has to see the same one — a
 * per-call instance would let a project created through one bridge be missing
 * from another, which is not a failure the real API can produce.
 */
let mockBridge: MockProvisionBridge | null = null

export function createProvisionBridge(): ProvisionBridge {
  if (typeof window !== 'undefined' && window.electronAPI && !!window.electronAPI.startSupabaseProvision) {
    return new ElectronProvisionBridge()
  }
  if (!mockBridge) mockBridge = new MockProvisionBridge()
  return mockBridge
}
