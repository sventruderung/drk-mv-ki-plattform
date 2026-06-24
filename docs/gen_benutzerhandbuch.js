const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageNumber, LevelFormat, TableOfContents, PageBreak,
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
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 180, after: 80 },
    children: [new TextRun({ text, font: "Arial", size: 21, bold: true, color: BLUE })] });
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
const tip = (t, l) => box(t, l, YELLOW_LIGHT, "B8860B");

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
const half = [Math.floor(CW / 2), Math.ceil(CW / 2)];

const C = [];

// ── Titel ──
C.push(spacer(1700, 0));
C.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 140 },
  children: [new TextRun({ text: "kv", font: "Arial", size: 64, bold: true, color: GREEN }),
             new TextRun({ text: "brain", font: "Arial", size: 64, bold: true, color: BLUE })] }));
C.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
  children: [new TextRun({ text: "Benutzerhandbuch", font: "Arial", size: 40, bold: true, color: GRAY_DARK })] }));
C.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 460 },
  children: [new TextRun({ text: "KI-Plattform — Konfiguration, Betrieb und Nutzung", font: "Arial", size: 26, color: GRAY_MID })] }));
C.push(table(["", ""], [
  ["Produkt", "kv-brain — lokale, mandantenfähige KI-Plattform"],
  ["Zielgruppen", "Administratoren, Server-Betrieb, Anwenderinnen und Anwender"],
  ["Betrieb", "On-Premise (NVIDIA DGX Spark), vollständig lokal"],
  ["Lokales LLM", "Qwen3 32B via Ollama; Embedding nomic-embed-text"],
  ["Zugang", "Browser: Chat unter / · Verwaltung unter /admin"],
  ["Stand", "Juni 2026 · Branch feat/white-label-mono"],
], half));
C.push(spacer(280, 0));
C.push(new Paragraph({ alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "ST COMPUTER GmbH", font: "Arial", size: 18, color: GRAY_MID })] }));

// ── Inhaltsverzeichnis ──
C.push(new Paragraph({ children: [new PageBreak()] }));
C.push(new Paragraph({ spacing: { after: 160 },
  children: [new TextRun({ text: "Inhalt", font: "Arial", size: 30, bold: true, color: BLUE })] }));
C.push(new TableOfContents("Inhalt", { hyperlink: true, headingStyleRange: "1-2" }));

// ════════════════════════════════════════════════════════════════════
// 1 Einleitung
// ════════════════════════════════════════════════════════════════════
C.push(h1("1  Einleitung"));
C.push(para("kv-brain ist eine KI-Plattform, die vollständig auf Ihrem eigenen Server läuft. Mitarbeitende können in natürlicher Sprache mit einem Sprachmodell arbeiten, Fragen an freigegebene Wissensdatenbanken stellen und — sofern angebunden — ein Dokumentenmanagementsystem (ELO) durchsuchen. Es werden keine Daten ungefragt an Dritte übertragen."));
C.push(spacer(60, 40));
C.push(h2("1.1  Für wen ist dieses Handbuch?"));
C.push(table(["Teil", "Zielgruppe", "Inhalt"], [
  ["Teil A", "Administratoren", "Verwaltungs-UI: Wissensbasis, Nutzer, Modelle, Monitoring, Backup, HTTPS, ELO"],
  ["Teil B", "Server-Betrieb / IT", "Kommandozeile: Update, Migration, Sicherung/Restore, Netzwechsel"],
  ["Teil C", "Anwenderinnen/Anwender", "Tägliche Nutzung: Chat, Modelle, Wissensbasis, Dokumentensystem"],
], [1500, 3200, Math.floor(CW - 4700)]));
C.push(spacer(60, 40));
C.push(h2("1.2  Die drei Module"));
C.push(bullet("Wissensbasis (RAG): Antworten auf Basis Ihrer eigenen, hochgeladenen Dokumente — mit Quellenangaben und rechtegeprüft nach Sichtbarkeitsgruppen."));
C.push(bullet("Externe KI-Modelle (optional): OpenAI/Anthropic, standardmäßig deaktiviert, nur nach bewusster Freigabe durch die Administration."));
C.push(bullet("Dokumentensystem (ELO, optional): Lesezugriff auf ein angebundenes ELO-DMS über einen Assistenten."));

