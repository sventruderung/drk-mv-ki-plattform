from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    log_level: str = "INFO"
    ollama_base_url: str = "http://ollama:11434"
    ollama_default_model: str = "qwen2.5:32b"
