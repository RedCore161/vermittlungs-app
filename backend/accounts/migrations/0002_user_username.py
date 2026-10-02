import re

import django.db.models.functions.text
from django.db import migrations, models

import accounts.models


def fill_usernames(apps, schema_editor):
    """Gives every existing user a unique username derived from the e-mail address."""
    User = apps.get_model("accounts", "User")
    taken = set()
    for user in User.objects.order_by("id"):
        base = re.sub(r"[^\w.+-]", "", user.email.split("@")[0].lower())[:144] or "user"
        candidate, suffix = base, 0
        while candidate in taken:
            suffix += 1
            candidate = f"{base}{suffix}"
        taken.add(candidate)
        user.username = candidate
        user.save(update_fields=["username"])


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="username",
            field=models.CharField(max_length=150, null=True),
        ),
        migrations.RunPython(fill_usernames, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="user",
            name="username",
            field=models.CharField(
                error_messages={"unique": "Dieser Benutzername ist bereits vergeben."},
                help_text="Höchstens 150 Zeichen: Buchstaben, Ziffern und . + - _",
                max_length=150,
                unique=True,
                validators=[accounts.models.username_validator],
                verbose_name="Benutzername",
            ),
        ),
        migrations.AddConstraint(
            model_name="user",
            constraint=models.UniqueConstraint(
                django.db.models.functions.text.Lower("username"), name="accounts_user_username_ci_unique"
            ),
        ),
    ]
