#!/usr/bin/env bash
# Requests the initial Let's Encrypt certificate for $DOMAIN (+ $DOMAIN_ALIASES).
#
# Usage:  ./scripts/init-letsencrypt.sh [--force]
#
#   --force   request a new certificate even if a valid one exists
#             (e.g. after switching from LETSENCRYPT_STAGING=1 to 0)
#
# Prerequisites: DNS of all domains points to this server, ports 80/443 are
# reachable from the internet and `.env` is filled in.
set -euo pipefail

cd "$(dirname "$0")/.."

# Prevent Git Bash on Windows from rewriting container paths like /etc/...
export MSYS_NO_PATHCONV=1

if [ ! -f .env ]; then
    echo "Error: .env not found. Copy .env.example to .env and fill it in." >&2
    exit 1
fi

# Read single keys from .env (sourcing it is unsafe: values may contain HTML).
env_value() {
    grep -E "^$1=" .env | tail -n1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//' || true
}

DOMAIN="$(env_value DOMAIN)"
DOMAIN_ALIASES="$(env_value DOMAIN_ALIASES)"
EMAIL="$(env_value LETSENCRYPT_EMAIL)"
STAGING="$(env_value LETSENCRYPT_STAGING)"

if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "example.com" ] || [ "$DOMAIN" = "localhost" ]; then
    echo "Error: set DOMAIN in .env to your public domain name." >&2
    exit 1
fi
if [ -z "$EMAIL" ] || [ "$EMAIL" = "admin@example.com" ]; then
    echo "Error: set LETSENCRYPT_EMAIL in .env." >&2
    exit 1
fi

domain_args=(-d "$DOMAIN")
IFS=',' read -ra aliases <<< "$DOMAIN_ALIASES"
for alias in "${aliases[@]}"; do
    alias="$(echo "$alias" | xargs)"
    [ -n "$alias" ] && domain_args+=(-d "$alias")
done

extra_args=()
[ "${STAGING:-0}" = "1" ] && extra_args+=(--staging) && echo "Using the Let's Encrypt STAGING environment."
[ "${1:-}" = "--force" ] && extra_args+=(--force-renewal)

echo "### Starting nginx (with a temporary self-signed certificate if needed) ..."
docker compose up -d --build nginx

echo "### Requesting certificate for: ${domain_args[*]//-d /}"
docker compose run --rm --entrypoint certbot certbot certonly \
    --webroot -w /var/www/certbot \
    --cert-name "$DOMAIN" \
    "${domain_args[@]}" \
    --email "$EMAIL" \
    --agree-tos --no-eff-email --non-interactive \
    --keep-until-expiring \
    "${extra_args[@]}"

echo "### Activating certificate in nginx ..."
docker compose exec nginx sh -c '/docker-entrypoint.d/15-ssl-certs.sh && nginx -s reload'

echo "### Starting the renewal service ..."
docker compose up -d certbot

echo "Done. https://${DOMAIN} is now served with a Let's Encrypt certificate."
