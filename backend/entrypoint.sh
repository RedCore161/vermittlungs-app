#!/bin/sh
set -e

# Only the application server (gunicorn or `manage.py runserver`) runs
# migrations/collectstatic; one-off commands such as `pytest` or
# `python manage.py shell` skip them.
is_app_server() {
    case " $* " in
        " gunicorn "*|*" runserver "*) return 0 ;;
        *) return 1 ;;
    esac
}

if [ "${DJANGO_RUN_MIGRATIONS:-true}" = "true" ] && is_app_server "$@"; then
    python manage.py migrate --noinput
    python manage.py collectstatic --noinput
fi

exec "$@"
