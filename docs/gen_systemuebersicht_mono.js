const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, LevelFormat, PageBreak, ImageRun
} = require("docx");
const fs = require("fs");

const BLUE   = "1F4E79";
const LBLUE  = "2E75B6";
const HBLUE  = "D6E4F0";
const LGRAY  = "F2F2F2";
const GREEN  = "1E6B2E";
const LGREEN = "E8F5E9";
const BORDER = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const NOBORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NOBORDERS = { top: NOBORDER, bottom: NOBORDER, left: NOBORDER, right: NOBORDER };

const W = 9638;

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
function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, font: "Arial", size: 22, ...opts })],
    spacing: { after: 120 },
  });
}
function bullet(text, color = "000000") {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun({ text, font: "Arial", size: 22, color })],
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
  const { bold = false, fill = "FFFFFF", color = "000000", width } = opts;
  return new TableCell({
    borders: BORDERS,
    shading: { fill, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 140, right: 140 },
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    children: [new Paragraph({
      children: [new TextRun({ text, font: "Arial", size: 20, bold, color })],
    })],
  });
}
function hcell(text, width) {
  return cell(text, { bold: true, fill: HBLUE, color: BLUE, width });
}
function gcell(text, width) {
  return cell(text, { bold: false, fill: LGREEN, color: GREEN, width });
}
function tableTitle(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: "Arial", size: 20, italics: true, color: "555555" })],
    spacing: { before: 100, after: 60 },
  });
}

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
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: BLUE },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: LBLUE },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
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
          children: [new TextRun({ text: "DRK KV-Einzelinstanz  |  Systemübersicht & Hardware-Dimensionierung (Mono)", font: "Arial", size: 18, color: "888888" })],
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
        children: [new TextRun({ text: "DRK KV-Einzelinstanz", font: "Arial", size: 56, bold: true, color: BLUE })],
        spacing: { before: 1440, after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "Systemübersicht & Hardware-Dimensionierung (Mono)", font: "Arial", size: 34, color: LBLUE })],
        spacing: { after: 160 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "Vereinfachte Architektur für einen einzelnen Kreisverband", font: "Arial", size: 26, color: "555555", italics: true })],
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
            new TableCell({ borders: NOBORDERS, margins: { top: 60, bottom: 60, left: 0, right: 0 }, children: [new Paragraph({ children: [new TextRun({ text: "DRK-Kreisverband (Einzelinstanz)", font: "Arial", size: 20 })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: NOBORDERS, margins: { top: 60, bottom: 60, left: 0, right: 200 }, children: [new Paragraph({ children: [new TextRun({ text: "Erstellt von", font: "Arial", size: 20, bold: true, color: "666666" })] })] }),
            new TableCell({ borders: NOBORDERS, margins: { top: 60, bottom: 60, left: 0, right: 0 }, children: [new Paragraph({ children: [new TextRun({ text: "ST COMPUTER Gesellschaft für angewandte Informatik GmbH", font: "Arial", size: 20 })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: NOBORDERS, margins: { top: 60, bottom: 60, left: 0, right: 200 }, children: [new Paragraph({ children: [new TextRun({ text: "Bezug", font: "Arial", size: 20, bold: true, color: "666666" })] })] }),
            new TableCell({ borders: NOBORDERS, margins: { top: 60, bottom: 60, left: 0, right: 0 }, children: [new Paragraph({ children: [new TextRun({ text: "Vereinfachung aus: Systemuebersicht-DRK-MV-KI-Plattform.docx (Multi-KV)", font: "Arial", size: 20 })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: NOBORDERS, margins: { top: 60, bottom: 60, left: 0, right: 200 }, children: [new Paragraph({ children: [new TextRun({ text: "Version", font: "Arial", size: 20, bold: true, color: "666666" })] })] }),
            new TableCell({ borders: NOBORDERS, margins: { top: 60, bottom: 60, left: 0, right: 0 }, children: [new Paragraph({ children: [new TextRun({ text: "0.1.0  –  Juni 2026", font: "Arial", size: 20 })] })] }),
          ]}),
        ],
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // ── 1. Vergleich Multi-KV vs. Mono ────────────────────────────────────
      h1("1  Was entfällt gegenüber der Multi-KV-Plattform"),
      p("Die Mono-Variante ist eine vereinfachte Einzelinstanz ohne Mandantenfähigkeit. Sie eignet sich für einen einzelnen DRK-Kreisverband, der die Plattform eigenständig betreibt. Die Compliance-Anforderungen (DSGVO Art. 9, § 35 SGB I, Zero-Data-Leak) bleiben vollumfänglich erhalten — lediglich die technische Komplexität der Mandantentrennung entfällt."),
      spacer(),

      tableTitle("Tabelle 1: Vergleich Multi-KV-Plattform vs. KV-Einzelinstanz"),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [3000, 3200, 3438],
        rows: [
          new TableRow({ children: [hcell("Komponente / Aspekt", 3000), hcell("Multi-KV-Plattform", 3200), hcell("KV-Einzelinstanz (Mono)", 3438)] }),
          new TableRow({ children: [cell("Mandantentrennung (RLS)", {width:3000}), cell("Pflicht — PostgreSQL Row-Level Security", {width:3200}), gcell("Entfällt — einfaches Single-Schema", 3438)] }),
          new TableRow({ children: [cell("tenant_id im gesamten Stack", {width:3000}), cell("Überall: JWT, DB, pgvector, Logs", {width:3200}), gcell("Entfällt vollständig", 3438)] }),
          new TableRow({ children: [cell("Admin-Service", {width:3000}), cell("Tenant-Verwaltung, Keycloak-Provisionierung", {width:3200}), gcell("Entfällt oder stark vereinfacht", 3438)] }),
          new TableRow({ children: [cell("Keycloak", {width:3000}), cell("Multi-Realm, komplexes Setup", {width:3200}), gcell("Single-Realm, deutlich einfacher", 3438)] }),
          new TableRow({ children: [cell("Kubernetes / K3s", {width:3000}), cell("Ab Szenario B Pflicht", {width:3200}), gcell("Entfällt — Docker Compose reicht", 3438)] }),
          new TableRow({ children: [cell("MinIO (Object Storage)", {width:3000}), cell("Ab Szenario B für Dokumente", {width:3200}), gcell("Entfällt — lokales Filesystem", 3438)] }),
          new TableRow({ children: [cell("LLM-Modellgröße", {width:3000}), cell("Qwen2.5 32B Q4 (~18 GB VRAM)", {width:3200}), gcell("Qwen2.5 7B–14B Q4 (~4–9 GB VRAM)", 3438)] }),
          new TableRow({ children: [cell("GPU-Anforderung", {width:3000}), cell("NVIDIA A10G (24 GB) Minimum", {width:3200}), gcell("Auch ohne dedizierte GPU möglich*", 3438)] }),
          new TableRow({ children: [cell("RAM-Bedarf gesamt", {width:3000}), cell("128 GB (Szenario A)", {width:3200}), gcell("32–64 GB ausreichend", 3438)] }),
          new TableRow({ children: [cell("Deployment-Komplexität", {width:3000}), cell("Hoch (Microservices + Orchestrierung)", {width:3200}), gcell("Niedrig (docker compose up)", 3438)] }),
          new TableRow({ children: [cell("DSGVO Art. 9 / § 35 SGB I", {width:3000}), cell("Pflicht", {width:3200}), cell("Pflicht — bleibt unverändert", {width:3438, bold:true})] }),
          new TableRow({ children: [cell("Zero-Data-Leak / kein Prompt-Logging", {width:3000}), cell("Pflicht", {width:3200}), cell("Pflicht — bleibt unverändert", {width:3438, bold:true})] }),
        ],
      }),
      p("* GPU empfohlen für TTFT < 2 s. Ohne GPU: TTFT 15–40 s bei 7B-Modell auf modernem Server-CPU (nicht SLA-konform, aber für interne Nutzung tolerierbar)."),
      new Paragraph({ children: [new PageBreak()] }),

      // ── 2. Architektur-Überblick ──────────────────────────────────────────
      h1("2  Architektur-Überblick (Mono)"),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 80 },
        children: [new ImageRun({
          type: "png",
          data: fs.readFileSync("C:\\Projekte\\drk-mv-ki-plattform\\docs\\architecture-mono.png"),
          transformation: { width: 620, height: 428 },
          altText: { title: "Funktionsschaubild Mono", description: "Vereinfachte Architektur KV-Einzelinstanz", name: "architecture-mono" },
        })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: "Abbildung 1: Funktionsschaubild KV-Einzelinstanz", font: "Arial", size: 18, italics: true, color: "555555" })],
      }),

      h2("2.1  Datenfluss"),
      bullet("Mitarbeitende senden Anfragen über Open WebUI (HTTPS im lokalen Netz oder per VPN)"),
      bullet("API-Gateway validiert JWT — ohne Tenant-Logik, da nur ein Nutzerkreis"),
      bullet("RAG-Service durchsucht die lokale Wissensdatenbank (pgvector, kein Tenant-Filter nötig)"),
      bullet("LLM-Service leitet Anfrage an Ollama weiter — lokales Modell, kein Datenbyte nach außen"),
      bullet("Streaming-Antwort wird direkt an den Nutzer zurückgeliefert"),
      spacer(),

      h2("2.2  Was bleibt gleich"),
      bullet("Open WebUI als Frontend — identische Nutzererfahrung"),
      bullet("FastAPI-Microservices-Struktur — Code-Basis bleibt kompatibel mit der Multi-KV-Plattform"),
      bullet("Ollama mit lokalem LLM — Zero-Data-Leak, kein externer API-Aufruf"),
      bullet("Keycloak für Auth — OIDC/OAuth2, AD-Integration, nur als Single-Realm vereinfacht"),
      bullet("PostgreSQL + pgvector für RAG — identische Technologie, kein RLS"),
      bullet("Kein Prompt-Logging — technisch und prozessual wie in der Multi-KV-Variante"),
      spacer(),

      h2("2.3  Upgrade-Pfad zur Multi-KV-Plattform"),
      p("Die Mono-Variante ist bewusst technologisch kompatibel zur Multi-KV-Plattform gestaltet. Ein späterer Upgrade ist möglich durch:"),
      bullet("Einführung von tenant_id in alle Tabellen (Migration) und Aktivierung von RLS"),
      bullet("Erweiterung von Keycloak auf Multi-Realm"),
      bullet("Deployment des Admin-Service"),
      bullet("Wechsel von Docker Compose zu K3s/Kubernetes"),
      p("Eine parallele Entwicklung beider Varianten aus derselben Codebasis ist durch Feature-Flags oder Deployment-Konfiguration umsetzbar."),
      new Paragraph({ children: [new PageBreak()] }),

      // ── 3. Hardware-Dimensionierung ───────────────────────────────────────
      h1("3  Hardware-Dimensionierung"),
      p("Ohne Mandantentrennung und mit reduzierter Modellgröße sinken die Hardware-Anforderungen erheblich. Die folgende Dimensionierung geht vom Zielmodell Qwen2.5 14B Q4 (~8 GB VRAM) aus — gutes Gleichgewicht zwischen Antwortqualität und Hardware-Kosten für einen einzelnen Kreisverband."),
      spacer(),

      h2("3.1  Empfohlene Konfiguration (1 Server)"),
      tableTitle("Tabelle 2: Hardware KV-Einzelinstanz — empfohlene Konfiguration"),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [2600, 2400, 4638],
        rows: [
          new TableRow({ children: [hcell("Komponente", 2600), hcell("Spezifikation", 2400), hcell("Hinweis", 4638)] }),
          new TableRow({ children: [cell("CPU", {width:2600}), cell("16–24 Kerne", {width:2400}), cell("z.B. AMD EPYC 9254 oder Intel Xeon Silver 4416+", {width:4638})] }),
          new TableRow({ children: [cell("RAM", {width:2600}), cell("64 GB DDR5", {width:2400}), cell("32 GB für OS/Services + 24 GB Puffer + 8 GB Modell-Overhead", {width:4638})] }),
          new TableRow({ children: [cell("GPU (empfohlen)", {width:2600}), cell("NVIDIA RTX 4090 (24 GB VRAM)", {width:2400}), cell("Consumer-GPU, deutlich günstiger als A10G — ausreichend für Einzelinstanz", {width:4638})] }),
          new TableRow({ children: [cell("GPU (Minimum)", {width:2600}), cell("NVIDIA RTX 3090 / 4080 (16–24 GB VRAM)", {width:2400}), cell("Für 14B-Modell ausreichend, TTFT ca. 1–2 s", {width:4638})] }),
          new TableRow({ children: [cell("Storage", {width:2600}), cell("1 TB NVMe SSD", {width:2400}), cell("OS + Modell (~10 GB) + Dokumente + DB", {width:4638})] }),
          new TableRow({ children: [cell("Netzwerk", {width:2600}), cell("1 GbE", {width:2400}), cell("Ausreichend für 5–20 gleichzeitige Nutzer im KV", {width:4638})] }),
          new TableRow({ children: [cell("Betrieb", {width:2600}), cell("Docker Compose", {width:2400}), cell("Alle Services auf einem Server, kein Orchestrator nötig", {width:4638})] }),
        ],
      }),
      spacer(),

      h2("3.2  TTFT nach Modell und Hardware"),
      tableTitle("Tabelle 3: Time-to-First-Token Übersicht für KV-Einzelinstanz"),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [2200, 2000, 1800, 1800, 1838],
        rows: [
          new TableRow({ children: [hcell("Modell", 2200), hcell("VRAM-Bedarf", 2000), hcell("GPU RTX 4090", 1800), hcell("GPU A10G", 1800), hcell("CPU only", 1838)] }),
          new TableRow({ children: [cell("Qwen2.5 7B Q4", {width:2200}), cell("~4 GB", {width:2000}), cell("0,3–0,5 s", {width:1800}), cell("0,5–0,8 s", {width:1800}), cell("5–12 s", {width:1838})] }),
          new TableRow({ children: [cell("Qwen2.5 14B Q4", {width:2200}), cell("~8 GB", {width:2000}), cell("0,6–1,0 s", {width:1800}), cell("0,8–1,4 s", {width:1800}), cell("15–30 s", {width:1838})] }),
          new TableRow({ children: [cell("Qwen2.5 32B Q4", {width:2200}), cell("~18 GB", {width:2000}), cell("Passt nicht", {width:1800}), cell("0,8–1,2 s", {width:1800}), cell("nicht praktikabel", {width:1838})] }),
        ],
      }),
      p("Empfehlung: Qwen2.5 14B Q4 auf RTX 4090 — beste Balance aus Qualität, Geschwindigkeit und Kosten für einen einzelnen Kreisverband."),
      spacer(),

      h2("3.3  Kostenrahmen (Einzelinstanz)"),
      tableTitle("Tabelle 4: Geschätzte Kosten KV-Einzelinstanz"),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [4000, 2600, 3038],
        rows: [
          new TableRow({ children: [hcell("Position", 4000), hcell("Betrag (ca.)", 2600), hcell("Hinweis", 3038)] }),
          new TableRow({ children: [cell("Server-Hardware (ohne GPU)", {width:4000}), cell("6.000–10.000 €", {width:2600}), cell("Tower-Server oder 1HE Rack, z.B. Dell PowerEdge T550", {width:3038})] }),
          new TableRow({ children: [cell("GPU NVIDIA RTX 4090 (24 GB)", {width:4000}), cell("1.800–2.200 €", {width:2600}), cell("Consumer-GPU, kein ECC — für Produktion PCIe-Kühlung prüfen", {width:3038})] }),
          new TableRow({ children: [cell("Storage (NVMe SSD 1 TB)", {width:4000}), cell("200–400 €", {width:2600}), cell("Samsung 990 Pro oder gleichwertig", {width:3038})] }),
          new TableRow({ children: [cell("Installation & Inbetriebnahme", {width:4000}), cell("2.000–4.000 €", {width:2600}), cell("ST COMPUTER GmbH", {width:3038})] }),
          new TableRow({ children: [
            cell("Gesamtrahmen Hardware + Inbetriebnahme", {width:4000, bold:true}),
            cell("10.000–16.600 €", {width:2600, bold:true}),
            cell("Einmalig", {width:3038}),
          ]}),
          new TableRow({ children: [cell("Betrieb & Wartung p.a.", {width:4000}), cell("2.000–4.000 €", {width:2600}), cell("Strom, Hardware-Wartung, Software-Updates", {width:3038})] }),
        ],
      }),
      p("Zum Vergleich: Die Multi-KV-Plattform (Szenario A, 1 KV) kostet 36.000–61.000 € Hardware + 6.000–11.000 € p.a. — die Mono-Variante ist ca. 3–4× günstiger in der Einmalanlage."),
      new Paragraph({ children: [new PageBreak()] }),

      // ── 4. Deployment ────────────────────────────────────────────────────
      h1("4  Deployment"),
      h2("4.1  Docker Compose — Übersicht"),
      p("Die gesamte Lösung läuft auf einem einzigen Server mit Docker Compose. Kein Kubernetes, kein Container-Orchestrator, kein Load Balancer."),
      tableTitle("Tabelle 5: Services im Docker Compose Stack"),
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: [2400, 1400, 5838],
        rows: [
          new TableRow({ children: [hcell("Service", 2400), hcell("Port", 1400), hcell("Funktion", 5838)] }),
          new TableRow({ children: [cell("open-webui", {width:2400}), cell("443 (HTTPS)", {width:1400}), cell("Chat-Frontend für Mitarbeitende", {width:5838})] }),
          new TableRow({ children: [cell("api-gateway", {width:2400}), cell("8000 (intern)", {width:1400}), cell("JWT-Validierung, Routing, Streaming", {width:5838})] }),
          new TableRow({ children: [cell("rag-service", {width:2400}), cell("8001 (intern)", {width:1400}), cell("Dokument-Ingest, Embedding, Vektor-Suche", {width:5838})] }),
          new TableRow({ children: [cell("llm-service", {width:2400}), cell("8002 (intern)", {width:1400}), cell("Inferenz-Proxy zu Ollama", {width:5838})] }),
          new TableRow({ children: [cell("ollama", {width:2400}), cell("11434 (intern)", {width:1400}), cell("Lokales LLM — Qwen2.5 14B Q4", {width:5838})] }),
          new TableRow({ children: [cell("postgres", {width:2400}), cell("5432 (intern)", {width:1400}), cell("Datenbank + pgvector für Embeddings", {width:5838})] }),
          new TableRow({ children: [cell("keycloak", {width:2400}), cell("8080 (intern)", {width:1400}), cell("Auth — Single-Realm für den Kreisverband", {width:5838})] }),
        ],
      }),
      spacer(),

      h2("4.2  Start und Betrieb"),
      bullet("Start: docker compose up -d"),
      bullet("Modell vorladen: ollama pull qwen2.5:14b (einmalig, ~5 GB Download)"),
      bullet("Backup: pg_dump täglich per Cronjob + Kopie auf externes NAS"),
      bullet("Updates: docker compose pull && docker compose up -d (rollierender Neustart)"),
      bullet("Monitoring: docker compose logs -f — kein dediziertes Monitoring-Stack nötig für Einzelinstanz"),
      spacer(),

      h2("4.3  Netzwerk"),
      bullet("Intern: Alle Service-zu-Service-Kommunikation im Docker-Bridge-Netz — nicht von außen erreichbar"),
      bullet("Extern: Nur Port 443 (HTTPS, Open WebUI) und 8080 (Keycloak Admin) freigeben"),
      bullet("Zugang der Mitarbeitenden: Direkt im LAN oder per VPN (WireGuard empfohlen)"),
      bullet("Kein öffentlicher Internetzugang des Servers erforderlich nach Ersteinrichtung"),
    ],
  }],
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("C:\\Projekte\\drk-mv-ki-plattform\\docs\\Systemuebersicht-DRK-KV-mono.docx", buffer);
  console.log("Dokument erstellt.");
});