// ════════════════════════════════════════════════════════════════════
// 2 Überblick & Architektur
// ════════════════════════════════════════════════════════════════════
C.push(h1("2  Überblick und Architektur"));
C.push(para("Die Plattform besteht aus mehreren Diensten (Docker-Containern), die zusammenarbeiten. Für die tägliche Nutzung müssen Sie diese nicht kennen — für Administration und Betrieb hilft der Überblick."));
C.push(spacer(40, 40));
C.push(table(["Dienst", "Zweck (vereinfacht)"], [
  ["Open WebUI", "Die Oberfläche, in der Anwender chatten und die Wissensbasis nutzen"],
  ["API-Gateway", "Zentrale Steuerung, Anmeldeprüfung, Verwaltungs-UI unter /admin"],
  ["RAG-Service", "Durchsucht die Dokumente, prüft Rechte, erstellt Antworten mit Quellen"],
  ["LLM-Service", "Leitet Anfragen an das lokale Modell (oder optional an externe)"],
  ["Ollama", "Die KI-Engine, die das Sprachmodell ausführt (lokal, mit GPU)"],
  ["Keycloak", "Anmeldung, Benutzer, Rollen und Gruppen (Single Sign-On)"],
  ["PostgreSQL", "Datenbank: Dokument-Index, Einstellungen, Protokoll, Keycloak-Daten"],
  ["MinIO", "Speicher für die Original-Dokumente"],
  ["ELO-Connector", "Verbindung zum ELO-Dokumentensystem (nur lesend)"],
  ["Caddy", "Verschlüsselte Verbindung (HTTPS) nach außen"],
], [2400, Math.floor(CW - 2400)]));
C.push(spacer(60, 40));
C.push(info("Wichtig zu wissen", [
  "Wissensbasis (RAG) und Dokumentensystem (ELO) nutzen IMMER das lokale Modell.",
  "Dokumenteninhalte verlassen das System unter keinen Umständen.",
  "Die Datenbank enthält auch die Keycloak-Daten — eine Sicherung der Datenbank",
  "sichert damit Realm, Benutzer und Anmeldekonfiguration vollständig mit.",
]));

// ════════════════════════════════════════════════════════════════════
// 3 Anmeldung & Rollen
// ════════════════════════════════════════════════════════════════════
C.push(h1("3  Anmeldung und Rollenkonzept"));
C.push(h2("3.1  Single Sign-On (Keycloak)"));
C.push(para("Die Anmeldung erfolgt zentral über Keycloak. Wer angemeldet ist, kann Chat und Wissensbasis nutzen, ohne sich erneut anzumelden. Die Anmeldedaten kommen entweder aus lokal in Keycloak angelegten Konten oder — falls angebunden — aus dem Active Directory."));
C.push(spacer(40, 40));
C.push(h2("3.2  Rollen und Sichtbarkeitsgruppen"));
C.push(table(["Rolle / Gruppe", "Bedeutung"], [
  ["kv-admin", "Administrator: voller Zugriff auf das Verwaltungs-UI"],
  ["alle", "Standard-Sichtbarkeitsgruppe (alle Mitarbeitenden)"],
  ["GF / Verwaltung / Datenschutz", "Sichtbarkeitsgruppen je Bereich"],
  ["ESF BRB / Panel / Rehapro / my turn", "Sichtbarkeitsgruppen je Projekt"],
], [3600, Math.floor(CW - 3600)]));
C.push(para("Sichtbarkeitsgruppen steuern, welche Wissensdatenbanken eine Person sehen und durchsuchen darf. Sie werden zentral konfiguriert (in der .env über ACL_GROUPS) und stehen automatisch als Rollen, Auswahlfelder und Filter zur Verfügung."));
C.push(spacer(40, 40));
C.push(h2("3.3  Erste Anmeldung als Administrator"));
C.push(numbered("Verwaltungs-UI öffnen: https://<hostname>/admin (intern: http://<ip>:8000/admin)"));
C.push(numbered("Mit dem kv-admin-Konto anmelden (im Setup angelegt)"));
C.push(numbered("Nach Rollenänderungen immer ab- und neu anmelden — Rollen stehen im Anmelde-Token"));
C.push(spacer(40, 40));
C.push(warn("Wenn Tabs fehlen (Nutzer, Protokoll, Einstellungen)", [
  "Dann fehlt dem Konto die Rolle kv-admin. In der Keycloak-Konsole unter",
  "Users -> Role mapping die Rolle kv-admin (und alle) zuweisen, danach im",
  "Verwaltungs-UI ab- und neu anmelden.",
]));

