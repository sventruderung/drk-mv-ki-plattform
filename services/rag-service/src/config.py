from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    log_level: str = "INFO"
    postgres_host: str = "postgres"
    postgres_port: int = 5432
    postgres_db: str
    postgres_user: str
    postgres_password: str
    ollama_base_url: str = "http://ollama:11434"

    # Embedding: nomic-embed-text → 768 Dimensionen (muss zu vector(768) im Schema passen)
    embedding_model: str = "nomic-embed-text"

    minio_endpoint: str = "minio:9000"
    minio_access_key: str
    minio_secret_key: str
    minio_bucket: str = "drk-docs"

    chunk_size: int = 1000          # Zeichen pro Chunk
    chunk_overlap: int = 200
    top_k: int = 3                  # Treffer pro RAG-Anfrage (mehr = bessere Abdeckung, langsameres TTFT)
