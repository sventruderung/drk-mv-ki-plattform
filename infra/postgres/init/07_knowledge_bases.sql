-- DRK MV KI-Plattform — Mehrere benannte Wissensdatenbanken
-- Dokumente ohne Zuordnung (kb_id NULL) gelten als "Allgemein".

CREATE TABLE knowledge_bases (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   TEXT NOT NULL,
    name        TEXT NOT NULL,
    -- Zugriff rollenbasiert (§4.2): nur Nutzer mit einer dieser Gruppen
    -- sehen Inhalte dieser Wissensdatenbank (zusätzlich zur Dokument-ACL)
    acl_groups  TEXT[] NOT NULL DEFAULT '{kv-alle}',
    created_by  TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name)
);

ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON knowledge_bases
    USING (tenant_id = current_tenant_id());

ALTER TABLE documents
    ADD COLUMN kb_id UUID REFERENCES knowledge_bases (id) ON DELETE SET NULL;
CREATE INDEX idx_documents_kb ON documents (kb_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON knowledge_bases TO drk_app;
