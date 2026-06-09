# Infrastructure-Playbook — DRK MV KI-Plattform

> Erzeugt von `prep-to-rules` am 2026-06-09. Platzhalter werden bei /bootstrap + cloud-system-engineer-Skill befüllt.

## 1 · Hosting

| Parameter | Wert |
|---|---|
| Modell | On-Premise oder DSGVO-konforme Private Cloud |
| Datenstandort | Deutschland (kein Public Cloud Default) |
| Cloud-Anbieter | WEISS-ICH-NICHT — bei Bootstrap klären |
| Begründung | Zero-Data-Leak-Pflicht, DSGVO Art. 9, §35 SGB I |

**Constraints:**
- Keine Datenverarbeitung außerhalb Deutschlands ohne explizite Rechtsgrundlage
- Kein Einsatz von Public-Cloud-LLM-APIs (OpenAI, Azure OpenAI, Anthropic API) ohne Datenschutzgutachten
- Alle GPU-Ressourcen lokal oder in deutschem RZ

## 2 · Laufzeit / Container

| Parameter | Wert |
|---|---|
| Minimal | Docker + Docker Compose |
| Skalierung | Kubernetes (Empfehlung bei zentralem Betrieb ≥ 3 KV) |
| Basis-Images | WEISS-ICH-NICHT — bei Bootstrap: gehärtete Images bevorzugen |
| IaC-Standard | WEISS-ICH-NICHT — Terraform / Ansible empfohlen |

**Multi-Tenant-Anforderungen:**
- Strikte Namespace-Trennung pro Kreisverband in K8s
- Netzwerk-Policies verhindern cross-namespace Kommunikation
- Separate PersistentVolumes pro Tenant

## 3 · Secrets

| Parameter | Wert |
|---|---|
| System | WEISS-ICH-NICHT (Neubau) |
| Empfehlung | HashiCorp Vault (Self-Hosted) oder K8s Secrets + RBAC |
| Regeln | Kein Secret im Code, kein Secret in Git |

**Pflicht-Regeln (Governance: streng):**
- Secrets nie in `.env`-Dateien committen
- Separate Secrets pro Tenant
- Rotation-Plan dokumentieren

Sensible Pfade: [`.claude/sensitive-paths.json`](../sensitive-paths.json)

## 4 · Netzwerk

WEISS-ICH-NICHT — hängt von DRK-IT ab. Bei erstem DRK-IT-Workshop klären:

- Erreichbarkeit der Endpunkte aus Ziel-Runtime
- VPN-Anforderungen
- Firewall-Freigaben (Vorlaufzeiten einplanen)
- Netzwerksegmentierung / DMZ

**Pflicht-Anforderungen aus Lastenheft:**
- HTTPS-only (TLS 1.2+)
- Kein unverschlüsselter Traffic
- Mandanten-Traffic logisch getrennt

## 5 · CI/CD

Status: out-of-scope (Neubau, kein System vorhanden)

Empfehlung für Bootstrap-Entscheidung:
- GitHub Actions (wenn GitHub als Repo-Plattform)
- Environments: Dev → Staging → Prod
- Quality Gates: Tests, Security-Scan (SAST), Dependency-Check
- Deployment-Freigabe: Manuelles Gate vor Prod (Vier-Augen-Prinzip)

## 6 · Checkliste Go-Live

Pflicht vor Go-Live (Abnahmekriterien aus Lastenheft §7):

- [ ] Dokumentierter Penetrationstest abgeschlossen
- [ ] Mandantentrennung vollständig getestet (kein cross-tenant Datenzugriff nachweisbar)
- [ ] DSGVO-Compliance-Nachweis (DPIA abgeschlossen, Verarbeitungsverzeichnis aktuell)
- [ ] ADV nach Art. 28 DSGVO unterzeichnet (DRK KV ↔ DRK LV MV ↔ ST Computer)
- [ ] Audit-Log aktiv und getestet
- [ ] Zero-Prompt-Logging nachgewiesen
- [ ] EU AI Act Dokumentation vollständig (AI_SYSTEM.md)
- [ ] Time-to-First-Token < 2s unter Last gemessen
- [ ] Backup- und Recovery-Plan dokumentiert und getestet
- [ ] Monitoring aktiv (Alerts konfiguriert)
- [ ] DEVELOPER_ONBOARDING.md aktuell
- [ ] Rollback-Strategie definiert und getestet

Pilot-Rollout: Erst 1 Kreisverband, dann schrittweise weitere 14.
