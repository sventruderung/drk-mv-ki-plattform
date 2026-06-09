# CONVENTIONS.md — DRK MV KI-Plattform

> Governance-Modus, aktive Gates, Story- und Spec-Konventionen.
> Erzeugt von `prep-to-rules` am 2026-06-09 — bei /bootstrap vervollständigen.

## Kern-Parameter

```yaml
backlog_adapter: github-issues
governance_mode: streng
documentation_ssot: repo-docs
execution_isolation: write-scope
```

## Governance-Strenge: streng

Folgende Gates sind aktiv:

- **Vier-Augen-Prinzip:** Jede Produktivänderung benötigt Review-Freigabe.
- **Pentest als Abnahmekriterium:** Go-Live ohne dokumentierten Pentest nicht erlaubt.
- **Audit-Trail:** Administrative Aktionen werden revisionssicher protokolliert.
- **Compliance-Review:** Änderungen an Datenhaltung, Auth, Mandantentrennung erfordern explizite Freigabe.
- **Kein Prompt-Logging:** Technisch und prozessual zu verhindern.

## Aktive Add-ons

```yaml
addons:
  - privacy        # DSGVO Art. 9, §35 SGB I, Sozialdaten
  - eu-ai-act      # KI-System + personenbezogene Daten → Dokumentationspflichten
```

## Backlog / Story-Format

Backlog-Tool: GitHub Issues (Repo wird bei /bootstrap angelegt)

Story-Format (Pflicht):
```
Als [Rolle] möchte ich [Ziel], damit [Mehrwert].
Akzeptanzkriterien:
- [ ] ...
Definition of Done:
- [ ] Tests vorhanden
- [ ] Kein Prompt-Logging eingebaut
- [ ] Mandantentrennung geprüft
- [ ] Compliance-Impact bewertet
```

## Dokumentation

```yaml
documentation_ssot: repo-docs
```

Alle Arch-Entscheidungen in `docs/adr/ADR-*.md`.
Compliance-Artefakte in `dpo/controls/`.
Runbooks in `docs/runbooks/`.

## Definition of Done (projektweite Gates)

Eine Story gilt als fertig, wenn:
1. Funktionalität implementiert und manuell getestet
2. Unit- und Integrationstests vorhanden (Coverage-Ziel: > 80 %)
3. Kein Prompt-Logging oder unbeabsichtigtes Daten-Leaking eingebaut
4. Mandantentrennung für den Änderungsbereich geprüft
5. Compliance-Impact bewertet (DSGVO Art. 9 / §35 SGB I relevant?)
6. Code-Review durchgeführt (Vier-Augen-Prinzip)
7. Dokumentation aktualisiert (Inline + Arch-Doc wenn nötig)

## Learning-Loop

- Sprint-Review: L1 (was lief gut), L2 (was verbessern), L3 (strukturelle Änderungen)
- Lessons in `journal/lessons/`.

## Versionierung

Semantic Versioning (MAJOR.MINOR.PATCH).
Tagging-Konvention: `v0.1.0`, `v0.2.0` etc.
Release-Notes in `CHANGELOG.md`.
