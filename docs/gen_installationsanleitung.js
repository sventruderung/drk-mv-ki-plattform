const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, Header, Footer, AlignmentType, HeadingLevel, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak,
  LevelFormat, NumberFormat, ExternalHyperlink
} = require('docx');
const fs = require('fs');
const path = require('path');

const RED = "CC0000";
const RED_LIGHT = "F9E5E5";
const GRAY_DARK = "404040";
const GRAY_MID = "666666";
const GRAY_LIGHT = "F5F5F5";
const BORDER_GRAY = "CCCCCC";
const GREEN = "1A7340";
const GREEN_LIGHT = "E8F5EE";
const BLUE = "1A4F8A";
const BLUE_LIGHT = "EBF2FA";
const ORANGE = "C75B00";
const ORANGE_LIGHT = "FEF3E8";
const YELLOW_LIGHT = "FFFBE6";

const PAGE_WIDTH = 11906;
const PAGE_MARGIN = 1134;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * PAGE_MARGIN;

const border = (color = BORDER_GRAY) => ({ style: BorderStyle.SINGLE, size: 1, color });
const borders = (color = BORDER_GRAY) => ({ top: border(color), bottom: border(color), left: border(color), right: border(color) });
const noBorders = () => {
  const nb = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  return { top: nb, bottom: nb, left: nb, right: nb };
};

function heading1(text, id) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore: true,
    children: [new TextRun({ text, font: "Arial", size: 28, bold: true, color: RED })]
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, font: "Arial", size: 24, bold: true, color: GRAY_DARK })]
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, font: "Arial", size: 22, bold: true, color: GRAY_MID })]
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text, font: "Arial", size: 20, color: GRAY_DARK, ...opts })]
  });
}

function bold(text) {
  return new TextRun({ text, font: "Arial", size: 20, bold: true, color: GRAY_DARK });
}

function code(text) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    indent: { left: 360 },
    children: [new TextRun({ text, font: "Courier New", size: 18, color: "1A1A1A" })]
  });
}

function codeBlock(lines) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: borders("888888"),
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            shading: { fill: "1E1E1E", type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 200, right: 200 },
            children: lines.map(l => new Paragraph({
              spacing: { before: 20, after: 20 },
              children: [new TextRun({ text: l, font: "Courier New", size: 18, color: "D4D4D4" })]
            }))
          })
        ]
      })
    ]
  });
}

function infoBox(title, lines, bg = BLUE_LIGHT, borderColor = BLUE) {
  const children = [];
  if (title) {
    children.push(new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [new TextRun({ text: title, font: "Arial", size: 20, bold: true, color: borderColor })]
    }));
  }
  for (const l of lines) {
    children.push(new Paragraph({
      spacing: { before: 40, after: 40 },
      children: [new TextRun({ text: l, font: "Arial", size: 19, color: GRAY_DARK })]
    }));
  }
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    rows: [new TableRow({ children: [new TableCell({
      borders: { top: border(borderColor), bottom: border(borderColor), left: { style: BorderStyle.SINGLE, size: 12, color: borderColor }, right: border(borderColor) },
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      shading: { fill: bg, type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 200, right: 200 },
      children
    })]})],
  });
}

function warningBox(title, lines) {
  return infoBox(title, lines, ORANGE_LIGHT, ORANGE);
}

function successBox(title, lines) {
  return infoBox(title, lines, GREEN_LIGHT, GREEN);
}

function checkBox(title, lines) {
  return infoBox(title, lines, YELLOW_LIGHT, "B8860B");
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, font: "Arial", size: 20, color: GRAY_DARK })]
  });
}

function numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "numbers", level },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 20, color: GRAY_DARK })]
  });
}

function spacer(before = 120, after = 120) {
  return new Paragraph({ spacing: { before, after }, children: [new TextRun("")] });
}

function simpleTable(headers, rows, colWidths) {
  const total = colWidths.reduce((a, b) => a + b, 0);
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => new TableCell({
      borders: borders(BORDER_GRAY),
      width: { size: colWidths[i], type: WidthType.DXA },
      shading: { fill: RED, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: h, font: "Arial", size: 19, bold: true, color: "FFFFFF" })] })]
    }))
  });
  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map((cell, ci) => new TableCell({
      borders: borders(BORDER_GRAY),
      width: { size: colWidths[ci], type: WidthType.DXA },
      shading: { fill: ri % 2 === 0 ? "FFFFFF" : GRAY_LIGHT, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: cell, font: "Arial", size: 19, color: GRAY_DARK })] })]
    }))
  }));
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: colWidths, rows: [headerRow, ...dataRows] });
}

