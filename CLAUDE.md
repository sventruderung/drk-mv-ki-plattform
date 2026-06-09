# CLAUDE.md — DRK MV KI-Plattform

> Projektweite Top-Regeln. Diese Datei ist Single Source of Truth für alles,
> was Claude Code (und das Team) bei jeder Entscheidung vorrangig beachten muss.
> Erzeugt von `prep-to-rules` am 2026-06-09 — bei /bootstrap befüllen.

## Projekt

- **Name:** DRK MV KI-Plattform
- **Slug:** `drk-mv-ki-plattform`
- **Version:** 0.1.0
- **Typ:** Kompletter Neubau — kein Fork von kvbrain
- **Intent:** Verwaltungs- und Fachkräfte der DRK-Kreisverbände MV erledigen Standarddokumente und interne Wissensabfragen in unter 5 Minuten, ohne dass Sozialdaten die Organisation verlassen. Detailiert in [`intents/INTENT-01.md`](intents/INTENT-01.md).
- **Auftraggeber:** DRK Landesverband Mecklenburg-Vorpommern e.V.
- **Dienstleister:** ST Computer GmbH (Sven Truderung, st@stc.de)

## Tech Stack

Stack wird bei /bootstrap festgelegt (WEISS-ICH-NICHT, Beratung gewünscht).

Orientierungspunkte aus dem Lastenheft:
- Python-Backend naheliegend (LLM-Ökosystem)
- OpenWebUI als UI-Referenz genannt
- Microservice-Architektur Pflicht (Lastenheft §5.2)
- API-First: alle Funktionen via REST

## Architektur

Wesentliche Constraints (aus Lastenheft + Compliance):

- **Multi-Tenancy strikt:** Physische oder logische DB-Trennung pro Kreisverband. Kein cross-tenant Datenzugriff.
- **Zero-Data-Leak:** Alle LLMs und Embedding-Modelle laufen lokal. Keine externen APIs ohne explizite Nutzerfreigabe.
- **RAG pro Tenant:** Isolierte Wissensdatenbanken pro Kreisverband. Dokument-ACL. Zitierungspflicht.
- **SSO/AD:** OpenID Connect / OAuth2 / Active Directory Integration.
- **Modular:** Module (Text, RAG, Social Media) sind unabhängig deploybar.
- **No-Code Prompt Management:** DRK-Admins erstellen Prompt-Templates selbst.

## Deployment

- **Hosting:** On-Premise oder DSGVO-konforme Private Cloud, ausschließlich Deutschland
- **Container:** Docker/Compose als Minimum; Kubernetes für Multi-Tenant-Skalierung
- **Datenstandort:** Deutschland (kein Public Cloud Default)
- Details in [`.claude/rules/infrastructure-playbook.md`](.claude/rules/infrastructure-playbook.md)

## Aktuelle Prioritäten

1. /bootstrap starten — liest diese Datei + `intake/PROJECT-INTAKE.md` als Onboarding
2. Repo anlegen (GitHub, wird bei Bootstrap abgefragt)
3. Stack-Entscheidung treffen (Bootstrap-Beratung)
4. Compliance-Artefakte erzeugen (dpo-Skill: DPIA, Verarbeitungsverzeichnis, AI_SYSTEM.md)

## Backlog-Adapter

`backlog_adapter: github-issues`
Repo-URL wird bei /bootstrap angelegt.

## Model-Routing

Alle LLMs lokal. Kein externer API-Aufruf ohne explizite Konfiguration.
Routing-Details nach Stack-Entscheidung bei Bootstrap festzulegen.

## Firmen- / Compliance-Kontext

**KRITISCH — immer beachten:**

- **DSGVO Art. 9:** Sozialdaten sind besondere Kategorien personenbezogener Daten. Verarbeitung nur mit expliziter Rechtsgrundlage.
- **§ 35 SGB I:** Sozialdatenschutz — besondere gesetzliche Geheimhaltungspflicht.
- **Kein Prompt-Logging:** Eingaben der Nutzer dürfen nicht gespeichert oder analysiert werden.
- **Audit-Log:** Nur administrative Aktionen (Rechtevergabe, Mandantenverwaltung) — kein Inhalt.
- **Pentest Pflicht:** Dokumentierter Penetrationstest vor Go-Live (Abnahmekriterium, Lastenheft §7).
- **EU AI Act:** KI-System mit Sozialdaten → Dokumentationspflichten, voraussichtlich Hochrisiko-Klassifikation.
- **ADV Art. 28 DSGVO:** Auftragsverarbeitungsvertrag zwischen DRK und ST Computer erforderlich.

Vollständiger Compliance-Kontext: [`docs/company-context.md`](docs/company-context.md)

---

## Versions-Historie

| Version | Datum | Änderung |
|---|---|---|
| 0.1.0 | 2026-06-09 | Initiale Erstellung durch prep-to-rules |
