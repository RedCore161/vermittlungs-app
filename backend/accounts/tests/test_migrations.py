import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor

pytestmark = pytest.mark.django_db(transaction=True)

BEFORE = [("accounts", "0001_initial")]
AFTER = [("accounts", "0002_user_username")]


def migrate(targets):
    executor = MigrationExecutor(connection)
    executor.loader.build_graph()
    executor.migrate(targets)
    return executor.loader.project_state(targets).apps


def test_existing_users_get_unique_usernames_from_their_email():
    old_apps = migrate(BEFORE)
    OldUser = old_apps.get_model("accounts", "User")
    for email in ["anna@example.com", "anna@example.org", "max.mustermann@example.com"]:
        OldUser.objects.create(email=email, password="!")

    new_apps = migrate(AFTER)
    NewUser = new_apps.get_model("accounts", "User")

    assert dict(NewUser.objects.values_list("email", "username")) == {
        "anna@example.com": "anna",
        "anna@example.org": "anna1",
        "max.mustermann@example.com": "max.mustermann",
    }
