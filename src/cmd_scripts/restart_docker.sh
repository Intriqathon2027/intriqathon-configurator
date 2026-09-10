#!/usr/bin/env bash
#
# Script pour redémarrer le conteneur discord_bot via SSH
#
# Usage : ./restart_docker.sh <IPV4>
#   IPV4       : adresse IPv4 du serveur cible

set -uo pipefail

echo "[SCRIPT] Démarrage du script de redémarrage de docker"
echo "[SCRIPT] Arguments reçus : $#"

if [ $# -lt 1 ]; then
    echo "Usage : $0 <IPV4>"
    exit 1
fi

IPV4="$1"

echo "[SCRIPT] IPV4 = ${IPV4}"

SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o BatchMode=no"

echo "=== Redémarrage sur ${IPV4} ==="

SSH_CMD="ssh ${SSH_OPTS}"
if [ -n "${SSHPASS:-}" ]; then
    echo "[SCRIPT] Utilisation de sshpass"
    SSH_CMD="sshpass -e ${SSH_CMD}"
fi

echo ""
echo "[1/1] Exécution de docker restart sur le serveur distant..."
echo "[SCRIPT] Connexion SSH à root@${IPV4}..."

${SSH_CMD} "root@${IPV4}" "docker restart discord_bot"
SSH_CODE=$?
echo "[SCRIPT] ssh terminé avec le code ${SSH_CODE}"
if [ $SSH_CODE -ne 0 ]; then
    echo "ERREUR : L'exécution distante a échoué avec le code d'erreur ${SSH_CODE}."
    exit $SSH_CODE
fi

echo ""
echo "=== Redémarrage de Docker terminé avec succès ! ==="
