from io import StringIO

import pytest
from django.core.management import call_command

pytestmark = pytest.mark.django_db


def test_no_missing_migrations():
    """Fails if a model change was made without running `makemigrations`."""
    out = StringIO()
    try:
        call_command("makemigrations", "--check", "--dry-run", stdout=out, stderr=out)
    except SystemExit:  # pragma: no cover - only reached on failure
        pytest.fail(f"Missing migrations:\n{out.getvalue()}")
