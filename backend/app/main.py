from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.database import test_db_connection
from app.routers import health
import app.models  # noqa: F401 — register all models with Base.metadata


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    # Startup
    print("\n" + "=" * 60)
    print("  Blood Donor Management System — API Server")
    print("=" * 60)

    db_ok = test_db_connection()
    if db_ok:
        print("  ✅ Database connection: SUCCESS")
    else:
        print("  ⚠️  Database connection: FAILED")
        print("     The API will start but database features won't work.")
        print("     Check your DATABASE_URL in .env")

    print(f"  📡 CORS origins: {settings.cors_origins_list}")
    print(f"  🔐 JWT expiry: {settings.ACCESS_TOKEN_EXPIRE_MINUTES} minutes")
    print("  📖 Swagger UI: http://localhost:8000/docs")
    print("  📖 ReDoc: http://localhost:8000/redoc")
    print("=" * 60 + "\n")

    yield

    # Shutdown
    print("\nShutting down Blood Donor Management System...")


# Create FastAPI application
app = FastAPI(
    title="Blood Donor Management System",
    description="A full-stack application connecting blood donors with recipients and hospitals.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api")


@app.get("/", tags=["Root"])
def root():
    """Root endpoint."""
    return {
        "message": "Blood Donor Management System API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health",
    }
