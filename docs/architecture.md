# Architektur-Übersicht — DRK MV KI-Plattform

> Wird auf GitHub automatisch als Diagramm gerendert.

```mermaid
flowchart TB
    subgraph KV["Nutzer-Ebene (15 DRK-Kreisverbände MV)"]
        KV1["KV Rostock"]
        KV2["KV Schwerin"]
        KV3["KV Neustrelitz"]
        KVN["... +12 weitere KV"]
    end

    UI["🖥️ Open WebUI\nChat · Dokument-Upload · Prompt-Templates"]

    GW["🔀 API-Gateway :8000\nJWT-Validierung · Tenant-Isolation · Routing · Streaming"]

    subgraph Services["Microservices"]
        RAG["📚 RAG-Service :8001\nDokument-Ingest · Embedding\nVektor-Suche · Zitierung"]
        LLM["🤖 LLM-Service :8002\nInferenz-Proxy · Streaming\nModell-Routing"]
        ADM["⚙️ Admin-Service :8003\nTenant-Verwaltung\nAudit-Log"]
    end

    subgraph Infra["Infrastruktur (On-Premise · Deutschland)"]
        PG[("🗄️ PostgreSQL 16\n+ pgvector\nRow-Level Security\nDSGVO Art. 9 · §35 SGB I")]
        OL["🦙 Ollama\nQwen2.5 32B Q4\nZero-Data-Leak\nkein ext. API"]
        KC["🔑 Keycloak 24\nOIDC · OAuth2\nActive Directory"]
        MN[("📦 MinIO\nDokument-Storage\nSzenario B/C")]
    end

    KV1 & KV2 & KV3 & KVN -->|"HTTPS"| UI
    UI -->|"REST · OIDC"| GW
    GW -->|"Route"| RAG
    GW -->|"Route"| LLM
    GW -->|"Route"| ADM
    RAG <-->|"pgvector-Suche\nRLS pro Tenant"| PG
    LLM <-->|"Inferenz\nStreaming"| OL
    ADM <-->|"Nutzer & Realms"| KC
    ADM <-->|"Audit-Einträge"| PG
    RAG <-->|"Dokumente"| MN

    style KV fill:#D6E4F0,stroke:#2E75B6
    style Services fill:#EAF2FB,stroke:#2E75B6
    style Infra fill:#F2F2F2,stroke:#888
    style PG fill:#fff,stroke:#2E75B6
    style OL fill:#fff,stroke:#2E75B6
    style KC fill:#fff,stroke:#2E75B6
    style MN fill:#fff,stroke:#aaa,stroke-dasharray:5 5
    style GW fill:#2E75B6,color:#fff
    style UI fill:#1F4E79,color:#fff
```

## Compliance-Hinweise

| Anforderung | Umsetzung |
|---|---|
| DSGVO Art. 9 / § 35 SGB I | PostgreSQL RLS — `tenant_id` in jeder Zeile, kein cross-tenant Zugriff möglich |
| Zero-Data-Leak | Alle LLMs und Embeddings laufen lokal in Ollama — kein externer API-Aufruf |
| Kein Prompt-Logging | LLM-Service loggt keine Nachrichteninhalte, nur Metadaten (tenant_id, Modell) |
| Audit-Log | Admin-Service protokolliert nur administrative Aktionen (Rechtevergabe, Tenant-Änderungen) |
| Mandantentrennung Auth | `tenant_id` kommt ausschließlich aus validierten JWT-Claims (Keycloak) |
