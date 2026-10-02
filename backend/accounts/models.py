from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.db.models.functions import Lower


class UserManager(BaseUserManager):
    use_in_migrations = True

    @staticmethod
    def normalize_email_address(email):
        return (email or "").strip().lower()

    def _create_user(self, email, password, **extra_fields):
        email = self.normalize_email_address(email)
        if not email:
            raise ValueError("An e-mail address is required.")
        user = self.model(email=email, **extra_fields)
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
    """Custom user that logs in with an e-mail address instead of a username."""

    username = None
    email = models.EmailField("E-Mail-Adresse", unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        constraints = [
            models.UniqueConstraint(Lower("email"), name="accounts_user_email_ci_unique"),
        ]

    def save(self, *args, **kwargs):
        self.email = UserManager.normalize_email_address(self.email)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.email
