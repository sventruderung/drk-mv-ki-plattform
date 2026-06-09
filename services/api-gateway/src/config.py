from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    log_level: str = "INFO"

    keycloak_url: str
    keycloak_realm: str
    keycloak_client_id: str
    keycloak_client_secret: str

    rag_service_url: str = "http://rag-service:8001"
    llm_service_url: str = "http://llm-service:8002"
    admin_service_url: str = "http://admin-service:8003"

    cors_origins: list[str] = ["http://localhost:3000"]
