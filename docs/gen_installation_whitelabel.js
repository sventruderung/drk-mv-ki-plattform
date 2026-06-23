const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber, LevelFormat,
} = require('docx');
const fs = require('fs');
const path = require('path');

// kv-brain-Farben
const BLUE = "235FA6";
const BLUE_LIGHT = "EAF1FA";
const GREEN = "2EA64C";
const GRAY_DARK = "333333";
const GRAY_MID = "666666";
const GRAY_LIGHT = "F5F5F5";
const BORDER = "CCCCCC";
const ORANGE = "C75B00";
const ORANGE_LIGHT = "FBF0E6";
const GREEN_LIGHT = "E8F5EC";
const YELLOW_LIGHT = "FFFBE6";

const PAGE_WIDTH = 11906;
const MARGIN = 1134;
const CW = PAGE_WIDTH - 2 * MARGIN;

const bd = (c = BORDER) => ({ style: BorderStyle.SINGLE, size: 1, color: c });
const borders = (c = BORDER) => ({ top: bd(c), bottom: bd(c), left: bd(c), right: bd(c) });

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true,
    children: [new TextRun({ text, font: "Arial", size: 30, bold: true, color: BLUE })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 100 },
    children: [new TextRun({ text, font: "Arial", size: 24, bold: true, color: GRAY_DARK })] });
}
function para(text, opts = {}) {
  return new Paragraph({ spacing: { before: 70, after: 70 },
    children: [new TextRun({ text, font: "Arial", size: 20, color: GRAY_DARK, ...opts })] });
}
function bullet(text, level = 0) {
  return new Paragraph({ numbering: { reference: "b", level }, spacing: { before: 30, after: 30 },
    children: [new TextRun({ text, font: "Arial", size: 20, color: GRAY_DARK })] });
}
function numbered(text) {
  return new Paragraph({ numbering: { reference: "n", level: 0 }, spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, font: "Arial", size: 20, color: GRAY_DARK })] });
}
function spacer(b = 100, a = 100) {
  return new Paragraph({ spacing: { before: b, after: a }, children: [new TextRun("")] });
}
function codeBlock(lines) {
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [CW],
    rows: [new TableRow({ children: [new TableCell({
      borders: borders("888888"), width: { size: CW, type: WidthType.DXA },
      shading: { fill: "1E1E1E", type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 200, right: 200 },
      children: lines.map(l => new Paragraph({ spacing: { before: 20, after: 20 },
        children: [new TextRun({ text: l, font: "Courier New", size: 18, color: "D4D4D4" })] })),
    })] })] });
}
function box(title, lines, bg, bc) {
  const children = [];
  if (title) children.push(new Paragraph({ spacing: { before: 50, after: 50 },
    children: [new TextRun({ text: title, font: "Arial", size: 20, bold: true, color: bc })] }));
  for (const l of lines) children.push(new Paragraph({ spacing: { before: 35, after: 35 },
    children: [new TextRun({ text: l, font: "Arial", size: 19, color: GRAY_DARK })] }));
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [CW],
    rows: [new TableRow({ children: [new TableCell({
      borders: { top: bd(bc), bottom: bd(bc), left: { style: BorderStyle.SINGLE, size: 14, color: bc }, right: bd(bc) },
      width: { size: CW, type: WidthType.DXA }, shading: { fill: bg, type: ShadingType.CLEAR },
      margins: { top: 110, bottom: 110, left: 200, right: 200 }, children,
    })] })] });
}
const info = (t, l) => box(t, l, BLUE_LIGHT, BLUE);
const warn = (t, l) => box(t, l, ORANGE_LIGHT, ORANGE);
const ok = (t, l) => box(t, l, GREEN_LIGHT, "1A7340");
const check = (t, l) => box(t, l, YELLOW_LIGHT, "B8860B");

function table(headers, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const head = new TableRow({ tableHeader: true, children: headers.map((h, i) => new TableCell({
    borders: borders(), width: { size: widths[i], type: WidthType.DXA },
    shading: { fill: BLUE, type: ShadingType.CLEAR }, margins: { top: 70, bottom: 70, left: 110, right: 110 },
    children: [new Paragraph({ children: [new TextRun({ text: h, font: "Arial", size: 19, bold: true, color: "FFFFFF" })] })] })) });
  const body = rows.map((r, ri) => new TableRow({ children: r.map((c, ci) => new TableCell({
    borders: borders(), width: { size: widths[ci], type: WidthType.DXA },
    shading: { fill: ri % 2 ? GRAY_LIGHT : "FFFFFF", type: ShadingType.CLEAR },
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    children: [new Paragraph({ children: [new TextRun({ text: c, font: "Arial", size: 19, color: GRAY_DARK })] })] })) }));
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: widths, rows: [head, ...body] });
}

