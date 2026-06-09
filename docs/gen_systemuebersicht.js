const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, LevelFormat, PageBreak, ImageRun
} = require("docx");
const fs = require("fs");

// ── Helpers ──────────────────────────────────────────────────────────────────

const BLUE   = "1F4E79";
const LBLUE  = "2E75B6";
const HBLUE  = "D6E4F0";
const LGRAY  = "F2F2F2";
const BORDER = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const NOBORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NOBORDERS = { top: NOBORDER, bottom: NOBORDER, left: NOBORDER, right: NOBORDER };

const W = 9638; // A4 content width in DXA (11906 - 2 * 1134)

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, font: "Arial", size: 32, bold: true, color: BLUE })],
    spacing: { before: 360, after: 160 },
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, font: "Arial", size: 26, bold: true, color: LBLUE })],
    spacing: { before: 280, after: 120 },
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text, font: "Arial", size: 24, bold: true, color: "404040" })],
    spacing: { before: 200, after: 80 },
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, font: "Arial", size: 22, ...opts })],
    spacing: { after: 120 },
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun({ text, font: "Arial", size: 22 })],
    spacing: { after: 60 },
  });
}

function rule() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: LBLUE, space: 1 } },
    spacing: { after: 160 },
    children: [],
  });
}

function spacer() {
  return new Paragraph({ children: [new TextRun("")], spacing: { after: 80 } });
}

function cell(text, opts = {}) {
  const { bold = false, fill = "FFFFFF", color = "000000", align = AlignmentType.LEFT, width } = opts;
  return new TableCell({
    borders: BORDERS,
    shading: { fill, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 140, right: 140 },
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text, font: "Arial", size: 20, bold, color })],
    })],
  });
}

function hcell(text, width) {
  return cell(text, { bold: true, fill: HBLUE, color: BLUE, width });
}

function tableTitle(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: "Arial", size: 20, italics: true, color: "555555" })],
    spacing: { before: 100, after: 60 },
  });
}

// ── Document ─────────────────────────────────────────────────────────────────