// ════════════════════════════════════════════════════════════════════
// TEIL A — ADMINISTRATION
// ════════════════════════════════════════════════════════════════════
C.push(h1("Teil A — Administration (Verwaltungs-UI)"));
C.push(para("Das Verwaltungs-UI ist die zentrale Oberfläche für Administratoren. Es ist gegliedert in die Tabs Dokumente, Nutzer, Protokoll und Einstellungen. Ganz unten zeigt eine Fußzeile Version, Entwicklungsstand und die verwendete Branch."));

// 4 Dokumente & Wissensbasis
C.push(h1("4  Dokumente und Wissensbasis"));
C.push(h2("4.1  Wissensdatenbanken anlegen"));
C.push(bullet("Im Tab Dokumente lassen sich beliebig benannte Wissensdatenbanken anlegen (z.B. Verwaltung, ESF BRB, Rehapro)."));
C.push(bullet("Über Zugriff legen Sie je Wissensdatenbank fest, welche Sichtbarkeitsgruppen sie sehen dürfen."));
C.push(bullet("Eine Person sieht und durchsucht nur Wissensdatenbanken, für die ihre Gruppe freigeschaltet ist."));
C.push(spacer(40, 40));
C.push(h2("4.2  Dokumente hochladen"));
C.push(para("Dokumente werden per Drag-and-Drop, als Ordner oder als ZIP-Archiv hochgeladen. Beim Hochladen wählen Sie die Ziel-Wissensdatenbank und die Sichtbarkeitsgruppe."));
C.push(bullet("24 Formate werden verarbeitet, u.a. PDF, Word, Excel, PowerPoint, RTF, ODT/ODS, CSV, E-Mail (eml/msg), HTML und reiner Text."));
C.push(bullet("Gescannte PDFs und Bilder (PNG/JPG/TIFF) werden per Texterkennung (OCR) lesbar gemacht."));
C.push(bullet("Duplikate werden anhand des Inhalts erkannt und nicht doppelt aufgenommen."));
C.push(spacer(40, 40));
C.push(h2("4.3  Suchen, filtern, Sammelaktionen"));
C.push(bullet("Die Dokumentliste lässt sich nach Name, Wissensdatenbank, Gruppe und Dateityp filtern und ist seitenweise navigierbar."));
C.push(bullet("Sammelaktionen (Bulk): mehrere Dokumente gleichzeitig verschieben, die Sichtbarkeit ändern oder löschen."));
C.push(spacer(40, 40));
C.push(info("Compliance", [
  "Die Suche ist immer rechtegeprüft: In Antworten fließen nur Dokumente ein,",
  "für die die Gruppe der anfragenden Person eine Leseberechtigung hat.",
]));

// 5 Nutzerverwaltung
C.push(h1("5  Nutzerverwaltung"));
C.push(h2("5.1  Nutzer anlegen und bearbeiten"));
C.push(bullet("Im Tab Nutzer neue Konten mit Benutzername und Startpasswort anlegen."));
C.push(bullet("Bestehende Nutzer bearbeiten, Passwort zurücksetzen oder deaktivieren."));
C.push(bullet("Funktioniert mit und ohne Active-Directory-Anbindung."));
C.push(spacer(40, 40));
C.push(h2("5.2  Rollen und Gruppen zuweisen"));
C.push(para("Über Rollen weisen Sie einer Person die Sichtbarkeitsgruppen zu (welche Wissensdatenbanken sie nutzen darf) und ggf. die Administratorrolle kv-admin. Änderungen wirken nach der nächsten Anmeldung."));
C.push(spacer(40, 40));
C.push(h2("5.3  Modelle pro Nutzer freigeben"));
C.push(para("Über Modelle legen Sie fest, welche KI-Modelle eine Person verwenden darf — zusätzlich zu den für alle freigegebenen. So lassen sich z.B. externe Modelle nur für einzelne Personen freischalten."));
C.push(spacer(40, 40));
C.push(h2("5.4  Active Directory (AD/LDAP)"));
C.push(para("Im Tab Einstellungen kann eine Windows-Domäne über das Active Directory angebunden werden (nur lesend). Angebundene Konten erscheinen nach dem ersten Login in der Nutzerliste; Rollen und Gruppen werden weiterhin im Verwaltungs-UI vergeben."));
C.push(tip("Empfehlung", [
  "Immer mindestens ein lokales kv-admin-Konto behalten (Break-Glass), damit die",
  "Administration auch bei AD-Störungen möglich bleibt.",
]));