const C = [];

// ── Titel ──
C.push(spacer(1800, 0));
C.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 },
  children: [new TextRun({ text: "kv", font: "Arial", size: 60, bold: true, color: GREEN }),
             new TextRun({ text: "brain", font: "Arial", size: 60, bold: true, color: BLUE })] }));
C.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 500 },
  children: [new TextRun({ text: "Installationsanleitung — KI-Plattform auf NVIDIA DGX Spark", font: "Arial", size: 30, color: GRAY_DARK })] }));
C.push(table(["", ""], [
  ["Branch", "feat/white-label-mono"],
  ["Zielumgebung", "NVIDIA DGX Spark (PNY oder ASUS)"],
  ["Betriebssystem", "NVIDIA DGX OS (Ubuntu-basiert, ARM64)"],
  ["Lokales LLM", "Qwen3 32B via Ollama"],
  ["Module", "Wissensbasis (RAG), Externe Modelle, Dokumentensystem (ELO)"],
  ["Stand", "Juni 2026"],
], [Math.floor(CW/2), Math.ceil(CW/2)]));
C.push(spacer(300, 0));
C.push(new Paragraph({ alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "ST COMPUTER GmbH", font: "Arial", size: 18, color: GRAY_MID })] }));

// ── 1 Überblick ──
C.push(h1("1  Überblick"));
C.push(para("Diese Anleitung beschreibt die Installation der White-Label-Variante der KI-Plattform auf einem NVIDIA DGX Spark. Die Plattform läuft vollständig lokal — kein Datenbyte verlässt das System ungefragt."));
C.push(spacer(60, 40));
C.push(ok("Was diese Variante ausmacht", [
  "Organisationsneutral: Markenname, Farbe und Logo per .env konfigurierbar (Standard: kv-brain)",
  "Frei benennbare Wissensdatenbanken mit rollenbasiertem Zugriff",
  "Sichtbarkeits-Gruppen: Alle, GF, Verwaltung, Datenschutz, ESF BRB, Panel, Rehapro, my turn",
  "Drei Module: Wissensbasis (RAG), externe KI-Modelle (optional), Dokumentensystem (ELO)",
  "HTTPS, SSO über Keycloak (mit/ohne Active Directory), Audit-Log, Monitoring, Backup",
]));
C.push(spacer(80, 60));
C.push(h2("1.1  Laufende Dienste"));
C.push(table(["Dienst", "Port", "Funktion"], [
  ["caddy", "80/443", "HTTPS-Reverse-Proxy, Let's-Encrypt-Zertifikate"],
  ["open-webui", "3000", "Benutzeroberfläche (Chat, Wissensbasis via Pipes)"],
  ["api-gateway", "8000", "Eintrittspunkt, JWT-Prüfung, Verwaltungs-UI unter /admin"],
  ["rag-service", "8001", "Vektorsuche, Reranking, ACL-geprüfte Antworten mit Zitaten"],
  ["llm-service", "8002", "Modell-Routing: Ollama lokal + optional OpenAI/Anthropic"],
  ["connector-service", "8004", "Connector-Registry (Tenant-Freigaben)"],
  ["elo-connector", "8006", "Adapter zum ELO-Dokumentensystem (read-only)"],
  ["postgres", "5432", "Datenbank + pgvector, Row-Level Security, Audit-Log"],
  ["keycloak", "8080", "Authentifizierung, Rollen, SSO/OIDC, optional AD"],
  ["minio", "9000", "Objektspeicher (Original-Dokumente)"],
  ["ollama", "11434", "LLM-Engine im Container mit GPU-Zugriff (GB10)"],
], [2300, 900, Math.floor(CW - 3200)]));

// ── 2 Phase 0 Hardware ──
C.push(h1("2  Phase 0 — Hardware in Betrieb nehmen"));
C.push(para("Der DGX Spark kommt mit vorinstalliertem DGX OS (Ubuntu, ARM64), Docker CE ist enthalten."));
C.push(h2("2.1  Netzwerk + System"));
C.push(codeBlock([
  "# Feste IP im Netz vergeben (Beispiel)",
  "sudo nmcli con mod \"Wired connection 1\" \\",
  "  ipv4.addresses 192.168.168.x/24 ipv4.gateway 192.168.168.1 \\",
  "  ipv4.dns \"192.168.168.1\" ipv4.method manual",
  "sudo nmcli con up \"Wired connection 1\"",
  "",
  "# System aktualisieren, Docker-Gruppe, Compose-Plugin",
  "sudo apt update && sudo apt full-upgrade -y",
  "sudo apt install -y docker-compose-plugin python3-httpx",
  "sudo usermod -aG docker $USER && newgrp docker",
]));
C.push(spacer(80, 50));
C.push(warn("Wichtig", [
  "Nach dem Hinzufügen zur docker-Gruppe die SSH-Sitzung neu starten,",
  "sonst schlägt jeder docker-Befehl mit 'permission denied' fehl.",
]));