function phaseHeader(num, title, duration, status) {
  const statusColor = status === "Vorbereitung" ? ORANGE : status === "Fertig" ? GREEN : BLUE;
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [500, CONTENT_WIDTH - 2200, 1000, 700],
    rows: [new TableRow({ children: [
      new TableCell({
        borders: borders(RED),
        width: { size: 500, type: WidthType.DXA },
        shading: { fill: RED, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 140, right: 140 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: num, font: "Arial", size: 28, bold: true, color: "FFFFFF" })] })]
      }),
      new TableCell({
        borders: borders(RED),
        width: { size: CONTENT_WIDTH - 2200, type: WidthType.DXA },
        shading: { fill: RED_LIGHT, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 160, right: 160 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: title, font: "Arial", size: 24, bold: true, color: RED })] })]
      }),
      new TableCell({
        borders: borders(RED),
        width: { size: 1000, type: WidthType.DXA },
        shading: { fill: RED_LIGHT, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: duration, font: "Arial", size: 18, color: GRAY_MID })] })]
      }),
      new TableCell({
        borders: borders(statusColor),
        width: { size: 700, type: WidthType.DXA },
        shading: { fill: status === "Vorbereitung" ? ORANGE_LIGHT : status === "Fertig" ? GREEN_LIGHT : BLUE_LIGHT, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 80, right: 80 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: status, font: "Arial", size: 17, bold: true, color: statusColor })] })]
      }),
    ]})],
  });
}

// ─── DOKUMENT ZUSAMMENBAUEN ───────────────────────────────────────────────────

const children = [];

// ── TITELSEITE ──────────────────────────────────────────────────────────────
children.push(spacer(2000, 0));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 0, after: 200 },
  children: [new TextRun({ text: "DRK MV KI-Plattform", font: "Arial", size: 52, bold: true, color: RED })]
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 0, after: 600 },
  children: [new TextRun({ text: "Installationsanleitung Mono-System", font: "Arial", size: 36, color: GRAY_DARK })]
}));

const titleTable = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: [Math.floor(CONTENT_WIDTH / 2), Math.ceil(CONTENT_WIDTH / 2)],
  rows: [
    ["Zielumgebung", "NVIDIA DGX Spark (PNY oder ASUS)"],
    ["Mandant", "Einzelner DRK-Kreisverband (Mono)"],
    ["Betriebssystem", "NVIDIA DGX OS (Ubuntu-basiert, ARM64)"],
    ["LLM", "Qwen3 72B via Ollama"],
    ["Stand", "Juni 2026"],
    ["Status", "Bereit zur Umsetzung"],
  ].map(([k, v], i) => new TableRow({ children: [
    new TableCell({
      borders: borders(BORDER_GRAY),
      width: { size: Math.floor(CONTENT_WIDTH / 2), type: WidthType.DXA },
      shading: { fill: i % 2 === 0 ? GRAY_LIGHT : "FFFFFF", type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 160, right: 160 },
      children: [new Paragraph({ children: [new TextRun({ text: k, font: "Arial", size: 20, bold: true, color: GRAY_DARK })] })]
    }),
    new TableCell({
      borders: borders(BORDER_GRAY),
      width: { size: Math.ceil(CONTENT_WIDTH / 2), type: WidthType.DXA },
      shading: { fill: i % 2 === 0 ? GRAY_LIGHT : "FFFFFF", type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 160, right: 160 },
      children: [new Paragraph({ children: [new TextRun({ text: v, font: "Arial", size: 20, color: GRAY_DARK })] })]
    }),
  ]}))
});
children.push(titleTable);
children.push(spacer(400, 0));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "DRK Landesverband Mecklenburg-Vorpommern e.V.", font: "Arial", size: 18, color: GRAY_MID })]
}));

// ── ÜBERBLICK ────────────────────────────────────────────────────────────────
children.push(heading1("1  Überblick und Voraussetzungen"));
children.push(para("Diese Anleitung beschreibt den vollständigen Weg von der leeren DGX Spark bis zum laufenden KI-System für einen DRK-Kreisverband — inklusive Transkription, RAG-Wissensbasis und Social-Media-Modul."));
children.push(spacer(80, 80));

children.push(heading2("1.1  Was entsteht"));
children.push(para("Das fertige System besteht aus folgenden laufenden Services:"));
children.push(spacer(60, 0));
children.push(simpleTable(
  ["Service", "Port", "Funktion"],
  [
    ["open-webui", "3000", "Benutzeroberfläche (Chat, Dokument-Upload, Prompt-Verwaltung)"],
    ["api-gateway", "8000", "Einheitlicher Eintrittspunkt, JWT-Prüfung, Routing"],
    ["rag-service", "8001", "Vektorsuche, Dokument-Chunking, ACL-geprüfte Antworten"],
    ["llm-service", "8002", "Ollama-Proxy, Streaming, Modell-Management"],
    ["content-service", "8005", "Social-Media-Entwürfe, Freigabe-Workflow (P02)"],
    ["postgres", "5432", "Datenbank + pgvector (Embeddings)"],
    ["keycloak", "8080", "Authentifizierung, Rollen, SSO/OIDC"],
    ["minio", "9000", "Objektspeicher (Dokumente, CI-Assets)"],
    ["ollama", "11434", "LLM-Engine (läuft nativ, nicht in Docker)"],
  ],
  [1800, 900, Math.floor(CONTENT_WIDTH - 2700)]
));
children.push(spacer(120, 60));

