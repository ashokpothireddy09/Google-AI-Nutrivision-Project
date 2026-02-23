from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "NutriVision Live Backend"
    log_level: str = "INFO"
    locale_country: str = "de"
    locale_language: str = "de"
    request_timeout_seconds: float = 5.0

    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"


settings = Settings()
