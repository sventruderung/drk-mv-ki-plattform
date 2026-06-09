// Systemuebersicht-DRK-Social-Media.docx
// Entscheidungsvorlage: P-02 Social-Media-Modul
'use strict';
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageBreak, LevelFormat, Header, Footer, PageNumber,
} = require('docx');
const fs = require('fs');

const CONTENT_W = 9026; // A4 with 1" margins in DXA
const COL2_A = 3000;
const COL2_B = CONTENT_W - COL2_A;
const COL3_A = 2200, COL3_B = 4326, COL3_C = 2500;
const COL4_A = 1800, COL4_B = 2800, COL4_C = 2600, COL4_D = 1826;

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
}
function p(text, opts = {}) {
  return new Paragraph({ children: [new TextRun({ text, ...opts })] });
}
function pBold(text) {
  return new Paragraph({ children: [new TextRun({ text, bold: true })] });
}
function gap(lines = 1) {
  return Array.from({ length: lines }, () => new Paragraph({ children: [] }));
}

function cell(text, colW, { header = false, shade = null, bold = false, color = '000000', wrap = false } = {}) {
  return new TableCell({
    borders,
    width: { size: colW, type: WidthType.DXA },
    shading: shade ? { fill: shade, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [new Paragraph({
      children: [new TextRun({ text, bold: bold || header, color, font: 'Arial', size: header ? 20 : 18 })],
    })],
  });
}

function row(cells) { return new TableRow({ children: cells }); }

function table2(rows2, colA = COL2_A, colB = COL2_B) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [colA, colB],
    rows: rows2,
  });
}

function codeBlock(lines) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: CONTENT_W, type: WidthType.DXA },
      shading: { fill: '1E1E1E', type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 200, right: 200 },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: '444444' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: '444444' },
        left: { style: BorderStyle.SINGLE, size: 1, color: '444444' },
        right: { style: BorderStyle.SINGLE, size: 1, color: '444444' },
      },
      children: lines.map(l => new Paragraph({ children: [new TextRun({ text: l, font: 'Courier New', size: 16, color: 'D4D4D4' })] })),
    })]})],
  });
}

// === Architecture Image ===
const imgData = fs.readFileSync('C:/Projekte/drk-mv-ki-plattform/docs/architecture-social.png');
const imgW = 840, imgH = Math.round(840 * 1720 / 2200);
const archImg = new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [new ImageRun({
    type: 'png', data: imgData,
    transformation: { width: imgW, height: imgH },
    altText: { title: 'Architektur Social-Media-Modul', description: 'DRK MV KI-Plattform Social-Media-Modul Architekturdiagramm', name: 'architecture-social' },
  })],
});