children.push(heading2("1.2  Hardware-Voraussetzungen"));
children.push(simpleTable(
  ["Komponente", "Anforderung", "Hinweis"],
  [
    ["Hardware", "NVIDIA DGX Spark (PNY oder ASUS)", "Beide Varianten identische Performance"],
    ["RAM", "128 GB LPDDR5X", "Unified Memory — kein separates VRAM-Limit"],
    ["SSD", "1 TB (ASUS) oder 4 TB (PNY)", "Für Qwen3 72B + OS + Daten reicht 1 TB"],
    ["Netzwerk", "Gigabit-LAN im KV-Netz", "Für SSH-Zugang und Nutzer-Browser-Zugriff"],
    ["Internetzugang", "Einmalig für Erstinstallation", "Ca. 50 GB Download (Modell + Docker-Images)"],
  ],
  [2000, 2500, Math.floor(CONTENT_WIDTH - 4500)]
));
children.push(spacer(120, 60));

children.push(heading2("1.3  Zeitplan auf einen Blick"));
children.push(simpleTable(
  ["Phase", "Inhalt", "Dauer", "Wer"],
  [
    ["0 — Hardware", "DGX Spark auspacken, Netz, SSH", "~2 Stunden", "IT-Betrieb KV"],
    ["1 — Basis", "Repo klonen, .env konfigurieren, Ollama", "~3 Stunden + Download", "Entwickler"],
    ["2 — Services", "RAG, Content, Integration fertig entwickeln", "~4 Wochen (Vibe Coding)", "Entwickler"],
    ["3 — Deployment", "docker compose up, Keycloak, Initialdaten", "~1 Tag", "Entwickler"],
    ["4 — Abnahme", "Tests TC-01..TC-08, Pilot-Nutzer", "~1 Tag", "Entwickler + KV"],
  ],
  [1600, Math.floor(CONTENT_WIDTH - 5000), 1800, 1600]
));

// ── PHASE 0 ──────────────────────────────────────────────────────────────────
children.push(heading1("2  Phase 0 — Hardware in Betrieb nehmen"));
children.push(phaseHeader("PHASE 0", "Hardware in Betrieb nehmen", "ca. 2 Stunden", "Vorbereitung"));
children.push(spacer(120, 60));
children.push(para("Der DGX Spark kommt mit vorinstalliertem NVIDIA DGX OS (Ubuntu-basiert, ARM64). Docker CE ist bereits vorinstalliert."));
children.push(spacer(80, 40));

children.push(heading2("2.1  Netzwerk konfigurieren"));
children.push(para("Eine feste IP-Adresse im KV-Netz vergeben — entweder per DHCP-Reservierung im Router oder manuell:"));
children.push(spacer(60, 40));
children.push(codeBlock([
  "# IP-Adresse prüfen",
  "ip addr show",
  "",
  "# Statische IP setzen (Beispiel: 192.168.10.50)",
  "sudo nmcli con mod \"Wired connection 1\" \\",
  "  ipv4.addresses 192.168.10.50/24 \\",
  "  ipv4.gateway 192.168.10.1 \\",
  "  ipv4.dns \"8.8.8.8 8.8.4.4\" \\",
  "  ipv4.method manual",
  "sudo nmcli con up \"Wired connection 1\"",
]));
children.push(spacer(120, 60));

children.push(heading2("2.2  System aktualisieren"));
children.push(codeBlock([
  "sudo apt update && sudo apt upgrade -y",
  "",
  "# Docker Compose Plugin installieren (falls noch nicht vorhanden)",
  "sudo apt install docker-compose-plugin -y",
  "",
  "# Aktuellen Nutzer zur Docker-Gruppe hinzufügen",
  "sudo usermod -aG docker $USER",
  "",
  "# WICHTIG: Neu einloggen oder Session neu starten, damit die Gruppe greift",
  "newgrp docker",
]));
children.push(spacer(120, 60));
children.push(warningBox("Wichtig: Neustart der Session", [
  "Nach dem Hinzufügen zur Docker-Gruppe muss die SSH-Session neu gestartet werden.",
  "Sonst schlägt jeder docker-Befehl mit 'permission denied' fehl.",
]));
children.push(spacer(80, 60));

children.push(heading2("2.3  SSH-Zugang testen"));
children.push(para("Vom Laptop aus testen (IP-Adresse anpassen):"));
children.push(codeBlock([
  "ssh user@192.168.10.50",
  "",
  "# Docker-Test",
  "docker run --rm hello-world",
]));

// ── PHASE 1 ──────────────────────────────────────────────────────────────────
children.push(heading1("3  Phase 1 — Repository und Umgebung"));
children.push(phaseHeader("PHASE 1", "Repository klonen und Umgebung konfigurieren", "ca. 3–4 Stunden", "Bereit"));
children.push(spacer(120, 60));

