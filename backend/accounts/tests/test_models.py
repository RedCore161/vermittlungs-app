import pytest
from django.contrib.auth import get_user_model

pytestmark = pytest.mark.django_db

User = get_user_model()


def test_create_user_uses_email_as_identifier():
    user = User.objects.create_user(email="anna@example.com", password="S3cure-pass!")

    assert user.email == "anna@example.com"
    assert user.get_username() == "anna@example.com"
    assert user.check_password("S3cure-pass!")
    assert user.is_active
    assert not user.is_staff
    assert not user.is_superuser


def test_create_user_normalizes_email_to_lowercase():
    user = User.objects.create_user(email="Anna.Schmidt@Example.COM", password="S3cure-pass!")

    assert user.email == "anna.schmidt@example.com"


def test_create_user_requires_email():
    with pytest.raises(ValueError):
        User.objects.create_user(email="", password="S3cure-pass!")


def test_create_superuser_sets_flags():
    admin = User.objects.create_superuser(email="admin@example.com", password="S3cure-pass!")

    assert admin.is_staff
    assert admin.is_superuser


def test_email_is_unique_case_insensitively():
    User.objects.create_user(email="anna@example.com", password="S3cure-pass!")

    assert User.objects.filter(email__iexact="ANNA@example.com").count() == 1
