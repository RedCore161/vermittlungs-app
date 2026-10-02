import pytest
from django.contrib.auth import authenticate, get_user_model

pytestmark = pytest.mark.django_db

User = get_user_model()
PASSWORD = "S3cure-pass!"


@pytest.fixture
def user():
    return User.objects.create_user(email="anna@example.com", username="anna", password=PASSWORD)


@pytest.mark.parametrize("identifier", ["anna@example.com", "ANNA@example.com", "anna", "Anna", "  anna  "])
def test_authenticate_with_email_or_username(user, identifier):
    assert authenticate(username=identifier, password=PASSWORD) == user


def test_authenticate_accepts_email_keyword(user):
    assert authenticate(email="anna@example.com", password=PASSWORD) == user


@pytest.mark.parametrize("identifier", ["", "bob", "bob@example.com"])
def test_authenticate_unknown_identifier(user, identifier):
    assert authenticate(username=identifier, password=PASSWORD) is None


def test_authenticate_wrong_password(user):
    assert authenticate(username="anna", password="wrong") is None


def test_authenticate_inactive_user(user):
    user.is_active = False
    user.save()

    assert authenticate(username="anna", password=PASSWORD) is None
