#!/usr/bin/env bash
#
# Script pour redémarrer le conteneur discord_bot via SSH
#
# Usage : ./restart_docker.sh <IPV4>
#   IPV4       : adresse IPv4 du serveur cible

set -uo pipefail

echo "[SCRIPT] Starting docker restart script"
echo "[SCRIPT] Arguments received: $#"

if [ $# -lt 1 ]; then
    echo "Usage: $0 <IPV4>"
    exit 1
fi

IPV4="$1"

echo "[SCRIPT] IPV4 = ${IPV4}"

SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o BatchMode=no"
if [ -n "${SSH_KEY_PATH:-}" ]; then
    echo "[SCRIPT] Using SSH key: ${SSH_KEY_PATH}"
    SSH_OPTS="${SSH_OPTS} -i ${SSH_KEY_PATH}"
fi

echo "=== Restarting on ${IPV4} ==="

SSH_CMD="ssh ${SSH_OPTS}"
if [ -n "${SSHPASS:-}" ]; then
    echo "[SCRIPT] Using sshpass"
    SSH_CMD="sshpass -e ${SSH_CMD}"
fi

echo ""
echo "[1/1] Running docker restart on remote server..."
echo "[SCRIPT] SSH connection to root@${IPV4}..."

${SSH_CMD} "root@${IPV4}" "docker restart discord_bot"
SSH_CODE=$?
echo "[SCRIPT] ssh finished with code ${SSH_CODE}"
if [ $SSH_CODE -ne 0 ]; then
    echo "ERROR: Remote execution failed with error code ${SSH_CODE}."
    exit $SSH_CODE
fi

echo ""
echo "=== Docker restart completed successfully! ==="