children.push(heading2("3.1  Ollama installieren"));
children.push(para("Ollama läuft nativ auf dem DGX OS (nicht in Docker) und nutzt direkt den GB10-Chip mit Unified Memory:"));
children.push(spacer(60, 40));
children.push(codeBlock([
  "# Ollama installieren",
  "curl -fsSL https://ollama.com/install.sh | sh",
  "",
  "# Dienst starten und automatisch beim Boot aktivieren",
  "sudo systemctl enable ollama",
  "sudo systemctl start ollama",
  "",
  "# Status prüfen",
  "sudo systemctl status ollama",
]));
children.push(spacer(120, 60));

children.push(heading2("3.2  Sprachmodelle herunterladen"));
children.push(para("Der Download dauert je nach Internetverbindung 30–60 Minuten. Die Modelle werden dauerhaft auf dem DGX gespeichert."));
children.push(spacer(60, 40));
children.push(codeBlock([
  "# Haupt-LLM: Qwen3 72B, 4-Bit-Quantisierung (~42 GB)",
  "ollama pull qwen3:72b",
  "",
  "# Embedding-Modell für RAG (~274 MB)",
  "ollama pull nomic-embed-text",
  "",
  "# Smoke-Test — sollte auf Deutsch antworten",
  "ollama run qwen3:72b \"Hallo, wer bist du? Antworte auf Deutsch in 2 Sätzen.\"",
]));
children.push(spacer(120, 60));
children.push(infoBox("Erwartetes Ergebnis des Smoke-Tests", [
  "Time-to-First-Token: < 0,5 Sekunden",
  "Ausgabe flüssig auf Deutsch",
  "Modell erwähnt sich als Sprachassistent ohne externe Verbindungen",
]));
children.push(spacer(120, 60));

children.push(heading2("3.3  Repository klonen"));
children.push(codeBlock([
  "# Repo von GitHub klonen",
  "git clone https://github.com/sventruderung/drk-mv-ki-plattform.git",
  "cd drk-mv-ki-plattform",
  "",
  "# Aktuellen Stand prüfen",
  "git log --oneline -5",
]));
children.push(spacer(120, 60));

children.push(heading2("3.4  Umgebungsvariablen konfigurieren"));
children.push(para("Die .env.example-Datei enthält alle Variablen mit Platzhaltern. Echte Secrets NIEMALS in Git einchecken."));
children.push(spacer(60, 40));
children.push(codeBlock([
  "cp .env.example .env",
  "nano .env   # oder: vim .env",
]));
children.push(spacer(80, 60));
children.push(simpleTable(
  ["Variable", "Beschreibung", "Beispielwert"],
  [
    ["POSTGRES_PASSWORD", "Datenbank-Passwort", "Sicheres Passwort, min. 20 Zeichen"],
    ["KEYCLOAK_ADMIN_PASSWORD", "Keycloak-Verwaltungspasswort", "Sicheres Passwort, min. 20 Zeichen"],
    ["MINIO_ROOT_PASSWORD", "MinIO Objektspeicher", "Sicheres Passwort, min. 20 Zeichen"],
    ["JWT_SECRET", "Token-Signierung API-Gateway", "Zufälliger 64-Zeichen-String"],
    ["OLLAMA_BASE_URL", "Ollama-Adresse", "http://host-gateway:11434"],
    ["KV_NAME", "Name des Kreisverbandes", "z.B. parchim"],
    ["KV_DISPLAY_NAME", "Anzeigename", "z.B. DRK KV Parchim"],
  ],
  [2400, Math.floor(CONTENT_WIDTH - 5000), 2500]
));
children.push(spacer(80, 60));
children.push(warningBox("Sicherheitshinweis", [
  "Die .env-Datei enthält echte Secrets und darf NIEMALS in Git eingecheckt werden.",
  "Sie steht bereits in .gitignore — bitte vor jedem git commit prüfen: git status",
  "Sichere Passwörter generieren: openssl rand -base64 32",
]));

// ── PHASE 2 ──────────────────────────────────────────────────────────────────
children.push(heading1("4  Phase 2 — Services entwickeln"));
children.push(phaseHeader("PHASE 2", "Fehlende Services entwickeln", "ca. 4 Wochen", "Entwicklung"));
children.push(spacer(120, 60));
children.push(para("Das Repository enthält bereits das Grundgerüst. Diese Services müssen noch vollständig implementiert werden:"));
children.push(spacer(60, 40));

children.push(simpleTable(
  ["Service", "Priorität", "Aufwand", "Abhängigkeiten"],
  [
    ["RAG-Service", "KRITISCH — Kern des Systems", "8–10 Tage", "PostgreSQL + pgvector, Ollama (Embeddings)"],
    ["docker-compose.yml finalisieren", "KRITISCH", "1 Tag", "Alle Service-Definitionen bekannt"],
    ["Keycloak-Realm-Konfiguration", "HOCH", "2 Tage", "Rollen aus §4 Lastenheft"],
    ["Content-Service (P02)", "MITTEL", "5 Tage", "RAG-Service, MinIO"],
    ["Integration-Service (P03)", "NIEDRIG", "5 Tage", "Content-Service"],
    ["Abnahmetests TC-01..TC-08", "HOCH", "3 Tage", "Alle Services laufend"],
  ],
  [2000, 2200, 1400, Math.floor(CONTENT_WIDTH - 5600)]
));
children.push(spacer(120, 60));

