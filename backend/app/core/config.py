"""
Application settings — loaded from environment variables / .env file.

PostgreSQL-only configuration. All database pool parameters are tunable
via environment for production scaling without code changes.
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    # --- Environment ---
    ENV: str = "development"
    DEBUG: bool = False

    # --- Database (PostgreSQL only) ---
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/homeopathy"

    # PostgreSQL connection pool tuning
    DB_POOL_SIZE: int = 20          # Persistent connections in the pool
    DB_MAX_OVERFLOW: int = 10       # Extra connections under spike load
    DB_POOL_TIMEOUT: int = 30       # Seconds to wait for a free connection
    DB_POOL_RECYCLE: int = 1800     # Recycle connections every 30 minutes

    # --- CORS ---
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # --- Server ---
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # --- JWT Authentication ---
    SECRET_KEY: str = "CHANGE-ME-IN-PRODUCTION-USE-openssl-rand-hex-32"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours for a doctor's workday

    # --- Logging ---
    LOG_LEVEL: str = "INFO"

    # --- Stripe ---
    STRIPE_SECRET_KEY: str = "sk_test_placeholder"
    STRIPE_WEBHOOK_SECRET: str = "whsec_placeholder"
    FRONTEND_URL: str = "http://localhost:3000"



    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
