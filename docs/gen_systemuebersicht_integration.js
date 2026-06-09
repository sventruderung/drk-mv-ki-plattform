const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, LevelFormat, PageBreak, ImageRun
} = require("docx");
const fs = require("fs");

// ── Konstanten ────────────────────────────────────────────────────────────────
const BLUE    = "1F4E79";
const LBLUE   = "2E75B6";
const HBLUE   = "D6E4F0";
const ORANGE  = "C05000";
const LORANGE = "FFF8E1";
const PURPLE  = "3D2B8E";
const LPURPLE = "EDE7F6";
const GREEN   = "1E6B2E";
const LGREEN  = "E8F5E9";
const RED     = "C0392B";
const LGRAY   = "F2F2F2";

const BORDER  = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const NOBORDER  = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NOBORDERS = { top: NOBORDER, bottom: NOBORDER, left: NOBORDER, right: NOBORDER };
const W = 9638; // A4 content width DXA

// ── Helfer ────────────────────────────────────────────────────────────────────
const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  children: [new TextRun({ text, font: "Arial", size: 32, bold: true, color: BLUE })],
  spacing: { before: 360, after: 160 },
});
const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  children: [new TextRun({ text, font: "Arial", size: 26, bold: true, color: LBLUE })],
  spacing: { before: 280, after: 120 },
});
const h3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  children: [new TextRun({ text, font: "Arial", size: 24, bold: true, color: "404040" })],
  spacing: { before: 200, after: 80 },
});
const p = (text, opts = {}) => new Paragraph({
  children: [new TextRun({ text, font: "Arial", size: 22, ...opts })],
  spacing: { after: 120 },
});
const bullet = (text, color = "000000") => new Paragraph({
  numbering: { reference: "bullets", level: 0 },
  children: [new TextRun({ text, font: "Arial", size: 22, color })],
  spacing: { after: 60 },
});
const rule = () => new Paragraph({
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: LBLUE, space: 1 } },
  spacing: { after: 160 }, children: [],
});
const spacer = () => new Paragraph({ children: [new TextRun("")], spacing: { after: 80 } });

const cell = (text, opts = {}) => {
  const { bold = false, fill = "FFFFFF", color = "000000", width, italic = false } = opts;
  return new TableCell({
    borders: BORDERS,
    shading: { fill, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 140, right: 140 },
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    children: [new Paragraph({
      children: [new TextRun({ text, font: "Arial", size: 20, bold, color, italics: italic })],
    })],
  });
};
const hcell = (text, width) => cell(text, { bold: true, fill: HBLUE, color: BLUE, width });
const ocell = (text, width) => cell(text, { fill: LORANGE, color: ORANGE, width });
const gcell = (text, width) => cell(text, { fill: LGREEN,  color: GREEN,  width });
const vcell = (text, width) => cell(text, { fill: LPURPLE, color: PURPLE, width });
const tableTitle = (text) => new Paragraph({
  children: [new TextRun({ text, font: "Arial", size: 20, italics: true, color: "555555" })],
  spacing: { before: 100, after: 60 },
});

// ── Code-Block Simulation ─────────────────────────────────────────────────────
const codeBlock = (lines) => new Table({
  width: { size: W, type: WidthType.DXA },
  columnWidths: [W],
  rows: [new TableRow({ children: [new TableCell({
    borders: BORDERS,
    shading: { fill: "1E1E1E", type: ShadingType.CLEAR },
    margins: { top: 120, bottom: 120, left: 200, right: 200 },
    children: lines.map(l => new Paragraph({
      children: [new TextRun({ text: l, font: "Courier New", size: 18, color: "D4D4D4" })],
      spacing: { after: 0 },
    })),
  })] })],
});

