import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db

User = get_user_model()

CSRF_URL = "/api/auth/csrf/"
REGISTER_URL = "/api/auth/register/"
LOGIN_URL = "/api/auth/login/"
LOGOUT_URL = "/api/auth/logout/"
ME_URL = "/api/auth/me/"

PASSWORD = "S3cure-pass!"


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def csrf_client():
    """A client that enforces CSRF like a real browser would."""
    client = APIClient(enforce_csrf_checks=True)
    response = client.get(CSRF_URL)
    assert response.status_code == 200
    client.credentials(HTTP_X_CSRFTOKEN=response.cookies["csrftoken"].value)
    return client


@pytest.fixture
def user():
    return User.objects.create_user(email="anna@example.com", username="anna", password=PASSWORD)


# --- CSRF -------------------------------------------------------------------


def test_csrf_endpoint_sets_cookie(client):
    response = client.get(CSRF_URL)

    assert response.status_code == 200
    assert "csrftoken" in response.cookies


def test_login_without_csrf_token_is_rejected(user):
    client = APIClient(enforce_csrf_checks=True)

    response = client.post(LOGIN_URL, {"identifier": user.email, "password": PASSWORD}, format="json")

    assert response.status_code == 403


def test_register_without_csrf_token_is_rejected():
    client = APIClient(enforce_csrf_checks=True)

    response = client.post(REGISTER_URL, {"email": "new@example.com", "username": "neu", "password": PASSWORD}, format="json")

    assert response.status_code == 403


# --- Registration -----------------------------------------------------------


def test_register_creates_user_and_logs_in(csrf_client):
    response = csrf_client.post(
        REGISTER_URL,
        {
            "email": "new@example.com",
            "username": "neu",
            "password": PASSWORD,
            "first_name": "Neu",
            "last_name": "Nutzer",
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.json() == {
        "id": response.json()["id"],
        "email": "new@example.com",
        "username": "neu",
        "first_name": "Neu",
        "last_name": "Nutzer",
    }
    assert "password" not in response.json()
    assert User.objects.get(email="new@example.com").check_password(PASSWORD)

    me = csrf_client.get(ME_URL)
    assert me.status_code == 200
    assert me.json()["email"] == "new@example.com"


def test_register_rejects_duplicate_email_case_insensitively(csrf_client, user):
    response = csrf_client.post(REGISTER_URL, {"email": "ANNA@example.com", "username": "anna2", "password": PASSWORD}, format="json")

    assert response.status_code == 400
    assert "email" in response.json()


def test_register_rejects_weak_password(csrf_client):
    response = csrf_client.post(REGISTER_URL, {"email": "new@example.com", "username": "neu", "password": "123"}, format="json")

    assert response.status_code == 400
    assert "password" in response.json()
    assert not User.objects.filter(email="new@example.com").exists()


def test_register_rejects_invalid_email(csrf_client):
    response = csrf_client.post(REGISTER_URL, {"email": "not-an-email", "username": "neu", "password": PASSWORD}, format="json")

    assert response.status_code == 400
    assert "email" in response.json()


def test_register_requires_username(csrf_client):
    response = csrf_client.post(REGISTER_URL, {"email": "new@example.com", "password": PASSWORD}, format="json")

    assert response.status_code == 400
    assert "username" in response.json()


def test_register_rejects_duplicate_username_case_insensitively(csrf_client, user):
    response = csrf_client.post(
        REGISTER_URL, {"email": "other@example.com", "username": "ANNA", "password": PASSWORD}, format="json"
    )

    assert response.status_code == 400
    assert "username" in response.json()


@pytest.mark.parametrize("username", ["anna@home", "with space", "x" * 151])
def test_register_rejects_invalid_username(csrf_client, username):
    response = csrf_client.post(
        REGISTER_URL, {"email": "new@example.com", "username": username, "password": PASSWORD}, format="json"
    )

    assert response.status_code == 400
    assert "username" in response.json()


# --- Login / logout ---------------------------------------------------------


def test_login_with_valid_credentials(csrf_client, user):
    response = csrf_client.post(LOGIN_URL, {"identifier": "anna@example.com", "password": PASSWORD}, format="json")

    assert response.status_code == 200
    assert response.json()["email"] == "anna@example.com"
    assert csrf_client.get(ME_URL).status_code == 200


def test_login_is_case_insensitive_for_email(csrf_client, user):
    response = csrf_client.post(LOGIN_URL, {"identifier": "Anna@Example.com", "password": PASSWORD}, format="json")

    assert response.status_code == 200


def test_login_with_username(csrf_client, user):
    response = csrf_client.post(LOGIN_URL, {"identifier": "anna", "password": PASSWORD}, format="json")

    assert response.status_code == 200
    assert response.json()["username"] == "anna"
    assert csrf_client.get(ME_URL).status_code == 200


def test_login_with_username_is_case_insensitive(csrf_client, user):
    response = csrf_client.post(LOGIN_URL, {"identifier": "ANNA", "password": PASSWORD}, format="json")

    assert response.status_code == 200


def test_login_with_unknown_identifier_fails(csrf_client, user):
    response = csrf_client.post(LOGIN_URL, {"identifier": "bob", "password": PASSWORD}, format="json")

    assert response.status_code == 400


@pytest.mark.parametrize("identifier", ["anna@example.com", "anna"])
def test_login_with_wrong_password_fails(csrf_client, user, identifier):
    response = csrf_client.post(LOGIN_URL, {"identifier": identifier, "password": "wrong"}, format="json")

    assert response.status_code == 400
    assert csrf_client.get(ME_URL).status_code == 403


def test_login_with_inactive_user_fails(csrf_client, user):
    user.is_active = False
    user.save()

    response = csrf_client.post(LOGIN_URL, {"identifier": "anna@example.com", "password": PASSWORD}, format="json")

    assert response.status_code == 400


def test_logout_ends_session(csrf_client, user):
    csrf_client.post(LOGIN_URL, {"identifier": "anna@example.com", "password": PASSWORD}, format="json")
    # Django rotates the CSRF token on login, so refresh it like the frontend does.
    csrf_client.credentials(HTTP_X_CSRFTOKEN=csrf_client.cookies["csrftoken"].value)

    response = csrf_client.post(LOGOUT_URL)

    assert response.status_code == 204
    assert csrf_client.get(ME_URL).status_code == 403


def test_me_requires_authentication(client):
    assert client.get(ME_URL).status_code == 403


# --- Throttling -------------------------------------------------------------


def test_login_is_rate_limited(client, user, monkeypatch):
    from rest_framework.throttling import ScopedRateThrottle

    monkeypatch.setattr(ScopedRateThrottle, "THROTTLE_RATES", {"auth": "3/min"})

    statuses = [
        client.post(LOGIN_URL, {"identifier": "anna@example.com", "password": "wrong"}, format="json").status_code
        for _ in range(4)
    ]

    assert statuses == [400, 400, 400, 429]
