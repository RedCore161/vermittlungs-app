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


def test_create_user_with_username():
    user = User.objects.create_user(email="anna@example.com", username="anna_s", password="S3cure-pass!")

    assert user.username == "anna_s"


def test_create_user_without_username_derives_one_from_email():
    user = User.objects.create_user(email="Anna.Schmidt+news@example.com", password="S3cure-pass!")

    assert user.username == "anna.schmidt+news"


def test_derived_usernames_are_unique():
    User.objects.create_user(email="anna@example.com", password="S3cure-pass!")
    second = User.objects.create_user(email="anna@example.org", password="S3cure-pass!")
    third = User.objects.create_user(email="ANNA@example.net", password="S3cure-pass!")

    assert second.username == "anna1"
    assert third.username == "anna2"


def test_username_is_unique_case_insensitively():
    from django.db import IntegrityError

    User.objects.create_user(email="anna@example.com", username="anna", password="S3cure-pass!")

    with pytest.raises(IntegrityError):
        User.objects.create_user(email="other@example.com", username="ANNA", password="S3cure-pass!")