// ── Dokument ──────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "–",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 560, hanging: 280 } } } }] },
      { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 560, hanging: 280 } } } }] },
    ],
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: BLUE },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: LBLUE },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "404040" },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
      },
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        children: [new TextRun({ text: "DRK MV KI-Plattform  |  API-Integration mit Anwendungssystemen", font: "Arial", size: 18, color: "888888" })],
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LBLUE, space: 1 } },
        spacing: { after: 0 },
      })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        children: [
          new TextRun({ text: "ST COMPUTER GmbH  –  Vertraulich  –  Seite ", font: "Arial", size: 18, color: "888888" }),
          new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: "888888" }),
        ],
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: LBLUE, space: 1 } },
        alignment: AlignmentType.RIGHT,
      })] }),
    },
    children: [

      // ── Titelseite ─────────────────────────────────────────────────────────
      new Paragraph({
        children: [new TextRun({ text: "DRK MV KI-Plattform", font: "Arial", size: 56, bold: true, color: BLUE })],
        spacing: { before: 1440, after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "API-Integration mit Anwendungssystemen", font: "Arial", size: 34, color: LBLUE })],
        spacing: { after: 160 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "Architektur, Integrationsmuster und Umsetzung", font: "Arial", size: 26, italics: true, color: "555555" })],
        spacing: { after: 600 },
      }),
      rule(),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [2400, 7238],
        borders: { top: NOBORDER, bottom: NOBORDER, left: NOBORDER, right: NOBORDER, insideH: NOBORDER, insideV: NOBORDER },
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: NOBORDERS, margins: { top: 60, bottom: 60, left: 0, right: 200 }, children: [new Paragraph({ children: [new TextRun({ text: "Auftraggeber", font: "Arial", size: 20, bold: true, color: "666666" })] })] }),
            new TableCell({ borders: NOBORDERS, margins: { top: 60, bottom: 60, left: 0 }, children: [new Paragraph({ children: [new TextRun({ text: "DRK Landesverband Mecklenburg-Vorpommern e.V.", font: "Arial", size: 20 })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: NOBORDERS, margins: { top: 60, bottom: 60, left: 0, right: 200 }, children: [new Paragraph({ children: [new TextRun({ text: "Erstellt von", font: "Arial", size: 20, bold: true, color: "666666" })] })] }),
            new TableCell({ borders: NOBORDERS, margins: { top: 60, bottom: 60, left: 0 }, children: [new Paragraph({ children: [new TextRun({ text: "ST COMPUTER Gesellschaft für angewandte Informatik GmbH", font: "Arial", size: 20 })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: NOBORDERS, margins: { top: 60, bottom: 60, left: 0, right: 200 }, children: [new Paragraph({ children: [new TextRun({ text: "Bezug", font: "Arial", size: 20, bold: true, color: "666666" })] })] }),
            new TableCell({ borders: NOBORDERS, margins: { top: 60, bottom: 60, left: 0 }, children: [new Paragraph({ children: [new TextRun({ text: "Erweiterung der Systemübersicht DRK MV KI-Plattform (Multi-KV)", font: "Arial", size: 20 })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: NOBORDERS, margins: { top: 60, bottom: 60, left: 0, right: 200 }, children: [new Paragraph({ children: [new TextRun({ text: "Version", font: "Arial", size: 20, bold: true, color: "666666" })] })] }),
            new TableCell({ borders: NOBORDERS, margins: { top: 60, bottom: 60, left: 0 }, children: [new Paragraph({ children: [new TextRun({ text: "0.1.0  –  Juni 2026", font: "Arial", size: 20 })] })] }),
          ]}),
        ],
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // ── 1. Übersicht ───────────────────────────────────────────────────────
      h1("1  Übersicht und Zielsetzung"),
      p("Die DRK MV KI-Plattform ist als eigenständige, lokal betriebene KI-Lösung konzipiert. Um den Mehrwert für die Kreisverbände zu maximieren, kann sie über einen dedizierten Integration-Service an bestehende Anwendungssysteme angebunden werden — etwa Dienstplan-Software, Dokumentenmanagementsysteme (DMS), HR-Systeme oder Fach-Datenbanken."),
      p("Ziel dieser Erweiterung ist es, dem LLM kontextrelevante Echtdaten aus den Fremdsystemen bereitzustellen, ohne dass Nutzer zwischen Anwendungen wechseln müssen oder Daten manuell übertragen werden."),
      spacer(),

      tableTitle("Tabelle 1: Nutzen der API-Integration"),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [3400, 6238],
        rows: [
          new TableRow({ children: [hcell("Anwendungsfall", 3400), hcell("Nutzen", 6238)] }),
          new TableRow({ children: [cell("Dienstplan-Abfrage per Chat", {width:3400}), cell("\"Zeig mir die Dienste von Müller nächste Woche\" — LLM ruft Dienstplan-API ab", {width:6238})] }),
          new TableRow({ children: [cell("Dokument aus DMS zitieren", {width:3400}), cell("Neues Dokument im DMS wird automatisch in den RAG-Index aufgenommen", {width:6238})] }),
          new TableRow({ children: [cell("Stammdaten aus HR-System", {width:3400}), cell("Nachtlauf synchronisiert Mitarbeiterdaten in die Wissensdatenbank", {width:6238})] }),
          new TableRow({ children: [cell("Fachanwendung abfragen", {width:3400}), cell("LLM liest Read-Only-Daten aus Sozial-Software für Kontextanreicherung", {width:6238})] }),
        ],
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // ── 2. Architektur ─────────────────────────────────────────────────────
      h1("2  Architektur-Erweiterung"),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 80 },
        children: [new ImageRun({
          type: "png",
          data: fs.readFileSync("C:\\Projekte\\drk-mv-ki-plattform\\docs\\architecture-integration.png"),
          transformation: { width: 640, height: 496 },
          altText: { title: "Integrationsarchitektur", description: "Architektur mit Integration-Service und Fremdsystemen", name: "architecture-integration" },
        })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: "Abbildung 1: Architektur mit Integration-Service und angebundenen Fremdsystemen", font: "Arial", size: 18, italics: true, color: "555555" })],
      }),

      h2("2.1  Neue Komponenten"),
      tableTitle("Tabelle 2: Neu hinzukommende Komponenten"),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [2600, 1600, 5438],
        rows: [
          new TableRow({ children: [hcell("Komponente", 2600), hcell("Port", 1600), hcell("Aufgabe", 5438)] }),
          new TableRow({ children: [ocell("Integration-Service", 2600), ocell(":8004", 1600), cell("Zentraler Ausgangs- und Eingangspunkt für alle Fremdsystem-Kommunikation. Enthält Tool-Registry, Connector-Pool und Circuit Breaker.", {width:5438})] }),
          new TableRow({ children: [ocell("Secrets-Store", 2600), ocell("intern", 1600), cell("Sichere Verwaltung aller API-Keys, OAuth2-Tokens und Credentials für Fremdsysteme — getrennt pro Tenant. HashiCorp Vault oder Docker Secrets.", {width:5438})] }),
        ],
      }),
      spacer(),

      h2("2.2  Compliance-Grenze"),
      p("Der Integration-Service ist der einzige Punkt im Stack, der die Compliance-Grenze der Plattform überschreitet. Alle anderen Services (RAG, LLM, Admin, Gateway) kommunizieren ausschließlich intern. Dies hat zwei wichtige Implikationen:"),
      bullet("Datenschutz-by-Design: Jede ausgehende Anfrage wird im Integration-Service explizit autorisiert und geloggt (nur Metadaten: Systemname, RequestID, Tenant, Statuscode — keine Inhalte)"),
      bullet("Single Point of Control: Fremdsystem-Credentials, Timeouts, Retry-Logik und Circuit Breaker sind zentral konfiguriert — kein Fremdsystem-Zugriff aus anderen Services möglich"),
      new Paragraph({ children: [new PageBreak()] }),

      // ── 3. Integrationsmuster ──────────────────────────────────────────────
      h1("3  Integrationsmuster"),
      p("Es gibt drei grundlegende Muster für die Anbindung von Fremdsystemen. Sie können kombiniert werden."),
      spacer(),

      h2("3.1  Muster A — Tool-Calling (LLM ruft Werkzeug auf)"),
      p("Das LLM erkennt während der Antwortgenerierung, dass es externe Daten benötigt, und ruft ein registriertes Tool auf. Der Nutzer muss nichts konfigurieren — die Entscheidung trifft das Modell auf Basis des Prompts."),
      spacer(),

      tableTitle("Ablauf Tool-Calling"),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [600, 9038],
        rows: [
          new TableRow({ children: [hcell("Schritt", 600), hcell("Beschreibung", 9038)] }),
          new TableRow({ children: [cell("1", {width:600}), cell("Nutzer sendet: \"Welche Dienste hat Schmidt nächste Woche?\"", {width:9038})] }),
          new TableRow({ children: [cell("2", {width:600}), cell("LLM-Service erkennt: Tool dienstplan_abfrage mit Parameter mitarbeiter=\"Schmidt\" benötigt", {width:9038})] }),
          new TableRow({ children: [cell("3", {width:600}), cell("LLM-Service sendet Tool-Call-Request an Integration-Service (:8004)", {width:9038})] }),
          new TableRow({ children: [cell("4", {width:600}), cell("Integration-Service authentifiziert sich gegen Dienstplan-API (OAuth2 Client Credentials aus Secrets-Store)", {width:9038})] }),
          new TableRow({ children: [cell("5", {width:600}), cell("Ergebnis (JSON) wird zurück an LLM-Service übergeben — als Kontext in die laufende Antwort eingebettet", {width:9038})] }),
          new TableRow({ children: [cell("6", {width:600}), cell("LLM formuliert natürlichsprachliche Antwort mit den Echtdaten — mit Quellenangabe", {width:9038})] }),
        ],
      }),
      spacer(),
      p("Implementierung: Tool-Definition als JSON-Schema in der Tool-Registry des Integration-Service. Ollama unterstützt OpenAI-kompatibles Function Calling ab Version 0.3."),
      codeBlock([
        "# Tool-Definition (Beispiel: Dienstplan-Abfrage)",
        "{",
        '  "name": "dienstplan_abfrage",',
        '  "description": "Liefert Dienste eines Mitarbeiters für einen Zeitraum",',
        '  "parameters": {',
        '    "mitarbeiter": { "type": "string", "description": "Name oder ID" },',
        '    "von": { "type": "string", "description": "Datum YYYY-MM-DD" },',
        '    "bis": { "type": "string", "description": "Datum YYYY-MM-DD" }',
        "  }",
        "}",
      ]),
      spacer(),

      h2("3.2  Muster B — Webhook (Fremdsystem pusht Ereignisse)"),
      p("Ein Fremdsystem (z.B. DMS) sendet aktiv eine Benachrichtigung an den Integration-Service, wenn ein relevantes Ereignis eintritt — etwa ein neues Dokument. Der Integration-Service verarbeitet das Ereignis und aktualisiert ggf. den RAG-Index."),
      spacer(),

      tableTitle("Ablauf Webhook"),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [600, 9038],
        rows: [
          new TableRow({ children: [hcell("Schritt", 600), hcell("Beschreibung", 9038)] }),
          new TableRow({ children: [cell("1", {width:600}), cell("DMS-System veröffentlicht neues Dokument → sendet HTTP POST an https://plattform/webhooks/dms", {width:9038})] }),
          new TableRow({ children: [cell("2", {width:600}), cell("Integration-Service empfängt Webhook, prüft HMAC-Signatur (Authentizität), extrahiert Dokument-URL und Tenant", {width:9038})] }),
          new TableRow({ children: [cell("3", {width:600}), cell("Integration-Service lädt Dokument von DMS herunter (REST-API, mit gespeichertem API-Key)", {width:9038})] }),
          new TableRow({ children: [cell("4", {width:600}), cell("Dokument wird an RAG-Service übergeben → Embedding erstellt → in pgvector gespeichert (mit Tenant-Filter)", {width:9038})] }),
          new TableRow({ children: [cell("5", {width:600}), cell("Nutzer können das Dokument sofort über Chat-RAG abfragen", {width:9038})] }),
        ],
      }),
      spacer(),

      h2("3.3  Muster C — Scheduled Sync (Nachtlauf)"),
      p("Der Integration-Service holt regelmäßig (z.B. nächtlich) Stammdaten oder Dokumente aus einem Fremdsystem und aktualisiert den RAG-Index. Kein Trigger durch das Fremdsystem nötig — ideal für Systeme ohne Webhook-Unterstützung."),
      spacer(),

      tableTitle("Ablauf Scheduled Sync"),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [600, 9038],
        rows: [
          new TableRow({ children: [hcell("Schritt", 600), hcell("Beschreibung", 9038)] }),
          new TableRow({ children: [cell("1", {width:600}), cell("Cronjob (täglich 02:00 Uhr) triggert Sync-Job im Integration-Service", {width:9038})] }),
          new TableRow({ children: [cell("2", {width:600}), cell("Integration-Service fragt HR-System nach geänderten Datensätzen seit letztem Sync (Delta-Abfrage)", {width:9038})] }),
          new TableRow({ children: [cell("3", {width:600}), cell("Neue/geänderte Datensätze werden transformiert (JSON → Embedding-freundlicher Text)", {width:9038})] }),
          new TableRow({ children: [cell("4", {width:600}), cell("RAG-Service aktualisiert Embeddings (neue Einträge hinzufügen, geänderte überschreiben, gelöschte entfernen)", {width:9038})] }),
          new TableRow({ children: [cell("5", {width:600}), cell("Sync-Protokoll (Anzahl Datensätze, Fehler) wird ins Audit-Log geschrieben — ohne Inhalte", {width:9038})] }),
        ],
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // ── 4. Integration-Service ─────────────────────────────────────────────
      h1("4  Integration-Service — Aufbau und Implementierung"),

      h2("4.1  Struktur"),
      p("Der Integration-Service ist ein weiterer FastAPI-Microservice im bestehenden Stack. Er wird in services/integration-service/ angelegt — analog zu den bestehenden Services."),
      codeBlock([
        "services/integration-service/",
        "  src/",
        "    main.py              # FastAPI App, Endpunkte",
        "    config.py            # Settings (Pydantic)",
        "    tool_registry.py     # Tool-Definitionen fuer LLM Function Calling",
        "    connectors/",
        "      base.py            # AbstractConnector",
        "      dienstplan.py      # Dienstplan-API Connector",
        "      dms.py             # DMS / SharePoint Connector",
        "      hr.py              # HR-System Connector",
        "    webhooks/",
        "      router.py          # Webhook-Endpunkte",
        "      handlers.py        # Verarbeitungslogik",
        "    scheduler/",
        "      jobs.py            # Cronjobs (APScheduler)",
        "    secrets.py           # Secrets-Store Client (Vault / Env)",
        "  tests/",
        "  Dockerfile",
        "  pyproject.toml",
      ]),
      spacer(),

      h2("4.2  Connector-Muster (AbstractConnector)"),
      p("Jedes Fremdsystem implementiert einen eigenen Connector, der von AbstractConnector erbt. Das ermöglicht einfaches Hinzufügen neuer Systeme ohne Änderungen am Kern."),
      codeBlock([
        "# connectors/base.py",
        "from abc import ABC, abstractmethod",
        "",
        "class AbstractConnector(ABC):",
        "    def __init__(self, tenant_id: str, secrets) -> None:",
        "        self.tenant_id = tenant_id  # TENANT-ISOLATION: Credentials pro Tenant",
        "        self.secrets = secrets",
        "",
        "    @abstractmethod",
        "    async def execute(self, params: dict) -> dict:",
        "        \"\"\"Fuehrt eine Abfrage aus und gibt strukturiertes Ergebnis zurueck.\"\"\"",
        "",
        "    @abstractmethod",
        "    async def health_check(self) -> bool:",
        "        \"\"\"Prueft ob Fremdsystem erreichbar ist (fuer Circuit Breaker).\"\"\"",
      ]),
      spacer(),

      h2("4.3  Circuit Breaker und Fehlerbehandlung"),
      p("Fremdsystem-Ausfälle dürfen die Plattform nicht blockieren. Jeder Connector wird durch einen Circuit Breaker abgesichert: Nach 3 aufeinanderfolgenden Fehlern öffnet der Breaker — der LLM antwortet dann ohne externe Daten und informiert den Nutzer transparent."),
      codeBlock([
        "# Vereinfachtes Beispiel mit tenacity",
        "from tenacity import retry, stop_after_attempt, wait_exponential",
        "",
        "@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))",
        "async def call_external(connector, params):",
        "    return await connector.execute(params)",
        "",
        "# Fallback wenn Circuit offen:",
        "# COMPLIANCE: Kein Prompt-Inhalt in Fehlermeldung",
        'return { "error": "Dienst temporaer nicht verfuegbar", "source": connector.name }',
      ]),
      spacer(),

      h2("4.4  Secrets-Management"),
      p("Credentials für Fremdsysteme werden niemals im Code oder in Git gespeichert. Für die Mono-Variante (Docker Compose) genügen Docker Secrets oder .env-Variablen. Für die Multi-KV-Plattform empfiehlt sich HashiCorp Vault mit Tenant-getrennten Pfaden."),
      tableTitle("Tabelle 3: Secrets-Struktur pro Tenant"),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [3400, 6238],
        rows: [
          new TableRow({ children: [hcell("Vault-Pfad (Beispiel)", 3400), hcell("Inhalt", 6238)] }),
          new TableRow({ children: [cell("secret/kv-parchim/dienstplan", {width:3400}), cell("API_KEY, BASE_URL, TIMEOUT", {width:6238})] }),
          new TableRow({ children: [cell("secret/kv-parchim/dms", {width:3400}), cell("CLIENT_ID, CLIENT_SECRET, TENANT_ID (Azure)", {width:6238})] }),
          new TableRow({ children: [cell("secret/kv-schwerin/dienstplan", {width:3400}), cell("Eigene Credentials — komplett getrennt", {width:6238})] }),
        ],
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // ── 5. Konkrete Systeme ────────────────────────────────────────────────
      h1("5  Konkrete Anbindungsszenarien"),

      h2("5.1  Dienstplan-Software"),
      tableTitle("Tabelle 4: Anbindung Dienstplan"),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [2600, 7038],
        rows: [
          new TableRow({ children: [hcell("Parameter", 2600), hcell("Details", 7038)] }),
          new TableRow({ children: [cell("Muster", {width:2600}), ocell("Tool-Calling", 7038)] }),
          new TableRow({ children: [cell("Protokoll", {width:2600}), cell("REST-API (JSON), typisch HTTPS", {width:7038})] }),
          new TableRow({ children: [cell("Auth", {width:2600}), cell("OAuth2 Client Credentials oder API-Key (je nach Hersteller)", {width:7038})] }),
          new TableRow({ children: [cell("Typische Systeme", {width:2600}), cell("Dienstplan24, Vivendi, SP-Expert, DRK-eigene Systeme", {width:7038})] }),
          new TableRow({ children: [cell("Tool-Parameter", {width:2600}), cell("mitarbeiter (Name/ID), von (Datum), bis (Datum), kreisverband", {width:7038})] }),
          new TableRow({ children: [cell("Datenschutz", {width:2600}), cell("Dienstplandaten sind Beschäftigtendaten (Art. 88 DSGVO). Nur Read-Only. Keine Speicherung im RAG-Index.", {width:7038})] }),
        ],
      }),
      spacer(),

      h2("5.2  Dokumentenmanagementsystem (DMS / SharePoint)"),
      tableTitle("Tabelle 5: Anbindung DMS"),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [2600, 7038],
        rows: [
          new TableRow({ children: [hcell("Parameter", 2600), hcell("Details", 7038)] }),
          new TableRow({ children: [cell("Muster", {width:2600}), gcell("Webhook (neue Dokumente) + Tool-Calling (Suche)", 7038)] }),
          new TableRow({ children: [cell("Protokoll", {width:2600}), cell("Microsoft Graph API (SharePoint Online) oder CMIS-Standard (lokale DMS)", {width:7038})] }),
          new TableRow({ children: [cell("Auth", {width:2600}), cell("OAuth2 Authorization Code (SharePoint) oder Basic/API-Key (lokales DMS)", {width:7038})] }),
          new TableRow({ children: [cell("Webhook-Trigger", {width:2600}), cell("DMS sendet Ereignis bei: neues Dokument, Dokumenten-Update, Löschung", {width:7038})] }),
          new TableRow({ children: [cell("Verarbeitung", {width:2600}), cell("PDF/DOCX wird extrahiert (pdfplumber/python-docx) → Text → Embedding → pgvector", {width:7038})] }),
          new TableRow({ children: [cell("Datenschutz", {width:2600}), cell("Nur Dokumente mit expliziter Freigabe für KI-Verarbeitung werden indexiert (Metadaten-Flag im DMS)", {width:7038})] }),
        ],
      }),
      spacer(),

      h2("5.3  HR-System / Personalverwaltung"),
      tableTitle("Tabelle 6: Anbindung HR-System"),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [2600, 7038],
        rows: [
          new TableRow({ children: [hcell("Parameter", 2600), hcell("Details", 7038)] }),
          new TableRow({ children: [cell("Muster", {width:2600}), vcell("Scheduled Sync (Nachtlauf)", 7038)] }),
          new TableRow({ children: [cell("Protokoll", {width:2600}), cell("REST-API oder SOAP/XML (ältere Systeme), alternativ CSV-Export per SFTP", {width:7038})] }),
          new TableRow({ children: [cell("Auth", {width:2600}), cell("API-Key oder Basis-Authentifizierung", {width:7038})] }),
          new TableRow({ children: [cell("Synchronisierte Daten", {width:2600}), cell("Nicht-personenbezogene Stammdaten: Organisationsstruktur, Abteilungen, Rollen, Kontaktverzeichnis", {width:7038})] }),
          new TableRow({ children: [cell("Datenschutz", {width:2600}), cell("Personenbezogene Daten (Name, Adresse, Gehalt) werden NICHT in RAG-Index übernommen. Nur anonymisierte/strukturelle Daten.", {width:7038})] }),
          new TableRow({ children: [cell("Sync-Frequenz", {width:2600}), cell("Täglich 02:00 Uhr, Delta-Abfrage (nur geänderte Datensätze seit letztem Lauf)", {width:7038})] }),
        ],
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // ── 6. Umsetzungsplan ──────────────────────────────────────────────────
      h1("6  Umsetzungsplan"),
      p("Die Integration wird in vier Phasen umgesetzt. Jede Phase ist unabhängig produktionsfähig."),
      spacer(),

      tableTitle("Tabelle 7: Umsetzungsphasen"),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [800, 2400, 4400, 2038],
        rows: [
          new TableRow({ children: [hcell("Phase", 800), hcell("Bezeichnung", 2400), hcell("Inhalt", 4400), hcell("Dauer (ca.)", 2038)] }),
          new TableRow({ children: [
            cell("1", {width:800}),
            cell("Grundgerüst", {width:2400}),
            cell("Integration-Service anlegen, AbstractConnector, Secrets-Store-Anbindung, Health-Check-Endpunkt, Tests", {width:4400}),
            cell("1 Woche", {width:2038}),
          ]}),
          new TableRow({ children: [
            cell("2", {width:800}),
            cell("Tool-Calling", {width:2400}),
            cell("Tool-Registry, erster Connector (Dienstplan), Function-Calling-Integration in LLM-Service, Ollama-Konfiguration", {width:4400}),
            cell("1–2 Wochen", {width:2038}),
          ]}),
          new TableRow({ children: [
            cell("3", {width:800}),
            cell("Webhook + Sync", {width:2400}),
            cell("Webhook-Endpunkt mit HMAC-Verifikation, DMS-Connector, Scheduled-Sync-Framework (APScheduler), HR-Connector", {width:4400}),
            cell("2 Wochen", {width:2038}),
          ]}),
          new TableRow({ children: [
            cell("4", {width:800}),
            cell("Härtung", {width:2400}),
            cell("Circuit Breaker für alle Connectoren, Rate Limiting, vollständige Tenant-Isolation-Tests, Pentest Integration-Service", {width:4400}),
            cell("1 Woche", {width:2038}),
          ]}),
        ],
      }),
      spacer(),

      h2("6.1  Voraussetzungen vor Start"),
      bullet("API-Dokumentation der Fremdsysteme liegt vor (REST-Spec oder WSDL)"),
      bullet("Testumgebung der Fremdsysteme zugänglich (kein Direktzugriff auf Produktionssysteme in der Entwicklung)"),
      bullet("Netzwerk-Freigaben zwischen Plattform-Server und Fremdsystem-Endpunkten beantragt (Vorlaufzeit 4–8 Wochen beim DRK-IT einplanen)"),
      bullet("Datenschutzrechtliche Freigabe: Welche Daten dürfen aus Fremdsystem X in den RAG-Index? Schriftliche Bestätigung durch DRK-Datenschutzbeauftragten"),
      bullet("ADV-Erweiterung: Wenn Fremdsystem von Drittanbieter betrieben wird, ADV nach Art. 28 DSGVO prüfen"),
      spacer(),

      h2("6.2  Wichtige Entscheidungen vor Implementierung"),
      tableTitle("Tabelle 8: Offene Entscheidungen"),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [3600, 3000, 3038],
        rows: [
          new TableRow({ children: [hcell("Frage", 3600), hcell("Optionen", 3000), hcell("Empfehlung", 3038)] }),
          new TableRow({ children: [cell("Secrets-Management-System", {width:3600}), cell("Docker Secrets, HashiCorp Vault, .env", {width:3000}), cell("Vault ab Multi-KV; Docker Secrets für Mono", {width:3038})] }),
          new TableRow({ children: [cell("Welche Fremdsysteme in Phase 2?", {width:3600}), cell("Abhängig von KV-Priorisierung", {width:3000}), cell("Im ersten DRK-IT-Workshop klären", {width:3038})] }),
          new TableRow({ children: [cell("Welche Daten dürfen in RAG?", {width:3600}), cell("Organisationsstruktur, Vorlagen, Richtlinien", {width:3000}), cell("Abstimmung mit DPO vor Phase 3", {width:3038})] }),
          new TableRow({ children: [cell("Function Calling Modell", {width:3600}), cell("Qwen2.5 32B / 14B (beide unterstützen FC)", {width:3000}), cell("14B ausreichend für strukturierte Tool-Calls", {width:3038})] }),
        ],
      }),
    ],
  }],
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("C:\\Projekte\\drk-mv-ki-plattform\\docs\\Systemuebersicht-DRK-Integration.docx", buffer);
  console.log("Dokument erstellt.");
});
