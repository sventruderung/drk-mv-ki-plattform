const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageNumber, LevelFormat, PageBreak,
} = require('docx');
const fs = require('fs');
const path = require('path');

const RED = "E2001A";        // DRK-Rot
const RED_LIGHT = "FBE9EB";
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

function h1(t) { return new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true,
  children: [new TextRun({ text: t, font: "Arial", size: 30, bold: true, color: RED })] }); }
function h2(t) { return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 100 },
  children: [new TextRun({ text: t, font: "Arial", size: 24, bold: true, color: GRAY_DARK })] }); }
function para(t, opts = {}) { return new Paragraph({ spacing: { before: 70, after: 70 },
  children: [new TextRun({ text: t, font: "Arial", size: 20, color: GRAY_DARK, ...opts })] }); }
function bullet(t) { return new Paragraph({ numbering: { reference: "b", level: 0 }, spacing: { before: 30, after: 30 },
  children: [new TextRun({ text: t, font: "Arial", size: 20, color: GRAY_DARK })] }); }
function numbered(t) { return new Paragraph({ numbering: { reference: "n", level: 0 }, spacing: { before: 40, after: 40 },
  children: [new TextRun({ text: t, font: "Arial", size: 20, color: GRAY_DARK })] }); }
function spacer(b = 100, a = 100) { return new Paragraph({ spacing: { before: b, after: a }, children: [new TextRun("")] }); }
function codeBlock(lines) {
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [CW],
    rows: [new TableRow({ children: [new TableCell({
      borders: borders("888888"), width: { size: CW, type: WidthType.DXA },
      shading: { fill: "1E1E1E", type: ShadingType.CLEAR }, margins: { top: 120, bottom: 120, left: 200, right: 200 },
      children: lines.map(l => new Paragraph({ spacing: { before: 20, after: 20 },
        children: [new TextRun({ text: l, font: "Courier New", size: 18, color: "D4D4D4" })] })) })] })] });
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
      margins: { top: 110, bottom: 110, left: 200, right: 200 }, children })] })] });
}
const info = (t, l) => box(t, l, RED_LIGHT, RED);
const warn = (t, l) => box(t, l, ORANGE_LIGHT, ORANGE);
const ok = (t, l) => box(t, l, GREEN_LIGHT, "1A7340");
const check = (t, l) => box(t, l, YELLOW_LIGHT, "B8860B");
function table(headers, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const head = new TableRow({ tableHeader: true, children: headers.map((h, i) => new TableCell({
    borders: borders(), width: { size: widths[i], type: WidthType.DXA }, shading: { fill: RED, type: ShadingType.CLEAR },
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    children: [new Paragraph({ children: [new TextRun({ text: h, font: "Arial", size: 19, bold: true, color: "FFFFFF" })] })] })) });
  const body = rows.map((r, ri) => new TableRow({ children: r.map((c, ci) => new TableCell({
    borders: borders(), width: { size: widths[ci], type: WidthType.DXA },
    shading: { fill: ri % 2 ? GRAY_LIGHT : "FFFFFF", type: ShadingType.CLEAR }, margins: { top: 70, bottom: 70, left: 110, right: 110 },
    children: [new Paragraph({ children: [new TextRun({ text: c, font: "Arial", size: 19, color: GRAY_DARK })] })] })) }));
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: widths, rows: [head, ...body] });
}

const HOST = "192.168.126.12";
const C = [];

// ── Titel ──
C.push(spacer(1800, 0));
C.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 140 },
  children: [new TextRun({ text: "DRK MV KI-Plattform", font: "Arial", size: 56, bold: true, color: RED })] }));
C.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 500 },
  children: [new TextRun({ text: "Installationsanleitung — Neuinstallation auf NVIDIA DGX Spark", font: "Arial", size: 28, color: GRAY_DARK })] }));
C.push(table(["", ""], [
  ["Variante", "main (DRK, Mono)"],
  ["Zielhost", `NVIDIA DGX Spark · ${HOST}`],
  ["Betriebssystem", "DGX OS (Ubuntu-basiert, ARM64)"],
  ["Lokales LLM", "Qwen3 32B via Ollama · Embedding nomic-embed-text"],
  ["Module", "Wissensbasis (RAG), Social Media, Externe Modelle (opt.), ELO (opt.)"],
  ["Stand", "Juli 2026"],
], [Math.floor(CW / 2), Math.ceil(CW / 2)]));
C.push(spacer(300, 0));
C.push(new Paragraph({ alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "ST COMPUTER GmbH — Vertraulich", font: "Arial", size: 18, color: GRAY_MID })] }));