children.push(heading2("4.1  RAG-Service — Kern-Funktionen"));
children.push(para("Der RAG-Service ist der kritische Pfad. Ohne ihn funktioniert keine dokumentenbasierte KI-Antwort. Er muss folgendes leisten:"));
children.push(spacer(60, 0));
children.push(bullet("Dokument-Upload: PDF, DOCX, XLSX, TXT → Text-Extraktion → Chunks (je ~500 Token)"));
children.push(bullet("Embedding: Chunks → nomic-embed-text → Vektoren in pgvector speichern"));
children.push(bullet("ACL-Schutz: Jedes Dokument bekommt acl_groups (z.B. {kv-vorstand, kv-pflege})"));
children.push(bullet("Suchanfrage: Nutzer-Embedding → pgvector-Suche NUR in freigegebenen Dokumenten"));
children.push(bullet("Zitierung: Antwort enthält Quellenangabe (Dokumentenname, Seitenbereich)"));
children.push(spacer(80, 60));

children.push(heading2("4.2  Datenbankschema (bereits in infra/postgres/init/01_init.sql)"));
children.push(codeBlock([
  "-- Vektordimension: nomic-embed-text = 768 Dimensionen",
  "CREATE EXTENSION IF NOT EXISTS vector;",
  "",
  "-- RLS aktivieren",
  "ALTER TABLE documents ENABLE ROW LEVEL SECURITY;",
  "CREATE POLICY tenant_isolation ON documents",
  "  USING (tenant_id = current_setting('app.tenant_id')::UUID);",
  "",
  "-- ACL-gefilterte Vektorsuche",
  "SELECT dc.chunk_text, d.name, dc.page_start",
  "FROM document_chunks dc",
  "JOIN documents d ON d.id = dc.document_id",
  "WHERE dc.tenant_id = $tenant_id",
  "  AND dc.acl_groups && $user_roles    -- && = Array-Überschneidung",
  "ORDER BY dc.embedding <=> $query_vector",
  "LIMIT 5;",
]));
children.push(spacer(80, 60));

children.push(heading2("4.3  Was bereits im Repo steht"));
children.push(simpleTable(
  ["Datei/Verzeichnis", "Status", "Beschreibung"],
  [
    ["services/api-gateway/", "Vorhanden", "Auth-Middleware, JWT-Prüfung, Chat-Route"],
    ["services/llm-service/", "Vorhanden", "Ollama-Proxy mit Streaming"],
    ["infra/postgres/init/01_init.sql", "Vorhanden", "Datenbankschema mit RLS und ACL"],
    ["packages/shared/", "Vorhanden", "tenant.py, logging.py (DSGVO-konform)"],
    ["docker-compose.yml", "Grundgerüst", "Muss für alle Services erweitert werden"],
    ["services/rag-service/", "Fehlt", "Kern-Feature — muss implementiert werden"],
    ["services/content-service/", "Fehlt", "P02 Social Media — nach RAG"],
    ["services/integration-service/", "Fehlt", "P03 Drittsysteme — nach Content"],
    ["infra/keycloak/", "Fehlt", "Realm-Export JSON für KV-Konfiguration"],
  ],
  [3200, 1400, Math.floor(CONTENT_WIDTH - 4600)]
));

// ── PHASE 3 ──────────────────────────────────────────────────────────────────
children.push(heading1("5  Phase 3 — Deployment"));
children.push(phaseHeader("PHASE 3", "Stack hochfahren und konfigurieren", "ca. 1 Tag", "Bereit"));
children.push(spacer(120, 60));

children.push(heading2("5.1  Docker Compose starten"));
children.push(codeBlock([
  "# Im Repository-Verzeichnis auf dem DGX Spark",
  "cd drk-mv-ki-plattform",
  "",
  "# Alle Services starten",
  "docker compose up -d",
  "",
  "# Status prüfen — alle Services sollten 'healthy' sein",
  "docker compose ps",
  "",
  "# Logs bei Problemen",
  "docker compose logs -f api-gateway",
  "docker compose logs -f rag-service",
]));
children.push(spacer(120, 60));
children.push(successBox("Erwarteter Zustand nach 'docker compose up'", [
  "postgres      :5432   ✔  healthy",
  "keycloak      :8080   ✔  healthy",
  "minio         :9000   ✔  healthy",
  "api-gateway   :8000   ✔  healthy",
  "rag-service   :8001   ✔  healthy",
  "llm-service   :8002   ✔  healthy",
  "content-svc   :8005   ✔  healthy",
  "open-webui    :3000   ✔  healthy",
  "ollama        :11434  ✔  (läuft nativ, nicht in Docker)",
]));
children.push(spacer(120, 60));

