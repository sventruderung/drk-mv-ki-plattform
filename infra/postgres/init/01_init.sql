-- DRK MV KI-Plattform — PostgreSQL Initialisierung
-- TENANT-ISOLATION: Row-Level Security für alle Tabellen mit tenant_id Pflicht

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Anwendungsbenutzer mit eingeschränkten Rechten
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'drk_app') THEN
    CREATE ROLE drk_app LOGIN PASSWORD 'CHANGE_IN_ENV';
  END IF;
END $$;

GRANT CONNECT ON DATABASE drk_platform TO drk_app;
GRANT USAGE ON SCHEMA public TO drk_app;

-- Hilfsfunktion: aktuellen Tenant aus Session-Variable lesen
-- TENANT-ISOLATION: tenant_id wird per SET LOCAL am Anfang jeder Transaktion gesetzt
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS TEXT AS $$
  SELECT current_setting('app.tenant_id', true);
$$ LANGUAGE sql STABLE;
