-- DRK MV KI-Plattform — Schema-Migrationen (idempotent)
--
-- Bringt eine BESTEHENDE Datenbank auf den aktuellen Stand. Beliebig oft
-- ausführbar: scripts/migrate.sh (nach jedem git pull empfohlen).
-- Neuinstallationen brauchen das nicht (infra/postgres/init/ deckt alles ab).

-- ── Wissensdatenbanken (Juni 2026) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_bases (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   TEXT NOT NULL,
    name        TEXT NOT NULL,
    acl_groups  TEXT[] NOT NULL DEFAULT '{kv-alle}',
    created_by  TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name)
);
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_policies
                   WHERE tablename = 'knowledge_bases' AND policyname = 'tenant_isolation') THEN
        CREATE POLICY tenant_isolation ON knowledge_bases
            USING (tenant_id = current_tenant_id());
    END IF;
END $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON knowledge_bases TO drk_app;

ALTER TABLE knowledge_bases ADD COLUMN IF NOT EXISTS acl_groups TEXT[] NOT NULL DEFAULT '{kv-alle}';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS kb_id UUID REFERENCES knowledge_bases (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_documents_kb ON documents (kb_id);

-- ── Duplikat-Erkennung (Juni 2026) ──────────────────────────────────────────
ALTER TABLE documents ADD COLUMN IF NOT EXISTS content_sha256 TEXT;
CREATE INDEX IF NOT EXISTS idx_documents_hash ON documents (tenant_id, content_sha256);

-- ── Monitoring (Juni 2026) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS monitor_events (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    check_name  TEXT NOT NULL,
    ok          BOOLEAN NOT NULL,
    detail      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_monitor_events_time ON monitor_events (created_at DESC);
GRANT SELECT, INSERT ON monitor_events TO drk_app;

INSERT INTO system_settings (key, value) VALUES
    ('smtp_host', ''), ('smtp_port', '587'), ('smtp_user', ''),
    ('smtp_password', ''), ('alert_email', ''), ('alerts_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- ── Basis-Schlüssel nachziehen (falls ältere Installation) ──────────────────
INSERT INTO system_settings (key, value) VALUES
    ('public_hostname', ''), ('openai_api_key', ''), ('anthropic_api_key', '')
ON CONFLICT (key) DO NOTHING;

INSERT INTO ai_models (id, provider, display_name, enabled, default_allowed) VALUES
    ('qwen3:32b', 'local', 'Qwen3 32B (lokal)', true, true),
    ('mistral-small:24b', 'local', 'Mistral Small 24B (lokal)', false, false)
ON CONFLICT (id) DO NOTHING;

-- ── Aktuellste/ökonomischste externe Modelle nachziehen ─────────────────────
-- COMPLIANCE: bleiben deaktiviert; Aktivierung nur bewusst durch kv-admin
-- (DSB-Freigabe). Bestehende Zeilen werden NICHT verändert (DO NOTHING).
INSERT INTO ai_models (id, provider, display_name, enabled, default_allowed) VALUES
    ('claude-sonnet-5', 'anthropic', 'Claude Sonnet 5 – neuestes (extern!)', false, false),
    ('gpt-5-nano', 'openai', 'GPT-5 Nano – günstigstes (OpenAI, extern!)', false, false)
ON CONFLICT (id) DO NOTHING;

-- ── Härtung: RLS auch für Tabellen-Eigentümer erzwingen ─────────────────────
-- (Wirkt nur, wenn drk_app KEIN Superuser ist — siehe Hinweis im Runbook;
--  für die Multi-Tenant-Phase relevant, im Mono-Betrieb unkritisch.)
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
ALTER TABLE document_chunks FORCE ROW LEVEL SECURITY;
ALTER TABLE content_drafts FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
ALTER TABLE knowledge_bases FORCE ROW LEVEL SECURITY;