children.push(heading2("5.2  Keycloak einrichten"));
children.push(para("Keycloak ist die zentrale Authentifizierungsinstanz. Für einen Kreisverband wird ein eigener Realm angelegt."));
children.push(spacer(60, 40));
children.push(codeBlock([
  "# Keycloak Admin-Oberfläche im Browser öffnen:",
  "# http://192.168.10.50:8080",
  "#",
  "# Login: admin / <KEYCLOAK_ADMIN_PASSWORD aus .env>",
  "",
  "# Option A: Realm per JSON-Import anlegen (empfohlen)",
  "#   → Master-Realm → Create Realm → Import drk-kv-<name>-realm.json",
  "",
  "# Option B: Manuell anlegen",
  "#   1. Create Realm: Name = drk-kv-parchim",
  "#   2. Clients anlegen: drk-platform-client (Confidential, Authorization enabled)",
  "#   3. Rollen anlegen (Realm Roles):",
  "#      - kv-admin",
  "#      - kv-vorstand",
  "#      - kv-pflege",
  "#      - kv-rettungsdienst",
  "#      - kv-standard",
  "#   4. Ersten KV-Admin-Nutzer anlegen",
  "#      → Users → Add User → Username/E-Mail",
  "#      → Credentials → Passwort setzen",
  "#      → Role Mappings → kv-admin zuweisen",
]));
children.push(spacer(120, 60));

children.push(heading2("5.3  MinIO-Buckets anlegen"));
children.push(codeBlock([
  "# MinIO-Client installieren",
  "curl https://dl.min.io/client/mc/release/linux-arm64/mc \\",
  "  --create-dirs -o ~/bin/mc",
  "chmod +x ~/bin/mc",
  "",
  "# Verbindung konfigurieren",
  "mc alias set local http://localhost:9000 \\",
  "  $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD",
  "",
  "# Buckets anlegen",
  "mc mb local/drk-docs-kv-parchim      # RAG-Dokumente",
  "mc mb local/drk-content-kv-parchim   # P02 CI-Assets",
]));
children.push(spacer(120, 60));

children.push(heading2("5.4  Erstes RAG-Dokument hochladen"));
children.push(para("Über die Open WebUI-Oberfläche im Browser (http://192.168.10.50:3000):"));
children.push(spacer(60, 0));
children.push(numbered("Browser öffnen: http://192.168.10.50:3000"));
children.push(numbered("Mit KV-Admin-Account einloggen"));
children.push(numbered("Workspace → Knowledge → New Knowledge Base"));
children.push(numbered("Erstes Testdokument per Drag-and-Drop hochladen (z.B. Vereinssatzung, Dienstanweisung)"));
children.push(numbered("Warten bis Embedding abgeschlossen (Statusanzeige grün)"));
children.push(numbered("Chat öffnen → Modell 'qwen3:72b' wählen → Testfrage stellen"));

// ── PHASE 4 ──────────────────────────────────────────────────────────────────
children.push(heading1("6  Phase 4 — Abnahmetests"));
children.push(phaseHeader("PHASE 4", "Abnahmetests und Pilot-Betrieb", "ca. 1 Tag", "Bereit"));
children.push(spacer(120, 60));
children.push(para("Die Abnahmetests basieren auf §7 des Lastenhefts. Alle acht Tests müssen bestanden sein, bevor Nutzer eingeladen werden."));
children.push(spacer(80, 60));

children.push(simpleTable(
  ["Test", "Beschreibung", "Erwartetes Ergebnis"],
  [
    ["TC-01\nLatenz", "curl-Anfrage an /api/v1/chat mit JWT-Token", "Time-to-First-Token < 2,0 s\n(DGX Spark: < 0,5 s erwartet)"],
    ["TC-02\nACL-Schutz", "Nutzer mit Rolle kv-standard fragt nach Vorstandsdokument", "Antwort: 'Keine freigegebenen Informationen'"],
    ["TC-03\nMandanten-\nIsolation", "Simulierter Token eines anderen KV — nicht anwendbar bei Mono, entfällt", "N/A bei Mono-Installation"],
    ["TC-04\nKein Prompt-\nLog", "Anfrage stellen, danach PostgreSQL audit_log prüfen", "Kein Prompt-Inhalt in audit_log gespeichert"],
    ["TC-05\nZitierung", "Frage, die im RAG-Dokument beantwortet ist", "Antwort enthält Quellenangabe (Dateiname + Seite)"],
    ["TC-06\nKeycloak-\nSSO", "Login über Keycloak-Seite, Weiterleitung zu WebUI", "Nahtloser Login ohne zweite Passwort-Eingabe"],
    ["TC-07\nRollen-\nvergabe", "KV-Admin vergibt Rolle kv-pflege an Nutzer", "Nutzer sieht danach Pflege-Dokumente im RAG"],
    ["TC-08\nStreaming", "Lange Chat-Anfrage beobachten", "Antwort erscheint Wort-für-Wort (Streaming aktiv)"],
  ],
  [1200, Math.floor((CONTENT_WIDTH - 1200) * 0.45), Math.floor((CONTENT_WIDTH - 1200) * 0.55)]
));
children.push(spacer(120, 60));

