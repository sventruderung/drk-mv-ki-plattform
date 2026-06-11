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
    ["LLM", "Qwen3 72B via Ollama (lokal) — optional externe Modelle"],
    ["Stand", "Juni 2026 (Version 2 — Software implementiert)"],
    ["Status", "Bereit zur Installation"],
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
children.push(para("Diese Anleitung beschreibt den vollständigen Weg von der leeren DGX Spark bis zum laufenden KI-System für einen DRK-Kreisverband. Die Software ist vollständig implementiert — die Installation besteht im Wesentlichen aus zwei Skripten und der Konfiguration über das browserbasierte Verwaltungs-UI."));
children.push(spacer(60, 40));
children.push(successBox("Was seit Version 1 fertig wurde", [
  "✔  RAG-Wissensbasis mit rechtegeprüfter Suche und Quellen-Zitaten",
  "✔  Social-Media-Modul (P02) mit Freigabe-Workflow",
  "✔  Browserbasiertes Verwaltungs-UI (Dokumente, Nutzer, Freigaben, Protokoll)",
  "✔  Nutzerverwaltung — mit oder ohne Active-Directory-Anbindung",
  "✔  HTTPS mit Let's Encrypt (Hostname im UI änderbar)",
  "✔  Revisionssicheres Audit-Log",
  "✔  Optional: externe KI-Modelle (OpenAI/Anthropic) mit Freigabe pro Nutzer",
  "✔  Setup-Skripte: Ersteinrichtung in unter einer Stunde (ohne Modell-Download)",
]));
children.push(spacer(80, 80));

