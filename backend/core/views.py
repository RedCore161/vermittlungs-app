from django.db import connection
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    """Liveness/readiness probe used by monitoring and deployment checks."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            db_status = "ok"
        except Exception:
            db_status = "unavailable"
        healthy = db_status == "ok"
        return Response(
            {"status": "ok" if healthy else "error", "database": db_status},
            status=status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE,
        )