// ── 3 Phase 1 Installation ──
C.push(h1("3  Phase 1 — Repository und Branch"));
C.push(h2("3.1  Repository klonen und White-Label-Branch auschecken"));
C.push(codeBlock([
  "git clone https://github.com/sventruderung/drk-mv-ki-plattform.git",
  "cd drk-mv-ki-plattform",
  "",
  "# WICHTIG: den White-Label-Branch verwenden",
  "git checkout feat/white-label-mono",
  "git branch --show-current        # muss feat/white-label-mono zeigen",
]));
C.push(spacer(100, 60));
C.push(h2("3.2  Setup-Skript ausführen"));
C.push(para("Das Skript erstellt die .env mit sicheren Zufalls-Passwörtern, baut die Container und lädt die Modelle. Die White-Label-Werte (kv-brain) sind als Standard hinterlegt."));
C.push(codeBlock([
  "bash scripts/setup_dgx.sh",
  "# fragt nur die Kontakt-E-Mail für Let's Encrypt ab",
]));
C.push(spacer(80, 60));
C.push(h2("3.3  Branding und Gruppen prüfen (.env)"));
C.push(para("In der erzeugten .env sind die White-Label-Variablen vorbelegt. Bei Bedarf anpassen:"));
C.push(codeBlock([
  "nano .env",
  "",
  "BRAND_NAME=kv-brain",
  "BRAND_COLOR=#235FA6",
  "BRAND_LOGO=logo.svg",
  "ACL_GROUPS=alle:Alle Mitarbeitenden,gf:GF,verwaltung:Verwaltung,\\",
  "  datenschutz:Datenschutz,esf-brb:ESF BRB,panel:Panel,\\",
  "  rehapro:Rehapro,my-turn:my turn",
]));
C.push(spacer(60, 40));
C.push(info("Logo austauschen (optional)", [
  "Offizielles Logo als services/api-gateway/src/static/admin/logo.svg ablegen.",
  "Für Open WebUI zusätzlich PNGs unter infra/openwebui/branding/ ersetzen",
  "(splash.png, logo.png, favicon.png). Danach Container neu bauen.",
]));

// ── 4 Phase 2 Keycloak ──
C.push(h1("4  Phase 2 — Keycloak einrichten"));
C.push(para("Ein interaktives Skript konfiguriert Keycloak vollständig (Client-Secret, Mapper, Service-Account, Redirect-URIs, Login-Theme, ersten Admin)."));
C.push(codeBlock([
  "python3 scripts/setup_keycloak.py",
  "# Fragen: Name der Organisation, Hostname (optional), Admin-Konto",
  "",
  "# danach Dienste mit neuem Client-Secret neu starten:",
  "docker compose up -d --force-recreate api-gateway open-webui",
]));
C.push(spacer(80, 50));
C.push(h2("4.1  Rollen / Sichtbarkeits-Gruppen"));
C.push(table(["Rolle", "Bedeutung"], [
  ["kv-admin", "Administrator: Nutzer, Dokumente, Freigaben, Einstellungen"],
  ["alle", "Sichtbarkeitsgruppe: Alle Mitarbeitenden (Standard)"],
  ["gf / verwaltung / datenschutz", "Sichtbarkeitsgruppen je Bereich"],
  ["esf-brb / panel / rehapro / my-turn", "Sichtbarkeitsgruppen je Projekt"],
  ["content-editor / content-approver", "(nur falls Social-Media-Modul aktiviert — hier nicht deployt)"],
], [3400, Math.floor(CW - 3400)]));
C.push(spacer(80, 50));
C.push(info("Optional: Active-Directory-Anbindung", [
  "Keycloak User Federation (READ_ONLY, LDAPS). Nutzer kommen dann aus dem AD,",
  "die Rollen-/Gruppenvergabe bleibt im Verwaltungs-UI. Mindestens ein lokales",
  "kv-admin-Konto behalten (Break-Glass). Details: docs/runbooks/ldap-ad-anbindung.md",
]));

