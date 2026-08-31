// ─── Env Content Generator ────────────────────────────────────────────────────

export function generateEnvContent(config: Record<string, string>): string {
  return `DOMAIN=${config.DOMAIN}

# Supabase
SUPABASE_URL=${config.SUPABASE_URL}
SUPABASE_ANON_KEY=${config.SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${config.SUPABASE_SERVICE_ROLE_KEY}

# Database
DATABASE_URL=${config.DATABASE_URL}
DIRECT_URL=${config.DIRECT_URL}

# Supabase S3
S3_ACCESS_KEY_ID=${config.S3_ACCESS_KEY_ID}
S3_SECRET_ACCESS_KEY=${config.S3_SECRET_ACCESS_KEY}

# Discord Keys
DISCORD_CLIENT_ID=${config.DISCORD_CLIENT_ID}
OAUTH2_DISCORD_CLIENT_SECRET=${config.OAUTH2_DISCORD_CLIENT_SECRET}

# Github Keys
GITHUB_CLIENT_ID=${config.GITHUB_CLIENT_ID}
OAUTH2_GITHUB_CLIENT_SECRET=${config.OAUTH2_GITHUB_CLIENT_SECRET}

# Email Resend
RESEND_API_KEY=${config.RESEND_API_KEY}
FROM_EMAIL=${config.FROM_EMAIL}
ALLOWED_EMAILS=${config.ALLOWED_EMAILS}

# Discord Bot
CLIENT_ID=${config.CLIENT_ID}
BOT_TOKEN=${config.BOT_TOKEN}
DEV_SERVER_ID=${config.DEV_SERVER_ID}
GUILD_ID=${config.GUILD_ID}
`
}
