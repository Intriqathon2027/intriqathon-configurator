import type { Config } from '../context/AppContext'
import type { ManualKey, RunKey } from '../context/SessionContext'

/**
 * What the deployment is about to consume, and what would be missing from it.
 *
 * The .env is written from steps 2 and 3, and a blank there does not fail the
 * deployment — it produces a stack that installs cleanly and then cannot reach
 * its database, sign anyone in, or send a single email. The gap is only visible
 * hours later, which is why it is worth saying so before the transfer starts.
 *
 * The manual acknowledgements are part of the answer: creating the buckets or
 * the DNS records leaves nothing in the config, so the ticked box is the only
 * record that those steps happened.
 */

export interface PreDeployGap {
  /** Which wizard step it belongs to — shown as a prefix in the warning. */
  step: 'api' | 'oauth'
  /** Already translated, ready to display. */
  label: string
}

interface CheckInput {
  config: Config
  isManualChecked: (key: ManualKey) => boolean
  /** Automations that succeeded in this session — they do some of this work. */
  isRunDone: (key: RunKey) => boolean
  isEn: boolean
}

export function collectPreDeployGaps({ config, isManualChecked, isRunDone, isEn }: CheckInput): PreDeployGap[] {
  const gaps: PreDeployGap[] = []

  const api = (label: string) => gaps.push({ step: 'api', label })
  const oauth = (label: string) => gaps.push({ step: 'oauth', label })

  // ── Step 2 — Configuration par API ──────────────────────────────────────
  if (!config.SUPABASE_URL) api(isEn ? 'Supabase — Project URL (SUPABASE_URL)' : 'Supabase — URL du projet (SUPABASE_URL)')
  if (!config.SUPABASE_ANON_KEY) api('Supabase — SUPABASE_ANON_KEY')
  if (!config.SUPABASE_SERVICE_ROLE_KEY) api('Supabase — SUPABASE_SERVICE_ROLE_KEY')
  if (!config.DATABASE_URL) api('Supabase — DATABASE_URL')
  if (!config.DIRECT_URL) api('Supabase — DIRECT_URL')
  // The automation creates the buckets and verifies them: a run that reported
  // success answers this as well as a ticked box does.
  if (!isManualChecked('supabase-buckets') && !isRunDone('api-supabase')) {
    api(isEn ? 'Supabase — storage buckets not confirmed as created' : 'Supabase — création des buckets non confirmée')
  }

  if (!config.IPV4_INSTANCE) api(isEn ? 'Scaleway — instance IPv4 (IPV4_INSTANCE)' : "Scaleway — IPv4 de l'instance (IPV4_INSTANCE)")

  if (!isManualChecked('spaceship-dns')) {
    api(isEn ? 'Spaceship — DNS records not confirmed as added' : 'Spaceship — ajout des enregistrements DNS non confirmé')
  }

  if (!config.FROM_EMAIL) api('Resend — FROM_EMAIL')
  if (!config.ALLOWED_EMAILS) api('Resend — ALLOWED_EMAILS')
  if (!isManualChecked('resend-subdomain')) {
    api(isEn ? 'Resend — mail subdomain not confirmed as added' : "Resend — ajout du sous-domaine mail non confirmé")
  }

  // ── Step 3 — OAuth2 and the bot ─────────────────────────────────────────
  if (!config.DISCORD_CLIENT_ID) oauth('Discord OAuth2 — DISCORD_CLIENT_ID')
  if (!config.OAUTH2_DISCORD_CLIENT_SECRET) oauth('Discord OAuth2 — OAUTH2_DISCORD_CLIENT_SECRET')
  if (!config.GITHUB_CLIENT_ID) oauth('GitHub OAuth2 — GITHUB_CLIENT_ID')
  if (!config.OAUTH2_GITHUB_CLIENT_SECRET) oauth('GitHub OAuth2 — OAUTH2_GITHUB_CLIENT_SECRET')
  if (!config.CLIENT_ID) oauth(isEn ? 'Discord bot — CLIENT_ID' : 'Bot Discord — CLIENT_ID')
  if (!config.BOT_TOKEN) oauth(isEn ? 'Discord bot — BOT_TOKEN' : 'Bot Discord — BOT_TOKEN')
  if (!config.DEV_SERVER_ID) oauth(isEn ? 'Discord bot — DEV_SERVER_ID' : 'Bot Discord — DEV_SERVER_ID')
  if (!config.GUILD_ID) oauth(isEn ? 'Discord bot — GUILD_ID' : 'Bot Discord — GUILD_ID')

  return gaps
}
