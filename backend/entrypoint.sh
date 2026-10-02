#!/bin/sh
set -e

# Only the main application process runs migrations/collectstatic; one-off
# commands such as `pytest` or `python manage.py shell` skip them.
if [ "${DJANGO_RUN_MIGRATIONS:-true}" = "true" ] && { [ "$1" = "gunicorn" ] || [ "$2" = "runserver" ]; }; then
    python manage.py migrate --noinput
    python manage.py collectstatic --noinput
fi

exec "$@"