// ── 5 Phase 3 Oberfläche ──
C.push(h1("5  Phase 3 — Oberfläche und HTTPS"));
C.push(h2("5.1  Open-WebUI-Pipes installieren"));
C.push(codeBlock([
  "python3 scripts/setup_openwebui.py",
  "# legt bei Bedarf das Open-WebUI-Admin-Konto an und installiert die Pipes:",
  "#   Wissensbasis (RAG), Externe Modelle, Dokumentensystem (ELO)",
]));
C.push(spacer(80, 50));
C.push(h2("5.2  HTTPS aktivieren (sobald DNS steht)"));
C.push(numbered("DNS-Eintrag des Hostnamens auf den Server zeigen lassen, Ports 80/443 freigeben"));
C.push(numbered("python3 scripts/set_host.py <hostname> --https — trägt Hostname, Redirect-URIs und Zertifikats-Freigabe ein"));
C.push(numbered("docker compose up -d --force-recreate api-gateway open-webui"));
C.push(numbered("Erster Aufruf von https://<hostname> stellt das Let's-Encrypt-Zertifikat aus"));
C.push(spacer(60, 40));
C.push(info("Rein internes Netz ohne Internet-Zugang", [
  "Let's Encrypt braucht eine öffentlich erreichbare HTTP-Challenge. Für reinen",
  "Intranetz-Betrieb stattdessen Caddy auf eine interne CA (local_certs) umstellen",
  "und deren Root-Zertifikat per Gruppenrichtlinie verteilen.",
]));
C.push(spacer(80, 50));
C.push(h2("5.3  Verwaltungs-UI"));
C.push(para("Erreichbar unter https://<hostname>/admin (oder http://<ip>:8000/admin intern). Login mit dem kv-admin-Konto. Tabs: Dokumente, Nutzer, Protokoll, Einstellungen."));

// ── 6 Phase 4 Inhalte + Test ──
C.push(h1("6  Phase 4 — Wissensdatenbanken, Nutzer, Test"));
C.push(h2("6.1  Wissensdatenbanken anlegen (Tab Dokumente)"));
C.push(bullet("Über 'Neue anlegen' beliebig benannte Wissensdatenbanken erstellen (z.B. Verwaltung, ESF BRB, Rehapro)"));
C.push(bullet("Über 'Zugriff' je Wissensdatenbank die berechtigten Gruppen festlegen"));
C.push(bullet("Dokumente per Drag-and-Drop, Ordner oder ZIP hochladen — 24 Formate inkl. OCR für Scans; Duplikate werden erkannt"));
C.push(spacer(60, 40));
C.push(h2("6.2  Pilot-Nutzer anlegen (Tab Nutzer)"));
C.push(bullet("Nutzer mit Benutzername + Startpasswort anlegen, passende Sichtbarkeits-Gruppen zuweisen"));
C.push(bullet("Bei AD-Anbindung: Nutzer erscheinen nach erstem Login automatisch; nur Gruppen zuweisen"));
C.push(spacer(60, 40));
C.push(h2("6.3  Funktionstest"));
C.push(numbered("Open WebUI öffnen, über den Login (Keycloak) anmelden"));
C.push(numbered("Modell 'Wissensbasis — alle (lokal)' wählen, Frage zu einem Dokument stellen → Antwort mit Quellenangabe [Quelle: …]"));
C.push(numbered("ACL-Gegenprobe: Nutzer ohne Gruppe X fragt nach einem X-Dokument → 'keine freigegebenen Informationen'"));
C.push(spacer(80, 50));
C.push(check("Installations-Checkliste", [
  "□  Phase 0: DGX im Netz, Docker läuft, System aktuell",
  "□  Phase 1: Branch feat/white-label-mono ausgecheckt, setup_dgx.sh grün",
  "□  Phase 1: .env-Branding geprüft (BRAND_NAME/COLOR/LOGO, ACL_GROUPS)",
  "□  Phase 2: setup_keycloak.py ausgeführt, danach compose force-recreate",
  "□  Phase 3: Pipes installiert, HTTPS aktiv (falls DNS steht)",
  "□  Phase 3: Verwaltungs-UI erreichbar, Systemstatus grün",
  "□  Phase 4: Wissensdatenbanken + Gruppen-Zugriff angelegt, Nutzer eingerichtet",
  "□  Phase 4: Funktionstest + ACL-Gegenprobe bestanden",
  "□  Backup eingerichtet: sudo bash scripts/backup.sh --install",
]));

