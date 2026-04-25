from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ai_provider: Literal["gemini", "kimi"] = Field(default="gemini")
    gemini_api_key: str | None = None
    moonshot_api_key: str | None = None
    db_url: str = Field(default="sqlite+aiosqlite:///.data/ai.db")
    log_level: str = Field(default="INFO")

    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    clip_max_seconds: int = Field(default=60)
    clip_min_seconds: int = Field(default=1)
    analyze_first_token_timeout_sec: int = Field(default=30)


settings = Settings()


def require_provider_key() -> str:
    """Return the API key for the currently selected provider, or raise with actionable hint."""
    if settings.ai_provider == "gemini":
        if not settings.gemini_api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. Get one at https://aistudio.google.com/apikey "
                "and add it to apps/ai-service/.env"
            )
        return settings.gemini_api_key
    if settings.ai_provider == "kimi":
        if not settings.moonshot_api_key:
            raise RuntimeError(
                "MOONSHOT_API_KEY is not set. Get one at https://platform.moonshot.ai/ "
                "and add it to apps/ai-service/.env"
            )
        return settings.moonshot_api_key
    raise RuntimeError(f"Unknown AI_PROVIDER: {settings.ai_provider}")
