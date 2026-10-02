import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


def test_health_endpoint_reports_ok():
    response = APIClient().get("/api/health/")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}