// ── 7 Betrieb ──
C.push(h1("7  Betrieb und Wartung"));
C.push(h2("7.1  Update einspielen"));
C.push(codeBlock([
  "git pull origin feat/white-label-mono",
  "bash scripts/migrate.sh                # DB-Schema nachziehen (idempotent)",
  "docker compose up -d --build           # geänderte Dienste neu bauen",
  "python3 scripts/setup_openwebui.py     # nur falls Pipes geändert",
]));
C.push(spacer(60, 40));
C.push(h2("7.2  Backup"));
C.push(codeBlock([
  "sudo bash scripts/backup.sh --install  # täglich 02:30 nach /var/backups/drk-ki",
  "bash scripts/backup.sh                 # Probelauf",
]));
C.push(para("Empfehlung: Backup zusätzlich auf ein externes Ziel (NAS) spiegeln. Fehlschläge erscheinen im Monitoring (Verwaltungs-UI → Einstellungen)."));
C.push(spacer(60, 40));
C.push(h2("7.3  Nach OS-Update / Reboot"));
C.push(warn("Wichtig nach 'docker compose down'", [
  "Ein bewusst gestoppter Stack startet NICHT automatisch wieder.",
  "Nach Update/Reboot immer abschließen mit:  docker compose up -d",
]));
C.push(spacer(60, 40));
C.push(h2("7.4  Nach Netz-/IP-Wechsel"));
C.push(codeBlock([
  "python3 scripts/set_host.py            # neue IP automatisch erkennen",
  "python3 scripts/set_host.py <hostname> --https   # öffentlicher Hostname",
]));

// ── 8 Troubleshooting ──
C.push(h1("8  Fehlerbehebung"));
C.push(table(["Symptom", "Ursache / Lösung"], [
  ["Login: 'nicht erreichbar'", "Nach Netzwechsel: scripts/set_host.py ausführen"],
  ["'Invalid username or password'", "kv-admin-Passwort in Keycloak-Konsole zurücksetzen (Temporary off)"],
  ["Chat langsam / 'keine Antwort'", "ollama ps prüfen; Modell muss geladen sein (KEEP_ALIVE=-1)"],
  ["RAG: 'keine freigegebenen Informationen'", "Nutzer-Rollen prüfen (Tab Nutzer); nach Änderung neu anmelden"],
  ["Nutzer-Tab leer/Fehler", "setup_keycloak.py erneut ausführen (Service-Account-Rollen)"],
  ["ELO 'nicht verfügbar'", "ELO_SERVER_IP in .env prüfen; Netz-Route zum ELO-Server"],
  ["Modelle fehlen", "docker compose exec ollama ollama pull qwen3:32b nomic-embed-text qwen3:8b"],
], [3600, Math.floor(CW - 3600)]));
C.push(spacer(80, 50));
C.push(para("Erste Anlaufstelle bei Problemen: Verwaltungs-UI → ⚙️ Einstellungen → Systemstatus. Dort werden alle Dienste, Modelle und der Service-Account mit Lösungshinweis geprüft."));

// ── Dokument ──
const doc = new Document({
  numbering: { config: [
    { reference: "b", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    { reference: "n", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  ] },
  styles: { default: { document: { run: { font: "Arial", size: 20 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, font: "Arial", color: BLUE }, paragraph: { spacing: { before: 480, after: 240 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: GRAY_DARK }, paragraph: { spacing: { before: 260, after: 100 }, outlineLevel: 1 } },
    ] },
  sections: [{
    properties: { page: { size: { width: PAGE_WIDTH, height: 16838 },
      margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } } },
    headers: { default: new Header({ children: [new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } },
      children: [
        new TextRun({ text: "kv", font: "Arial", size: 18, bold: true, color: GREEN }),
        new TextRun({ text: "brain", font: "Arial", size: 18, bold: true, color: BLUE }),
        new TextRun({ text: "  |  Installationsanleitung DGX Spark (White-Label)", font: "Arial", size: 18, color: GRAY_MID }),
      ] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: BORDER, space: 1 } },
      tabStops: [{ type: "right", position: CW }],
      children: [
        new TextRun({ text: "ST COMPUTER GmbH — Vertraulich", font: "Arial", size: 16, color: GRAY_MID }),
        new TextRun({ text: "\tSeite ", font: "Arial", size: 16, color: GRAY_MID }),
        new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: GRAY_MID }),
      ] })] }) },
    children: C,
  }],
});

Packer.toBuffer(doc).then(buffer => {
  const out = path.join(__dirname, "Installationsanleitung-kv-brain-DGX.docx");
  fs.writeFileSync(out, buffer);
  console.log("Erstellt:", out, `(${(buffer.length / 1024).toFixed(0)} KB)`);
});
