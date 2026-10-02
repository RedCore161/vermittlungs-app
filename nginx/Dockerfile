# --- Stage 1: build the React frontend ---------------------------------------
# The `frontend` build context is provided by docker-compose (additional_contexts).
FROM node:24-alpine AS frontend-build
WORKDIR /app

COPY --from=frontend package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy sources explicitly so a host node_modules folder never ends up in the image.
COPY --from=frontend index.html tsconfig.json vite.config.ts ./
COPY --from=frontend public ./public
COPY --from=frontend src ./src

ARG VITE_MAP_TILE_URL=
ARG VITE_MAP_ATTRIBUTION=
ENV VITE_MAP_TILE_URL=${VITE_MAP_TILE_URL} \
    VITE_MAP_ATTRIBUTION=${VITE_MAP_ATTRIBUTION}

RUN npm run build

# --- Stage 2: nginx serving the SPA and proxying the API ----------------------
FROM nginx:stable-alpine

# openssl is needed to create a temporary self-signed certificate until
# Let's Encrypt has issued the real one.
RUN apk add --no-cache openssl

COPY docker-entrypoint.d/ /docker-entrypoint.d/
RUN chmod +x /docker-entrypoint.d/15-ssl-certs.sh /docker-entrypoint.d/40-reload-loop.sh

COPY snippets/ /etc/nginx/snippets/
COPY templates/ /etc/nginx/templates/
COPY --from=frontend-build /app/dist /usr/share/nginx/html
