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

    gemini_use_vertex: bool = True
    gcp_project_id: str | None = None
    gcp_location: str = "europe-west4"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    gemini_live_model: str | None = None
    gemini_live_timeout_seconds: float = 12.0
    gemini_live_output_audio: bool = True
    gemini_live_voice_name: str | None = None


settings = Settings()