// 6 KI-Modelle
C.push(h1("6  KI-Modelle"));
C.push(h2("6.1  Modell-Katalog (Tab Einstellungen)"));
C.push(bullet("Aktiv: schaltet ein Modell grundsätzlich nutzbar."));
C.push(bullet("Für alle Nutzer: gibt ein aktives Modell für alle frei (sonst nur individuell pro Nutzer)."));
C.push(bullet("Das lokale Modell (Qwen3 32B) ist standardmäßig aktiv und für alle freigegeben."));
C.push(spacer(40, 40));
C.push(h2("6.2  Lokales Modell herunterladen"));
C.push(para("Unter Lokales Modell herunterladen kann ein weiteres Ollama-Modell auf den Server geladen werden."));
C.push(numbered("Modellnamen eintragen (z.B. qwen3:14b, gemma3, llama3.3) — Namen siehe ollama.com/library"));
C.push(numbered("Herunterladen klicken; der Fortschritt wird angezeigt (große Modelle dauern einige Minuten)"));
C.push(numbered("Nach Abschluss erscheint das Modell oben in der Liste und kann dort aktiviert/freigegeben werden"));
C.push(para("Neu geladene Modelle sind zunächst deaktiviert — die Freigabe ist ein bewusster Schritt. Es läuft immer nur ein Download gleichzeitig."));
C.push(spacer(40, 40));
C.push(h2("6.3  Externe Modelle und API-Keys"));
C.push(para("Externe Modelle (OpenAI/Anthropic) sind standardmäßig deaktiviert. Zur Nutzung werden unter API-Keys die Schlüssel hinterlegt (verschlüsselt gespeichert, nie wieder angezeigt) und das gewünschte Modell aktiviert."));
C.push(warn("Datenschutz bei externen Modellen", [
  "Externe Modelle übertragen Nutzereingaben an Dritte außerhalb der Plattform.",
  "Aktivierung nur nach Freigabe durch den Datenschutzbeauftragten. In jeder",
  "Antwort sind externe Modelle klar als extern gekennzeichnet. Wissensbasis und",
  "ELO nutzen niemals externe Modelle.",
]));

// 7 Monitoring & Alarm
C.push(h1("7  Monitoring und E-Mail-Alarm"));
C.push(h2("7.1  Systemstatus"));
C.push(para("Im Tab Einstellungen prüft der Systemstatus alle Dienste, die geladenen Modelle und den Keycloak-Service-Account. Dies ist die erste Anlaufstelle bei Problemen — jeder rote Punkt enthält einen Lösungshinweis."));
C.push(spacer(40, 40));
C.push(h2("7.2  E-Mail-Alarm (SMTP)"));
C.push(bullet("Unter Monitoring SMTP-Server, Absender und Empfänger hinterlegen und Alarm aktivieren."));
C.push(bullet("Über Testnachricht senden die Konfiguration prüfen."));
C.push(bullet("Bei Ausfällen oder fehlgeschlagenen Backups wird automatisch eine E-Mail versendet."));
C.push(spacer(40, 40));
C.push(h2("7.3  Letzte Ereignisse"));
C.push(para("Eine Liste der jüngsten Status-Änderungen und Fehler (z.B. Dienst kurz nicht erreichbar, Backup fehlgeschlagen) — ohne Inhalte, nur Metadaten."));

// 8 System steuern
C.push(h1("8  System steuern"));
C.push(para("Im Tab Einstellungen unter System steuern lassen sich direkt aus dem Browser ausführen:"));
C.push(bullet("Dienste neu starten — startet die Plattform-Container neu (z.B. nach Konfigurationsänderungen)."));
C.push(bullet("Server neu starten / herunterfahren — steuert den gesamten DGX."));
C.push(warn("Mit Bedacht verwenden", [
  "Diese Aktionen sind root-äquivalent, daher nur für kv-admin verfügbar und",
  "werden im Audit-Protokoll vermerkt. Nach 'Server herunterfahren' ist die",
  "Plattform erst nach physischem/Remote-Einschalten wieder erreichbar.",
]));

