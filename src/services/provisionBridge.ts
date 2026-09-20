import { DNS_TTL, buildInfraDnsRecords, hostPart, type DnsRecord } from '../shared/dnsRecords'
import type {
  ProvisionCancelledPayload,
  ProvisionDonePayload,
  ProvisionErrorPayload,
  ProvisionLogPayload,
  ProvisionProgressPayload,
  ProvisionQueryResult,
  ResendDomainReadRequest,
  ResendDomainSnapshot,
  ResendProvisionRequest,
  ResendVerificationResult,
  ResendVerifyRequest,
  SpaceshipProvisionRequest,
  SupabaseOrganizationSummary,
  SupabaseProjectSummary,
  SupabaseProjectVerification,
  SupabaseProvisionRequest,
  SupabaseSiteSetupRequest,
} from '../types/provision'

/**
 * Renderer-side access to the provisioning services, mirroring `deployBridge`.
 * The mock keeps the page usable under `npm run dev`, where the app runs in a
 * plain browser with no `window.electronAPI` at all.
 */
export interface ProvisionBridge {
  startSupabase(req: SupabaseProvisionRequest): Promise<void>
  /** The post-deployment settings run, driven from "Configuration du site". */
  startSupabaseSiteSetup(req: SupabaseSiteSetupRequest): Promise<void>
  startSpaceship(req: SpaceshipProvisionRequest): Promise<void>
  startResend(req: ResendProvisionRequest): Promise<void>
  /** The standalone check, outside any run — nothing is created or published. */
  verifyResendDomain(req: ResendVerifyRequest): Promise<ProvisionQueryResult<ResendVerificationResult>>
  /** What Resend holds for the sending domain today — read-only. */
  readResendDomain(req: ResendDomainReadRequest): Promise<ProvisionQueryResult<ResendDomainSnapshot>>
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
  startSupabaseSiteSetup(req: SupabaseSiteSetupRequest) {
    return window.electronAPI.startSupabaseSiteSetup(req)
  }
  startSpaceship(req: SpaceshipProvisionRequest) {
    return window.electronAPI.startSpaceshipProvision(req)
  }
  startResend(req: ResendProvisionRequest) {
    return window.electronAPI.startResendProvision(req)
  }
  verifyResendDomain(req: ResendVerifyRequest) {
    return window.electronAPI.verifyResendDomain(req)
  }
  readResendDomain(req: ResendDomainReadRequest) {
    return window.electronAPI.readResendDomain(req)
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

  /** The sending domain this fake account holds, once a run has created one. */
  private resendDomain: { id: string; name: string; records: DnsRecord[]; verified: boolean } | null = null

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
      ['Clé service_role legacy récupérée.', 50],
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
          // Same as the real service: the panel key is resolved as soon as the
          // project exists.
          SUPABASE_PANEL_SERVICE_KEY: 'eyJmock.legacy.service.key',
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
        SUPABASE_PANEL_SERVICE_KEY: 'eyJmock.legacy.service.key',
        DATABASE_URL: `postgresql://postgres.${ref}:mock@pooler.supabase.com:6543/postgres`,
        DIRECT_URL: `postgresql://postgres.${ref}:mock@pooler.supabase.com:5432/postgres`,
      },
    }))
  }

  /**
   * The site setup, as the real service reports it: one line per settings step.
   * Every branch it can take depends on the state of a live project, so the
   * mock plays the straightforward path — the "already configured" and
   * "deployment not run yet" paths are only reachable against a real project.
   */
  async startSupabaseSiteSetup() {
    this.cancelled = false

    const script: [string, number][] = [
      ['Projet demo (abcdefghijklmnopqrst) — configuration finale…', 5],
      ['Privilèges appliqués (anon, authenticated, service_role).', 25],
      ['Schémas exposés mis à jour : public, graphql_public.', 45],
      ['Announcement ajoutée à supabase_realtime.', 60],
      ["Confirmation d'email désactivée — le compte organisateur pourra se connecter.", 80],
      ['RLS activée sur 3 table(s) : Announcement, Team, User.', 95],
    ]

    for (const [message, value] of script) {
      await new Promise(resolve => setTimeout(resolve, 400))
      if (this.cancelled) return
      this.logCbs.forEach(cb => cb({ service: 'supabase-site', message, level: 'info' }))
      this.progressCbs.forEach(cb => cb({ service: 'supabase-site', value }))
    }

    this.progressCbs.forEach(cb => cb({ service: 'supabase-site', value: 100 }))
    this.doneCbs.forEach(cb => cb({
      service: 'supabase-site',
      patch: {
        SUPABASE_SITE_SETUP_AT: new Date().toISOString(),
        SUPABASE_PANEL_SERVICE_KEY: 'eyJmock.legacy.service.key',
      },
    }))
  }

  /** The DNS run as the real service reports it: one line per record, then the read-back. */
  async startSpaceship(req: SpaceshipProvisionRequest) {
    this.cancelled = false

    const records = buildInfraDnsRecords(req.domain, req.ipv4, req.mailSubdomain)
    const script: [string, number][] = [
      [`Enregistrements à publier sur ${req.domain} :`, 10],
      ...records.map(
        (r): [string, number] => [`  ${r.type}  ${r.host}  ➔  ${r.answer}`, 20],
      ),
      ['Écriture chez Spaceship (les enregistrements de même nom sont remplacés)…', 35],
      ['Relecture de la zone…', 75],
      [`Zone relue — ${records.length} enregistrement(s) en place.`, 90],
    ]

    for (const [message, value] of script) {
      await new Promise(resolve => setTimeout(resolve, 350))
      if (this.cancelled) return
      this.logCbs.forEach(cb => cb({ service: 'spaceship', message, level: 'info' }))
      this.progressCbs.forEach(cb => cb({ service: 'spaceship', value }))
    }

    this.progressCbs.forEach(cb => cb({ service: 'spaceship', value: 100 }))
    this.doneCbs.forEach(cb => cb({ service: 'spaceship', patch: {} }))
  }

  /**
   * The Resend run, in its Spaceship branch — the one that goes all the way to
   * a verified domain. The records mirror the shapes Resend really asks for,
   * so the table the card renders from them is the real thing.
   */
  async startResend(req: ResendProvisionRequest) {
    this.cancelled = false

    const mailHost = hostPart(req.mailSubdomain, req.domain)
    const records: DnsRecord[] = [
      { type: 'MX', host: `send.${mailHost}`, answer: 'feedback-smtp.eu-west-1.amazonses.com', ttl: DNS_TTL, priority: 10 },
      { type: 'TXT', host: `send.${mailHost}`, answer: 'v=spf1 include:amazonses.com ~all', ttl: DNS_TTL },
      { type: 'TXT', host: `resend._domainkey.${mailHost}`, answer: 'p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQMOCK...', ttl: DNS_TTL },
    ]

    const script: [string, number][] = [
      [`Recherche de ${req.mailSubdomain} sur le compte Resend…`, 10],
      [`Création du domaine ${req.mailSubdomain}…`, 25],
      [`Enregistrements demandés par Resend (${records.length}) :`, 40],
      ...records.map(
        (r): [string, number] => [`  ${r.type}  ${r.host}  ➔  ${r.answer.slice(0, 57)}`, 45],
      ),
      [`Publication des enregistrements chez Spaceship sur ${req.domain}…`, 55],
      ['Enregistrements publiés.', 60],
      ['Demande de vérification à Resend…', 70],
      ["Vérification demandée. La propagation DNS peut prendre jusqu'à 15 minutes : cette étape est terminée.", 90],
    ]

    for (const [message, value] of script) {
      await new Promise(resolve => setTimeout(resolve, 350))
      if (this.cancelled) return
      this.logCbs.forEach(cb => cb({ service: 'resend', message, level: 'info' }))
      this.progressCbs.forEach(cb => cb({ service: 'resend', value }))
    }

    this.resendDomain = { id: 'mock-4f3a2b1c-domain', name: req.mailSubdomain, records, verified: false }

    this.progressCbs.forEach(cb => cb({ service: 'resend', value: 100 }))
    this.doneCbs.forEach(cb => cb({
      service: 'resend',
      patch: {
        RESEND_DOMAIN_ID: 'mock-4f3a2b1c-domain',
        RESEND_DNS_RECORDS: JSON.stringify(records),
        // As the real run now ends: asked, not yet confirmed.
        RESEND_VERIFICATION_PENDING_SINCE: new Date().toISOString(),
      },
    }))
  }

  /**
   * The mock account holds whatever its last `startResend` created, so the
   * read answers "no such domain" until one has been — which is the state the
   * page has to handle, and the one it used to get wrong.
   */
  async readResendDomain(req: ResendDomainReadRequest) {
    await new Promise(resolve => setTimeout(resolve, 400))
    if (this.resendDomain?.name !== req.mailSubdomain) return { success: true, data: { exists: false } }
    return {
      success: true,
      data: {
        exists: true,
        domainId: this.resendDomain.id,
        status: this.resendDomain.verified ? ('verified' as const) : ('pending' as const),
        records: this.resendDomain.records,
      },
    }
  }

  /** The check as the real one answers on the happy path: asked, then seen. */
  async verifyResendDomain(req: ResendVerifyRequest) {
    await new Promise(resolve => setTimeout(resolve, 900))
    if (this.resendDomain) this.resendDomain.verified = true
    return {
      success: true,
      data: {
        domainId: req.domainId || 'mock-4f3a2b1c-domain',
        status: 'verified' as const,
        verifiedAt: new Date().toISOString(),
      },
    }
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

  async cancel(service: string) {
    this.cancelled = true
    this.cancelledCbs.forEach(cb => cb({ service: service as ProvisionCancelledPayload['service'] }))
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
