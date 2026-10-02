#!/bin/sh
# Periodically re-links the certificates and reloads nginx so that renewed or
# newly issued Let's Encrypt certificates are picked up without a restart.
INTERVAL="${NGINX_RELOAD_INTERVAL:-6h}"

(
    while :; do
        sleep "$INTERVAL"
        /docker-entrypoint.d/15-ssl-certs.sh >/dev/null && nginx -s reload
    done
) &
