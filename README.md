# Vermittlungs-App

Web application with a Django REST backend, a React (Vite) frontend and a
PostgreSQL database, all running in Docker Compose behind an nginx reverse
proxy with automatic Let's Encrypt HTTPS certificates.

**Features so far**

- Registration, login and logout with e-mail address and password (session cookies + CSRF protection)
- Protected "Mein Konto" (my account) page
- Landing page with an interactive map of Germany ([Leaflet](https://leafletjs.com/) + [OpenStreetMap](https://www.openstreetmap.org/))
- Django admin at `/admin/`
- Health check at `/api/health/`
- Test suites for backend (pytest) and frontend (Vitest + Testing Library), plus CI

The user interface is in German.

---

## Contents

1. [Architecture](#architecture)
2. [Prerequisites](#prerequisites)
3. [Quick start (development)](#quick-start-development)
4. [Configuration](#configuration)
5. [Production deployment with HTTPS](#production-deployment-with-https)
6. [Testing and the TDD workflow](#testing-and-the-tdd-workflow)
7. [API reference](#api-reference)
8. [Project structure](#project-structure)
9. [Common tasks](#common-tasks)
10. [Troubleshooting](#troubleshooting)

---

## Architecture

```
                    ┌────────────────────────── docker compose ───────────────────────────┐
                    │                                                                     │
 Browser ──80/443──▶│  nginx ──/api/, /admin/──▶ backend (Django + gunicorn) ──▶ db (Postgres)
                    │   │  ├── /static/   ─▶ Django static files (shared volume)          │
                    │   │  ├── /          ─▶ React build (bundled into the nginx image)   │
                    │   │  └── /.well-known/acme-challenge/ ─▶ certbot webroot            │
                    │   │                                                                 │
                    │   └── reads certificates ◀── certbot (renews every 12 h)            │
                    └─────────────────────────────────────────────────────────────────────┘
```

| Service    | Image / build              | Purpose                                                                     |
|------------|----------------------------|-----------------------------------------------------------------------------|
| `db`       | `postgres:17-alpine`       | Database; data stored in the `postgres_data` volume                         |
| `backend`  | `./backend`                | Django 6.1 + Django REST Framework, served by gunicorn on port 8000 (internal only) |
| `nginx`    | `./nginx` (multi-stage)    | Builds the React app and serves it; reverse proxy for Django; TLS termination |
| `certbot`  | `certbot/certbot`          | Issues and renews Let's Encrypt certificates (webroot method)               |
| `frontend` | `node:24-alpine` (dev only)| Vite dev server with hot reload                                             |

**Why one origin?** nginx serves the frontend and the API from the same domain,
so authentication uses Django's secure, `HttpOnly` session cookie. No tokens are
stored in the browser and no CORS configuration is required.

**Authentication flow**

1. The SPA calls `GET /api/auth/csrf/`, which sets the `csrftoken` cookie.
2. Every `POST` sends that value in the `X-CSRFToken` header.
3. Login and registration create a Django session (`sessionid` cookie, `HttpOnly`).
4. `GET /api/auth/me/` tells the SPA who is logged in (403 when anonymous).

Login and registration are rate-limited per client IP (`AUTH_THROTTLE_RATE`).

---

## Prerequisites

- Docker Engine 24+ with the Compose plugin (`docker compose version`)
- For production: a Linux server with a public IP, a domain whose DNS `A`/`AAAA`
  record points to that server, and ports **80** and **443** open
- Optional, for running tests without Docker: Python 3.13 and Node.js 24

---

## Quick start (development)

```bash
cp .env.example .env
# Set at least POSTGRES_PASSWORD and DJANGO_SECRET_KEY in .env (see Configuration)

docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Then open **http://localhost:8080**.

The development override (`docker-compose.dev.yml`):

- runs Django with `runserver` and auto-reload; `./backend` is mounted into the container
- runs the Vite dev server with hot module replacement; `./frontend` is mounted
- serves everything through nginx over plain HTTP on `DEV_HTTP_PORT` (default 8080)
- exposes Postgres on `localhost:POSTGRES_HOST_PORT` (default 5432)
- turns on `DJANGO_DEBUG` and disables the `Secure` cookie flag
- disables certbot

Create an admin account for `/admin/`:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec backend python manage.py createsuperuser
```

> **Tip:** To avoid typing both file names, set
> `COMPOSE_FILE=docker-compose.yml:docker-compose.dev.yml` in your shell
> (on Windows use `;` as the separator). After that, `docker compose up` uses the dev setup.
> The examples below write `docker compose` and assume you have done this for development.

---

## Configuration

All settings are environment variables in `.env` (template: [.env.example](.env.example)).
`.env` contains secrets and is ignored by git. Never commit it.

### Domain and HTTPS

| Variable              | Default (example)    | Description |
|-----------------------|----------------------|-------------|
| `DOMAIN`              | `example.com`        | Public domain. Used for the certificate and by nginx to locate it. |
| `DOMAIN_ALIASES`      | *(empty)*            | Extra names for the same certificate, comma-separated (e.g. `www.example.com`). |
| `LETSENCRYPT_EMAIL`   | `admin@example.com`  | Address Let's Encrypt sends expiry notices to. |
| `LETSENCRYPT_STAGING` | `0`                  | `1` = use the Let's Encrypt staging CA for test runs (untrusted certificates, much higher rate limits). |
| `HTTP_PORT`           | `80`                 | Host port for HTTP in production. |
| `HTTPS_PORT`          | `443`                | Host port for HTTPS in production. |
| `DEV_HTTP_PORT`       | `8080`               | Host port of the development stack. |

### PostgreSQL

| Variable             | Default        | Description |
|----------------------|----------------|-------------|
| `POSTGRES_DB`        | `vermittlung`  | Database name |
| `POSTGRES_USER`      | `vermittlung`  | Database user |
| `POSTGRES_PASSWORD`  | `change-me`    | **Change this.** Generate one with `openssl rand -base64 32`. |
| `POSTGRES_HOST_PORT` | `5432`         | Host port Postgres is published on (development only) |

`POSTGRES_HOST` and `POSTGRES_PORT` default to `db` and `5432`. Override them only
when Django runs outside Docker.

### Django

| Variable                      | Default                                   | Description |
|-------------------------------|-------------------------------------------|-------------|
| `DJANGO_SECRET_KEY`           | –                                         | **Required, keep it secret.** Generate: `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `DJANGO_DEBUG`                | `false`                                   | Never set `true` in production. |
| `DJANGO_ALLOWED_HOSTS`        | `localhost,127.0.0.1`                     | Comma-separated host names Django answers for. Must include `DOMAIN` (and its aliases). |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | `http://localhost:8080,https://localhost` | Comma-separated origins (`https://example.com`) allowed to send unsafe requests. |
| `DJANGO_SECURE_COOKIES`       | `true` unless `DEBUG`                     | Adds the `Secure` flag to the session and CSRF cookies. |
| `DJANGO_LOG_LEVEL`            | `INFO`                                    | Root log level |
| `DJANGO_LANGUAGE_CODE`        | `de-de`                                   | Language for validation messages and the admin |
| `DJANGO_TIME_ZONE`            | `Europe/Berlin`                           | Time zone |
| `DJANGO_RUN_MIGRATIONS`       | `true`                                    | Run `migrate` and `collectstatic` when the container starts. |
| `AUTH_THROTTLE_RATE`          | `10/min`                                  | Login and registration attempts allowed per client IP (`N/sec`, `N/min`, `N/hour`, `N/day`). |
| `NUM_PROXIES`                 | `1`                                       | Number of reverse proxies in front of Django. Used to read the client IP from `X-Forwarded-For`. Increase it if you add a load balancer or CDN. |

### Frontend (build time)

These values are compiled into the JavaScript bundle. After changing them, rebuild
the image with `docker compose build nginx`.

| Variable               | Default                                          | Description |
|------------------------|--------------------------------------------------|-------------|
| `VITE_MAP_TILE_URL`    | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | Tile server URL template |
| `VITE_MAP_ATTRIBUTION` | OpenStreetMap contributors (HTML)                | Attribution shown on the map. Your tile provider's licence requires it. |

> **About the map tiles:** the public OpenStreetMap tile servers are run by
> volunteers. Their [Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)
> allows light use only. For production traffic, use your own tile server or an
> OSM-based provider (for example MapTiler, Stadia Maps or Thunderforest) and set
> the two variables above. The Content Security Policy already allows images from
> any HTTPS host.

---

## Production deployment with HTTPS

### 1. Prepare the server

Install Docker. Point the DNS of `DOMAIN` and every entry in `DOMAIN_ALIASES` to
the server. Open ports 80 and 443.

### 2. Configure

```bash
git clone git@github.com:RedCore161/vermittlungs-app.git
cd vermittlungs-app
cp .env.example .env
nano .env
```

Set at least the following:

```dotenv
DOMAIN=example.com
DOMAIN_ALIASES=www.example.com
LETSENCRYPT_EMAIL=you@example.com
LETSENCRYPT_STAGING=1                 # do a test run first, see step 3
POSTGRES_PASSWORD=<random>
DJANGO_SECRET_KEY=<random>
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=example.com,www.example.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://example.com,https://www.example.com
```

### 3. Start the stack and request the certificate

```bash
docker compose up -d --build
./scripts/init-letsencrypt.sh
```

Each step explained:

- **Self-signed fallback.** Until a real certificate exists, nginx starts with a
  temporary self-signed one (`nginx/docker-entrypoint.d/15-ssl-certs.sh`), so it can
  always come up and answer the ACME challenge on port 80.
- **Certificate request.** `init-letsencrypt.sh` asks certbot for a certificate for
  `DOMAIN` plus `DOMAIN_ALIASES`, using the HTTP-01 webroot challenge.
- **Switch-over.** The script then points nginx at the new certificate and reloads it.
  No downtime is needed.
- **Renewal.** The `certbot` container tries to renew twice a day. nginx re-links
  and reloads its certificates every 6 hours (`40-reload-loop.sh`), so renewals
  take effect automatically.

If the staging run succeeds, switch to real certificates:

```bash
sed -i 's/^LETSENCRYPT_STAGING=.*/LETSENCRYPT_STAGING=0/' .env
./scripts/init-letsencrypt.sh --force
```

### 4. Create an admin user

```bash
docker compose exec backend python manage.py createsuperuser
```

### 5. Deploy updates

```bash
git pull
docker compose up -d --build
```

Database migrations and `collectstatic` run automatically when the backend
container starts.

### Security measures already in place

- All HTTP traffic is redirected to HTTPS. HSTS is enabled for one year.
- Only TLS 1.2 and 1.3 are accepted.
- Session and CSRF cookies have the `Secure` flag. The session cookie is also `HttpOnly`. Both use `SameSite=Lax`.
- Login and registration are protected against CSRF (including login CSRF) and rate-limited.
- Django's password validators apply: at least 8 characters, not a common password, not entirely numeric, not too similar to the user's details.
- Responses carry a Content Security Policy plus `X-Frame-Options: DENY`, `nosniff` and `Referrer-Policy` headers.
- Containers run as non-root (the backend runs as the `app` user). Only nginx publishes ports.

---

## Testing and the TDD workflow

This project is developed **test-first**:

1. **Red:** write a test that describes the new behaviour and watch it fail.
2. **Green:** write the smallest amount of code that makes it pass.
3. **Refactor:** clean up while the tests stay green.

Every feature in this repository started as a failing test. One example: the
rate-limit test found that `throttle_scope` had no effect until
`ScopedRateThrottle` was enabled.

### Backend (pytest + pytest-django)

Tests run against a real PostgreSQL database. pytest-django creates and drops the
`test_<POSTGRES_DB>` database for each run.

```bash
# development stack running:
docker compose exec backend pytest

# or as a one-off container:
docker compose run --rm backend pytest
docker compose run --rm backend pytest accounts/tests/test_auth_api.py -k login -v
```

| Test file                              | Covers |
|----------------------------------------|--------|
| `accounts/tests/test_models.py`        | Custom user model: e-mail as login, lower-casing, superuser |
| `accounts/tests/test_auth_api.py`      | CSRF, registration, login, logout, `/me`, rate limiting |
| `core/tests/test_health.py`            | Health endpoint |
| `core/tests/test_migrations.py`        | Fails when a model changed but no migration was created |

### Frontend (Vitest + React Testing Library)

```bash
cd frontend
npm install
npm test             # single run
npm run test:watch   # watch mode while developing
npm run build        # type check + production build
```

Or in Docker: `docker compose run --rm frontend npm test`.

| Test file                               | Covers |
|-----------------------------------------|--------|
| `src/api/client.test.ts`                | CSRF handling, error mapping, fetch calls |
| `src/config.test.ts`                    | Map tile configuration and defaults |
| `src/components/GermanyMap.test.tsx`    | Map bounds cover all of Germany; Leaflet renders with OSM attribution |
| `src/App.test.tsx`                      | Landing page, navigation state, logout, protected route, 404 |
| `src/pages/LoginPage.test.tsx`          | Login success/failure, redirect back to the requested page |
| `src/pages/RegisterPage.test.tsx`       | Registration, password confirmation, server field errors |

Page tests stub the API with `mockApi()` and render the real router through
`renderApp()` (see `src/test/utils.tsx`).

### Continuous integration

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on every push to `main`
and on every pull request. It runs the backend tests against a Postgres service
container, runs the frontend tests and production build, and builds all Docker images.

---

## API reference

All endpoints are under `/api/`. Request and response bodies are JSON.
Unsafe methods (`POST`, …) require the `X-CSRFToken` header.

| Method | Path                   | Auth | Description |
|--------|------------------------|------|-------------|
| GET    | `/api/health/`         | –    | `{"status":"ok","database":"ok"}`. Returns 503 if the database is unavailable. |
| GET    | `/api/auth/csrf/`      | –    | Sets the `csrftoken` cookie. |
| POST   | `/api/auth/register/`  | –    | Body: `email`, `password`, optional `first_name`, `last_name`. Returns 201 with the user and logs them in. |
| POST   | `/api/auth/login/`     | –    | Body: `email`, `password`. Returns 200 with the user. Returns 400 for wrong credentials. |
| POST   | `/api/auth/logout/`    | yes  | Returns 204. |
| GET    | `/api/auth/me/`        | yes  | The current user. Returns 403 when not logged in. |

User object: `{ "id": 1, "email": "anna@example.com", "first_name": "Anna", "last_name": "Schmidt" }`

Validation errors (status 400) map each field name to a list of messages, for
example `{"email": ["…"]}`. General errors use the key `non_field_errors`.

---

## Project structure

```
.
├── docker-compose.yml          # production stack
├── docker-compose.dev.yml      # development override
├── .env.example                # all configuration parameters
├── scripts/
│   └── init-letsencrypt.sh     # requests the initial certificate
├── backend/                    # Django project
│   ├── config/                 # settings, urls, wsgi
│   ├── accounts/               # custom user model + auth API (+ tests/)
│   ├── core/                   # health check (+ tests/)
│   ├── Dockerfile, entrypoint.sh
│   └── requirements*.txt, pytest.ini, conftest.py
├── frontend/                   # React + Vite + TypeScript
│   └── src/
│       ├── api/                # API client (CSRF, errors)
│       ├── auth/               # AuthContext (session state)
│       ├── components/         # Layout, GermanyMap, FormField, ProtectedRoute
│       ├── pages/              # Landing, Login, Register, Account, NotFound
│       └── test/               # test setup and helpers
├── nginx/
│   ├── Dockerfile              # builds the frontend, then nginx image
│   ├── templates/              # production config (HTTPS)
│   ├── templates-dev/          # development config (HTTP, Vite proxy)
│   ├── snippets/               # shared proxy settings
│   └── docker-entrypoint.d/    # certificate selection + reload loop
└── .github/workflows/ci.yml
```

---

## Common tasks

```bash
# Logs
docker compose logs -f backend nginx

# Django management commands
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py shell

# Database shell
docker compose exec db psql -U "$POSTGRES_USER" "$POSTGRES_DB"

# Back up and restore the database
docker compose exec -T db pg_dump -U vermittlung vermittlung > backup.sql
docker compose exec -T db psql -U vermittlung vermittlung < backup.sql

# Add a frontend dependency (then rebuild/restart)
cd frontend && npm install <package>

# Show certificate status
docker compose run --rm --entrypoint certbot certbot certificates

# Stop everything (volumes keep the data); add -v to also DELETE all data
docker compose down
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Browser warns about the certificate | No Let's Encrypt certificate has been issued yet, or it came from staging. Run `./scripts/init-letsencrypt.sh` (add `--force` after switching off staging). Check with `docker compose logs nginx \| grep ssl-certs`. |
| certbot fails with `Connection refused` or `Timeout during connect` | Port 80 cannot be reached from the internet, or DNS points to the wrong server. Test with `curl http://<domain>/.well-known/acme-challenge/test` from another machine (a 404 from nginx is fine). |
| `too many certificates already issued` | You hit the Let's Encrypt rate limit. Use `LETSENCRYPT_STAGING=1` while testing. |
| Login returns `403 CSRF verification failed` | Add the exact origin you use (scheme + host + port) to `DJANGO_CSRF_TRUSTED_ORIGINS`, and make sure the host is in `DJANGO_ALLOWED_HOSTS`. |
| `400 Bad Request` on every page | The host name is missing from `DJANGO_ALLOWED_HOSTS`. |
| Map stays grey | The browser cannot reach the tile server, or a custom `VITE_MAP_TILE_URL` is wrong. Check the network tab. After changing the URL, rebuild: `docker compose build nginx`. |
| Windows: `sh: C:/Program Files/...: not found` | Git Bash rewrites container paths. Run `export MSYS_NO_PATHCONV=1` first. The init script already does this. |
| Windows: `entrypoint.sh: not found` in the backend | The shell script was checked out with CRLF line endings. `.gitattributes` forces LF. Re-checkout with `git rm --cached -r . && git reset --hard`. |
