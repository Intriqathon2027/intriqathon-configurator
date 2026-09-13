import type { Config } from '../context/AppContext'

/**
 * What "the card is green" means, per service, at step 1 (Création de comptes).
 *
 * Single source of truth: the account cards colour themselves with it, and the
 * automations downstream lock themselves with the very same rule. A block whose
 * button is live while its account card is still grey would be starting a run
 * on values the reader has not finished providing.
 */
export type AccountService = 'supabase' | 'resend' | 'spaceship' | 'scaleway'

export const ACCOUNT_REQUIRED_FIELDS: Record<AccountService, (keyof Config)[]> = {
  /**
   * The S3 pair is deliberately left out: nothing in the deployed stack reads
   * it, and no API can create it. The project reference is not: the token and
   * the password describe an intent, not a project to work against.
   */
  supabase: ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'SUPABASE_PROJECT_REF'],
  resend: ['RESEND_API_KEY'],
  spaceship: ['DOMAIN', 'SPACESHIP_API_KEY', 'SPACESHIP_API_SECRET'],
  scaleway: ['SCW_SECRET_KEY', 'SCW_DEFAULT_PROJECT_ID', 'DEPLOY_PATH'],
}

export function isAccountComplete(config: Config, service: AccountService): boolean {
  return ACCOUNT_REQUIRED_FIELDS[service].every(field => !!config[field])
}
