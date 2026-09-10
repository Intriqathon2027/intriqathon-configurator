/**
 * Per-field help registry.
 *
 * Single source of truth for what a field is and where to find its value.
 * Each entry becomes an anchored section in the help panel that the field's
 * "?" button jumps to. The service walkthroughs above these sections only
 * cover what no field owns (creating the account, the project, the app) —
 * anything field-specific lives here so it is described exactly once.
 */

export interface FieldHelpEntry {
  /** Matches the FormField `id` — the anchor becomes `help-<id>`. */
  id: string
  labelKey: string
  envKey?: string
  /** Where to click in the provider's UI. `>`-separated, rendered as chips. */
  pathKey?: string
  /** What the value is, plus the gotchas worth knowing. */
  hintKey?: string
}

export interface FieldHelpGroup {
  /** Literal group title (service names are not translated). */
  title: string
  fields: FieldHelpEntry[]
}

export const fieldHelpByStep: Record<number, FieldHelpGroup[]> = {
  // Step 1 — Création des comptes
  0: [
    {
      title: 'SUPABASE',
      fields: [
        { id: 'supabase-pat', labelKey: 'accountCreation.supabase.pat', envKey: 'SUPABASE_ACCESS_TOKEN', pathKey: 'accountCreation.supabase.pat.path', hintKey: 'accountCreation.supabase.pat.hint' },
        { id: 's3-access-key', labelKey: 'accountCreation.supabase.s3AccessKey', envKey: 'S3_ACCESS_KEY_ID', pathKey: 'accountCreation.supabase.s3AccessKey.path', hintKey: 'accountCreation.supabase.s3AccessKey.hint' },
        { id: 's3-secret', labelKey: 'accountCreation.supabase.s3SecretKey', envKey: 'S3_SECRET_ACCESS_KEY', pathKey: 'accountCreation.supabase.s3SecretKey.path', hintKey: 'accountCreation.supabase.s3SecretKey.hint' },
      ],
    },
    {
      title: 'RESEND',
      fields: [
        { id: 'resend-api-key', labelKey: 'accountCreation.resend.apiKey', envKey: 'RESEND_API_KEY', pathKey: 'accountCreation.resend.apiKey.path', hintKey: 'accountCreation.resend.apiKey.hint' },
      ],
    },
    {
      title: 'SPACESHIP',
      fields: [
        { id: 'domain', labelKey: 'accountCreation.spaceship.domain', envKey: 'DOMAIN', hintKey: 'accountCreation.spaceship.domain.hint' },
        { id: 'spaceship-api-key', labelKey: 'accountCreation.spaceship.apiKey', envKey: 'SPACESHIP_API_KEY', pathKey: 'accountCreation.spaceship.apiKey.path', hintKey: 'accountCreation.spaceship.apiKey.hint' },
        { id: 'spaceship-api-secret', labelKey: 'accountCreation.spaceship.apiSecret', envKey: 'SPACESHIP_API_SECRET', pathKey: 'accountCreation.spaceship.apiSecret.path', hintKey: 'accountCreation.spaceship.apiSecret.hint' },
      ],
    },
    {
      title: 'SCALEWAY',
      fields: [
        { id: 'scw-secret-key', labelKey: 'accountCreation.scaleway.secretKey', envKey: 'SCW_SECRET_KEY', pathKey: 'accountCreation.scaleway.secretKey.path', hintKey: 'accountCreation.scaleway.secretKey.hint' },
        { id: 'scw-project-id', labelKey: 'accountCreation.scaleway.projectId', envKey: 'SCW_DEFAULT_PROJECT_ID', pathKey: 'accountCreation.scaleway.projectId.path', hintKey: 'accountCreation.scaleway.projectId.hint' },
        { id: 'deploy-path', labelKey: 'accountCreation.scaleway.deployPath', envKey: 'DEPLOY_PATH', hintKey: 'accountCreation.scaleway.deployPath.hint' },
      ],
    },
  ],

  // Step 2 — Configurations par API
  1: [
    {
      title: 'SUPABASE',
      fields: [
        { id: 'supabase-url', labelKey: 'apiConfig.supabase.url', envKey: 'SUPABASE_URL', pathKey: 'apiConfig.supabase.url.path', hintKey: 'apiConfig.supabase.url.hint' },
        { id: 'supabase-anon', labelKey: 'apiConfig.supabase.anonKey', envKey: 'SUPABASE_ANON_KEY', pathKey: 'apiConfig.supabase.anonKey.path', hintKey: 'apiConfig.supabase.anonKey.hint' },
        { id: 'supabase-service', labelKey: 'apiConfig.supabase.serviceKey', envKey: 'SUPABASE_SERVICE_ROLE_KEY', pathKey: 'apiConfig.supabase.serviceKey.path', hintKey: 'apiConfig.supabase.serviceKey.hint' },
        { id: 'database-url', labelKey: 'apiConfig.supabase.databaseUrl', envKey: 'DATABASE_URL', pathKey: 'apiConfig.supabase.databaseUrl.path', hintKey: 'apiConfig.supabase.databaseUrl.hint' },
        { id: 'direct-url', labelKey: 'apiConfig.supabase.directUrl', envKey: 'DIRECT_URL', pathKey: 'apiConfig.supabase.directUrl.path', hintKey: 'apiConfig.supabase.directUrl.hint' },
      ],
    },
    {
      title: 'SCALEWAY',
      fields: [
        { id: 'ipv4', labelKey: 'apiConfig.spaceship.ipv4', envKey: 'IPV4_INSTANCE', pathKey: 'apiConfig.spaceship.ipv4.path', hintKey: 'apiConfig.spaceship.ipv4.hint' },
      ],
    },
    {
      title: 'RESEND',
      fields: [
        { id: 'from-email', labelKey: 'apiConfig.supabase.fromEmail', envKey: 'FROM_EMAIL', hintKey: 'apiConfig.supabase.fromEmail.hint' },
        { id: 'allowed-emails', labelKey: 'apiConfig.supabase.allowedEmails', envKey: 'ALLOWED_EMAILS', hintKey: 'apiConfig.supabase.allowedEmails.hint' },
      ],
    },
  ],

  // Step 3 — OAuth2
  2: [
    {
      title: 'DISCORD OAUTH2',
      fields: [
        { id: 'discord-client-id', labelKey: 'step3.discordClientId', envKey: 'DISCORD_CLIENT_ID', pathKey: 'step3.discordClientId.path', hintKey: 'step3.discordClientId.hint' },
        { id: 'discord-secret', labelKey: 'step3.discordSecret', envKey: 'OAUTH2_DISCORD_CLIENT_SECRET', pathKey: 'step3.discordSecret.path', hintKey: 'step3.discordSecret.hint' },
      ],
    },
    {
      title: 'GITHUB OAUTH2',
      fields: [
        { id: 'github-client-id', labelKey: 'step3.githubClientId', envKey: 'GITHUB_CLIENT_ID', pathKey: 'step3.githubClientId.path', hintKey: 'step3.githubClientId.hint' },
        { id: 'github-secret', labelKey: 'step3.githubSecret', envKey: 'OAUTH2_GITHUB_CLIENT_SECRET', pathKey: 'step3.githubSecret.path', hintKey: 'step3.githubSecret.hint' },
      ],
    },
    {
      title: 'BOT DISCORD',
      fields: [
        { id: 'bot-client-id', labelKey: 'step3.botClientId', envKey: 'CLIENT_ID', pathKey: 'step3.botClientId.path', hintKey: 'step3.botClientId.hint' },
        { id: 'bot-token', labelKey: 'step3.botToken', envKey: 'BOT_TOKEN', pathKey: 'step3.botToken.path', hintKey: 'step3.botToken.hint' },
        { id: 'dev-server-id', labelKey: 'step3.devServerId', envKey: 'DEV_SERVER_ID', pathKey: 'step3.devServerId.path', hintKey: 'step3.devServerId.hint' },
        { id: 'guild-id', labelKey: 'step3.guildId', envKey: 'GUILD_ID', hintKey: 'step3.guildId.hint' },
      ],
    },
  ],
}

const registeredIds = new Set(
  Object.values(fieldHelpByStep).flatMap(groups => groups.flatMap(g => g.fields.map(f => f.id)))
)

/** True when a field has a help section to jump to. */
export function hasFieldHelp(id: string): boolean {
  return registeredIds.has(id)
}