// ── 1 Überblick ──
C.push(h1("1  Überblick"));
C.push(para(`Diese Anleitung beschreibt die Neuinstallation der DRK-Variante (Branch main) auf einem NVIDIA DGX Spark mit der festen IP ${HOST}. Die Plattform läuft vollständig lokal — kein Datenbyte verlässt das System ungefragt.`));
C.push(spacer(60, 40));
C.push(ok("Was die Plattform mitbringt", [
  "KI-Chat (Qwen3 32B lokal) über Open WebUI, Anmeldung per Keycloak (SSO)",
  "Wissensbasis (RAG): Dokumente in 24 Formaten inkl. OCR, rechtegeprüfte Antworten mit Quellen",
  "Modellverwaltung im UI: installieren, aktivieren, Standard-Antwortmodell setzen",
  "Verwaltung im Browser: Dokumente, Nutzer, Monitoring, Backup/Restore, HTTPS, ELO",
  "Automatischer Host-Sync: passt sich bei IP-Wechsel selbstständig an",
]));
C.push(spacer(80, 50));
C.push(h2("1.1  Laufende Dienste"));
C.push(table(["Dienst", "Port", "Funktion"], [
  ["caddy", "80/443", "HTTPS-Reverse-Proxy (optional, für Hostname-Betrieb)"],
  ["open-webui", "3000", "Benutzeroberfläche (Chat, Wissensbasis via Pipes)"],
  ["api-gateway", "8000", "Eintrittspunkt, JWT-Prüfung, Verwaltungs-UI unter /admin"],
  ["rag-service", "8001", "Vektorsuche, Reranking, ACL-geprüfte Antworten mit Zitaten"],
  ["llm-service", "8002", "Modell-Routing: Ollama lokal + optional OpenAI/Anthropic"],
  ["keycloak", "8080", "Authentifizierung, Rollen, SSO/OIDC, optional AD"],
  ["postgres", "5432", "Datenbank + pgvector, Row-Level Security, Audit-Log"],
  ["minio", "9000", "Objektspeicher (Original-Dokumente)"],
  ["ollama", "11434", "LLM-Engine im Container mit GPU-Zugriff (GB10)"],
], [2300, 900, Math.floor(CW - 3200)]));

// ── 2 Voraussetzungen ──
C.push(h1("2  Voraussetzungen"));
C.push(bullet("NVIDIA DGX Spark mit DGX OS (Docker CE + NVIDIA Container Toolkit vorinstalliert)."));
C.push(bullet(`Feste IP ${HOST} (DHCP-Reservierung im Router empfohlen) und Netzzugang für den einmaligen Modell-Download.`));
C.push(bullet("Docker Compose Plugin: docker compose version muss funktionieren."));
C.push(spacer(60, 40));
C.push(warn("Wichtig: Benutzer in die docker-Gruppe aufnehmen", [
  "Auf einem frischen Host ist der Anmeldebenutzer noch NICHT in der docker-Gruppe —",
  "sonst bricht das Setup mit 'permission denied ... docker.sock' ab. Einmalig:",
  "  sudo usermod -aG docker $USER",
  "  newgrp docker            (oder einmal ab- und wieder anmelden)",
  "  docker ps                (Kontrolle: keine Fehlermeldung)",
]));

