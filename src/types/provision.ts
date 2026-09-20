/**
 * Contract between the provisioning services (main) and the cards (renderer).
 * Lives outside `src/electron` so both sides import the same definitions.
 */

export type ProvisionService =
  | 'supabase'
  /** The post-deployment Supabase settings, driven from "Configuration du site". */
  | 'supabase-site'
  | 'scaleway'
  | 'spaceship'
  | 'resend'

export interface ProvisionLogPayload {
  service: ProvisionService
  message: string
  level: 'info' | 'done' | 'error'
}

export interface ProvisionProgressPayload {
  service: ProvisionService
  value: number
}

export interface ProvisionDonePayload {
  service: ProvisionService
  /** Config keys to apply — the service never writes to the vault itself. */
  patch: Record<string, string>
}

export interface ProvisionErrorPayload {
  service: ProvisionService
  message: string
}

export interface ProvisionCancelledPayload {
  service: ProvisionService
}

export interface SupabaseProvisionRequest {
  accessToken: string
  dbPassword: string
  mode: 'existing' | 'create'
  ref?: string
  projectName?: string
  organizationSlug?: string
  regionCode?: string
  /**
   * Stop once the project exists and is ready, without touching keys, URLs or
   * buckets. Lets step 1 provision the project on its own, so the account page
   * finishes with a real project reference in hand.
   */
  stopAfterProject?: boolean
}

/**
 * The DNS run. Everything it writes is derived from these four values, and
 * they are passed in rather than read from the vault for the same reason the
 * Supabase request carries its token: the reader can press "Lancer" straight
 * after typing one of them.
 */
export interface SpaceshipProvisionRequest {
  apiKey: string
  apiSecret: string
  domain: string
  ipv4: string
  mailSubdomain: string
}

export interface ResendProvisionRequest {
  apiKey: string
  /** The registered domain — what the records' names are relative to. */
  domain: string
  /** The subdomain Resend sends from, and the domain created on the account. */
  mailSubdomain: string
  /**
   * Resolved by an earlier run. Reusing it is what stops a second click from
   * creating a second domain on the account.
   */
  domainId?: string
  /**
   * Present when Spaceship holds the DNS. The run then publishes the records
   * Resend asks for by itself; without them it stops after creating the
   * domain and leaves the records for the reader to copy to their registrar.
   */
  spaceshipApiKey?: string
  spaceshipApiSecret?: string
}

/**
 * The site-configuration run. It works against a project that already exists
 * and whose database the deployment has migrated, so it needs nothing but the
 * token and the reference.
 */
export interface SupabaseSiteSetupRequest {
  accessToken: string
  ref: string
}

export interface SupabaseOrganizationSummary {
  id: string
  slug: string
  name: string
}

export interface SupabaseProjectSummary {
  id: string
  ref: string
  name: string
  status: string
  region?: string
  organization_slug?: string
}

/**
 * Proof that the configurator reached the exact project the user picked —
 * its identity straight from the API, plus whether its services answer.
 */
export interface SupabaseProjectVerification {
  ref: string
  name: string
  region?: string
  status: string
  organizationSlug?: string
  services: { name: string; healthy: boolean }[]
  /** The project answers and every service checked is healthy. */
  ready: boolean
}

export interface ProvisionQueryResult<T> {
  success: boolean
  data?: T
  error?: string
}
