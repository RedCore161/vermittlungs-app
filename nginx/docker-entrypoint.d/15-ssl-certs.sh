#!/bin/sh
# Points /etc/nginx/ssl/{fullchain,privkey}.pem to the Let's Encrypt
# certificate for $DOMAIN if it exists, otherwise to a self-signed
# certificate, so nginx can always start (and answer ACME challenges).
set -eu

DOMAIN="${DOMAIN:-localhost}"
SSL_DIR=/etc/nginx/ssl
LE_DIR="/etc/letsencrypt/live/${DOMAIN}"
SELF_DIR=/etc/nginx/ssl-selfsigned

mkdir -p "$SSL_DIR" "$SELF_DIR"

if [ -s "$LE_DIR/fullchain.pem" ] && [ -s "$LE_DIR/privkey.pem" ]; then
    SOURCE="$LE_DIR"
    echo "ssl-certs: using Let's Encrypt certificate for ${DOMAIN}"
else
    SOURCE="$SELF_DIR"
    if [ ! -s "$SELF_DIR/fullchain.pem" ]; then
        echo "ssl-certs: no Let's Encrypt certificate for ${DOMAIN} yet, creating a self-signed one"
        openssl req -x509 -nodes -newkey rsa:2048 -days 30 \
            -subj "/CN=${DOMAIN}" \
            -keyout "$SELF_DIR/privkey.pem" -out "$SELF_DIR/fullchain.pem" 2>/dev/null
    fi
fi

ln -sf "$SOURCE/fullchain.pem" "$SSL_DIR/fullchain.pem"
ln -sf "$SOURCE/privkey.pem" "$SSL_DIR/privkey.pem"