children.push(heading2("6.1  TC-01 Latenz-Test"));
children.push(codeBlock([
  "# JWT-Token holen (Keycloak OIDC)",
  "TOKEN=$(curl -s -X POST \\",
  "  http://localhost:8080/realms/drk-kv-parchim/protocol/openid-connect/token \\",
  "  -d 'grant_type=password&client_id=drk-platform-client' \\",
  "  -d 'username=testuser&password=testpass' \\",
  "  | jq -r .access_token)",
  "",
  "# Latenz-Test",
  "curl -w \"\\nTTFT: %{time_starttransfer}s\\nGesamt: %{time_total}s\\n\" \\",
  "  -H \"Authorization: Bearer $TOKEN\" \\",
  "  -H \"Content-Type: application/json\" \\",
  "  -d '{\"message\":\"Was sind die Kernaufgaben des DRK?\"}' \\",
  "  http://localhost:8000/api/v1/chat",
  "",
  "# Ziel: TTFT < 0,5 s auf DGX Spark",
]));
children.push(spacer(120, 60));

children.push(heading2("6.2  TC-04 Kein Prompt-Logging prüfen"));
children.push(codeBlock([
  "# Nach einer Chat-Anfrage den Audit-Log prüfen",
  "docker exec -it drk-postgres psql -U postgres -d drk_platform -c \\",
  "  \"SELECT action, metadata FROM audit_log ORDER BY created_at DESC LIMIT 5;\"",
  "",
  "# Erwartetes Ergebnis:",
  "# Einträge vom Typ 'login', 'document_upload', 'role_change'",
  "# KEIN Eintrag vom Typ 'chat_message' oder 'prompt'",
]));

// ── UPDATES & WARTUNG ─────────────────────────────────────────────────────────
children.push(heading1("7  Updates und laufender Betrieb"));
children.push(heading2("7.1  Software-Updates einspielen"));
children.push(codeBlock([
  "# Neue Version vom GitHub holen",
  "git pull origin main",
  "",
  "# Services neu bauen und starten",
  "docker compose up -d --build",
  "",
  "# Datenbankmigrationen laufen automatisch beim Start",
  "# Logs prüfen",
  "docker compose logs -f",
]));
children.push(spacer(120, 60));

children.push(heading2("7.2  LLM-Modell aktualisieren"));
children.push(codeBlock([
  "# Neues Modell herunterladen (ohne Unterbrechung des laufenden Systems)",
  "ollama pull qwen3:72b",
  "",
  "# In Open WebUI: Admin Panel → Models → Standardmodell wechseln",
]));
children.push(spacer(120, 60));

children.push(heading2("7.3  Datensicherung"));
children.push(codeBlock([
  "# PostgreSQL-Datenbank sichern",
  "docker exec drk-postgres pg_dump -U postgres drk_platform \\",
  "  | gzip > backup_$(date +%Y%m%d).sql.gz",
  "",
  "# MinIO-Dokumente sichern",
  "mc mirror local/drk-docs-kv-parchim /backup/minio/",
  "",
  "# .env-Datei sichern (SEPARAT und sicher aufbewahren!)",
  "cp .env /backup/env/drk-platform-$(date +%Y%m%d).env",
]));
children.push(spacer(80, 60));
children.push(warningBox("Backup-Hinweis", [
  "Die .env-Datei enthält alle Secrets. Sie muss GETRENNT vom Daten-Backup",
  "und physisch gesichert aufbewahrt werden (z.B. Passwort-Manager, verschlüsselter USB).",
  "Ohne .env ist eine Wiederherstellung nicht möglich.",
]));

// ── FEHLERBEHEBUNG ────────────────────────────────────────────────────────────
children.push(heading1("8  Fehlerbehebung (Troubleshooting)"));
children.push(heading2("8.1  Häufige Probleme und Lösungen"));
children.push(simpleTable(
  ["Problem", "Symptom", "Lösung"],
  [
    ["Docker permission denied", "'Got permission denied while trying to connect to Docker'", "sudo usermod -aG docker $USER && newgrp docker"],
    ["Ollama nicht erreichbar", "llm-service: 'Connection refused :11434'", "sudo systemctl start ollama && sudo systemctl status ollama"],
    ["Keycloak startet nicht", "keycloak Container bleibt bei 'starting'", "docker compose logs keycloak — meist DB-Verbindungsfehler beim Erststart, 2 Min. warten"],
    ["Embedding schlägt fehl", "rag-service: 'model nomic-embed-text not found'", "ollama pull nomic-embed-text"],
    ["TTFT > 2 Sekunden", "Antworten kommen spät", "Prüfen: ollama ps — Modell sollte geladen sein. Erst-Anfrage lädt Modell in RAM (~10s)"],
    ["pgvector-Fehler", "'type vector does not exist'", "docker exec drk-postgres psql -U postgres -c 'CREATE EXTENSION vector;'"],
    ["JWT-Fehler 401", "'Token signature verification failed'", "JWT_SECRET in .env prüfen — muss auf allen Services identisch sein"],
  ],
  [2000, 2800, Math.floor(CONTENT_WIDTH - 4800)]
));
children.push(spacer(120, 60));

