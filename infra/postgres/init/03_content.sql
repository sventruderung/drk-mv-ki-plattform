-- DRK MV KI-Plattform — P02 Social-Media-Modul: Content-Drafts
-- TENANT-ISOLATION: RLS wie bei allen Tabellen
-- Workflow (5 Stufen): entwurf → zur_freigabe → freigegeben → publiziert
--                                             ↘ abgelehnt → entwurf

CREATE TABLE content_drafts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       TEXT NOT NULL,
    channel         TEXT NOT NULL,                -- facebook | instagram | linkedin | webseite | newsletter
    topic           TEXT NOT NULL,                -- Stichpunkte/Rohdaten des Erstellers
    draft_text      TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'entwurf',
    created_by      TEXT NOT NULL,                -- Keycloak user_id (sub)
    reviewed_by     TEXT,
    review_comment  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_status CHECK (
        status IN ('entwurf', 'zur_freigabe', 'freigegeben', 'abgelehnt', 'publiziert')
    )
);

ALTER TABLE content_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON content_drafts
    USING (tenant_id = current_tenant_id());

CREATE INDEX idx_content_drafts_tenant ON content_drafts (tenant_id);
CREATE INDEX idx_content_drafts_status ON content_drafts (tenant_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON content_drafts TO drk_app;
