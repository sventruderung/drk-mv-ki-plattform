from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    log_level: str = "INFO"

    keycloak_url: str
    keycloak_public_url: str = "http://localhost:8080"
    keycloak_realm: str
    keycloak_client_id: str
    keycloak_client_secret: str

    postgres_host: str = "postgres"
    postgres_port: int = 5432
    postgres_db: str = "drk_platform"
    postgres_user: str = "drk_app"
    postgres_password: str = ""

    rag_service_url: str = "http://rag-service:8001"
    llm_service_url: str = "http://llm-service:8002"
    admin_service_url: str = "http://admin-service:8003"
    content_service_url: str = "http://content-service:8005"

    cors_origins: list[str] = ["http://localhost:3000"]
