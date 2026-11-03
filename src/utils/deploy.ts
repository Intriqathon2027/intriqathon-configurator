import { ensurePgBouncerFlag } from '../shared/pgbouncer'

// ─── Env Content Generator ────────────────────────────────────────────────────

export function generateEnvContent(config: Record<string, string>): string {
  return `DOMAIN=${config.DOMAIN}

# Supabase
SUPABASE_URL=${config.SUPABASE_URL}
SUPABASE_ANON_KEY=${config.SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${config.SUPABASE_SERVICE_ROLE_KEY}

# Database
DATABASE_URL=${ensurePgBouncerFlag(config.DATABASE_URL ?? '')}
DIRECT_URL=${config.DIRECT_URL}

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

// ─── Script Generators ────────────────────────────────────────────────────────

export function generateBashScript(deployPath: string, ipv4: string, envContent: string): string {
  // Escape single quotes in envContent for the here-doc
  const safeEnv = envContent
  return `#!/usr/bin/env bash
set -e

DEPLOY_PATH="${deployPath}"
IPV4="${ipv4}"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   Intriqathon — Auto Deployment      ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── Étape 1 : Écriture du .env ──────────────────────────────────────────────
echo "📄 [1/4] Writing .env file in \${DEPLOY_PATH}..."
cat > "\${DEPLOY_PATH}/.env" << 'INTRIQATHON_ENV_EOF'
${safeEnv}INTRIQATHON_ENV_EOF
echo "✅ .env file written successfully."
echo ""

# ── Étape 2 : Synchronisation rsync ─────────────────────────────────────────
echo "📦 [2/4] Sending files to VPS (rsync)..."
rsync -avz -e "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" --progress "\${DEPLOY_PATH}/" root@\${IPV4}:~/hackathon-deploy || {
    CODE=$?
    echo "ERROR: File copy failed with error code $CODE."
    exit $CODE
}
echo "✅ Files synchronized."
echo ""

# ── Étape 3 : Connexion SSH + chmod ─────────────────────────────────────────
echo "🔗 [3/4] SSH connection — setting execution permissions..."
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@\${IPV4} "cd hackathon-deploy && sed -i 's/\\r$//' install_hackathon.sh && chmod +x install_hackathon.sh" || {
    CODE=$?
    echo "ERROR: Setting execution permissions failed with error code $CODE."
    exit $CODE
}
echo "✅ Permissions granted."
echo ""

# ── Étape 4 : Lancement du script d'installation ────────────────────────────
echo "🚀 [4/4] Launching installation on VPS..."
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@\${IPV4} "cd hackathon-deploy && ./install_hackathon.sh" || {
    CODE=$?
    echo "❌ ERROR: Remote execution failed with error code $CODE."
    exit $CODE
}
echo ""
echo "🎉 Deployment completed successfully!"
`
}

export function generateBatScript(deployPath: string, ipv4: string, envContent: string): string {
  const envLines = envContent
    .split('\n')
    .map(line => {
      if (line.trim() === '') return 'echo.'
      // Escape special batch chars
      const escaped = line.replace(/[&<>|^]/g, '^$&')
      return `echo ${escaped}`
    })
    .join('\r\n')

  return `@echo off
setlocal EnableDelayedExpansion

set DEPLOY_PATH=${deployPath}
set IPV4=${ipv4}

echo.
echo ==========================================
echo   Intriqathon -- Automatic Deployment
echo ==========================================
echo.

:: Etape 1 : Ecriture du .env
echo [1/4] Writing .env file...
(
${envLines}
) > "%DEPLOY_PATH%\\.env"
echo [OK] .env file written.
echo.

:: Etape 2 : Envoi des fichiers
echo [2/4] Sending files to VPS (scp)...
scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -r "%DEPLOY_PATH%\\" root@%IPV4%:~/hackathon-deploy
if !ERRORLEVEL! NEQ 0 (
    echo ERROR: File copy failed with error code !ERRORLEVEL!.
    exit /b !ERRORLEVEL!
)
echo [OK] Files sent.
echo.

:: Etape 3 : Droits execution
echo [3/4] Setting execution permissions...
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@%IPV4% "cd hackathon-deploy && sed -i 's/\\r$//' install_hackathon.sh && chmod +x install_hackathon.sh"
if !ERRORLEVEL! NEQ 0 (
    echo ERROR: Setting execution permissions failed with error code !ERRORLEVEL!.
    exit /b !ERRORLEVEL!
)
echo [OK] Permissions granted.
echo.

:: Etape 4 : Installation
echo [4/4] Launching installation...
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@%IPV4% "cd hackathon-deploy && ./install_hackathon.sh"
if !ERRORLEVEL! NEQ 0 (
    echo ERROR: Remote execution failed with error code !ERRORLEVEL!.
    exit /b !ERRORLEVEL!
)
echo.
echo Deployment completed successfully!
`
}

// ─── Platform helpers ─────────────────────────────────────────────────────────

export function platformLabel(p: string): { label: string; cssClass: string; emoji: string } {
  if (p === 'darwin') return { label: 'macOS', cssClass: 'mac', emoji: '🍎' }
  if (p === 'win32') return { label: 'Windows', cssClass: 'windows', emoji: '🪟' }
  return { label: 'Linux', cssClass: 'linux', emoji: '🐧' }
}

export function scriptExt(p: string): string {
  return p === 'win32' ? '.bat' : '.sh'
}