// 9 Backup & Restore
C.push(h1("9  Sicherung (Backup) und Wiederherstellung (Restore)"));
C.push(h2("9.1  Was wird gesichert?"));
C.push(bullet("Datenbank (Dokument-Index, Wissensdatenbanken, Einstellungen, Protokoll, Keycloak)."));
C.push(bullet("MinIO — die Original-Dokumente."));
C.push(bullet("Die .env — die Konfiguration inkl. Secrets."));
C.push(spacer(40, 40));
C.push(h2("9.2  Backup auf NAS einrichten (Tab Einstellungen)"));
C.push(numbered("NAS-Freigabe (URL) eintragen, z.B. //192.168.1.10/backup/drk-ki"));
C.push(numbered("Benutzer und Passwort des NAS-Freigabekontos eingeben (Passwort wird verschlüsselt gespeichert)"));
C.push(numbered("Verbindung testen — schreibt eine Testdatei und löscht sie wieder"));
C.push(numbered("Zeitplan aktivieren: täglich oder wöchentlich + Uhrzeit (bei wöchentlich zusätzlich Wochentag), dann Speichern"));
C.push(para("Der Stand der letzten erfolgreichen Sicherung wird oben in der Karte angezeigt. Zusätzlich wird stets lokal gesichert; schlägt der NAS-Upload fehl, bleibt die lokale Sicherung erhalten und es erscheint ein Ereignis."));
C.push(spacer(40, 40));
C.push(info("Einrichtung auf dem Server (einmalig)", [
  "Der geplante Lauf benötigt einen Cron-Dispatcher und smbclient für den Upload:",
  "  sudo apt install -y smbclient",
  "  sudo bash scripts/backup.sh --install",
  "Der Dispatcher prüft alle 15 Minuten den im UI hinterlegten Zeitplan.",
]));
C.push(spacer(40, 40));
C.push(h2("9.3  Wiederherstellung (Restore)"));
C.push(para("Ein Voll-Restore stellt das gesamte System aus einem Backup-Satz wieder her. Da er Dienste stoppt und die Datenbank neu aufbaut, läuft er bewusst über die Kommandozeile (kein UI-Button)."));
C.push(codeBlock([
  "# Vom NAS (neuester Stand; Passwort wird abgefragt):",
  "bash scripts/restore.sh --nas //192.168.1.10/backup/drk-ki --user backup-user",
  "",
  "# Bestimmter Stand:",
  "bash scripts/restore.sh --nas //... --user U --ts 2026-06-24_0230",
  "",
  "# Aus lokaler Sicherung:",
  "bash scripts/restore.sh --local /var/backups/drk-ki",
]));
C.push(para("Ablauf: .env zurückspielen (die bisherige wird als .env.pre-restore.<Stand> gesichert), Datenbank neu aufbauen und einspielen (inkl. Keycloak), MinIO ersetzen, alle Dienste starten. Anschließend gleicht das Skript automatisch IP und Keycloak-Redirect-URIs an die aktuelle Umgebung an und führt einen Smoke-Test aus — so startet das System sicher wieder."));
C.push(tip("Empfehlung", [
  "Den Restore einmal testweise durchspielen, damit im Ernstfall sicher ist, dass",
  "NAS-Pfad und Backup-Satz sauber zurückkommen. Bei HTTPS-Betrieb danach:",
  "python3 scripts/set_host.py <hostname> --https",
]));

// 10 HTTPS / Hostname
C.push(h1("10  HTTPS und Hostname"));
C.push(para("Im Tab Einstellungen unter HTTPS / Öffentlicher Hostname wird der Hostname gepflegt, unter dem die Plattform per HTTPS erreichbar ist. Das Zertifikat wird automatisch über Let's Encrypt ausgestellt und erneuert."));
C.push(bullet("Voraussetzung: DNS-Eintrag zeigt auf den Server; Ports 80 und 443 sind erreichbar."));
C.push(bullet("Beim Speichern werden die Keycloak-Redirect-URIs automatisch ergänzt."));
C.push(bullet("Die endgültige Umstellung erfordert einen einmaligen Befehl auf dem Server (wird nach dem Speichern angezeigt): python3 scripts/set_host.py <hostname> --https"));
C.push(spacer(40, 40));
C.push(info("Rein internes Netz", [
  "Ohne Internet-Zugang kann Let's Encrypt keine Challenge durchführen. Dann Caddy",
  "auf eine interne Zertifizierungsstelle umstellen und deren Root-Zertifikat per",
  "Gruppenrichtlinie verteilen.",
]));

// 11 ELO
C.push(h1("11  Dokumentensystem (ELO) anbinden"));
C.push(para("Im Tab Einstellungen unter ELO-Dokumentensystem werden die Verbindungsdaten gepflegt: REST-Basis-URL sowie Zugangsdaten (Tomcat und/oder REST-API). Passwörter werden verschlüsselt gespeichert und nie zurückgegeben."));
C.push(bullet("Über Verbindung testen wird automatisch ermittelt, mit welchem Zugangsdaten-Paar die ELO-API antwortet."));
C.push(bullet("Die Anbindung ist ausschließlich lesend."));
C.push(tip("Namensauflösung", [
  "Nutzt die ELO-URL einen internen Hostnamen, müssen ELO_SERVER_HOST und",
  "ELO_SERVER_IP in der .env gesetzt sein, damit der Connector den Namen auch",
  "ohne internen DNS auflöst (reboot- und update-fest).",
]));