// ═══════════════════════════════════════════════
const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: '1F4E79' },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: '2E75B6' },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({ children: [
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '2E75B6', space: 1 } },
          children: [
            new TextRun({ text: 'DRK MV KI-Plattform — Social-Media-Modul (P-02)', font: 'Arial', size: 18, color: '2E75B6' }),
            new TextRun({ text: '\tST COMPUTER GmbH', font: 'Arial', size: 18, color: '888888' }),
          ],
          tabStops: [{ type: 'right', position: 9026 }],
        }),
      ]}),
    },
    footers: {
      default: new Footer({ children: [
        new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: '2E75B6', space: 1 } },
          children: [
            new TextRun({ text: 'Vertraulich — Nur für interne Verwendung', font: 'Arial', size: 16, color: '888888' }),
            new TextRun({ text: '\tSeite ', font: 'Arial', size: 16, color: '888888' }),
            new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: '888888' }),
          ],
          tabStops: [{ type: 'right', position: 9026 }],
        }),
      ]}),
    },
    children: [

      // ── Titelseite ──────────────────────────────────────────
      ...gap(3),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'DRK MV KI-Plattform', font: 'Arial', size: 48, bold: true, color: '1F4E79' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Social-Media-Modul (P-02)', font: 'Arial', size: 36, bold: true, color: '2E75B6' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'KI-gestützte Öffentlichkeitsarbeit für DRK-Kreisverbände', font: 'Arial', size: 24, color: '555555' })],
      }),
      ...gap(2),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '2E75B6', space: 2 } },
        children: [],
      }),
      ...gap(1),
      new Table({
        width: { size: 6000, type: WidthType.DXA },
        columnWidths: [2400, 3600],
        rows: [
          row([cell('Erstellt von', 2400, { shade: 'D6E4F0', bold: true }), cell('ST COMPUTER GmbH · Sven Truderung', 3600)]),
          row([cell('Auftraggeber', 2400, { shade: 'D6E4F0', bold: true }), cell('DRK Landesverband MV e.V.', 3600)]),
          row([cell('Datum', 2400, { shade: 'D6E4F0', bold: true }), cell('09. Juni 2026', 3600)]),
          row([cell('Version', 2400, { shade: 'D6E4F0', bold: true }), cell('0.1.0 — Konzeptionsphase', 3600)]),
          row([cell('Status', 2400, { shade: 'D6E4F0', bold: true }), cell('Entwurf — zur internen Abstimmung', 3600)]),
          row([cell('Parked-Intent-Ref.', 2400, { shade: 'D6E4F0', bold: true }), cell('P-02 aus intents/PARKED.md', 3600)]),
        ],
      }),
      ...gap(2),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Kap. 1: Zielsetzung ─────────────────────────────────
      h1('1. Zielsetzung und Nutzen'),
      p('Das Social-Media-Modul erweitert die DRK MV KI-Plattform um KI-gestützte Öffentlichkeitsarbeit. ' +
        'Mitarbeitende in Kreisverbänden beschreiben eine DRK-Aktivität in natürlicher Sprache; die KI ' +
        'generiert daraus einsatzbereite Entwürfe für mehrere Kommunikationskanäle im DRK-CI-konformen Stil. ' +
        'Ein Freigabeworkflow stellt sicher, dass kein Entwurf ohne menschliche Prüfung veröffentlicht wird.'),
      ...gap(1),
      h2('1.1 Anwendungsfälle'),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [COL3_A, COL3_B, COL3_C],
        rows: [
          row([
            cell('Anwendungsfall', COL3_A, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
            cell('Beschreibung', COL3_B, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
            cell('Zielkanal', COL3_C, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
          ]),
          row([
            cell('Aktionsbericht', COL3_A, { shade: 'EAF2FB' }),
            cell('Kurzbeschreibung einer Blutspende-Aktion, Katastrophenschutz-Übung oder Spendenaufruf → KI generiert Social-Media-Post', COL3_B),
            cell('Facebook, Instagram', COL3_C),
          ]),
          row([
            cell('Pressemitteilung', COL3_A, { shade: 'EAF2FB' }),
            cell('Strukturierter Fließtext (Anlass, Zitat, Kontakt) → professionelle Pressemitteilung im DRK-Layout', COL3_B),
            cell('DRK-Webseite, Medien', COL3_C),
          ]),
          row([
            cell('Newsletter-Beitrag', COL3_A, { shade: 'EAF2FB' }),
            cell('Themenstichworte → ausformulierter Beitrag für Mitglieder-Newsletter (nur Opt-in-Empfänger)', COL3_B),
            cell('Newsletter / E-Mail', COL3_C),
          ]),
          row([
            cell('LinkedIn-Beitrag', COL3_A, { shade: 'EAF2FB' }),
            cell('Sachliche Darstellung einer DRK-Aktivität im professionellen Ton für Vernetzung mit Institutionen', COL3_B),
            cell('LinkedIn', COL3_C),
          ]),
          row([
            cell('Übersetzung / Sprachanpassung', COL3_A, { shade: 'EAF2FB' }),
            cell('Bereits erstellter Text → Ton-Anpassung (formell/informell) oder Kürzung für Zeichenlimits (Twitter/X: 280)', COL3_B),
            cell('Alle Kanäle', COL3_C),
          ]),
        ],
      }),
      ...gap(1),
      h2('1.2 Unterschied zum RAG-Kern'),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2800, 3113, 3113],
        rows: [
          row([
            cell('Merkmal', 2800, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
            cell('RAG-Kern (INTENT-01)', 3113, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
            cell('Social-Media-Modul (P-02)', 3113, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
          ]),
          row([cell('Datenart', 2800, { shade: 'EAF2FB' }), cell('Sozialdaten, interne Dokumente', 3113), cell('Öffentlichkeitskommunikation', 3113)]),
          row([cell('DSGVO-Risiko', 2800, { shade: 'EAF2FB' }), cell('Hoch — Art. 9, § 35 SGB I', 3113), cell('Niedrig — keine Sozialdaten', 3113)]),
          row([cell('Zielgruppe Intern', 2800, { shade: 'EAF2FB' }), cell('Sachbearbeitende', 3113), cell('Presse- / ÖA-Beauftragte', 3113)]),
          row([cell('Output', 2800, { shade: 'EAF2FB' }), cell('Interne Antworten / Zitate', 3113), cell('Externe Veröffentlichungen', 3113)]),
          row([cell('Freigabe', 2800, { shade: 'EAF2FB' }), cell('Nicht erforderlich (intern)', 3113), cell('Pflicht vor Veröffentlichung', 3113)]),
          row([cell('Prompt-Logging', 2800, { shade: 'EAF2FB' }), cell('Verboten (Sozialdaten)', 3113), cell('Zulässig (keine Art. 9-Daten)', 3113)]),
        ],
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Kap. 2: Architektur ─────────────────────────────────
      h1('2. Architektur'),
      p('Das Social-Media-Modul wird als neuer Microservice content-service (:8005) in die bestehende ' +
        'Plattformarchitektur integriert. Die gesamte bestehende Infrastruktur (API-Gateway, LLM-Service, ' +
        'RAG-Service, PostgreSQL, Ollama, Keycloak) bleibt unverändert. Der content-service nutzt ' +
        'LLM-Service und RAG-Service intern über die bestehenden Service-APIs.'),
      ...gap(1),
      archImg,
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Abb. 1: Architektur DRK MV KI-Plattform — Social-Media-Modul (P-02)', font: 'Arial', size: 18, italics: true, color: '555555' })],
      }),
      ...gap(1),
      h2('2.1 Neue Komponenten'),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2400, 2000, 4626],
        rows: [
          row([
            cell('Komponente', 2400, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
            cell('Port / Ort', 2000, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
            cell('Funktion', 4626, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
          ]),
          row([cell('content-service', 2400, { shade: 'FEF9E7' }), cell(':8005 (neu)', 2000), cell('Post-Generierung, Kanalformatierung, DRK-CI-Validierung, Genehmigungsworkflow', 4626)]),
          row([cell('MinIO — Content Assets', 2400, { shade: 'FEF9E7' }), cell('S3-kompatibel', 2000), cell('DRK-Logos, CI-Vorlagen, Bilder für Posts; Bucket drk-content-{tenant}; keine personenbezogenen Daten', 4626)]),
          row([cell('content_drafts (DB)', 2400, { shade: 'FEF9E7' }), cell('PostgreSQL', 2000), cell('Entwurfs-Speicher mit Status (draft / review / approved / published); tenant_id via RLS isoliert', 4626)]),
          row([cell('Keycloak-Rollen', 2400, { shade: 'FEF9E7' }), cell('Keycloak 24', 2000), cell('content-editor (erstellt Entwürfe), content-approver (genehmigt / lehnt ab)', 4626)]),
        ],
      }),
      ...gap(1),
      h2('2.2 Interner Datenfluss'),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [600, 2200, 6226],
        rows: [
          row([
            cell('Nr.', 600, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
            cell('Von → Nach', 2200, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
            cell('Beschreibung', 6226, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
          ]),
          row([cell('1', 600, { shade: 'EAF2FB' }), cell('Nutzer → Open WebUI', 2200), cell('Eingabe: Thema/Stichwörter, Ziel-Kanal, gewünschter Ton. Optional: Referenz-Bild aus MinIO.', 6226)]),
          row([cell('2', 600, { shade: 'EAF2FB' }), cell('Open WebUI → API-Gateway', 2200), cell('JWT-gesicherter REST-Aufruf POST /api/v1/content/draft mit tenant_id aus Token-Claims.', 6226)]),
          row([cell('3', 600, { shade: 'EAF2FB' }), cell('API-Gateway → content-service', 2200), cell('Routing zu :8005, JWT-Validierung abgeschlossen, tenant_id im Request-Context.', 6226)]),
          row([cell('4', 600, { shade: 'EAF2FB' }), cell('content-service → RAG-Service', 2200), cell('Abruf DRK-CI-Regeln, Formulierungsbeispiele, aktuelle Kampagnen-Keywords aus dem Vektorspeicher des Mandanten.', 6226)]),
          row([cell('5', 600, { shade: 'EAF2FB' }), cell('content-service → LLM-Service', 2200), cell('Generierungsauftrag mit System-Prompt (CI-Regeln) + Nutzer-Kontext. Streaming-Antwort (SSE) zurück.', 6226)]),
          row([cell('6', 600, { shade: 'EAF2FB' }), cell('content-service → PostgreSQL', 2200), cell('Entwurf wird in content_drafts gespeichert. Status: draft. CI-Score und Kanal-Metadaten werden mit gespeichert.', 6226)]),
          row([cell('7', 600, { shade: 'EAF2FB' }), cell('Approver → Open WebUI', 2200), cell('content-approver prüft Entwurf, kann editieren, genehmigt (→ approved) oder lehnt ab (→ rejected mit Kommentar).', 6226)]),
          row([cell('8', 600, { shade: 'EAF2FB' }), cell('Approver → Kanal', 2200), cell('Manuelles Kopieren/Posten des genehmigten Textes. Optionale API-Anbindung (Facebook Graph API, LinkedIn API) in Phase 2.', 6226)]),
        ],
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Kap. 3: content-service Aufbau ─────────────────────
      h1('3. content-service — Modulaufbau'),
      h2('3.1 Verzeichnisstruktur'),
      codeBlock([
        'services/content-service/',
        '├── src/',
        '│   ├── main.py               ← FastAPI App, Routen-Registrierung',
        '│   ├── api/',
        '│   │   └── v1/',
        '│   │       ├── routes/',
        '│   │       │   ├── drafts.py       ← POST /draft, GET /draft/{id}, PATCH /draft/{id}/approve',
        '│   │       │   └── templates.py    ← GET /templates (Kanal-Vorlagen)',
        '│   │       └── schemas.py          ← Pydantic-Modelle: DraftRequest, DraftResponse',
        '│   ├── services/',
        '│   │   ├── generator.py      ← LLM-Aufruf, Prompt-Assembly, CI-Regeln',
        '│   │   ├── ci_validator.py   ← DRK-CI-Prüfung: Tonalität, Zeichenlimits, Pflicht-Hashtags',
        '│   │   ├── rag_client.py     ← RAG-Service-Client: CI-Beispiele, Kampagnen-Keywords',
        '│   │   └── approval.py       ← Freigabeworkflow: Status-Übergänge, Audit-Einträge',
        '│   └── models/',
        '│       ├── draft.py          ← SQLAlchemy-Modell: content_drafts',
        '│       └── template.py       ← SQLAlchemy-Modell: content_templates',
        '├── Dockerfile',
        '└── pyproject.toml',
      ]),
      ...gap(1),
      h2('3.2 Kanal-Konfiguration'),
      p('Jeder Kanal wird über ein JSON-Template konfiguriert, das Zeichenlimits, Ton-Vorgaben, ' +
        'Pflicht-Elemente (Hashtags, Kontaktzeile) und CI-Regeln definiert. Die Templates werden ' +
        'mandantenspezifisch im RAG-Vektorspeicher abgelegt und können durch den KV-Admin angepasst werden.'),
      ...gap(1),
      codeBlock([
        '// Beispiel: Facebook-Template (gespeichert als DRK-CI-Dokument im RAG)',
        '{',
        '  "channel": "facebook",',
        '  "max_chars": 500,',
        '  "tone": "warm, ansprechend, gemeinschaftsorientiert",',
        '  "required_elements": ["#DRK", "#DRKMV", "KV-Name"],',
        '  "forbidden_terms": ["Katastrophe", "Notfall" (ohne Kontext)],',
        '  "ci_colors_note": "Rot (#E8000D) als Akzent in Bild empfohlen",',
        '  "cta_template": "Mehr Infos: [KV-Webseite]"',
        '}',
      ]),
      ...gap(1),
      h2('3.3 Genehmigungsworkflow'),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [1800, 2600, 4626],
        rows: [
          row([
            cell('Status', 1800, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
            cell('Übergang durch', 2600, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
            cell('Beschreibung', 4626, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
          ]),
          row([cell('draft', 1800, { shade: 'EAF2FB' }), cell('System (nach KI-Generierung)', 2600), cell('Entwurf erstellt, noch nicht geprüft. Nur für content-editor sichtbar.', 4626)]),
          row([cell('review', 1800, { shade: 'EAF2FB' }), cell('content-editor (manuell)', 2600), cell('Zur Prüfung eingereicht. content-approver wird benachrichtigt.', 4626)]),
          row([cell('approved', 1800, { shade: 'FEF9E7' }), cell('content-approver', 2600), cell('Freigegeben. Text kann manuell veröffentlicht werden. Audit-Eintrag mit Approver-ID.', 4626)]),
          row([cell('published', 1800, { shade: 'E8F8E8' }), cell('content-editor (manuell)', 2600), cell('Als veröffentlicht markiert. Dokumentiert Kanal und Zeitpunkt.', 4626)]),
          row([cell('rejected', 1800, { shade: 'FDECEA' }), cell('content-approver', 2600), cell('Abgelehnt mit Begründung. Entwurf kann überarbeitet und erneut eingereicht werden.', 4626)]),
        ],
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Kap. 4: Datenschutz ─────────────────────────────────
      h1('4. Datenschutz und Compliance'),
      p('Das Social-Media-Modul unterscheidet sich grundlegend vom RAG-Kern in der Datenschutz-Risikolage: ' +
        'Öffentlichkeitskommunikation enthält keine Sozialdaten nach Art. 9 DSGVO oder § 35 SGB I. ' +
        'Das Risikoprofil ist deutlich niedriger — gleichwohl gelten allgemeine DSGVO-Grundsätze.'),
      ...gap(1),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [3000, 3013, 3013],
        rows: [
          row([
            cell('Aspekt', 3000, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
            cell('RAG-Kern', 3013, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
            cell('Social-Media-Modul', 3013, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
          ]),
          row([cell('Datenart', 3000, { shade: 'EAF2FB' }), cell('Sozialdaten (Art. 9)', 3013), cell('Öffentliche Kommunikation', 3013)]),
          row([cell('Prompt-Logging', 3000, { shade: 'EAF2FB' }), cell('Verboten (§ 35 SGB I)', 3013), cell('Zulässig (keine Sozialdaten)', 3013)]),
          row([cell('Rechtsgrundlage', 3000, { shade: 'EAF2FB' }), cell('Art. 9 Abs. 2h DSGVO', 3013), cell('Art. 6 Abs. 1f DSGVO (berechtigtes Interesse: Öffentlichkeitsarbeit)', 3013)]),
          row([cell('Newsletter', 3000, { shade: 'EAF2FB' }), cell('Nicht anwendbar', 3013), cell('Nur an Opt-in-Empfänger (Art. 6 Abs. 1a DSGVO)', 3013)]),
          row([cell('Social-Media-APIs', 3000, { shade: 'EAF2FB' }), cell('Nicht anwendbar', 3013), cell('Datenübermittlung in Drittländer möglich → Prüfung durch DPO vor API-Aktivierung', 3013)]),
          row([cell('Bilder / Fotos', 3000, { shade: 'EAF2FB' }), cell('Nicht anwendbar', 3013), cell('Personenbilder: Einwilligungspflicht. KI generiert keinen Bildinhalt (nur Text).', 3013)]),
          row([cell('Audit-Logging', 3000, { shade: 'EAF2FB' }), cell('Administrativ, kein Prompt-Log', 3013), cell('Freigabe-Aktionen vollständig protokolliert (Approver-ID, Zeitstempel, Kanal)', 3013)]),
        ],
      }),
      ...gap(1),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [CONTENT_W],
        rows: [new TableRow({ children: [new TableCell({
          width: { size: CONTENT_W, type: WidthType.DXA },
          shading: { fill: 'FFF3CD', type: ShadingType.CLEAR },
          borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'FFC107' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'FFC107' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'FFC107' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'FFC107' } },
          margins: { top: 120, bottom: 120, left: 160, right: 160 },
          children: [
            new Paragraph({ children: [new TextRun({ text: 'Hinweis für DPO-Abstimmung (vor Phase 2)', bold: true, font: 'Arial', size: 20, color: '856404' })] }),
            new Paragraph({ children: [new TextRun({ text: 'Die optionale API-Anbindung an Facebook Graph API oder LinkedIn API überträgt Daten an US-Server (Meta/Microsoft). Vor Aktivierung ist eine Prüfung durch den DRK-Datenschutzbeauftragten erforderlich: Datenübermittlungsklauseln (Art. 46 DSGVO), Standardvertragsklauseln, ggf. Transfer Impact Assessment. Phase 1 (Draft-Generierung ohne API) ist datenschutzrechtlich unbedenklich.', font: 'Arial', size: 18, color: '856404' })] }),
          ],
        })]})],
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Kap. 5: Implementierungsplan ────────────────────────
      h1('5. Implementierungsplan'),
      h2('5.1 Phasen'),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [COL4_A, COL4_B, COL4_C, COL4_D],
        rows: [
          row([
            cell('Phase', COL4_A, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
            cell('Inhalt', COL4_B, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
            cell('Ergebnis', COL4_C, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
            cell('Dauer', COL4_D, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
          ]),
          row([
            cell('Phase 1 — Grundgerüst', COL4_A, { shade: 'EAF2FB' }),
            cell('content-service Scaffold, DB-Schema (content_drafts), Keycloak-Rollen, einfache LLM-Texterstellung ohne CI-Validierung', COL4_B),
            cell('Entwürfe werden erstellt und in DB gespeichert. Manuelle Freigabe möglich.', COL4_C),
            cell('2 Wochen', COL4_D),
          ]),
          row([
            cell('Phase 2 — CI-Integration', COL4_A, { shade: 'EAF2FB' }),
            cell('DRK-CI-Templates im RAG-Vektorspeicher, ci_validator.py, kanalspezifische Prompts, Zeichenlimit-Prüfung', COL4_B),
            cell('Posts entsprechen DRK-CI. Automatischer CI-Score pro Entwurf.', COL4_C),
            cell('2 Wochen', COL4_D),
          ]),
          row([
            cell('Phase 3 — Genehmigungsworkflow', COL4_A, { shade: 'EAF2FB' }),
            cell('Status-Übergänge (draft→review→approved→published), E-Mail-Benachrichtigung an Approver, Audit-Log', COL4_B),
            cell('Vollständiger Freigabeprozess. Audit-Nachvollziehbarkeit gegeben.', COL4_C),
            cell('1–2 Wochen', COL4_D),
          ]),
          row([
            cell('Phase 4 — API-Anbindung (optional)', COL4_A, { shade: 'FFF8E1' }),
            cell('Facebook Graph API / LinkedIn API für direkte Veröffentlichung. Nur nach DPO-Freigabe.', COL4_B),
            cell('Optional: Ein-Klick-Veröffentlichung nach Freigabe. Erfordert DPO-Zustimmung.', COL4_C),
            cell('2–3 Wochen', COL4_D),
          ]),
        ],
      }),
      ...gap(1),
      h2('5.2 Technische Voraussetzungen'),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [3500, 5526],
        rows: [
          row([
            cell('Voraussetzung', 3500, { header: true, shade: '2E75B6', color: 'FFFFFF' }),
            cell('Details', 5526, { header: true, shade: '2E75B6', color: 'FFFFFF' }),
          ]),
          row([cell('Bestehende Plattform lauffähig', 3500, { shade: 'EAF2FB' }), cell('API-Gateway, LLM-Service, RAG-Service, PostgreSQL, Keycloak müssen installiert sein.', 5526)]),
          row([cell('DRK-CI-Dokumente vorhanden', 3500, { shade: 'EAF2FB' }), cell('CI-Richtlinien, Formulierungsbeispiele und Kanal-Vorgaben müssen vom KV bereitgestellt und in den RAG-Vektorspeicher eingespeist werden.', 5526)]),
          row([cell('MinIO-Instanz', 3500, { shade: 'EAF2FB' }), cell('MinIO ist bereits in der Multi-KV-Architektur vorgesehen. Für Mono-KV kann lokales Filesystem als Fallback genutzt werden.', 5526)]),
          row([cell('Keycloak-Rollen', 3500, { shade: 'EAF2FB' }), cell('content-editor und content-approver müssen im Keycloak-Realm des jeweiligen KV angelegt und Mitarbeitenden zugewiesen werden.', 5526)]),
          row([cell('DPO-Abstimmung (Phase 4)', 3500, { shade: 'FFF8E1' }), cell('Vor Aktivierung externer Social-Media-APIs: Datenschutzfolgenabschätzung, Standardvertragsklauseln (EU-US-Transfer).', 5526)]),
        ],
      }),
      ...gap(1),
      h2('5.3 Offene Entscheidungen'),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [3000, 6026],
        rows: [
          row([
            cell('Frage', 3000, { header: true, shade: '2E75B6', color: 'FFFFFF' }),
            cell('Optionen / Empfehlung', 6026, { header: true, shade: '2E75B6', color: 'FFFFFF' }),
          ]),
          row([cell('Welche Kanäle in Phase 1?', 3000, { shade: 'EAF2FB' }), cell('Empfehlung: Facebook + DRK-Webseite als Pilotkanäle. Instagram/LinkedIn in Phase 2.', 6026)]),
          row([cell('Wer ist content-approver pro KV?', 3000, { shade: 'EAF2FB' }), cell('Muss durch DRK KV-Leitung definiert werden. Mindestens eine Person pro KV mit Keycloak-Rolle.', 6026)]),
          row([cell('CI-Templates — wer pflegt?', 3000, { shade: 'EAF2FB' }), cell('ST COMPUTER GmbH legt Basis an; DRK LV MV pflegt fortlaufend via Admin-Service oder RAG-Ingest.', 6026)]),
          row([cell('LLM für Post-Generierung', 3000, { shade: 'EAF2FB' }), cell('Empfehlung: Llama 3.1 8B oder Qwen2.5 7B für schnelle Draft-Generierung (< 5 Sek. TTFT); Qwen3 30B für Qualitäts-Check.', 6026)]),
          row([cell('Phase 4 — API-Anbindung', 3000, { shade: 'FFF8E1' }), cell('Erfordert explizite Freigabe durch DPO (DRK LV MV). Empfehlung: erst nach 6-monatigem manuellen Betrieb.', 6026)]),
        ],
      }),
      ...gap(1),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Kap. 6: Aufwand und Ressourcen ─────────────────────
      h1('6. Aufwand und Ressourcen'),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2800, 2000, 4226],
        rows: [
          row([
            cell('Komponente', 2800, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
            cell('Aufwand (Tage)', 2000, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
            cell('Bemerkung', 4226, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
          ]),
          row([cell('content-service Grundgerüst (Phase 1)', 2800, { shade: 'EAF2FB' }), cell('5–7 Tage', 2000), cell('FastAPI-Service, DB-Schema, Keycloak-Rollen, einfache LLM-Anbindung', 4226)]),
          row([cell('CI-Templates + RAG-Integration (Phase 2)', 2800, { shade: 'EAF2FB' }), cell('4–6 Tage', 2000), cell('CI-Dokument-Ingest, ci_validator.py, Kanal-Prompts', 4226)]),
          row([cell('Genehmigungsworkflow (Phase 3)', 2800, { shade: 'EAF2FB' }), cell('3–4 Tage', 2000), cell('Status-Maschine, E-Mail-Benachrichtigung, Audit-Log', 4226)]),
          row([cell('Open WebUI Anpassung', 2800, { shade: 'EAF2FB' }), cell('2–3 Tage', 2000), cell('Content-Editor-Ansicht, Vorschau-Panel, Freigabe-Button', 4226)]),
          row([cell('Testing + Pilotbetrieb', 2800, { shade: 'EAF2FB' }), cell('3–5 Tage', 2000), cell('Unit-Tests, Pilot mit 1–2 KV-Mitarbeitenden, Feedback-Einarbeitung', 4226)]),
          row([
            cell('GESAMT Phase 1–3', 2800, { bold: true, shade: 'D6E4F0' }),
            cell('17–25 Tage', 2000, { bold: true, shade: 'D6E4F0' }),
            cell('Ohne Phase 4 (API-Anbindung). Abhängig von CI-Template-Bereitstellung durch DRK LV MV.', 4226, { shade: 'D6E4F0' }),
          ]),
          row([cell('Phase 4 — Social-Media-API (optional)', 2800, { shade: 'FFF8E1' }), cell('+5–8 Tage', 2000), cell('Nur nach DPO-Freigabe. Facebook Graph API + LinkedIn API Integration.', 4226)]),
        ],
      }),
      ...gap(2),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB', space: 2 } },
        children: [new TextRun({ text: 'ST COMPUTER GmbH · Sven Truderung · st@stc.de · Version 0.1.0 · 09.06.2026', font: 'Arial', size: 16, color: '888888' })],
      }),
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('C:/Projekte/drk-mv-ki-plattform/docs/Systemuebersicht-DRK-Social-Media.docx', buf);
  console.log('OK', buf.length, 'bytes');
});