// ── 3 Installation ──
C.push(h1("3  Installation"));
C.push(h2("3.1  Repository klonen und Branch prüfen"));
C.push(codeBlock([
  "git clone https://github.com/sventruderung/drk-mv-ki-plattform.git",
  "cd drk-mv-ki-plattform",
  "git checkout main",
  "git branch --show-current        # muss 'main' zeigen",
]));
C.push(spacer(80, 50));
C.push(h2("3.2  Basis-Setup"));
C.push(para("Das Setup-Skript erzeugt die .env mit sicheren Zufalls-Passwörtern, legt das Branding-Verzeichnis an, baut die Container, lädt die Modelle (~20 GB), installiert smbclient und den automatischen Host-Sync und führt einen Smoke-Test aus."));
C.push(codeBlock([
  "bash scripts/setup_dgx.sh",
  "# fragt einmal die Let's-Encrypt-Kontakt-E-Mail (leer lassen = HTTPS spaeter)",
]));
C.push(spacer(60, 40));
C.push(info("Automatisch gesetzt", [
  `KEYCLOAK_PUBLIC_URL wird auf http://${HOST}:8080/auth gesetzt (Server-IP erkannt).`,
  "Der Modell-Download (qwen3:32b + nomic-embed-text) dauert je nach Anbindung 30-90 Min.",
]));
C.push(spacer(80, 50));
C.push(h2("3.3  Keycloak einrichten"));
C.push(para("Ein interaktives Skript konfiguriert Keycloak vollständig (Client-Secret, tenant_id-Mapper, Service-Account-Rollen, Redirect-URIs für die Server-IP, ersten Admin)."));
C.push(codeBlock([
  "python3 scripts/setup_keycloak.py",
  "#  - Name des Kreisverbands: z.B. Bad Doberan",
  "#  - Oeffentlicher Hostname: LEER lassen (interner IP-Betrieb)",
  "#  - Admin-Konto: kv-admin + Startpasswort (min. 10 Zeichen)",
  "",
  "docker compose up -d --force-recreate api-gateway open-webui",
]));
C.push(spacer(80, 50));
C.push(h2("3.4  Open-WebUI-Pipes installieren"));
C.push(codeBlock([
  "python3 scripts/setup_openwebui.py",
  "#  - Admin-E-Mail + Passwort NEU anlegen (technisches Open-WebUI-Konto)",
  "#  installiert: Wissensbasis (RAG), Externe Modelle, Dokumentensystem (ELO)",
]));
C.push(spacer(80, 50));
C.push(h2("3.5  Abschluss-Kontrolle"));
C.push(codeBlock(["python3 scripts/smoke_test.py        # alle Dienste gruen?"]));

// ── 4 Zugriff ──
C.push(h1("4  Zugriff"));
C.push(table(["Zweck", "Adresse"], [
  ["Verwaltung (Admin)", `http://${HOST}:8000/admin/`],
  ["Chat (Anwender)", `http://${HOST}:3000`],
  ["Keycloak-Konsole", `http://${HOST}:8080/auth/admin/`],
], [3000, Math.floor(CW - 3000)]));
C.push(spacer(40, 40));
C.push(para("Verwaltung: Login mit dem kv-admin-Konto aus Schritt 3.3. Keycloak-Konsole: Benutzer admin + KEYCLOAK_ADMIN_PASSWORD aus der .env (grep KEYCLOAK_ADMIN_PASSWORD .env)."));
C.push(spacer(40, 40));
C.push(info("Hinweise", [
  "Die Verwaltung liegt unter /admin (mit Schraegstrich). Die Wurzel :8000 ist",
  "tokengeschuetzt und zeigt 'Token fehlt' - das ist normal.",
  "Nach Rollenaenderungen im Verwaltungs-UI ab- und neu anmelden (Token).",
]));

// ── 5 Nach der Installation ──
C.push(h1("5  Nach der Installation"));
C.push(numbered("Verwaltungs-UI oeffnen, als kv-admin anmelden."));
C.push(numbered("Einstellungen -> Systemstatus: muss durchgehend gruen sein (Dienste, Modelle, Service-Account)."));
C.push(numbered("KI-Modelle: qwen3:32b ist Standard-Antwortmodell; bei Bedarf weitere per '⬇ Installieren' laden."));
C.push(numbered("Wissensdatenbanken anlegen, Sichtbarkeitsgruppen zuweisen, Dokumente hochladen."));
C.push(numbered("Nutzer anlegen (oder Active Directory anbinden) und Rollen vergeben."));
C.push(numbered("Optional: Eigenes Logo hochladen (ersetzt das neutrale Platzhalter-Logo)."));
C.push(numbered("Backup einrichten: sudo bash scripts/backup.sh --install, dann im UI NAS + Zeitplan konfigurieren."));
C.push(spacer(80, 50));
C.push(check("Installations-Checkliste", [
  "□  docker-Gruppe: sudo usermod -aG docker $USER (+ newgrp/relogin)",
  "□  Branch main ausgecheckt, setup_dgx.sh ohne Fehler",
  "□  Modelle geladen: qwen3:32b + nomic-embed-text (ollama list)",
  "□  setup_keycloak.py ausgefuehrt, danach compose force-recreate",
  "□  setup_openwebui.py: Pipes installiert",
  "□  Systemstatus im UI gruen, Login als kv-admin funktioniert",
  "□  Test: Wissensbasis-Modell waehlen, Frage stellen -> Antwort mit Quelle",
  "□  Backup eingerichtet (backup.sh --install)",
]));