children.push(heading2("8.2  Logs und Diagnose"));
children.push(codeBlock([
  "# Alle Services auf einmal beobachten",
  "docker compose logs -f --tail=50",
  "",
  "# Einzelnen Service",
  "docker compose logs -f rag-service",
  "",
  "# Ressourcenverbrauch",
  "docker stats",
  "",
  "# GPU/CPU-Auslastung (DGX Spark)",
  "nvidia-smi",
  "htop",
  "",
  "# Ollama-Status",
  "ollama ps    # zeigt geladene Modelle und RAM-Nutzung",
  "ollama list  # alle verfügbaren Modelle",
]));

// ── KONTAKT UND NÄCHSTE SCHRITTE ─────────────────────────────────────────────
children.push(heading1("9  Nächste Schritte nach der Erstinstallation"));
children.push(heading2("9.1  Pilot-Betrieb (Woche 1 nach Go-Live)"));
children.push(numbered("3–5 Pilot-Nutzer aus dem KV einladen (Keycloak-Accounts anlegen)"));
children.push(numbered("Erste Wissensbasis befüllen: 10–20 interne Dokumente hochladen"));
children.push(numbered("Feedback-Session nach 1 Woche: Was funktioniert? Was fehlt?"));
children.push(numbered("Ergebnisse in GitHub Issues als Backlog einpflegen"));
children.push(spacer(80, 60));

children.push(heading2("9.2  Schrittweise Erweiterung"));
children.push(simpleTable(
  ["Schritt", "Wann", "Beschreibung"],
  [
    ["P02 Social Media freischalten", "Nach Pilot-Woche 2", "Content-Service aktivieren, Freigabe-Workflow einrichten"],
    ["AD/LDAP-Integration", "Nach Abstimmung KV-IT", "Keycloak Identity Provider konfigurieren (SSO mit bestehendem Login)"],
    ["Weitere DRK-KI-Workshops", "Fortlaufend alle 6 Wochen", "Co-Creation-Zyklus — neue Features aus Workshop-Ergebnissen"],
    ["Skalierung auf 2. KV", "Nach 3 Monaten Pilotbetrieb", "Mandanten-Erweiterung — neue Realm, neuer Tenant in DB"],
  ],
  [2500, 2000, Math.floor(CONTENT_WIDTH - 4500)]
));
children.push(spacer(120, 60));
children.push(checkBox("Installations-Checkliste", [
  "□  Phase 0: DGX Spark im Netz, SSH funktioniert, Docker läuft",
  "□  Phase 1: Ollama installiert, Qwen3 72B heruntergeladen, Smoke-Test bestanden",
  "□  Phase 1: Repo geklont, .env konfiguriert, keine echten Secrets in Git",
  "□  Phase 2: RAG-Service implementiert und in docker-compose.yml eingetragen",
  "□  Phase 3: docker compose up — alle 8 Services healthy",
  "□  Phase 3: Keycloak-Realm angelegt, erster KV-Admin-Account erstellt",
  "□  Phase 3: MinIO-Buckets angelegt, erstes Dokument hochgeladen",
  "□  Phase 4: TC-01..TC-08 alle bestanden",
  "□  Pilot-Nutzer eingeladen und eingewiesen",
]));

// ─── DOKUMENT ────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "•",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }, {
          level: 1, format: LevelFormat.BULLET, text: "◦",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } }
        }]
      },
      {
        reference: "numbers",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 20 } } },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: RED },
        paragraph: { spacing: { before: 480, after: 240 }, outlineLevel: 0 }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: GRAY_DARK },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 }
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Arial", color: GRAY_MID },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 }
      },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: PAGE_WIDTH, height: 16838 },
        margin: { top: PAGE_MARGIN, right: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RED, space: 1 } },
          children: [
            new TextRun({ text: "DRK MV KI-Plattform", font: "Arial", size: 18, bold: true, color: RED }),
            new TextRun({ text: "  |  Installationsanleitung Mono-System auf DGX Spark", font: "Arial", size: 18, color: GRAY_MID }),
          ]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: BORDER_GRAY, space: 1 } },
          tabStops: [{ type: "right", position: CONTENT_WIDTH }],
          children: [
            new TextRun({ text: "DRK Landesverband Mecklenburg-Vorpommern e.V. — Vertraulich", font: "Arial", size: 16, color: GRAY_MID }),
            new TextRun({ text: "\t", font: "Arial", size: 16 }),
            new TextRun({ text: "Seite ", font: "Arial", size: 16, color: GRAY_MID }),
            new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: GRAY_MID }),
          ]
        })]
      })
    },
    children
  }]
});

Packer.toBuffer(doc).then(buffer => {
  const outPath = path.join(__dirname, "Installationsanleitung-DRK-DGX-Spark.docx");
  fs.writeFileSync(outPath, buffer);
  console.log("Erstellt:", outPath, `(${(buffer.length / 1024).toFixed(0)} KB)`);
});
