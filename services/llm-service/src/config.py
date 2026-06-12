from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    log_level: str = "INFO"
    ollama_base_url: str = "http://ollama:11434"
    postgres_host: str = "postgres"
    postgres_port: int = 5432
    postgres_db: str = "drk_platform"
    postgres_user: str = "drk_app"
    postgres_password: str = ""
    # DGX Spark (128 GB Unified Memory): Qwen3 32B Q4 ≈ 20 GB, TTFT < 0,5 s
    ollama_default_model: str = "qwen3:32b"
