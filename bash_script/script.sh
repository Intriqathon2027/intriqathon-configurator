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

set -euo pipefail

# ── Paramètres ───────────────────────────────────────────────
if [ $# -lt 1 ]; then
    echo "Usage : $0 <IPV4> [source_dir]"
    exit 1
fi

IPV4="$1"
SOURCE_DIR="${2:-.}"

SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

echo "=== Déploiement vers ${IPV4} ==="
echo "    Dossier source : ${SOURCE_DIR}"

# ── Étape 1 : copie des fichiers ─────────────────────────────
echo ""
echo "[1/2] Copie des fichiers vers le serveur distant..."
rsync -avz --progress -e "ssh ${SSH_OPTS}" "${SOURCE_DIR}/" "root@${IPV4}:~/hackathon-deploy"

# ── Étape 2 : exécution distante du script d'installation ────
echo ""
echo "[2/2] Exécution de install_hackathon.sh sur le serveur distant..."
ssh ${SSH_OPTS} "root@${IPV4}" "cd hackathon-deploy && chmod +x install_hackathon.sh && ./install_hackathon.sh"

echo ""
echo "=== Déploiement terminé avec succès ! ==="
