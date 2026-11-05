#!/bin/bash

echo "🚀 Démarrage de l'installation..."

# 1. Installation de Docker
if ! command -v docker &> /dev/null
then
    echo "📦 Installation de Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    echo "✅ Docker installé."
else
    echo "✅ Docker est déjà installé."
fi

# 2. Configuration du Domaine et SSL (Lecture automatique du .env)
echo ""
echo "---------------------------------------------------"
echo "🌍 CONFIGURATION DU DOMAINE ET DU SSL"
echo "---------------------------------------------------"

# On initialise les variables
DOMAIN_NAME=""
SSL_MODE="production"

# Vérifie si le fichier .env existe
if [ -f .env ]; then
    # On cherche la ligne commençant par DOMAIN=, on prend ce qu'il y a après le =, et on enlève les guillemets éventuels
    DOMAIN_NAME=$(grep "^DOMAIN=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    PARSED_SSL_MODE=$(grep "^SSL_MODE=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    if [ -n "$PARSED_SSL_MODE" ]; then
        SSL_MODE="$PARSED_SSL_MODE"
    fi
fi

# Si DOMAIN_NAME est vide (pas trouvé dans le .env), on demande à l'utilisateur
if [ -z "$DOMAIN_NAME" ]; then
    echo "⚠️  Domaine introuvable dans le .env."
    echo "Entrez le nom de domaine (ex: testing.mixup.my) :"
    read DOMAIN_NAME
else
    echo "✅ Domaine récupéré depuis .env : $DOMAIN_NAME"
fi

# Sécurité : Si toujours vide, fallback
if [ -z "$DOMAIN_NAME" ]; then
  echo "⚠️  Aucun domaine défini. Passage en mode localhost (:80)"
  DOMAIN_NAME=":80"
fi

# Configuration ACME globale pour Caddy
ACME_GLOBAL_CONFIG=""
if [ "$DOMAIN_NAME" != ":80" ]; then
  if [ "$SSL_MODE" = "staging" ]; then
    echo "🧪 Mode SSL : TEST / STAGING (Let's Encrypt Staging — quota 30 000 certs/semaine)"
    ACME_GLOBAL_CONFIG=$(cat << 'ACME_EOF'
{
    # Let's Encrypt Staging (environnement de test pour éviter le rate limit)
    acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
}

ACME_EOF
)
  else
    echo "🔒 Mode SSL : PRODUCTION (Certificats officiels Let's Encrypt)"
  fi
fi

# 3. Génération dynamique du Caddyfile
echo "📝 Configuration du Proxy Caddy pour : $DOMAIN_NAME (Mode: $SSL_MODE)"
cat <<EOF > Caddyfile
${ACME_GLOBAL_CONFIG}$DOMAIN_NAME {
    # On gère l'API
    handle /api/* {
        reverse_proxy hackathon-backend:3000
    }

    # On gère tout le reste (Frontend)
    handle {
        reverse_proxy hackathon-frontend:80
    }
}

config.$DOMAIN_NAME {
    reverse_proxy config-app:80
}
EOF

# 4. Nettoyage et Lancement
echo "🧹 Nettoyage des anciens conteneurs..."
docker compose down --remove-orphans

echo "🔥 Lancement de l'application..."
# --build assure que les modifs du docker-compose sont prises en compte
docker compose up -d --build 

echo "---------------------------------------------------"
echo "✅ Installation terminée !"
echo "🌐 Site accessible ici : https://$DOMAIN_NAME"
# On utilise une commande plus universelle pour l'IP publique
PUBLIC_IP=$(curl -s https://api.ipify.org || curl -s ifconfig.me)
echo "📊 Grafana reste sur : http://$PUBLIC_IP:3001"
echo "---------------------------------------------------"