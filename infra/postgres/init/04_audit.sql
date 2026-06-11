-- DRK MV KI-Plattform — Revisionssicheres Audit-Log (§6.2 Lastenheft)
-- Protokolliert NUR administrative Aktionen (Upload, Löschung, Freigaben).
-- COMPLIANCE: Niemals Prompt-Inhalte oder Dokumenttexte — nur Metadaten.

CREATE TABLE audit_log (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    TEXT NOT NULL,
    actor        TEXT NOT NULL,             -- Keycloak user_id (sub)
    action       TEXT NOT NULL,             -- z.B. document.upload, draft.freigegeben
    object_type  TEXT NOT NULL,             -- document | draft
    object_id    TEXT NOT NULL,
    info         TEXT,                      -- Metadaten (Dateiname, Kanal, ACL) — keine Inhalte
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON audit_log
    USING (tenant_id = current_tenant_id());

CREATE INDEX idx_audit_tenant_time ON audit_log (tenant_id, created_at DESC);

-- Revisionssicher: Anwendung darf nur einfügen und lesen — kein UPDATE/DELETE
GRANT SELECT, INSERT ON audit_log TO drk_app;
