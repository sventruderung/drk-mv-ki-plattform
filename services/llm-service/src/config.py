from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    log_level: str = "INFO"
    ollama_base_url: str = "http://ollama:11434"
    # DGX Spark (128 GB Unified Memory): Qwen3 72B Q4 ≈ 42 GB, TTFT < 0,5 s
    ollama_default_model: str = "qwen3:72b"
