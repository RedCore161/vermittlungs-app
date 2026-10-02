import re

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import RegexValidator
from django.db import models
from django.db.models.functions import Lower

USERNAME_MAX_LENGTH = 150

# No "@": anything containing "@" is treated as an e-mail address at login,
# so a username can never be mistaken for (or impersonate) an e-mail address.
username_validator = RegexValidator(
    r"^[\w.+-]+\Z",
    "Der Benutzername darf nur Buchstaben, Ziffern und die Zeichen . + - _ enthalten.",
)


def username_base_from_email(email):
    base = re.sub(r"[^\w.+-]", "", email.split("@")[0].lower())
    return base or "user"


class UserManager(BaseUserManager):
    use_in_migrations = True

    @staticmethod
    def normalize_email_address(email):
        return (email or "").strip().lower()

    def generate_username(self, email):
        """Derives a free username from the e-mail address (anna, anna1, anna2, ...)."""
        base = username_base_from_email(email)[: USERNAME_MAX_LENGTH - 6]
        candidate, suffix = base, 0
        while self.model._default_manager.filter(username__iexact=candidate).exists():
            suffix += 1
            candidate = f"{base}{suffix}"
        return candidate

    def _create_user(self, email, password, username=None, **extra_fields):
        email = self.normalize_email_address(email)
        if not email:
            raise ValueError("An e-mail address is required.")
        username = (username or "").strip() or self.generate_username(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if not extra_fields["is_staff"] or not extra_fields["is_superuser"]:
            raise ValueError("A superuser must have is_staff=True and is_superuser=True.")
        return self._create_user(email, password, **extra_fields)

    def get_by_natural_key(self, username):
        # Makes authenticate(email=...) case-insensitive.
        return self.get(email__iexact=username)


class User(AbstractUser):
    """Custom user that can log in with either its e-mail address or its username."""

    username = models.CharField(
        "Benutzername",
        max_length=USERNAME_MAX_LENGTH,
        unique=True,
        validators=[username_validator],
        help_text="Höchstens 150 Zeichen: Buchstaben, Ziffern und . + - _",
        error_messages={"unique": "Dieser Benutzername ist bereits vergeben."},
    )
    email = models.EmailField("E-Mail-Adresse", unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    objects = UserManager()

    class Meta:
        constraints = [
            models.UniqueConstraint(Lower("email"), name="accounts_user_email_ci_unique"),
            models.UniqueConstraint(Lower("username"), name="accounts_user_username_ci_unique"),
        ]

    def save(self, *args, **kwargs):
        self.email = UserManager.normalize_email_address(self.email)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.username or self.email