// 12 Audit
C.push(h1("12  Audit-Protokoll"));
C.push(para("Der Tab Protokoll listet administrative Aktionen (z.B. Nutzer angelegt, Modell aktiviert, Einstellung geändert) mit Zeitpunkt und handelnder Person. Protokolliert werden ausschließlich Metadaten — niemals Frage- oder Dokumentinhalte."));

// ════════════════════════════════════════════════════════════════════
// TEIL B — SERVER-BETRIEB
// ════════════════════════════════════════════════════════════════════
C.push(h1("Teil B — Server-Betrieb (Kommandozeile)"));
C.push(para("Dieser Teil richtet sich an die IT, die den Server betreut. Alle Befehle werden im Projektverzeichnis ausgeführt (cd ~/drk-mv-ki-plattform)."));

C.push(h1("13  Befehlsübersicht"));
C.push(table(["Aufgabe", "Befehl"], [
  ["Status aller Dienste", "docker compose ps"],
  ["Protokoll eines Dienstes", "docker compose logs --tail=50 api-gateway"],
  ["Alles starten (nach Reboot/Stop)", "docker compose up -d"],
  ["Dienst neu bauen + starten", "docker compose up -d --build api-gateway"],
  ["Gesundheitscheck", "python3 scripts/smoke_test.py"],
  ["DB-Schema nachziehen", "bash scripts/migrate.sh"],
  ["Nach IP-/Netzwechsel", "python3 scripts/set_host.py"],
  ["Sicherung (Probelauf)", "sudo bash scripts/backup.sh"],
  ["Wiederherstellung", "bash scripts/restore.sh --nas ... --user ..."],
], [4200, Math.floor(CW - 4200)]));

C.push(h1("14  Update einspielen"));
C.push(h2("14.1  Plattform aktualisieren"));
C.push(codeBlock([
  "cd ~/drk-mv-ki-plattform",
  "sudo bash scripts/backup.sh        # Sicherung vorher",
  "git pull",
  "bash scripts/migrate.sh            # DB-Schema idempotent nachziehen",
  "docker compose up -d --build       # geänderte Dienste neu bauen",
  "python3 scripts/smoke_test.py      # muss grün sein",
]));
C.push(spacer(40, 40));
C.push(h2("14.2  Betriebssystem (DGX) aktualisieren"));
C.push(codeBlock([
  "sudo apt update && sudo apt full-upgrade -y",
  "sudo reboot",
  "# nach dem Reboot:",
  "cd ~/drk-mv-ki-plattform && docker compose up -d",
  "python3 scripts/smoke_test.py",
]));
C.push(spacer(40, 40));
C.push(warn("Wichtig", [
  "Die Container starten nach einem Reboot von selbst (restart: unless-stopped).",
  "NUR nach einem bewussten 'docker compose down' starten sie NICHT automatisch —",
  "dann immer mit 'docker compose up -d' abschließen.",
]));

C.push(h1("15  Nach Netz- oder IP-Wechsel"));
C.push(para("Bei fester IP ist nach einer einmaligen Änderung nichts weiter nötig. Falls sich die IP doch ändert, genügt ein Befehl — er erkennt die neue IP, korrigiert KEYCLOAK_PUBLIC_URL und die Redirect-URIs und startet die betroffenen Dienste neu:"));
C.push(codeBlock([
  "python3 scripts/set_host.py                     # interne IP automatisch",
  "python3 scripts/set_host.py <hostname> --https  # öffentlicher Hostname (HTTPS)",
]));

// ════════════════════════════════════════════════════════════════════
// TEIL C — ANWENDUNG
// ════════════════════════════════════════════════════════════════════
C.push(h1("Teil C — Nutzung (für Anwenderinnen und Anwender)"));
C.push(para("Dieser Teil beschreibt die tägliche Arbeit mit kv-brain im Browser. Sie benötigen nur Ihre Anmeldedaten — alles andere läuft im Hintergrund."));

