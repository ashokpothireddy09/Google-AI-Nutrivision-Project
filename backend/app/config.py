from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "NutriVision Live Backend"
    log_level: str = "INFO"
    locale_country: str = "de"
    locale_language: str = "de"
    request_timeout_seconds: float = 5.0
    cache_ttl_seconds: int = 300
    off_user_agent: str = "NutriVisionLive/0.1 (contact: hackathon@nutrivision.local)"

    gemini_use_vertex: bool = False
    gcp_project_id: str | None = None
    gcp_location: str = "europe-west3"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"


settings = Settings()