children.push(heading2("1.1  Was entsteht"));
children.push(para("Das fertige System besteht aus folgenden laufenden Services:"));
children.push(spacer(60, 0));
children.push(simpleTable(
  ["Service", "Port", "Funktion"],
  [
    ["caddy", "80/443", "HTTPS-Reverse-Proxy, Let's-Encrypt-Zertifikate automatisch"],
    ["open-webui", "3000", "Benutzeroberfläche (Chat, Wissensbasis, Social Media via Pipes)"],
    ["api-gateway", "8000", "Eintrittspunkt, JWT-Prüfung — inkl. Verwaltungs-UI unter /admin"],
    ["rag-service", "8001", "Vektorsuche, Chunking, ACL-geprüfte Antworten mit Zitaten"],
    ["llm-service", "8002", "Modell-Routing: Ollama (lokal) + optional OpenAI/Anthropic"],
    ["content-service", "8005", "Social-Media-Entwürfe, 5-Stufen-Freigabe-Workflow (P02)"],
    ["postgres", "5432", "Datenbank + pgvector, Row-Level Security, Audit-Log"],
    ["keycloak", "8080", "Authentifizierung, Rollen, SSO/OIDC, optional AD-Anbindung"],
    ["minio", "9000", "Objektspeicher (Original-Dokumente)"],
    ["ollama", "11434", "LLM-Engine im Container mit GPU-Zugriff (GB10)"],
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
    ["1 — Installation", "git clone + setup_dgx.sh (Secrets automatisch, Stack, Modelle)", "~1 Std. + Modell-Download", "IT-Betrieb"],
    ["2 — Keycloak", "setup_keycloak.py — 3 Fragen, Rest automatisch", "~15 Minuten", "IT-Betrieb"],
    ["3 — Verwaltung", "Pipes installieren, Nutzer + Dokumente im Verwaltungs-UI, HTTPS", "~halber Tag", "Mandanten-Admin"],
    ["4 — Abnahme", "Abnahmetests, Pilot-Nutzer einweisen", "~1 Tag", "Admin + KV"],
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
children.push(heading1("3  Phase 1 — Automatisierte Installation"));
children.push(phaseHeader("PHASE 1", "Repo klonen + Setup-Skript ausführen", "ca. 1 Std. + Download", "Bereit"));
children.push(spacer(120, 60));

children.push(heading2("3.1  Repository klonen"));
children.push(codeBlock([
  "git clone https://github.com/sventruderung/drk-mv-ki-plattform.git",
  "cd drk-mv-ki-plattform",
]));
children.push(spacer(120, 60));

children.push(heading2("3.2  Setup-Skript ausführen"));
children.push(para("Das Skript erledigt die komplette Basis-Installation. Alle Passwörter und Secrets werden automatisch sicher generiert (openssl rand) — es gibt keine CHANGE_ME-Platzhalter mehr, die jemand vergessen könnte."));
children.push(spacer(60, 40));
children.push(codeBlock([
  "bash scripts/setup_dgx.sh",
  "",
  "# Das Skript fragt nur eine Sache:",
  "#   Kontakt-E-Mail für Let's Encrypt (leer = HTTPS später einrichten)",
]));
children.push(spacer(80, 60));
children.push(para("Was das Skript automatisch erledigt:"));
children.push(bullet(".env mit sicheren Zufalls-Passwörtern erzeugen (chmod 600)"));
children.push(bullet("Alle Container bauen und starten (docker compose up -d --build)"));
children.push(bullet("Sprachmodelle laden: Qwen3 72B (~42 GB) und nomic-embed-text — Download je nach Anbindung 30–90 Minuten"));
children.push(bullet("Smoke-Test: prüft alle Dienste und Modelle, Ergebnis als ✅/❌-Liste"));
children.push(spacer(80, 60));
children.push(successBox("Erwartetes Ergebnis", [
  "✅ API-Gateway   ✅ RAG-Service   ✅ LLM-Service   ✅ Content-Service",
  "✅ Ollama        ✅ Keycloak      ✅ Open WebUI    ✅ MinIO",
  "✅ Modell: qwen3:72b      ✅ Modell: nomic-embed-text",
  "",
  "Alle Checks bestanden — System bereit. 🚀",
]));
children.push(spacer(80, 60));
children.push(warningBox("Sicherheitshinweis", [
  "Die .env-Datei enthält alle Secrets und darf NIEMALS in Git eingecheckt werden",
  "(steht in .gitignore). Nach der Installation: .env separat und sicher sichern",
  "(Passwort-Manager) — ohne sie ist keine Wiederherstellung möglich.",
]));

// ── PHASE 2 ──────────────────────────────────────────────────────────────────
children.push(heading1("4  Phase 2 — Keycloak einrichten (automatisiert)"));
children.push(phaseHeader("PHASE 2", "Keycloak-Wizard ausführen", "ca. 15 Minuten", "Bereit"));
children.push(spacer(120, 60));
children.push(para("Die früher nötigen Klickstrecken in der Keycloak-Konsole (Client-Secret, Mapper, Service-Account-Rollen, erster Admin) erledigt ein interaktives Skript. Es stellt drei Fragen und konfiguriert den Rest über die Keycloak-Admin-API."));
children.push(spacer(60, 40));
children.push(codeBlock([
  "python3 scripts/setup_keycloak.py",
  "",
  "# Fragen:",
  "#   1. Name des Kreisverbands (z.B. parchim)",
  "#   2. Öffentlicher Hostname für HTTPS (leer = später)",
  "#   3. Benutzername + Startpasswort für den ersten Mandanten-Admin",
  "",
  "# Danach Services neu laden (neues Client-Secret):",
  "docker compose up -d",
]));
children.push(spacer(80, 60));
children.push(para("Was der Wizard automatisch erledigt:"));
children.push(bullet("Neues Client-Secret generieren und direkt in die .env schreiben"));
children.push(bullet("tenant_id-Mapper auf den echten KV-Namen setzen (beide Clients)"));
children.push(bullet("Service-Account-Rollen zuweisen — schaltet die Nutzerverwaltung im Verwaltungs-UI frei"));
children.push(bullet("HTTPS-Redirect-URIs eintragen (falls Hostname angegeben)"));
children.push(bullet("Ersten Mandanten-Admin anlegen (Rolle kv-admin, Passwortänderung beim ersten Login)"));
children.push(spacer(80, 60));

children.push(heading2("4.1  Rollen des Systems (§4 Lastenheft)"));
children.push(simpleTable(
  ["Rolle", "Bedeutung"],
  [
    ["kv-admin", "Mandanten-Administrator: Nutzer, Dokumente, Freigaben, Einstellungen"],
    ["kv-vorstand", "ACL-Gruppe: Zugriff auf Vorstands-Dokumente"],
    ["kv-pflege", "ACL-Gruppe: Fachbereich Pflege"],
    ["kv-rettungsdienst", "ACL-Gruppe: Bereichsleitung Rettungsdienst"],
    ["kv-alle", "ACL-Gruppe: für alle Mitarbeitenden (Standard)"],
    ["content-editor", "Social Media: darf Entwürfe erstellen und bearbeiten"],
    ["content-approver", "Social Media: darf freigeben/ablehnen (nicht eigene Entwürfe)"],
  ],
  [2600, Math.floor(CONTENT_WIDTH - 2600)]
));
children.push(spacer(120, 60));

children.push(heading2("4.2  Optional: Active-Directory-Anbindung"));
children.push(para("Die Nutzerverwaltung funktioniert mit und ohne AD. Bei aktiver Anbindung (Keycloak User Federation, READ_ONLY, LDAPS) melden sich Mitarbeitende mit ihrem Windows-Passwort an; Konto und Passwort werden im AD gepflegt, die Rollenvergabe bleibt immer im Verwaltungs-UI. Details: docs/runbooks/ldap-ad-anbindung.md."));
children.push(spacer(60, 40));
children.push(infoBox("Break-Glass-Empfehlung", [
  "Mindestens ein lokales kv-admin-Konto behalten — fällt das AD aus,",
  "bleibt die Plattform administrierbar.",
]));

// ── PHASE 3 ──────────────────────────────────────────────────────────────────
children.push(heading1("5  Phase 3 — Verwaltung und Oberfläche"));
children.push(phaseHeader("PHASE 3", "Verwaltungs-UI, Pipes, HTTPS", "ca. halber Tag", "Bereit"));
children.push(spacer(120, 60));

children.push(heading2("5.1  Das Verwaltungs-UI"));
children.push(para("Die komplette Administration läuft im Browser unter http://<host>:8000/admin — Login mit dem in Phase 2 angelegten Mandanten-Admin (Keycloak). Unten im Fenster ist der Entwicklungsstand (Version + Build-Datum) vermerkt."));
children.push(spacer(60, 40));
children.push(simpleTable(
  ["Tab", "Funktion", "Sichtbar für"],
  [
    ["📄 Dokumente", "Upload per Drag-and-Drop, Sichtbarkeit per Checkbox (ACL), nachträglich änderbar, Löschen", "alle Rollen"],
    ["📣 Social-Media-Freigaben", "Entwürfe ansehen/bearbeiten, einreichen, freigeben/ablehnen — rollenabhängig", "Editoren + Approver"],
    ["👥 Nutzer", "Anlegen, Rollen, Modelle freigeben, Passwort-Reset, Deaktivieren (AD-Konten: nur Rollen)", "kv-admin"],
    ["📋 Protokoll", "Revisionssicheres Audit-Log aller administrativen Aktionen", "kv-admin"],
    ["⚙️ Einstellungen", "KI-Modelle, API-Keys externer Anbieter, HTTPS-Hostname, Systemstatus", "kv-admin"],
  ],
  [2400, Math.floor(CONTENT_WIDTH - 4400), 2000]
));
children.push(spacer(120, 60));

children.push(heading2("5.2  Open-WebUI-Pipes installieren (einmalig)"));
children.push(para("Open WebUI (Port 3000) ist die Chat-Oberfläche der Endnutzer. Drei Pipe-Funktionen verbinden sie mit der Plattform — Installation jeweils per Copy-Paste im Open-WebUI-Admin-Panel (Funktionen → Neue Funktion → Inhalt einfügen → aktivieren):"));
children.push(spacer(60, 40));
children.push(simpleTable(
  ["Pipe-Datei (infra/openwebui/pipes/)", "Erscheint als Modell", "Funktion"],
  [
    ["drk_rag_pipe.py", "🔒 DRK Wissensbasis (lokal)", "Rechtegeprüfte Dokumentensuche mit Quellen-Zitaten"],
    ["drk_content_pipe.py", "🔒 DRK Social Media (Kanal, lokal)", "Beitragsentwürfe je Kanal → Freigabe-Workflow"],
    ["drk_models_pipe.py", "🌐 EXTERN (Anbieter): Modellname", "Freigegebene externe Modelle (nur falls aktiviert)"],
  ],
  [2800, 3000, Math.floor(CONTENT_WIDTH - 5800)]
));
children.push(spacer(80, 60));
children.push(infoBox("Transparenz für Nutzer: Lokal vs. Extern", [
  "Lokale Verarbeitung ist mit 🔒 gekennzeichnet, externe mit 🌐 EXTERN.",
  "Jede Antwort eines externen Modells beginnt mit einem Hinweis, dass die",
  "Eingabe an einen Drittanbieter übertragen wurde. Lokale Antworten enden",
  "mit dem Vermerk 'Lokal verarbeitet — Daten haben die Plattform nicht verlassen'.",
]));
children.push(spacer(80, 60));
children.push(warningBox("Wichtig: Dokumenten-Upload nur über das Verwaltungs-UI", [
  "Dokumente für die Wissensbasis über /admin hochladen — NICHT über den",
  "Open-WebUI-eigenen Upload (der würde die Rechteprüfung (ACL) umgehen).",
  "Nach Keycloak-Login das oauth_id_token-Cookie prüfen (versionsabhängig,",
  "siehe docs/runbooks/openwebui-rag-pipe.md).",
]));
children.push(spacer(120, 60));

children.push(heading2("5.3  HTTPS aktivieren"));
children.push(para("Caddy läuft bereits als Reverse Proxy auf Port 80/443 und holt Let's-Encrypt-Zertifikate automatisch. Aktivierung:"));
children.push(spacer(60, 0));
children.push(numbered("DNS-Eintrag des Hostnamens (z.B. ki.kv-parchim.drk.de) auf den Server zeigen lassen, Ports 80/443 freigeben"));
children.push(numbered("Verwaltungs-UI → ⚙️ Einstellungen → Hostname eintragen und speichern (wirkt ohne Neustart)"));
children.push(numbered("Erster Aufruf von https://<hostname> stellt das Zertifikat aus"));
children.push(numbered("Danach interne Ports (8000, 3000, 8080) in der Firewall schließen"));
children.push(spacer(60, 40));
children.push(infoBox("Internes Netz ohne Internet-Zugang", [
  "Let's Encrypt braucht eine öffentlich erreichbare HTTP-Challenge. Für rein",
  "interne Installationen: 'local_certs' im Caddyfile aktivieren und die",
  "Caddy-Root-CA per Gruppenrichtlinie verteilen (docs/runbooks/https-setup.md).",
]));
children.push(spacer(120, 60));

children.push(heading2("5.4  Optional: Externe KI-Modelle (OpenAI / Anthropic)"));
children.push(para("Standardmäßig ist alles deaktiviert — ohne bewusste Admin-Aktion verlässt kein Byte das System. Falls externe Modelle gewünscht sind:"));
children.push(spacer(60, 0));
children.push(numbered("VORHER: Freigabe des Datenschutzbeauftragten einholen, AVV mit dem Anbieter abschließen"));
children.push(numbered("⚙️ Einstellungen → API-Key des Anbieters hinterlegen (wird nie wieder angezeigt)"));
children.push(numbered("Modelle in der Tabelle aktivieren — 'Für alle Nutzer' oder individuelle Freigabe pro Nutzer (Tab 👥)"));
children.push(spacer(60, 40));
children.push(warningBox("Datenschutz-Garantie der Architektur", [
  "Wissensbasis (RAG) und Social-Media-Texte nutzen IMMER das lokale Modell —",
  "Dokumenteninhalte können externe Modelle technisch nicht erreichen.",
  "Nur der direkte Chat kann (nach Freigabe) extern. Alle Aktivierungen und",
  "Freigaben stehen im Audit-Protokoll. Details: docs/runbooks/externe-modelle.md",
]));

// ── PHASE 4 ──────────────────────────────────────────────────────────────────
children.push(heading1("6  Phase 4 — Abnahmetests"));
children.push(phaseHeader("PHASE 4", "Abnahmetests und Pilot-Betrieb", "ca. 1 Tag", "Bereit"));
children.push(spacer(120, 60));
children.push(para("Die Abnahmetests basieren auf §7 des Lastenhefts. Alle acht Tests müssen bestanden sein, bevor Nutzer eingeladen werden."));
children.push(spacer(80, 60));

children.push(simpleTable(
  ["Test", "Beschreibung", "Erwartetes Ergebnis"],
  [
    ["TC-01\nLatenz", "Chat-Frage in Open WebUI stellen", "Erste Antwort-Tokens < 2,0 s\n(DGX Spark: < 0,5 s erwartet)"],
    ["TC-02\nACL negativ", "Nutzer OHNE kv-vorstand fragt die Wissensbasis nach Vorstandsdokument", "'Zu Ihrer Frage liegen keine freigegebenen Informationen vor'"],
    ["TC-03\nACL positiv", "Nutzer MIT kv-vorstand stellt dieselbe Frage", "Antwort mit Inhalt + Quellenangabe"],
    ["TC-04\nKein Prompt-\nLog", "Chat-Anfrage stellen, danach Logs und audit_log prüfen", "Kein Prompt-Inhalt in Logs oder Audit gespeichert"],
    ["TC-05\nZitierung", "Frage, die im RAG-Dokument beantwortet ist", "Antwort enthält [Quelle: Dateiname, Seite X]"],
    ["TC-06\nSSO", "Login in Open WebUI über 'DRK Login'", "Keycloak-Login, danach nahtlos angemeldet"],
    ["TC-07\nWorkflow", "Editor erstellt Social-Media-Entwurf und versucht, ihn selbst freizugeben", "Eigene Freigabe blockiert; Approver kann freigeben"],
    ["TC-08\nStreaming", "Lange Chat-Anfrage beobachten", "Antwort erscheint Wort für Wort"],
    ["TC-09\nAudit", "Upload, Löschung, Freigabe durchführen, Protokoll-Tab prüfen", "Alle Aktionen erscheinen; Nutzer ohne kv-admin: HTTP 403"],
    ["TC-10\nKein Token", "Abgemeldet eine Frage an die Wissensbasis stellen", "Klarer Hinweis auf fehlende Anmeldung statt Antwort"],
  ],
  [1200, Math.floor((CONTENT_WIDTH - 1200) * 0.45), Math.floor((CONTENT_WIDTH - 1200) * 0.55)]
));
children.push(spacer(120, 60));

children.push(heading2("6.1  TC-01 Latenz-Test (per API)"));
children.push(codeBlock([
  "# JWT-Token holen (Client-Secret steht nach dem Wizard in der .env)",
  "source .env",
  "TOKEN=$(curl -s -X POST \\",
  "  http://localhost:8080/auth/realms/drk-kv/protocol/openid-connect/token \\",
  "  -d \"grant_type=password&client_id=drk-platform\" \\",
  "  -d \"client_secret=$KEYCLOAK_CLIENT_SECRET\" \\",
  "  -d 'username=testuser&password=testpass' \\",
  "  | jq -r .access_token)",
  "",
  "# Latenz-Test",
  "curl -w \"\\nTTFT: %{time_starttransfer}s\\n\" \\",
  "  -H \"Authorization: Bearer $TOKEN\" \\",
  "  -H \"Content-Type: application/json\" \\",
  "  -d '{\"message\":\"Was sind die Kernaufgaben des DRK?\"}' \\",
  "  http://localhost:8000/api/v1/chat/",
  "",
  "# Ziel: TTFT < 0,5 s auf DGX Spark (Lastenheft-Grenze: < 2,0 s)",
]));
children.push(spacer(120, 60));

children.push(heading2("6.2  TC-04 Kein Prompt-Logging prüfen"));
children.push(codeBlock([
  "# Nach einer Chat-Anfrage die Service-Logs stichprobenartig prüfen",
  "docker compose logs --tail=100 api-gateway llm-service | grep -i frage",
  "# Erwartung: keine Treffer — nur Metadaten (tenant_id, model) werden geloggt",
  "",
  "# Audit-Log prüfen (enthält nur administrative Aktionen)",
  "docker compose exec postgres psql -U drk_app -d drk_platform -c \\",
  "  \"SELECT action, info FROM audit_log ORDER BY created_at DESC LIMIT 10;\"",
  "",
  "# Erwartung: document.upload, draft.create, user.roles etc. —",
  "# KEINE Chat-Inhalte, keine Dokumenttexte",
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
  "docker compose exec ollama ollama pull qwen3:72b",
]));
children.push(spacer(120, 60));

children.push(heading2("7.3  Datensicherung"));
children.push(codeBlock([
  "# PostgreSQL-Datenbank sichern (Dokumente-Index, Drafts, Audit-Log)",
  "docker compose exec postgres pg_dump -U drk_app drk_platform \\",
  "  | gzip > backup_$(date +%Y%m%d).sql.gz",
  "",
  "# MinIO-Dokumente sichern (Docker-Volume)",
  "docker run --rm -v drk-mv-ki-plattform_minio_data:/data \\",
  "  -v /backup/minio:/backup alpine tar czf /backup/minio_$(date +%Y%m%d).tgz /data",
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
    ["Erste Anlaufstelle", "Irgendetwas funktioniert nicht", "Verwaltungs-UI → ⚙️ Einstellungen → Systemstatus: zeigt alle Dienste/Modelle mit Lösungshinweis"],
    ["Docker permission denied", "'permission denied … docker.sock'", "sudo usermod -aG docker $USER && newgrp docker"],
    ["Ollama nicht erreichbar", "llm-service: 'Connection refused :11434'", "docker compose ps ollama; docker compose up -d ollama"],
    ["Keycloak startet nicht", "Container bleibt bei 'starting'", "docker compose logs keycloak — beim Erststart 2 Min. warten (DB-Init)"],
    ["Modell fehlt", "Status: 'Modell fehlt'", "docker compose exec ollama ollama pull qwen3:72b (bzw. nomic-embed-text)"],
    ["TTFT > 2 Sekunden", "Antworten kommen spät", "Erst-Anfrage lädt Modell in den Speicher (~10 s); danach < 0,5 s"],
    ["Nutzer-Tab leer / Fehler", "'Service-Account nicht nutzbar'", "scripts/setup_keycloak.py erneut ausführen (vergibt manage-users-Rolle)"],
    ["JWT-Fehler 401", "Verwaltungs-UI meldet Anmeldefehler", "Nach setup_keycloak.py: docker compose up -d (lädt neues Client-Secret)"],
    ["Pipe ohne Token", "'Kein OIDC-Token gefunden'", "Login muss über 'DRK Login' (Keycloak) erfolgen, nicht mit lokalem Open-WebUI-Konto"],
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
  "docker compose exec ollama ollama ps    # geladene Modelle + RAM",
  "docker compose exec ollama ollama list  # alle verfügbaren Modelle",
]));

// ── KONTAKT UND NÄCHSTE SCHRITTE ─────────────────────────────────────────────
children.push(heading1("9  Nächste Schritte nach der Erstinstallation"));
children.push(heading2("9.1  Pilot-Betrieb (Woche 1 nach Go-Live)"));
children.push(numbered("3–5 Pilot-Nutzer im Verwaltungs-UI anlegen (Tab 👥 Nutzer) — passende Rollen: Redaktion content-editor, Führungskraft content-approver, Fachbereich z.B. kv-pflege"));
children.push(numbered("Erste Wissensbasis befüllen: 10–20 interne Dokumente über das Verwaltungs-UI hochladen, mindestens eines mit eingeschränkter Sichtbarkeit"));
children.push(numbered("Kurzeinweisung (30 Min): Login, Chat, 🔒 Wissensbasis, 🔒 Social Media, Bedeutung von 🔒 lokal vs. 🌐 extern"));
children.push(numbered("Feedback-Session nach 1 Woche: Was funktioniert? Was fehlt?"));
children.push(numbered("Ergebnisse in GitHub Issues als Backlog einpflegen (Co-Creation-Zyklus)"));
children.push(spacer(80, 60));

children.push(heading2("9.2  Schrittweise Erweiterung"));
children.push(simpleTable(
  ["Schritt", "Wann", "Beschreibung"],
  [
    ["AD/LDAP-Integration", "Nach Abstimmung KV-IT", "Keycloak User Federation (READ_ONLY) — Runbook ldap-ad-anbindung.md"],
    ["Externe KI-Modelle", "Nach DSB-Freigabe + AVV", "OpenAI/Anthropic im Verwaltungs-UI aktivieren — Runbook externe-modelle.md"],
    ["Pentest + DSB-Freigabe", "Vor Produktivbetrieb", "Go-Live-Kriterien §7 Lastenheft — blocking für Produktion"],
    ["P03 Drittsystem-Integrationen", "Erster Co-Creation-Zyklus", "integration-service (Dienstplan, Intranet etc.)"],
    ["Weitere DRK-KI-Workshops", "Fortlaufend alle 6 Wochen", "Co-Creation-Zyklus — neue Features aus Workshop-Ergebnissen"],
    ["Skalierung auf 2. KV", "Nach 3 Monaten Pilotbetrieb", "Neuer Realm + Tenant — Codebasis ist bereits mandantenfähig (RLS)"],
  ],
  [2500, 2000, Math.floor(CONTENT_WIDTH - 4500)]
));
children.push(spacer(120, 60));
children.push(checkBox("Installations-Checkliste", [
  "□  Phase 0: DGX Spark im Netz, SSH funktioniert, Docker läuft",
  "□  Phase 1: setup_dgx.sh durchgelaufen, Smoke-Test komplett grün",
  "□  Phase 2: setup_keycloak.py ausgeführt, docker compose up -d danach",
  "□  Phase 3: Verwaltungs-UI erreichbar, Systemstatus alle Checks grün",
  "□  Phase 3: Drei Pipes in Open WebUI installiert und aktiviert",
  "□  Phase 3: oauth_id_token-Cookie nach Keycloak-Login vorhanden (DevTools)",
  "□  Phase 3: HTTPS aktiv, interne Ports in der Firewall geschlossen",
  "□  Phase 3: Pilot-Nutzer angelegt, Testdokumente mit ACL hochgeladen",
  "□  Phase 4: Abnahmetests TC-01..TC-10 alle bestanden",
  "□  Backup eingerichtet (Datenbank, MinIO, .env separat)",
  "□  Pilot-Nutzer eingewiesen (inkl. 🔒 lokal vs. 🌐 extern)",
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