C.push(h1("16  Anmelden und Oberfläche"));
C.push(numbered("Die Adresse der Plattform im Browser öffnen (z.B. https://<hostname>)"));
C.push(numbered("Auf der Anmeldeseite mit Benutzername und Passwort anmelden"));
C.push(numbered("Danach öffnet sich die Chat-Oberfläche"));
C.push(para("Links wählen Sie oben das gewünschte Modell, in der Mitte führen Sie das Gespräch, frühere Unterhaltungen finden Sie in der Seitenleiste."));

C.push(h1("17  Modell auswählen — lokal oder extern"));
C.push(para("Oben in der Modellauswahl stehen je nach Freigabe verschiedene Einträge. Achten Sie auf die Kennzeichnung:"));
C.push(table(["Auswahl", "Bedeutung"], [
  ["Lokales Modell (z.B. Qwen3 32B, lokal)", "Läuft komplett auf dem Server. Keine Daten verlassen das Haus. Standard."],
  ["Wissensbasis (lokal)", "Beantwortet Fragen aus den freigegebenen Dokumenten, mit Quellen — immer lokal."],
  ["Dokumentensystem (ELO)", "Durchsucht das ELO-DMS (sofern angebunden) — immer lokal."],
  ["Externes Modell (extern!)", "Sendet Ihre Eingaben an einen Drittanbieter. Nur nutzen, wenn freigegeben."],
], [4200, Math.floor(CW - 4200)]));
C.push(spacer(40, 40));
C.push(warn("Bewusst lokal oder extern arbeiten", [
  "Modelle mit dem Zusatz 'extern!' übertragen Ihre Eingaben an einen Cloud-",
  "Anbieter. Für vertrauliche Inhalte immer ein lokales Modell verwenden.",
]));

C.push(h1("18  Die Wissensbasis nutzen"));
C.push(para("Mit der Wissensbasis stellen Sie Fragen zu den Dokumenten Ihrer Organisation und erhalten Antworten mit Quellenangaben."));
C.push(numbered("Ein Wissensbasis-Modell wählen (z.B. 'Wissensbasis — alle')"));
C.push(numbered("Frage in normaler Sprache stellen, z.B. 'Welche Frist gilt für ...?'"));
C.push(numbered("Die Antwort nennt die verwendeten Quellen — so ist sie nachvollziehbar"));
C.push(spacer(40, 40));
C.push(info("Was Sie sehen — und was nicht", [
  "Sie erhalten nur Antworten aus Wissensdatenbanken, für die Ihre Gruppe",
  "freigeschaltet ist. Fragen zu nicht freigegebenen Inhalten werden mit einem",
  "Hinweis beantwortet, dass dazu keine freigegebenen Informationen vorliegen.",
]));
C.push(spacer(40, 40));
C.push(h2("18.1  Gute Antworten bekommen"));
C.push(bullet("Konkret fragen: Nennen Sie Zeitraum, Bereich oder Dokumentart, wenn relevant."));
C.push(bullet("Nachfragen ist erlaubt: Sie können die Antwort präzisieren lassen ('Fasse das kürzer', 'Nenne die Paragraphen')."));
C.push(bullet("Quellen prüfen: Bei wichtigen Auskünften die angegebene Quelle gegenlesen."));

C.push(h1("19  Das Dokumentensystem (ELO) nutzen"));
C.push(para("Sofern angebunden, durchsuchen Sie mit dem ELO-Assistenten das Dokumentenmanagementsystem in natürlicher Sprache, z.B. 'Wie viele Rechnungen aus 2026 gibt es?' oder 'Finde Rechnungen von Firma X'. Die Antwort nennt die gefundenen Dokumente als Quelle. Der Zugriff ist nur lesend."));

C.push(h1("20  Datenschutz aus Anwendersicht"));
C.push(bullet("Ihre Eingaben werden nicht gespeichert oder ausgewertet (kein Prompt-Logging)."));
C.push(bullet("Lokale Modelle und die Wissensbasis verarbeiten alles ausschließlich auf dem Server."));
C.push(bullet("Nur ausdrücklich als 'extern!' gekennzeichnete Modelle senden Eingaben an Dritte."));
C.push(bullet("Sie sehen nur Inhalte, für die Ihre Gruppe berechtigt ist."));

