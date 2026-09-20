/**
 * Contract between the provisioning services (main) and the cards (renderer).
 * Lives outside `src/electron` so both sides import the same definitions.
 */

import type { DnsRecord } from '../shared/dnsRecords'

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
  /**
   * What Resend last asked for, when anything has. Published by its own run,
   * so this pass only puts back what has gone missing from the zone since.
   */
  resendRecords?: DnsRecord[]
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

export type ResendDomainStatus =
  | 'not_started'
  | 'pending'
  | 'verified'
  | 'failed'
  | 'temporary_failure'

/**
 * A verification on its own, without the run around it. Resend's dashboard has
 * no "check now" control — its own check runs on a schedule — so this is the
 * only way to ask for one the moment the records are in place.
 */
export interface ResendVerifyRequest {
  apiKey: string
  /** The domain registered on the account — what it is found by, absent an id. */
  mailSubdomain: string
  domainId?: string
}

/**
 * A read of the sending domain as Resend holds it right now. Answers the one
 * question nothing else here can: the records on file were written by a run
 * that has long since finished, and a domain deleted from the dashboard since
 * leaves them behind with nothing to say so.
 */
export interface ResendDomainReadRequest {
  apiKey: string
  /** The registered domain — what the records' names are relative to. */
  domain: string
  mailSubdomain: string
}

export interface ResendDomainSnapshot {
  /** The account still lists this sending domain. */
  exists: boolean
  domainId?: string
  status?: ResendDomainStatus
  /** What it asks to be published, as it asks for it today. */
  records?: DnsRecord[]
}

export interface ResendVerificationResult {
  /**
   * Resolved during the check: an id saved by an earlier run can name a domain
   * that has since been deleted, in which case the one found by name is this.
   */
  domainId: string
  status: ResendDomainStatus
  /** Only when Resend reports the domain verified. */
  verifiedAt?: string
}

/**
 * The site-configuration run. It works against a project that already exists
 * and whose database the deployment has migrated, so it needs nothing but the
 * token and the reference.
 */
export interface SupabaseSiteSetupRequest {
  accessToken: string
  ref: string
  /**
   * A deployment ran in this session. The run then waits for its migrations
   * rather than configuring an empty schema and reporting what it could not do.
   */
  awaitMigrations?: boolean
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

/**
 * What the manual checkboxes claim, put to the providers that would know.
 *
 * Every part is optional: the page sends whatever credentials it holds, and
 * whatever cannot be asked simply is not answered.
 */
export interface ManualCheckProbeRequest {
  supabase?: { accessToken: string; ref: string }
  scaleway?: { secretKey: string; ipv4: string; zone?: string }
  spaceship?: { apiKey: string; apiSecret: string; domain: string; records: DnsRecord[] }
}

/**
 * One answer per box, and `undefined` wherever the question could not be put.
 * A box is never unticked on an absent answer — only on a clear "no".
 */
export interface ManualCheckProbe {
  /** The five storage buckets exist, with those exact names. */
  buckets?: boolean
  /** An instance really answers at the IPv4 on file. */
  instance?: boolean
  /** Every record the table lists is in the zone. */
  dnsRecords?: boolean
  /** The privileges the SQL block hands out are held. */
  siteGrants?: boolean
  /** Exposed schema, Realtime, email confirmation and RLS all as they should be. */
  siteSettings?: boolean
}

export interface ProvisionQueryResult<T> {
  success: boolean
  data?: T
  error?: string
}
