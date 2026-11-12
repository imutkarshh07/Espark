"""
Service-to-service authentication dependency.

Every RAG endpoint requires the Node backend to supply the shared
RAG_SERVICE_TOKEN in the X-Service-Token request header.
This prevents the Python service from being called by arbitrary callers
even though it is exposed on a public Render URL.

The token is intentionally NOT returned in any API response and must
never be forwarded to mobile or web clients.
"""
import logging
from fastapi import Header, HTTPException, status
from app.core.config import settings

logger = logging.getLogger(__name__)


def verify_service_token(x_service_token: str = Header(..., alias="x-service-token")) -> None:
    """
    FastAPI dependency: validates the shared service token supplied by the
    Node backend.  Raises HTTP 401 immediately if the token is absent,
    empty, or does not match the configured secret.
    """
    configured_token = settings.RAG_SERVICE_TOKEN

    # If no token is configured, the service is misconfigured – fail closed.
    if not configured_token:
        logger.error(
            "[ServiceAuth] RAG_SERVICE_TOKEN is not configured. "
            "Set it in Render environment variables."
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service authentication is not configured.",
        )

    if not x_service_token or x_service_token != configured_token:
        logger.warning("[ServiceAuth] Rejected request with invalid or missing service token.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing service authentication token.",
        )
