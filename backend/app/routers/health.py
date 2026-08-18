from fastapi import APIRouter
from datetime import datetime, timezone

from app.database.database import test_db_connection

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check():
    """Health check endpoint to verify the API and database are running."""
    db_status = test_db_connection()

    return {
        "status": "healthy" if db_status else "degraded",
        "api": "running",
        "database": "connected" if db_status else "disconnected",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0",
    }
