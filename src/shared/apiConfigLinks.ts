/**
 * External entry points referenced from both the API configuration page and
 * its help walkthrough — kept here so the two never point at different URLs.
 */
export const BUCKETS_URL = 'https://supabase.com/dashboard/project/_/storage/buckets'

/**
 * Spaceship's entry points. Everything in the account is reached through the
 * Launchpad — DNS included: `Advanced DNS` is an app of its own there, not a
 * tab inside a domain's page, which is where the previous instructions sent
 * the reader.
 */
/**
 * Where a sending domain's records are read off by hand. The page is the only
 * account of them Resend gives: what its API returns is shown there too, and
 * when the API cannot be reached this is where they are still legible.
 */
export const RESEND_DOMAINS_URL = 'https://resend.com/domains'

export const SPACESHIP_LAUNCHPAD_URL = 'https://www.spaceship.com/application/launchpad/'
export const SPACESHIP_DNS_HELP_URL = 'https://www.spaceship.com/knowledgebase/category/knowledgebase-dns/'
