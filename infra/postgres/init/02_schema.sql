-- DRK MV KI-Plattform — Dokumenten-Schema (RAG)
-- TENANT-ISOLATION: RLS auf allen Tabellen, tenant_id Pflicht
-- ACL (§4.2 Lastenheft): acl_groups steuert Leseberechtigung auf Dokumentebene

-- ---------------------------------------------------------------------------
-- Dokumente (Originale liegen in MinIO, hier nur Metadaten)
-- ---------------------------------------------------------------------------
CREATE TABLE documents (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     TEXT NOT NULL,
    name          TEXT NOT NULL,
    storage_key   TEXT NOT NULL,                 -- MinIO-Objekt-Key
    content_type  TEXT,
    size_bytes    BIGINT,
    -- ACL-Gruppen laut §4.2: z.B. kv-vorstand, kv-pflege, kv-rettungsdienst, kv-alle
    acl_groups    TEXT[] NOT NULL DEFAULT '{kv-alle}',
    uploaded_by   TEXT NOT NULL,                 -- Keycloak user_id (sub)
    content_sha256 TEXT,                         -- Duplikat-Erkennung beim Upload
    status        TEXT NOT NULL DEFAULT 'processing',  -- processing | ready | error
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON documents
    USING (tenant_id = current_tenant_id());

CREATE INDEX idx_documents_tenant ON documents (tenant_id);
CREATE INDEX idx_documents_hash ON documents (tenant_id, content_sha256);

-- ---------------------------------------------------------------------------
-- Chunks mit Embeddings (nomic-embed-text via Ollama → 768 Dimensionen)
-- acl_groups denormalisiert für rechtegeprüfte Vektorsuche in einem Query
-- ---------------------------------------------------------------------------
CREATE TABLE document_chunks (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id   UUID NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
    tenant_id     TEXT NOT NULL,
    chunk_index   INT NOT NULL,
    chunk_text    TEXT NOT NULL,
    page          INT,                           -- Quellseite für Zitationspflicht (§3.2)
    acl_groups    TEXT[] NOT NULL,
    embedding     vector(768) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON document_chunks
    USING (tenant_id = current_tenant_id());

CREATE INDEX idx_chunks_tenant ON document_chunks (tenant_id);
CREATE INDEX idx_chunks_document ON document_chunks (document_id);
-- HNSW: gute Recall/Latenz-Balance, kein Training nötig (anders als ivfflat)
CREATE INDEX idx_chunks_embedding ON document_chunks
    USING hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- Rechte für Anwendungsbenutzer (RLS greift, da drk_app nicht Tabellen-Owner ist)
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON documents, document_chunks TO drk_app;