// ── 6 Betrieb ──
C.push(h1("6  Betrieb und Wartung"));
C.push(h2("6.1  Update einspielen"));
C.push(codeBlock([
  "cd ~/drk-mv-ki-plattform",
  "sudo bash scripts/backup.sh        # Sicherung vorher",
  "git pull",
  "bash scripts/migrate.sh            # DB-Schema/Katalog nachziehen (idempotent)",
  "docker compose up -d --build       # geaenderte Dienste neu bauen",
  "python3 scripts/smoke_test.py",
]));
C.push(spacer(60, 40));
C.push(h2("6.2  Betriebssystem aktualisieren"));
C.push(codeBlock([
  "sudo apt update && sudo apt full-upgrade -y",
  "sudo reboot",
  "# nach dem Reboot:  docker compose up -d",
]));
C.push(spacer(60, 40));
C.push(warn("Nach 'docker compose down'", [
  "Ein bewusst gestoppter Stack startet NICHT automatisch wieder.",
  "Nach Update/Reboot immer abschliessen mit:  docker compose up -d",
]));
C.push(spacer(60, 40));
C.push(h2("6.3  Nach IP-Wechsel"));
C.push(para("Der automatische Host-Sync (in setup_dgx.sh eingerichtet) passt Keycloak-URL und Redirect-URIs bei Boot und IP-Wechsel selbststaendig an — kein Befehl noetig. Manuell nur fuer Sonderfaelle:"));
C.push(codeBlock([
  "python3 scripts/set_host.py            # interne IP automatisch",
  "python3 scripts/set_host.py <host> --https   # oeffentlicher Hostname (HTTPS)",
]));

// ── 7 Fehlerbehebung ──
C.push(h1("7  Fehlerbehebung"));
C.push(table(["Symptom", "Ursache / Loesung"], [
  ["permission denied ... docker.sock", "Benutzer nicht in docker-Gruppe: sudo usermod -aG docker $USER + newgrp docker"],
  ["Modell fehlt / 'keine Antwort'", "Modell installiert + im Katalog aktiv + als Standard gesetzt? (alle drei noetig)"],
  ["Open WebUI startet nicht (Branding)", "data/branding vor dem Start befuellen: mkdir -p data/branding && cp -n infra/openwebui/branding/*.png data/branding/"],
  ["Nutzer-Tab: Service-Account nicht nutzbar", "setup_keycloak.py erneut ausfuehren"],
  ["Login: 'Invalid parameter: redirect_uri'", "set_host.py ausfuehren (registriert Redirect-URIs fuer die aktuelle IP)"],
  ["Chat langsam / stockend", "Nur EIN grosses Modell laden lassen; ollama ps pruefen (100% GPU)"],
], [3600, Math.floor(CW - 3600)]));
C.push(spacer(80, 50));
C.push(para("Erste Anlaufstelle bei Problemen: Verwaltungs-UI -> Einstellungen -> Systemstatus. Dort werden alle Dienste, Modelle und der Service-Account mit Loesungshinweis geprueft."));

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
        run: { size: 30, bold: true, font: "Arial", color: RED }, paragraph: { spacing: { before: 480, after: 240 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: GRAY_DARK }, paragraph: { spacing: { before: 260, after: 100 }, outlineLevel: 1 } },
    ] },
  sections: [{
    properties: { page: { size: { width: PAGE_WIDTH, height: 16838 },
      margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } } },
    headers: { default: new Header({ children: [new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RED, space: 1 } },
      children: [new TextRun({ text: "DRK MV KI-Plattform", font: "Arial", size: 18, bold: true, color: RED }),
        new TextRun({ text: "  |  Installationsanleitung (main)", font: "Arial", size: 18, color: GRAY_MID })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: BORDER, space: 1 } },
      tabStops: [{ type: "right", position: CW }],
      children: [new TextRun({ text: "ST COMPUTER GmbH — Vertraulich", font: "Arial", size: 16, color: GRAY_MID }),
        new TextRun({ text: "\tSeite ", font: "Arial", size: 16, color: GRAY_MID }),
        new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: GRAY_MID })] })] }) },
    children: C,
  }],
});

Packer.toBuffer(doc).then(buffer => {
  const out = path.join(__dirname, "Installationsanleitung-DRK-DGX.docx");
  fs.writeFileSync(out, buffer);
  console.log("Erstellt:", out, `(${(buffer.length / 1024).toFixed(0)} KB)`);
});