// ════════════════════════════════════════════════════════════════════
// Anhang
// ════════════════════════════════════════════════════════════════════
C.push(h1("21  Datenschutz und Compliance (Grundsätze)"));
C.push(bullet("Kein Prompt-Logging — Nutzereingaben werden nie gespeichert oder analysiert."));
C.push(bullet("Mandantentrennung — die Zuordnung (tenant_id) stammt ausschließlich aus dem Anmelde-Token; Row-Level Security in der Datenbank."));
C.push(bullet("Rechtegeprüfte Generierung — RAG nutzt nur Dokumente mit aktiver Leseberechtigung der Gruppe."));
C.push(bullet("Externe Modelle nur bewusst — standardmäßig deaktiviert, Aktivierung nur durch Admin (DSB-Freigabe), in jeder Antwort gekennzeichnet."));
C.push(bullet("Secrets nie im Code — nur über die .env; Passwörter im UI werden verschlüsselt gespeichert und nie zurückgegeben."));

C.push(h1("22  Fehlerbehebung"));
C.push(table(["Symptom", "Ursache / Lösung"], [
  ["Login: 'nicht erreichbar' / falsche Adresse", "Nach Netzwechsel: python3 scripts/set_host.py ausführen"],
  ["'Invalid parameter: redirect_uri'", "set_host.py ausführen (registriert Redirect-URIs für die aktuelle IP)"],
  ["'Invalid username or password'", "Passwort in der Keycloak-Konsole zurücksetzen (Temporary: Off)"],
  ["Tabs Nutzer/Protokoll/Einstellungen fehlen", "Rolle kv-admin zuweisen, danach ab- und neu anmelden"],
  ["Nutzer-Tab: 'Service-Account nicht nutzbar'", "python3 scripts/setup_keycloak.py erneut ausführen"],
  ["Chat langsam / keine Antwort", "Systemstatus prüfen; Modell muss in Ollama geladen sein"],
  ["RAG: 'keine freigegebenen Informationen'", "Gruppen-/Zugriffsrechte prüfen; nach Änderung neu anmelden"],
  ["ELO 'nicht verfügbar'", "ELO-Verbindung testen; ELO_SERVER_IP in .env prüfen"],
  ["NAS-Test schlägt fehl", "URL //server/freigabe, Benutzer/Passwort und Erreichbarkeit prüfen"],
  ["Nach Reboot nichts erreichbar", "cd ~/drk-mv-ki-plattform && docker compose up -d"],
], [4200, Math.floor(CW - 4200)]));
C.push(spacer(60, 40));
C.push(para("Erste Anlaufstelle bleibt immer: Verwaltungs-UI -> Einstellungen -> Systemstatus."));

C.push(h1("23  Glossar"));
C.push(table(["Begriff", "Erklärung"], [
  ["RAG", "Retrieval-Augmented Generation — Antworten auf Basis eigener Dokumente"],
  ["LLM", "Large Language Model — das Sprachmodell (hier Qwen3 32B, lokal)"],
  ["Ollama", "Software, die das Sprachmodell auf dem Server ausführt"],
  ["Keycloak", "Anmelde-/Rechteverwaltung (Single Sign-On)"],
  ["Sichtbarkeitsgruppe", "Steuert, welche Wissensdatenbanken eine Person nutzen darf"],
  ["Embedding", "Mathematische Repräsentation von Text für die Vektorsuche"],
  ["Tenant", "Mandant — die organisatorische Trennung der Daten"],
  [".env", "Konfigurationsdatei mit allen Einstellungen und Secrets"],
], [2600, Math.floor(CW - 2600)]));

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
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 21, bold: true, font: "Arial", color: BLUE }, paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 } },
    ] },
  features: { updateFields: true },
  sections: [{
    properties: { page: { size: { width: PAGE_WIDTH, height: 16838 },
      margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } } },
    headers: { default: new Header({ children: [new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } },
      children: [
        new TextRun({ text: "kv", font: "Arial", size: 18, bold: true, color: GREEN }),
        new TextRun({ text: "brain", font: "Arial", size: 18, bold: true, color: BLUE }),
        new TextRun({ text: "  |  Benutzerhandbuch", font: "Arial", size: 18, color: GRAY_MID }),
      ] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: BORDER, space: 1 } },
      tabStops: [{ type: "right", position: CW }],
      children: [
        new TextRun({ text: "ST COMPUTER GmbH", font: "Arial", size: 16, color: GRAY_MID }),
        new TextRun({ text: "\tSeite ", font: "Arial", size: 16, color: GRAY_MID }),
        new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: GRAY_MID }),
      ] })] }) },
    children: C,
  }],
});

Packer.toBuffer(doc).then(buffer => {
  const out = path.join(__dirname, "Benutzerhandbuch-kv-brain.docx");
  fs.writeFileSync(out, buffer);
  console.log("Erstellt:", out, `(${(buffer.length / 1024).toFixed(0)} KB)`);
});
