#!/usr/bin/env bash
#
# Script de déploiement automatisé pour hackathon-deploy.
# Reproduit les étapes du README.md :
#   1. Copie des fichiers vers le serveur distant via rsync
#   2. Connexion SSH et exécution de install_hackathon.sh
#
# Usage : ./script.sh <IPV4> [source_dir]
#   IPV4       : adresse IPv4 du serveur cible
#   source_dir : chemin vers le dossier à déployer (défaut : répertoire courant)

# Ne pas utiliser set -e ici pour capturer les erreurs manuellement
set -uo pipefail

echo "[SCRIPT] Démarrage du script de déploiement"
echo "[SCRIPT] Arguments reçus : $#"

# ── Paramètres ───────────────────────────────────────────────
if [ $# -lt 1 ]; then
    echo "Usage : $0 <IPV4> [source_dir]"
    exit 1
fi

IPV4="$1"
SOURCE_DIR="${2:-.}"

echo "[SCRIPT] IPV4 = ${IPV4}"
echo "[SCRIPT] SOURCE_DIR = ${SOURCE_DIR}"

SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o BatchMode=no"

echo "=== Déploiement vers ${IPV4} ==="
echo "    Dossier source : ${SOURCE_DIR}"

# ── Helper pour sshpass ──────────────────────────────────────
SSH_CMD="ssh ${SSH_OPTS}"
RSYNC_CMD="rsync -avz --progress"
if [ -n "${SSHPASS:-}" ]; then
    echo "[SCRIPT] Utilisation de sshpass"
    SSH_CMD="sshpass -e ${SSH_CMD}"
    RSYNC_CMD="sshpass -e ${RSYNC_CMD}"
fi

# ── Étape 1 : copie des fichiers ─────────────────────────────
echo ""
echo "[1/2] Copie des fichiers vers le serveur distant..."
echo "[SCRIPT] Lancement rsync vers root@${IPV4}..."

${RSYNC_CMD} -e "ssh ${SSH_OPTS}" "${SOURCE_DIR}/" "root@${IPV4}:~/hackathon-deploy"
RSYNC_CODE=$?
echo "[SCRIPT] rsync terminé avec le code ${RSYNC_CODE}"
if [ $RSYNC_CODE -ne 0 ]; then
    echo "ERREUR : La copie des fichiers a échoué avec le code d'erreur ${RSYNC_CODE}."
    exit $RSYNC_CODE
fi

# ── Étape 2 : exécution distante du script d'installation ────
echo ""
echo "[2/2] Exécution de install_hackathon.sh sur le serveur distant..."
echo "[SCRIPT] Connexion SSH à root@${IPV4}..."

${SSH_CMD} "root@${IPV4}" "cd hackathon-deploy && chmod +x install_hackathon.sh && ./install_hackathon.sh"
SSH_CODE=$?
echo "[SCRIPT] ssh terminé avec le code ${SSH_CODE}"
if [ $SSH_CODE -ne 0 ]; then
    echo "ERREUR : L'exécution distante a échoué avec le code d'erreur ${SSH_CODE}."
    exit $SSH_CODE
fi

echo ""
echo "=== Déploiement terminé avec succès ! ==="