const doc = new Document({
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: "–",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 560, hanging: 280 } } },
      }],
    }],
  },
  styles: {
    default: {
      document: { run: { font: "Arial", size: 22 } },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: BLUE },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: LBLUE },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "404040" },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 },
      },
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
      default: new Header({
        children: [new Paragraph({
          children: [
            new TextRun({ text: "DRK MV KI-Plattform  |  Systemübersicht & Hardware-Dimensionierung", font: "Arial", size: 18, color: "888888" }),
          ],
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LBLUE, space: 1 } },
          spacing: { after: 0 },
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          children: [
            new TextRun({ text: "ST COMPUTER GmbH  –  Vertraulich  –  Seite ", font: "Arial", size: 18, color: "888888" }),
            new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: "888888" }),
          ],
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: LBLUE, space: 1 } },
          alignment: AlignmentType.RIGHT,
        })],
      }),
    },
    children: [

      // ── Titelseite ────────────────────────────────────────────────────────
      new Paragraph({
        children: [new TextRun({ text: "DRK MV KI-Plattform", font: "Arial", size: 56, bold: true, color: BLUE })],
        spacing: { before: 1440, after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "Systemübersicht & Hardware-Dimensionierung", font: "Arial", size: 34, color: LBLUE })],
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
            new TableCell({ borders: NOBORDERS, margins: { top: 60, bottom: 60, left: 0, right: 0 }, children: [new Paragraph({ children: [new TextRun({ text: "DRK Landesverband Mecklenburg-Vorpommern e.V.", font: "Arial", size: 20 })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: NOBORDERS, margins: { top: 60, bottom: 60, left: 0, right: 200 }, children: [new Paragraph({ children: [new TextRun({ text: "Erstellt von", font: "Arial", size: 20, bold: true, color: "666666" })] })] }),
            new TableCell({ borders: NOBORDERS, margins: { top: 60, bottom: 60, left: 0, right: 0 }, children: [new Paragraph({ children: [new TextRun({ text: "ST Computer Gesellschaft für angewandte Informatik GmbH", font: "Arial", size: 20 })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: NOBORDERS, margins: { top: 60, bottom: 60, left: 0, right: 200 }, children: [new Paragraph({ children: [new TextRun({ text: "Version", font: "Arial", size: 20, bold: true, color: "666666" })] })] }),
            new TableCell({ borders: NOBORDERS, margins: { top: 60, bottom: 60, left: 0, right: 0 }, children: [new Paragraph({ children: [new TextRun({ text: "0.1.0  –  Juni 2026", font: "Arial", size: 20 })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: NOBORDERS, margins: { top: 60, bottom: 60, left: 0, right: 200 }, children: [new Paragraph({ children: [new TextRun({ text: "Vertraulichkeit", font: "Arial", size: 20, bold: true, color: "666666" })] })] }),
            new TableCell({ borders: NOBORDERS, margins: { top: 60, bottom: 60, left: 0, right: 0 }, children: [new Paragraph({ children: [new TextRun({ text: "Vertraulich – nur für autorisierte Empfänger", font: "Arial", size: 20 })] })] }),
          ]}),
        ],
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // ── 1. Architektur-Überblick ──────────────────────────────────────────
      h1("1  Architektur-Überblick"),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 80 },
        children: [new ImageRun({
          type: "png",
          data: fs.readFileSync("C:\\Projekte\\drk-mv-ki-plattform\\docs\\architecture.png"),
          transformation: { width: 620, height: 465 },
          altText: { title: "Funktionsschaubild", description: "Systemarchitektur DRK MV KI-Plattform", name: "architecture" },
        })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: "Abbildung 1: Funktionsschaubild DRK MV KI-Plattform", font: "Arial", size: 18, italics: true, color: "555555" })],
      }),
      p("Die DRK MV KI-Plattform ist als mandantenfähige, vollständig lokal betriebene KI-Lösung für die 15 DRK-Kreisverbände in Mecklenburg-Vorpommern konzipiert. Alle Datenverarbeitungskomponenten laufen on-premise oder in einer DSGVO-konformen Private Cloud ausschließlich in Deutschland. Kein Datenbyte verlässt die jeweilige Mandantengrenze ohne explizite technische und rechtliche Freigabe."),
      spacer(),

      h2("1.1  Schichtenmodell"),
      tableTitle("Abbildung 1: Systemschichten (Datenfluss von oben nach unten)"),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [W],
        rows: [
          new TableRow({ children: [new TableCell({
            borders: BORDERS,
            shading: { fill: HBLUE, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 200, right: 200 },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Nutzer (Browser / Tablet)  –  Open WebUI", font: "Arial", size: 22, bold: true, color: BLUE })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "HTTPS • OpenID Connect (Keycloak)", font: "Arial", size: 18, color: "555555" })] }),
            ],
          })] }),
          new TableRow({ children: [new TableCell({
            borders: BORDERS,
            shading: { fill: "EAF2FB", type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 200, right: 200 },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "API-Gateway  (Port 8000)", font: "Arial", size: 22, bold: true })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "JWT-Validierung • Tenant-Isolation • Request-Routing • Streaming", font: "Arial", size: 18, color: "555555" })] }),
            ],
          })] }),
          new TableRow({ children: [new TableCell({
            borders: BORDERS,
            shading: { fill: "FAFAFA", type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 200, right: 200 },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [
                new TextRun({ text: "LLM-Service (8002)     RAG-Service (8001)     Admin-Service (8003)", font: "Arial", size: 22, bold: true }),
              ]}),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Inferenz-Proxy • Dokument-Ingest & Suche • Tenant- & Nutzerverwaltung", font: "Arial", size: 18, color: "555555" })] }),
            ],
          })] }),
          new TableRow({ children: [new TableCell({
            borders: BORDERS,
            shading: { fill: LGRAY, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 200, right: 200 },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Infrastruktur-Layer", font: "Arial", size: 22, bold: true })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Ollama (LLM) • PostgreSQL 16 + pgvector • Keycloak 24", font: "Arial", size: 18, color: "555555" })] }),
            ],
          })] }),
        ],
      }),
      spacer(),

      h2("1.2  Datenfluss Chat-Anfrage"),
      p("Eine typische Chat-Anfrage durchläuft folgende Stationen:"),
      bullet("Nutzer sendet Nachricht über Open WebUI (TLS-verschlüsselt)"),
      bullet("API-Gateway validiert JWT, extrahiert tenant_id aus Token-Claims"),
      bullet("Bei RAG-Anfrage: RAG-Service sucht relevante Dokumente in pgvector (isoliert pro Tenant)"),
      bullet("LLM-Service leitet Anfrage + Kontext an Ollama weiter (lokales Modell)"),
      bullet("Antwort wird per Server-Sent Events (Streaming) zurück an den Nutzer geliefert"),
      bullet("Kein Prompt-Inhalt wird persistiert (DSGVO Art. 9, § 35 SGB I)"),
      spacer(),

      h2("1.3  Mandantentrennung"),
      p("Jeder DRK-Kreisverband ist ein eigenständiger Mandant (Tenant). Die Trennung wird auf zwei Ebenen durchgesetzt:"),
      bullet("Datenbank: PostgreSQL Row-Level Security (RLS) mit tenant_id als Partition. Die Datenbankfunktion current_tenant_id() liest den Tenant ausschließlich aus der gesetzten Session-Variable, die ihrerseits aus dem validierten JWT-Token gespeist wird."),
      bullet("Vektordatenbank: pgvector-Einträge tragen tenant_id als Filterfeld. Suchanfragen des RAG-Service enthalten immer einen Tenant-Filter – ein Zugriff auf fremde Wissensdatenbanken ist auf Query-Ebene strukturell ausgeschlossen."),
      new Paragraph({ children: [new PageBreak()] }),

      // ── 2. Hardware-Dimensionierung ───────────────────────────────────────
      h1("2  Hardware-Dimensionierung nach Betriebsszenario"),
      p("Die Anforderungen des Lastenhefts (§ 6.1) schreiben eine Time-to-First-Token von unter 2 Sekunden vor. Dieser Wert ist bei lokal betriebenen LLMs maßgeblich durch die GPU-Leistung bestimmt. Die nachfolgende Dimensionierung geht vom Zielmodell Qwen2.5 32B in Q4-Quantisierung (ca. 18 GB VRAM) aus, das die beste Balance aus Antwortqualität und Geschwindigkeit für den Anwendungsfall bietet."),
      spacer(),

      h2("2.1  Szenario A – Pilot (1 Kreisverband)"),
      tableTitle("Tabelle 1: Hardware Szenario A"),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [2800, 2419, 4419],
        rows: [
          new TableRow({ children: [hcell("Komponente", 2800), hcell("Spezifikation", 2419), hcell("Hinweis", 4419)] }),
          new TableRow({ children: [cell("Server (1×)", {width:2800}), cell("32 CPU-Kerne, 128 GB RAM", {width:2419}), cell("z.B. Dell PowerEdge R750 oder HPE ProLiant DL380 Gen11", {width:4419})] }),
          new TableRow({ children: [cell("GPU", {width:2800}), cell("1× NVIDIA A10G (24 GB VRAM)", {width:2419}), cell("Alternativ: AMD MI210 (64 GB HBM2e) – mehr VRAM, geringer Takt", {width:4419})] }),
          new TableRow({ children: [cell("Storage", {width:2800}), cell("2 TB NVMe SSD", {width:2419}), cell("RAID 1 empfohlen; Modell-Daten (~20 GB) + pgvector-Index", {width:4419})] }),
          new TableRow({ children: [cell("Netzwerk", {width:2800}), cell("1 GbE", {width:2419}), cell("Ausreichend für 20 gleichzeitige Nutzer bei lokalem Betrieb", {width:4419})] }),
          new TableRow({ children: [cell("Gleichzeitige Nutzer", {width:2800}), cell("~20", {width:2419}), cell("1 Kreisverband, typischer Verwaltungsbetrieb", {width:4419})] }),
          new TableRow({ children: [cell("Betrieb", {width:2800}), cell("Docker Compose", {width:2419}), cell("Alle Services auf einem Server, kein Kubernetes erforderlich", {width:4419})] }),
        ],
      }),
      spacer(),

      h2("2.2  Szenario B – Mittelbetrieb (5–10 Kreisverbände)"),
      tableTitle("Tabelle 2: Hardware Szenario B"),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [2800, 2419, 4419],
        rows: [
          new TableRow({ children: [hcell("Komponente", 2800), hcell("Spezifikation", 2419), hcell("Hinweis", 4419)] }),
          new TableRow({ children: [cell("LLM-Server (2×)", {width:2800}), cell("je 2× NVIDIA A10G oder 1× A100 80 GB", {width:2419}), cell("Multi-GPU-Betrieb erfordert Ollama-Parallelisierung (mehrere Instanzen)", {width:4419})] }),
          new TableRow({ children: [cell("App-Nodes (3×)", {width:2800}), cell("je 16 Kerne, 64 GB RAM", {width:2419}), cell("API-Gateway, RAG-Service, Admin-Service je als separate Nodes", {width:4419})] }),
          new TableRow({ children: [cell("DB-Server (1× dediziert)", {width:2800}), cell("32 Kerne, 256 GB RAM, NVMe RAID 10", {width:2419}), cell("PostgreSQL-Shared-Buffers = 64 GB; pgvector-Index im RAM halten", {width:4419})] }),
          new TableRow({ children: [cell("Storage gesamt", {width:2800}), cell("~10 TB (NVMe)", {width:2419}), cell("Dokument-Ablage, Backups, Modell-Daten", {width:4419})] }),
          new TableRow({ children: [cell("Netzwerk", {width:2800}), cell("10 GbE zwischen Nodes", {width:2419}), cell("Getrennte VLANs für DB-Traffic und Client-Traffic empfohlen", {width:4419})] }),
          new TableRow({ children: [cell("Gleichzeitige Nutzer", {width:2800}), cell("~100", {width:2419}), cell("5–10 Kreisverbände", {width:4419})] }),
          new TableRow({ children: [cell("Betrieb", {width:2800}), cell("K3s (leichtgewichtiges Kubernetes)", {width:2419}), cell("Automatisches Failover, Health Checks, Rolling Updates", {width:4419})] }),
        ],
      }),
      spacer(),

      h2("2.3  Szenario C – Vollbetrieb (15 Kreisverbände)"),
      tableTitle("Tabelle 3: Hardware Szenario C"),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [2800, 2419, 4419],
        rows: [
          new TableRow({ children: [hcell("Komponente", 2800), hcell("Spezifikation", 2419), hcell("Hinweis", 4419)] }),
          new TableRow({ children: [cell("K8s Control Plane (3×)", {width:2800}), cell("je 8 Kerne, 32 GB RAM", {width:2419}), cell("HA-Cluster, etcd-Quorum", {width:4419})] }),
          new TableRow({ children: [cell("Worker Nodes (6×)", {width:2800}), cell("je 16 Kerne, 64 GB RAM", {width:2419}), cell("Pods für App-Services, dynamisch skalierbar", {width:4419})] }),
          new TableRow({ children: [cell("GPU-Pool", {width:2800}), cell("4× A10G oder 2× A100 80 GB", {width:2419}), cell("Ollama mit nvidia-device-plugin in Kubernetes; Queue-basierte Lastverteilung", {width:4419})] }),
          new TableRow({ children: [cell("DB-Cluster", {width:2800}), cell("Primary + 2 Read Replicas", {width:2419}), cell("Patroni oder Citus; automatisches Failover; pgvector auf Primary", {width:4419})] }),
          new TableRow({ children: [cell("Object Storage", {width:2800}), cell("MinIO (self-hosted)", {width:2419}), cell("S3-kompatibel für Dokument-Uploads; 3-Node-Cluster, 20 TB", {width:4419})] }),
          new TableRow({ children: [cell("Netzwerk", {width:2800}), cell("25 GbE Spine-Leaf", {width:2419}), cell("BGP zwischen Cluster-Nodes; dediziertes GPU-Fabric empfohlen", {width:4419})] }),
          new TableRow({ children: [cell("Gleichzeitige Nutzer", {width:2800}), cell("~250", {width:2419}), cell("Alle 15 Kreisverbände im Vollbetrieb", {width:4419})] }),
        ],
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // ── 3. Antwortzeit-Analyse ────────────────────────────────────────────
      h1("3  Antwortzeit-Analyse"),
      p("Das Lastenheft (§ 6.1) fordert eine Time-to-First-Token (TTFT) von unter 2 Sekunden. Dieser Wert beschreibt den Zeitraum zwischen Absenden der Nutzeranfrage und Erscheinen des ersten Ausgabetokens. Er ist für die wahrgenommene Reaktionszeit entscheidender als die Gesamtdauer der Antwortgenerierung, da Streaming-Ausgabe den Rest der Antwort kontinuierlich liefert."),
      spacer(),

      h2("3.1  Time-to-First-Token nach GPU-Klasse"),
      tableTitle("Tabelle 4: TTFT-Schätzwerte für Qwen2.5 32B Q4, Prompt ~500 Tokens"),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [2400, 1600, 1600, 1600, 2438],
        rows: [
          new TableRow({ children: [hcell("GPU", 2400), hcell("VRAM", 1600), hcell("TTFT (warm)", 1600), hcell("TTFT (kalt)", 1600), hcell("Parallelkapazität", 2438)] }),
          new TableRow({ children: [cell("NVIDIA A10G", {width:2400}), cell("24 GB", {width:1600}), cell("0,8–1,2 s", {width:1600}), cell("8–12 s*", {width:1600}), cell("1–2 gleichzeitige Anfragen", {width:2438})] }),
          new TableRow({ children: [cell("NVIDIA A100 SXM (80 GB)", {width:2400}), cell("80 GB", {width:1600}), cell("0,4–0,7 s", {width:1600}), cell("5–8 s*", {width:1600}), cell("3–5 gleichzeitige Anfragen", {width:2438})] }),
          new TableRow({ children: [cell("2× NVIDIA A10G (Multi-GPU)", {width:2400}), cell("2× 24 GB", {width:1600}), cell("0,6–0,9 s", {width:1600}), cell("8–12 s*", {width:1600}), cell("2–4 gleichzeitige Anfragen", {width:2438})] }),
          new TableRow({ children: [cell("CPU only (kein GPU)", {width:2400}), cell("–", {width:1600}), cell("15–40 s", {width:1600}), cell("30–60 s", {width:1600}), cell("Nicht SLA-konform", {width:2438})] }),
        ],
      }),
      p("* Kaltstart: Modell muss von Disk in VRAM geladen werden. Vermeidbar durch Ollama keep_alive-Parameter (Modell im VRAM halten zwischen Anfragen)."),
      spacer(),

      h2("3.2  Empfehlungen zur TTFT-Optimierung"),
      bullet("keep_alive konfigurieren: Ollama-Parameter auf „-1“ setzen (Modell permanent im VRAM) oder auf ausreichend langen Zeitraum (z. B. 30 Minuten). Verhindert Kaltstart-Latenz bei Folgeanfragen."),
      bullet("Modell beim Service-Start vorladen: Ollama-API-Aufruf mit einem Dummy-Prompt beim Containerstart stellt sicher, dass das Modell beim ersten echten Nutzer-Request bereits warm ist."),
      bullet("Batch-Größe: Bei parallelen Anfragen Ollama-Parallelisierung (num_parallel) begrenzen, um TTFT stabil zu halten. Lieber zwei Anfragen sequenziell mit 1,2 s TTFT als vier parallel mit 4 s TTFT."),
      bullet("Streaming als Pflicht: Server-Sent Events ab erstem Token. Die wahrgenommene Wartezeit sinkt für den Nutzer auf TTFT, auch wenn die Gesamtantwort länger benötigt."),
      bullet("Kleineres Modell für einfache Aufgaben: Für Klassifikations- oder Extraktionsaufgaben (ohne Langtext-Generierung) kann ein 7B-Modell (Qwen2.5 7B, ~4 GB VRAM) parallel auf derselben GPU betrieben werden – TTFT dann unter 0,3 s."),
      new Paragraph({ children: [new PageBreak()] }),

      // ── 4. Netzwerk-Anforderungen ─────────────────────────────────────────
      h1("4  Netzwerk-Anforderungen"),

      h2("4.1  Interne Bandbreite (Service-zu-Service)"),
      tableTitle("Tabelle 5: Interne Netzwerkanforderungen"),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [3200, 2000, 4438],
        rows: [
          new TableRow({ children: [hcell("Verbindung", 3200), hcell("Mindestbandbreite", 2000), hcell("Begründung", 4438)] }),
          new TableRow({ children: [cell("API-Gateway → LLM-Service", {width:3200}), cell("1 GbE", {width:2000}), cell("Streaming-Antworten, typisch < 1 MB/Anfrage", {width:4438})] }),
          new TableRow({ children: [cell("API-Gateway → RAG-Service", {width:3200}), cell("1 GbE", {width:2000}), cell("Query + Kontext-Chunks, typisch < 100 KB", {width:4438})] }),
          new TableRow({ children: [cell("RAG-Service → PostgreSQL", {width:3200}), cell("10 GbE empfohlen", {width:2000}), cell("pgvector-ANN-Suche über große Embedding-Tabellen, latenzempfindlich", {width:4438})] }),
          new TableRow({ children: [cell("LLM-Service → Ollama", {width:3200}), cell("10 GbE bei Multi-GPU", {width:2000}), cell("Große Modellgewichte zwischen Nodes (Multi-GPU-Splitting)", {width:4438})] }),
        ],
      }),
      spacer(),

      h2("4.2  Nutzer-Anbindung (Kreisverband → Zentralserver)"),
      bullet("Mindestbandbreite pro Kreisverband: 50 Mbit/s symmetrisch (ausreichend für 20 gleichzeitige Streaming-Sessions)"),
      bullet("Empfohlen: 100 Mbit/s bei Vollbetrieb mit intensiver RAG-Nutzung (große Dokument-Downloads)"),
      bullet("Latenz zurä Zentralinfrastruktur: Irrelevant für TTFT (dominiert durch GPU-Latenz), aber für Streaming-Qualität: < 50 ms empfohlen"),
      spacer(),

      h2("4.3  VPN / Netzwerksegmentierung"),
      bullet("Wenn KV-übergreifend zentral betrieben: Site-to-Site-VPN zwischen Kreisverband-Standorten und Zentralrechenzentrum (WireGuard oder IPsec)"),
      bullet("Alternativ: Dediziertes MPLS/SD-WAN über DRK-LV-MV-Backbone (abhängig von bestehender IT-Infrastruktur des DRK LV MV)"),
      bullet("Netzwerksegmentierung im Cluster: Getrennte VLANs für Management-Traffic, DB-Traffic und Client-Traffic; Kubernetes NetworkPolicies verhindern cross-namespace Kommunikation"),
      bullet("Firewall-Freigaben (Vorlaufzeit 4–8 Wochen einplanen): Port 443 (HTTPS), Port 8080 (Keycloak intern), keine direkten Datenbankports nach außen"),
      new Paragraph({ children: [new PageBreak()] }),

      // ── 5. Backup & Verfügbarkeit ─────────────────────────────────────────
      h1("5  Backup & Verfügbarkeit"),

      h2("5.1  Ziel-SLAs"),
      tableTitle("Tabelle 6: Verfügbarkeits- und Recovery-Ziele"),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [2400, 1600, 1600, 4038],
        rows: [
          new TableRow({ children: [hcell("Komponente", 2400), hcell("RTO", 1600), hcell("RPO", 1600), hcell("Bemerkung", 4038)] }),
          new TableRow({ children: [cell("PostgreSQL (Sozialdaten)", {width:2400}), cell("4 Stunden", {width:1600}), cell("1 Stunde", {width:1600}), cell("Point-in-Time-Recovery via WAL-Archivierung; Patroni-Failover", {width:4038})] }),
          new TableRow({ children: [cell("pgvector-Index", {width:2400}), cell("8 Stunden", {width:1600}), cell("24 Stunden", {width:1600}), cell("Index aus Dokumenten rekonstruierbar; kein harter Datenverlust", {width:4038})] }),
          new TableRow({ children: [cell("Dokument-Storage (MinIO)", {width:2400}), cell("4 Stunden", {width:1600}), cell("1 Stunde", {width:1600}), cell("MinIO-Replikation zwischen Nodes; tägliches Offsite-Backup", {width:4038})] }),
          new TableRow({ children: [cell("App-Services (stateless)", {width:2400}), cell("< 5 Minuten", {width:1600}), cell("n/a", {width:1600}), cell("Kubernetes Rolling Restart; kein persistenter State in App-Services", {width:4038})] }),
          new TableRow({ children: [cell("Ollama / LLM-Modelle", {width:2400}), cell("30 Minuten", {width:1600}), cell("n/a", {width:1600}), cell("Modelle aus Ollama-Hub nachladbar; Offline-Kopie im lokalen Storage", {width:4038})] }),
        ],
      }),
      spacer(),

      h2("5.2  Backup-Strategie"),
      bullet("PostgreSQL: Continuous WAL Archiving (pgBackRest oder Barman) + täglicher Base Backup; Aufbewahrung 30 Tage"),
      bullet("Dokumente / MinIO: tägliches inkrementelles Backup auf separates NAS/JBOD; wochentliches Full Backup; Offsite-Replikation in zweites deutsches RZ empfohlen"),
      bullet("Kubernetes-Konfiguration: GitOps (alle Manifeste in Git); Wiederherstellung aus Repository ohne Datenverlust möglich"),
      bullet("Verschlüsselung Backups: AES-256; Schlüssel getrennt von Backup-Medien verwahren (Hardware Security Module oder separates Vault)"),
      bullet("Backup-Tests: Monatlicher Restore-Test als Pflicht (Go-Live-Kriterium laut Lastenheft)"),
      new Paragraph({ children: [new PageBreak()] }),

      // ── 6. Kostenrahmen ───────────────────────────────────────────────────
      h1("6  Kostenrahmen-Orientierung"),
      p("Die nachfolgenden Werte sind Orientierungsrahmen auf Basis aktueller Listenpreise (Stand: Q2 2026) und erfahrungsbasierter Betriebskosten. Sie ersetzen kein verbindliches Angebot. Tatsächliche Kosten hängen von Ausschreibungsergebnissen, bestehender Infrastruktur und Supportverträgen ab."),
      spacer(),

      h2("6.1  Hardware-Investitionen (einmalig)"),
      tableTitle("Tabelle 7: Geschätzte Hardware-Einmalkosten"),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [3200, 2000, 2000, 2438],
        rows: [
          new TableRow({ children: [hcell("Komponente", 3200), hcell("Szenario A", 2000), hcell("Szenario B", 2000), hcell("Szenario C", 2438)] }),
          new TableRow({ children: [cell("Server-Hardware", {width:3200}), cell("20.000–30.000 €", {width:2000}), cell("80.000–120.000 €", {width:2000}), cell("180.000–260.000 €", {width:2438})] }),
          new TableRow({ children: [cell("GPU(s)", {width:3200}), cell("8.000–15.000 €", {width:2000}), cell("30.000–60.000 €", {width:2000}), cell("60.000–120.000 €", {width:2438})] }),
          new TableRow({ children: [cell("Storage & Netzwerk", {width:3200}), cell("3.000–6.000 €", {width:2000}), cell("15.000–25.000 €", {width:2000}), cell("30.000–50.000 €", {width:2438})] }),
          new TableRow({ children: [cell("Installation & Inbetriebnahme", {width:3200}), cell("5.000–10.000 €", {width:2000}), cell("15.000–25.000 €", {width:2000}), cell("25.000–40.000 €", {width:2438})] }),
          new TableRow({ children: [
            cell("Gesamtrahmen (Hardware)", {width:3200, bold:true}),
            cell("36.000–61.000 €", {width:2000, bold:true}),
            cell("140.000–230.000 €", {width:2000, bold:true}),
            cell("295.000–470.000 €", {width:2438, bold:true}),
          ]}),
        ],
      }),
      spacer(),

      h2("6.2  Betrieb & Wartung (jährlich, wiederkehrend)"),
      tableTitle("Tabelle 8: Geschätzte jährliche Betriebskosten"),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [3200, 2000, 2000, 2438],
        rows: [
          new TableRow({ children: [hcell("Position", 3200), hcell("Szenario A", 2000), hcell("Szenario B", 2000), hcell("Szenario C", 2438)] }),
          new TableRow({ children: [cell("Hardware-Wartung (3-Jahre-Vertrag)", {width:3200}), cell("2.000–3.000 €", {width:2000}), cell("8.000–15.000 €", {width:2000}), cell("18.000–30.000 €", {width:2438})] }),
          new TableRow({ children: [cell("RZ-Betrieb (Strom, Kühlung, Rack)", {width:3200}), cell("3.000–6.000 €", {width:2000}), cell("10.000–18.000 €", {width:2000}), cell("20.000–35.000 €", {width:2438})] }),
          new TableRow({ children: [cell("Software-Wartung & Support (ST Computer)", {width:3200}), cell("nach Vereinbarung", {width:2000}), cell("nach Vereinbarung", {width:2000}), cell("nach Vereinbarung", {width:2438})] }),
          new TableRow({ children: [cell("Modell-Updates / LLM-Upgrading", {width:3200}), cell("1.000–2.000 €", {width:2000}), cell("2.000–5.000 €", {width:2000}), cell("5.000–10.000 €", {width:2438})] }),
          new TableRow({ children: [
            cell("Gesamtrahmen (Betrieb p.a.)", {width:3200, bold:true}),
            cell("6.000–11.000 €", {width:2000, bold:true}),
            cell("20.000–38.000 €", {width:2000, bold:true}),
            cell("43.000–75.000 €", {width:2438, bold:true}),
          ]}),
        ],
      }),
      p("Hinweis: Bei zentralem Betrieb durch DRK LV MV mit Umlage auf Kreisverbände (15 KV): Betriebskosten pro Kreisverband ca. 2.900–5.000 €/Jahr (Szenario C). Vergleichskosten kommerzieller Cloud-KI-Dienste für vergleichbare Nutzungsintensität: 6.000–12.000 €/KV/Jahr, ohne Datenschutz-Eignung für Sozialdaten."),
      spacer(),

      // ── 7. Empfehlung ─────────────────────────────────────────────────────
      h1("7  Empfehlung für den Einstieg"),
      p("Empfohlen wird ein zweistufiges Vorgehen:"),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: "Stufe 1 – Pilot mit Szenario A: Ein Kreisverband, ein Server mit A10G GPU, Docker Compose. Ziel: Funktionalitätsnachweis, User-Acceptance-Testing, Messung realer TTFT und Nutzungsintensität. Dauer: 3–6 Monate.", font: "Arial", size: 22 })],
        spacing: { after: 100 },
      }),
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun({ text: "Stufe 2 – Rollout mit Szenario B oder C: Auf Basis der Pilot-Messdaten Hardware-Dimensionierung präzisieren und stufenweise auf weitere Kreisverbände ausrollen. GPU-Pool nachrüsten nach Auslastungsdaten.", font: "Arial", size: 22 })],
        spacing: { after: 120 },
      }),
      p("Kritischer Erfolgsfaktor: Das Modell muss beim Service-Start in den VRAM geladen und dauerhaft dort gehalten werden (Ollama keep_alive). Ohne diese Maßnahme ist das TTFT-Ziel von < 2 s im Produktivbetrieb nicht verlässlich erreichbar."),
    ],
  }],
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("C:\\Projekte\\drk-mv-ki-plattform\\docs\\Systemuebersicht-DRK-MV-KI-Plattform.docx", buffer);
  console.log("Dokument erstellt.");
});
