/**
 * Per-field help registry.
 *
 * Single source of truth for what used to be rendered inline under each input
 * (the env var name and the short description). It now lives in the help panel:
 * every entry becomes an anchored section that a field's "?" button jumps to.
 */

export interface FieldHelpEntry {
  /** Matches the FormField `id` — the anchor becomes `help-<id>`. */
  id: string
  labelKey: string
  envKey?: string
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
        { id: 'supabase-pat', labelKey: 'accountCreation.supabase.pat', envKey: 'SUPABASE_ACCESS_TOKEN', hintKey: 'accountCreation.supabase.pat.hint' },
        { id: 's3-access-key', labelKey: 'accountCreation.supabase.s3AccessKey', envKey: 'S3_ACCESS_KEY_ID', hintKey: 'accountCreation.supabase.s3AccessKey.hint' },
        { id: 's3-secret', labelKey: 'accountCreation.supabase.s3SecretKey', envKey: 'S3_SECRET_ACCESS_KEY', hintKey: 'accountCreation.supabase.s3SecretKey.hint' },
      ],
    },
    {
      title: 'RESEND',
      fields: [
        { id: 'resend-api-key', labelKey: 'accountCreation.resend.apiKey', envKey: 'RESEND_API_KEY', hintKey: 'accountCreation.resend.apiKey.hint' },
      ],
    },
    {
      title: 'SPACESHIP',
      fields: [
        { id: 'domain', labelKey: 'accountCreation.spaceship.domain', envKey: 'DOMAIN', hintKey: 'accountCreation.spaceship.domain.hint' },
        { id: 'spaceship-api-key', labelKey: 'accountCreation.spaceship.apiKey', envKey: 'SPACESHIP_API_KEY', hintKey: 'accountCreation.spaceship.apiKey.hint' },
        { id: 'spaceship-api-secret', labelKey: 'accountCreation.spaceship.apiSecret', envKey: 'SPACESHIP_API_SECRET', hintKey: 'accountCreation.spaceship.apiSecret.hint' },
      ],
    },
    {
      title: 'SCALEWAY',
      fields: [
        { id: 'scw-secret-key', labelKey: 'accountCreation.scaleway.secretKey', envKey: 'SCW_SECRET_KEY', hintKey: 'accountCreation.scaleway.secretKey.hint' },
        { id: 'scw-project-id', labelKey: 'accountCreation.scaleway.projectId', envKey: 'SCW_DEFAULT_PROJECT_ID', hintKey: 'accountCreation.scaleway.projectId.hint' },
        { id: 'deploy-path', labelKey: 'accountCreation.scaleway.deployPath', envKey: 'DEPLOY_PATH', hintKey: 'accountCreation.scaleway.deployPath.hint' },
      ],
    },
  ],

  // Step 2 — Configurations par API
  1: [
    {
      title: 'SUPABASE',
      fields: [
        { id: 'supabase-url', labelKey: 'apiConfig.supabase.url', envKey: 'SUPABASE_URL', hintKey: 'apiConfig.supabase.url.hint' },
        { id: 'supabase-anon', labelKey: 'apiConfig.supabase.anonKey', envKey: 'SUPABASE_ANON_KEY', hintKey: 'apiConfig.supabase.anonKey.hint' },
        { id: 'supabase-service', labelKey: 'apiConfig.supabase.serviceKey', envKey: 'SUPABASE_SERVICE_ROLE_KEY', hintKey: 'apiConfig.supabase.serviceKey.hint' },
        { id: 'database-url', labelKey: 'apiConfig.supabase.databaseUrl', envKey: 'DATABASE_URL', hintKey: 'apiConfig.supabase.databaseUrl.hint' },
        { id: 'direct-url', labelKey: 'apiConfig.supabase.directUrl', envKey: 'DIRECT_URL', hintKey: 'apiConfig.supabase.directUrl.hint' },
      ],
    },
    {
      title: 'SCALEWAY',
      fields: [
        { id: 'ipv4', labelKey: 'apiConfig.spaceship.ipv4', envKey: 'IPV4_INSTANCE', hintKey: 'apiConfig.spaceship.ipv4.hint' },
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
        { id: 'discord-client-id', labelKey: 'step3.discordClientId', envKey: 'DISCORD_CLIENT_ID', hintKey: 'help.field.discordClientId' },
        { id: 'discord-secret', labelKey: 'step3.discordSecret', envKey: 'OAUTH2_DISCORD_CLIENT_SECRET', hintKey: 'help.field.discordSecret' },
      ],
    },
    {
      title: 'GITHUB OAUTH2',
      fields: [
        { id: 'github-client-id', labelKey: 'step3.githubClientId', envKey: 'GITHUB_CLIENT_ID', hintKey: 'help.field.githubClientId' },
        { id: 'github-secret', labelKey: 'step3.githubSecret', envKey: 'OAUTH2_GITHUB_CLIENT_SECRET', hintKey: 'help.field.githubSecret' },
      ],
    },
    {
      title: 'BOT DISCORD',
      fields: [
        { id: 'bot-client-id', labelKey: 'step3.botClientId', envKey: 'CLIENT_ID', hintKey: 'step3.botClientId.hint' },
        { id: 'bot-token', labelKey: 'step3.botToken', envKey: 'BOT_TOKEN', hintKey: 'step3.botToken.hint' },
        { id: 'dev-server-id', labelKey: 'step3.devServerId', envKey: 'DEV_SERVER_ID', hintKey: 'step3.devServerId.hint' },
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
