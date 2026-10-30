from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    DATABASE_URL: str = "mysql+pymysql://root:root@localhost:3306/blood_donor_db"

    # JWT & Cryptographic HMAC Signing
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Secret Key Rotation Support (Active key in SECRET_KEY; past keys in PREVIOUS_SECRET_KEYS)
    PREVIOUS_SECRET_KEYS: str = ""

    @property
    def previous_secret_keys_list(self) -> List[str]:
        if not self.PREVIOUS_SECRET_KEYS:
            return []
        return [k.strip() for k in self.PREVIOUS_SECRET_KEYS.split(",") if k.strip()]

    # Security & Rate Limiting
    CERTIFICATE_VERIFY_RATE_LIMIT_PER_MINUTE: int = 60

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
