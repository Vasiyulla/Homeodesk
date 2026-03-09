from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./homeopathy.db"
    ENV: str = "development"

    model_config = {"env_file": ".env"}


settings = Settings()
