/**
 * Contract between the provisioning services (main) and the cards (renderer).
 * Lives outside `src/electron` so both sides import the same definitions.
 */

export type ProvisionService = 'supabase' | 'scaleway' | 'spaceship' | 'resend'

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
