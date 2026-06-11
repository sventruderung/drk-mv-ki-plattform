-- DRK MV KI-Plattform — Instanz-Einstellungen (global, nicht mandantenbezogen)
-- Aktuell: public_hostname für HTTPS (Caddy On-Demand-TLS fragt das Gateway).

CREATE TABLE system_settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by  TEXT
);

GRANT SELECT, INSERT, UPDATE ON system_settings TO drk_app;

INSERT INTO system_settings (key, value) VALUES ('public_hostname', '');
