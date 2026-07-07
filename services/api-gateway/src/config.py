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
    connector_service_url: str = "http://connector-service:8004"
    ollama_base_url: str = "http://ollama:11434"
    ollama_default_model: str = "qwen3:32b"
    # Eigenes, kleineres Modell für den ELO-Tool-Ablauf (mehrere Generierungen je
    # Anfrage) — 32b ist dafür zu langsam. Tool-fähig sein muss es.
    ollama_elo_model: str = "qwen3:8b"
    # Embedding-Modell für die RAG-Suche (muss zum Index passen)
    embedding_model: str = "nomic-embed-text"
    minio_health_url: str = "http://minio:9000/minio/health/live"

    cors_origins: list[str] = ["http://localhost:3000"]
