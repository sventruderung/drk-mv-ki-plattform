-- DRK MV KI-Plattform — Monitoring: Statuswechsel-Ereignisse + Alarm-Konfig
-- Das Gateway prüft die Dienste minütlich; nur ZUSTANDSWECHSEL werden
-- gespeichert (ausgefallen/wiederhergestellt) — kein Dauerrauschen.

CREATE TABLE monitor_events (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    check_name  TEXT NOT NULL,
    ok          BOOLEAN NOT NULL,           -- false = ausgefallen, true = wiederhergestellt
    detail      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_monitor_events_time ON monitor_events (created_at DESC);
GRANT SELECT, INSERT ON monitor_events TO drk_app;

-- E-Mail-Alarm (Pflege über das Verwaltungs-UI)
INSERT INTO system_settings (key, value) VALUES
    ('smtp_host', ''),
    ('smtp_port', '587'),
    ('smtp_user', ''),
    ('smtp_password', ''),
    ('alert_email', ''),
    ('alerts_enabled', 'false');
