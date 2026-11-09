#!/bin/bash

echo "🚀 Starting installation..."

# 1. Docker Installation
if ! command -v docker &> /dev/null
then
    echo "📦 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    echo "✅ Docker installed."
else
    echo "✅ Docker is already installed."
fi

# 2. Domain & SSL Configuration (Automatic reading from .env)
echo ""
echo "---------------------------------------------------"
echo "🌍 DOMAIN AND SSL CONFIGURATION"
echo "---------------------------------------------------"

# Initialize variables
DOMAIN_NAME=""
SSL_MODE="production"

# Check if .env file exists
if [ -f .env ]; then
    # Extract DOMAIN= value and strip quotes
    DOMAIN_NAME=$(grep "^DOMAIN=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    PARSED_SSL_MODE=$(grep "^SSL_MODE=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    if [ -n "$PARSED_SSL_MODE" ]; then
        SSL_MODE="$PARSED_SSL_MODE"
    fi
fi

# If DOMAIN_NAME is empty (not found in .env), prompt the user
if [ -z "$DOMAIN_NAME" ]; then
    echo "⚠️  Domain not found in .env."
    echo "Enter domain name (e.g. testing.mixup.my):"
    read DOMAIN_NAME
else
    echo "✅ Domain loaded from .env: $DOMAIN_NAME"
fi

# Fallback if still empty
if [ -z "$DOMAIN_NAME" ]; then
  echo "⚠️  No domain defined. Falling back to localhost mode (:80)"
  DOMAIN_NAME=":80"
fi

# 3. Dynamic Caddyfile Generation
echo "📝 Configuring Caddy Proxy for: $DOMAIN_NAME (Mode: $SSL_MODE)"

if [ "$DOMAIN_NAME" != ":80" ] && [ "$SSL_MODE" = "staging" ]; then
    echo "🧪 SSL Mode: TEST / STAGING (Let's Encrypt Staging — quota: 30,000 certs/week)"
    cat <<EOF > Caddyfile
{
    # Let's Encrypt Staging (test environment to avoid rate limits)
    acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
}

$DOMAIN_NAME {
    # API routing
    handle /api/* {
        reverse_proxy hackathon-backend:3000
    }

    # Frontend fallback
    handle {
        reverse_proxy hackathon-frontend:80
    }
}

config.$DOMAIN_NAME {
    reverse_proxy config-app:80
}
EOF
else
    if [ "$DOMAIN_NAME" != ":80" ]; then
        echo "🔒 SSL Mode: PRODUCTION (Official Let's Encrypt certificates)"
    fi
    cat <<EOF > Caddyfile
$DOMAIN_NAME {
    # API routing
    handle /api/* {
        reverse_proxy hackathon-backend:3000
    }

    # Frontend fallback
    handle {
        reverse_proxy hackathon-frontend:80
    }
}

config.$DOMAIN_NAME {
    reverse_proxy config-app:80
}
EOF
fi

# 4. Cleanup and Launch
echo "🧹 Cleaning up old containers..."
docker compose down --remove-orphans

echo "🔥 Starting application..."
# --build ensures docker-compose changes are taken into account
docker compose up -d --build 

echo "---------------------------------------------------"
echo "✅ Installation completed!"
echo "🌐 Website available at: https://$DOMAIN_NAME"
# Fetch public IP
PUBLIC_IP=$(curl -s https://api.ipify.org || curl -s ifconfig.me)
echo "📊 Grafana is available at: http://$PUBLIC_IP:3001"
echo "---------------------------------------------------"