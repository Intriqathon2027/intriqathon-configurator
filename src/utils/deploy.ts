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
echo "║   Intriqathon — Déploiement Auto     ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── Étape 1 : Écriture du .env ──────────────────────────────────────────────
echo "📄 [1/4] Écriture du fichier .env dans \${DEPLOY_PATH}..."
cat > "\${DEPLOY_PATH}/.env" << 'INTRIQATHON_ENV_EOF'
${safeEnv}INTRIQATHON_ENV_EOF
echo "✅ Fichier .env écrit avec succès."
echo ""

# ── Étape 2 : Synchronisation rsync ─────────────────────────────────────────
echo "📦 [2/4] Envoi des fichiers vers le VPS (rsync)..."
rsync -avz -e "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" --progress "\${DEPLOY_PATH}/" root@\${IPV4}:~/hackathon-deploy || {
    CODE=$?
    echo "ERREUR : La copie des fichiers a échoué avec le code d'erreur $CODE."
    exit $CODE
}
echo "✅ Fichiers synchronisés."
echo ""

# ── Étape 3 : Connexion SSH + chmod ─────────────────────────────────────────
echo "🔗 [3/4] Connexion SSH — attribution des droits d'exécution..."
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@\${IPV4} "cd hackathon-deploy && sed -i 's/\\r$//' install_hackathon.sh && chmod +x install_hackathon.sh" || {
    CODE=$?
    echo "ERREUR : L'attribution des droits a échoué avec le code d'erreur $CODE."
    exit $CODE
}
echo "✅ Droits accordés."
echo ""

# ── Étape 4 : Lancement du script d'installation ────────────────────────────
echo "🚀 [4/4] Lancement de l'installation sur le VPS..."
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@\${IPV4} "cd hackathon-deploy && ./install_hackathon.sh" || {
    CODE=$?
    echo "❌ ERREUR : L'exécution distante a échoué avec le code d'erreur $CODE."
    exit $CODE
}
echo ""
echo "🎉 Déploiement terminé avec succès !"
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
echo   Intriqathon -- Deploiement Automatique
echo ==========================================
echo.

:: Etape 1 : Ecriture du .env
echo [1/4] Ecriture du fichier .env...
(
${envLines}
) > "%DEPLOY_PATH%\\.env"
echo [OK] Fichier .env ecrit.
echo.

:: Etape 2 : Envoi des fichiers
echo [2/4] Envoi des fichiers vers le VPS (scp)...
scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -r "%DEPLOY_PATH%\\" root@%IPV4%:~/hackathon-deploy
if !ERRORLEVEL! NEQ 0 (
    echo ERREUR : la copie des fichiers a echoue avec le code !ERRORLEVEL!.
    exit /b !ERRORLEVEL!
)
echo [OK] Fichiers envoyes.
echo.

:: Etape 3 : Droits execution
echo [3/4] Attribution des droits d'execution...
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@%IPV4% "cd hackathon-deploy && sed -i 's/\\r$//' install_hackathon.sh && chmod +x install_hackathon.sh"
if !ERRORLEVEL! NEQ 0 (
    echo ERREUR : l'attribution des droits a echoue avec le code !ERRORLEVEL!.
    exit /b !ERRORLEVEL!
)
echo [OK] Droits accordes.
echo.

:: Etape 4 : Installation
echo [4/4] Lancement de l'installation...
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@%IPV4% "cd hackathon-deploy && ./install_hackathon.sh"
if !ERRORLEVEL! NEQ 0 (
    echo ERREUR : l'execution distante a echoue avec le code !ERRORLEVEL!.
    exit /b !ERRORLEVEL!
)
echo.
echo Deploiement termine avec succes !
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
