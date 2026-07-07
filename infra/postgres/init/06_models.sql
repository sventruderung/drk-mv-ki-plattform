-- DRK MV KI-Plattform — Modell-Katalog + Nutzer-Freigaben
-- COMPLIANCE: Externe Modelle (openai/anthropic) sind standardmäßig
-- deaktiviert. Aktivierung nur bewusst durch kv-admin (DSB-Freigabe!).
-- RAG und Social Media nutzen IMMER das lokale Modell — Dokumenteninhalte
-- verlassen das System unter keinen Umständen.

CREATE TABLE ai_models (
    id              TEXT PRIMARY KEY,            -- z.B. 'qwen3:32b', 'claude-sonnet-4-6'
    provider        TEXT NOT NULL,               -- local | openai | anthropic
    display_name    TEXT NOT NULL,
    enabled         BOOLEAN NOT NULL DEFAULT false,
    default_allowed BOOLEAN NOT NULL DEFAULT false,  -- für alle Nutzer freigegeben?
    CONSTRAINT valid_provider CHECK (provider IN ('local', 'openai', 'anthropic'))
);

-- Individuelle Freigaben (wenn nicht default_allowed)
CREATE TABLE user_model_access (
    user_id   TEXT NOT NULL,                     -- Keycloak user_id (sub)
    model_id  TEXT NOT NULL REFERENCES ai_models (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, model_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON ai_models, user_model_access TO drk_app;

-- Katalog: lokales Modell aktiv und für alle; externe deaktiviert
INSERT INTO ai_models (id, provider, display_name, enabled, default_allowed) VALUES
    ('qwen3:32b',          'local',     'Qwen3 32B (lokal)',                true,  true),
    ('mistral-small:24b',  'local',     'Mistral Small 24B (lokal)',        false, false),
    ('gpt-5.2',            'openai',    'GPT-5.2 (OpenAI, extern!)',        false, false),
    ('gpt-5-mini',         'openai',    'GPT-5 Mini (OpenAI, extern!)',     false, false),
    ('claude-opus-4-8',    'anthropic', 'Claude Opus 4.8 (extern!)',        false, false),
    ('claude-sonnet-4-6',  'anthropic', 'Claude Sonnet 4.6 (extern!)',      false, false),
    ('claude-haiku-4-5',   'anthropic', 'Claude Haiku 4.5 (extern!)',       false, false);

-- API-Keys (werden über das Verwaltungs-UI gesetzt, nie im Code/Git)
INSERT INTO system_settings (key, value) VALUES
    ('openai_api_key', ''),
    ('anthropic_api_key', '');
