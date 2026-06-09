// Systemuebersicht-DRK-Rollen-Rechte.docx
// Rollen-, Rechte- und Zugriffskonzept laut Lastenheft §4
'use strict';
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageBreak, LevelFormat, Header, Footer, PageNumber,
} = require('docx');
const fs = require('fs');

const CW = 9026; // content width A4 1" margins

const bd = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: bd, bottom: bd, left: bd, right: bd };
const cm = { top: 80, bottom: 80, left: 120, right: 120 };

const hdrBorder = (color) => ({
  top: { style: BorderStyle.SINGLE, size: 1, color },
  bottom: { style: BorderStyle.SINGLE, size: 1, color },
  left: { style: BorderStyle.SINGLE, size: 1, color },
  right: { style: BorderStyle.SINGLE, size: 1, color },
});

function h1(t) { return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] }); }
function h2(t) { return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] }); }
function h3(t) { return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] }); }
function p(t, opts = {}) { return new Paragraph({ children: [new TextRun({ text: t, font: 'Arial', size: 22, ...opts })] }); }
function gap(n = 1) { return Array.from({ length: n }, () => new Paragraph({ children: [] })); }
function bullet(t, bold = false) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    children: [new TextRun({ text: t, font: 'Arial', size: 22, bold })],
  });
}
function checkBullet(t, ok = true) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    children: [new TextRun({ text: (ok ? '✔  ' : '✘  ') + t, font: 'Arial', size: 22, color: ok ? '1A5C1A' : 'C0392B' })],
  });
}

function cell(t, w, { hdr = false, shade = null, bold = false, color = '000000', italic = false, size = 18 } = {}) {
  return new TableCell({
    borders, width: { size: w, type: WidthType.DXA },
    shading: shade ? { fill: shade, type: ShadingType.CLEAR } : undefined,
    margins: cm,
    children: [new Paragraph({ children: [new TextRun({ text: t, bold: bold || hdr, color, font: 'Arial', size: hdr ? 20 : size, italics: italic })] })],
  });
}
function cellLines(lines, w, { shade = null } = {}) {
  return new TableCell({
    borders, width: { size: w, type: WidthType.DXA },
    shading: shade ? { fill: shade, type: ShadingType.CLEAR } : undefined,
    margins: cm,
    children: lines.map(([t, opts = {}]) => new Paragraph({ children: [new TextRun({ text: t, font: 'Arial', size: 18, ...opts })] })),
  });
}
function row(...cells) { return new TableRow({ children: cells }); }
function tbl(cols, rows2) {
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: cols, rows: rows2 });
}

function infoBox(title, body, fillColor = 'EAF2FB', borderColor = '2E75B6') {
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: [CW],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: CW, type: WidthType.DXA },
      shading: { fill: fillColor, type: ShadingType.CLEAR },
      borders: hdrBorder(borderColor),
      margins: { top: 120, bottom: 120, left: 160, right: 160 },
      children: [
        new Paragraph({ children: [new TextRun({ text: title, bold: true, font: 'Arial', size: 20, color: borderColor === '2E75B6' ? '1F4E79' : borderColor === 'C0392B' ? '7B241C' : '856404' })] }),
        new Paragraph({ children: [new TextRun({ text: body, font: 'Arial', size: 18, color: '333333' })] }),
      ],
    })]})],
  });
}

function roleBox(titleText, subtitle, bullets, keycloakRole, fillColor, borderColor, titleColor) {
  const children = [
    new Paragraph({ children: [new TextRun({ text: titleText, bold: true, font: 'Arial', size: 22, color: titleColor })] }),
    new Paragraph({ children: [new TextRun({ text: subtitle, font: 'Arial', size: 18, italics: true, color: '555555' })] }),
    new Paragraph({ children: [] }),
    ...bullets.map(([t, ok]) => new Paragraph({
      numbering: { reference: 'bullets', level: 0 },
      children: [new TextRun({ text: (ok ? '✔  ' : '✘  ') + t, font: 'Arial', size: 18, color: ok ? '1A5C1A' : 'C0392B' })],
    })),
    new Paragraph({ children: [] }),
    new Paragraph({ children: [new TextRun({ text: 'Keycloak-Rolle: ' + keycloakRole, font: 'Arial', size: 16, italics: true, color: '888888' })] }),
  ];
  return new TableCell({
    borders: hdrBorder(borderColor),
    width: { size: Math.floor(CW / 3), type: WidthType.DXA },
    shading: { fill: fillColor, type: ShadingType.CLEAR },
    margins: { top: 120, bottom: 120, left: 160, right: 160 },
    children,
  });
}

// Image
const imgData = fs.readFileSync('C:/Projekte/drk-mv-ki-plattform/docs/architecture-rollen.png');
const imgW = 840, imgH = Math.round(840 * 1960 / 2400);
const archImg = new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [new ImageRun({
    type: 'png', data: imgData,
    transformation: { width: imgW, height: imgH },
    altText: { title: 'Rollen-Rechte-Zugriffskonzept', description: 'DRK MV KI-Plattform Rollen und Zugriffskonzept', name: 'architecture-rollen' },
  })],
});

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
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: '1A5C1A' },
        paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•',
          alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.',
          alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '2E75B6', space: 1 } },
      children: [
        new TextRun({ text: 'DRK MV KI-Plattform — Rollen-, Rechte- und Zugriffskonzept (Lastenheft §4)', font: 'Arial', size: 18, color: '2E75B6' }),
        new TextRun({ text: '\tST COMPUTER GmbH', font: 'Arial', size: 18, color: '888888' }),
      ],
      tabStops: [{ type: 'right', position: 9026 }],
    })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: '2E75B6', space: 1 } },
      children: [
        new TextRun({ text: 'Vertraulich — Nur für interne Verwendung', font: 'Arial', size: 16, color: '888888' }),
        new TextRun({ text: '\tSeite ', font: 'Arial', size: 16, color: '888888' }),
        new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: '888888' }),
      ],
      tabStops: [{ type: 'right', position: 9026 }],
    })] }) },
    children: [

      // ── Titelseite ─────────────────────────────────────────
      ...gap(3),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'DRK MV KI-Plattform', font: 'Arial', size: 48, bold: true, color: '1F4E79' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Rollen-, Rechte- und Zugriffskonzept', font: 'Arial', size: 36, bold: true, color: '2E75B6' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Lastenheft §4 · Feingranulares Berechtigungssystem für alle Kreisverbände', font: 'Arial', size: 24, color: '555555' })] }),
      ...gap(2),
      new Paragraph({ alignment: AlignmentType.CENTER, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '2E75B6', space: 2 } }, children: [] }),
      ...gap(1),
      tbl([2400, 3600], [
        row(cell('Erstellt von', 2400, { shade: 'D6E4F0', bold: true }), cell('ST COMPUTER GmbH · Sven Truderung', 3600)),
        row(cell('Auftraggeber', 2400, { shade: 'D6E4F0', bold: true }), cell('DRK Landesverband MV e.V.', 3600)),
        row(cell('Datum', 2400, { shade: 'D6E4F0', bold: true }), cell('09. Juni 2026', 3600)),
        row(cell('Version', 2400, { shade: 'D6E4F0', bold: true }), cell('0.1.0 — Konzeptionsphase', 3600)),
        row(cell('Lastenheft-Referenz', 2400, { shade: 'D6E4F0', bold: true }), cell('§4 Rollen-, Rechte- und Zugriffskonzept · §6.2 Authentifizierung · §7 Abnahmekriterien', 3600)),
        row(cell('Technologie', 2400, { shade: 'D6E4F0', bold: true }), cell('Keycloak 24 (OIDC/OAuth2/AD) · PostgreSQL Row-Level Security · pgvector ACL-Filter', 3600)),
      ]),
      ...gap(2),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Kap. 1: Übersicht ─────────────────────────────────
      h1('1. Zielsetzung und Überblick'),
      p('Das Lastenheft (§4) schreibt ein feingranulares Berechtigungssystem vor, das auf zwei Ebenen greift: ' +
        'der System-Ebene (Landesverband MV) und der Mandanten-Ebene (je Kreisverband). ' +
        'Innerhalb jedes Kreisverbandes können Dokumente im RAG-System mit differenzierten Zugriffsrechten ' +
        'versehen werden — die KI darf bei einer Anfrage ausschließlich Inhalte heranziehen, ' +
        'für die der anfragende Nutzer eine aktive Leseberechtigung besitzt (§4.2, rechtegeprüfte Generierung).'),
      ...gap(1),
      infoBox(
        'Abnahmekriterium §7 — Rechtegeprüfte RAG-Anfrage',
        'Es wird nachgewiesen, dass die KI bei Prompts von Nutzern ohne entsprechende Berechtigung ' +
        'keine Informationen aus geschützten Dokumenten preisgibt. Dieser Nachweis ist Pflicht vor Go-Live.',
        'FFF3CD', 'FFC107'
      ),
      ...gap(1),

      // Übersichtstabelle
      tbl([1800, 2800, 4426], [
        row(
          cell('Ebene', 1800, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Rolle', 2800, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Hauptverantwortung', 4426, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
        ),
        row(cell('System', 1800, { shade: 'FADBD8' }), cell('Super-Administrator', 2800, { bold: true }), cell('Mandanten anlegen, LLM-Updates, Ressourcen-Monitoring — kein Einblick in Mandanten-Daten', 4426)),
        row(cell('Mandant (KV)', 1800, { shade: 'EAF2FB' }), cell('Mandanten-Administrator', 2800, { bold: true }), cell('Nutzer des eigenen KV verwalten, Rechtegruppen definieren, Dokumentenordner pflegen', 4426)),
        row(cell('Mandant (KV)', 1800, { shade: 'EAF2FB' }), cell('Standard-Nutzer', 2800, { bold: true }), cell('KI-Textfunktionen nutzen, Dokumente abrufen — nur freigeschaltete Inhalte sichtbar', 4426)),
        row(cell('Dokument', 1800, { shade: 'D5F5E3' }), cell('ACL-Gruppe', 2800, { bold: true }), cell('Dokumente werden Zugriffsgruppen zugewiesen; RAG filtert bei jeder Suche nach Nutzer-ACL', 4426)),
      ]),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Kap. 2: Schaubild ─────────────────────────────────
      h1('2. Schaubild — Rollen, Rechte, Zugriffsfluss'),
      p('Das folgende Diagramm zeigt alle fünf Ebenen des Berechtigungskonzepts: ' +
        'von der System-Ebene (Super-Admin, DRK LV MV) über die Mandanten-Ebene (Kreisverbände) ' +
        'und Nutzergruppen bis zum rechtegeprüften RAG-Zugriffsfluss und der Dokument-Klassifizierung.'),
      ...gap(1),
      archImg,
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Abb. 1: Rollen-, Rechte- und Zugriffskonzept DRK MV KI-Plattform (Lastenheft §4)', font: 'Arial', size: 18, italics: true, color: '555555' })] }),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Kap. 3: System-Rollen §4.1 ────────────────────────
      h1('3. System-Rollen (Lastenheft §4.1)'),
      p('Das Gesamtsystem kennt drei Rollen-Ebenen. Die Trennung zwischen System- und Mandanten-Ebene ' +
        'ist eine explizite Datenschutzanforderung: Der Super-Administrator darf keine Mandanten-Dokumente ' +
        'einsehen, um die Vertraulichkeit der 15 Kreisverbände gegenüber dem Landesverband zu wahren.'),
      ...gap(1),

      // Drei Rollen nebeneinander als Tabelle
      new Table({
        width: { size: CW, type: WidthType.DXA },
        columnWidths: [Math.floor(CW / 3), Math.floor(CW / 3), CW - 2 * Math.floor(CW / 3)],
        rows: [new TableRow({ children: [
          roleBox(
            'Super-Administrator',
            'DRK Landesverband MV e.V.',
            [
              ['Neue Mandanten (KV) anlegen', true],
              ['Mandanten deaktivieren / löschen', true],
              ['Systemressourcen überwachen', true],
              ['Globale LLM-Modelle aktualisieren', true],
              ['Einblick in Mandanten-Dokumente', false],
              ['Zugriff auf KV-Nutzerdaten', false],
            ],
            'super-admin (Realm: drk-system)',
            'FADBD8', 'C0392B', 'C0392B'
          ),
          roleBox(
            'Mandanten-Administrator',
            'Je ein Admin pro Kreisverband',
            [
              ['Nutzer des eigenen KV anlegen', true],
              ['Rechtegruppen definieren', true],
              ['Dokumentenordner verwalten', true],
              ['Prompt-Vorlagen pflegen (No-Code)', true],
              ['Nutzer anderer KV einsehen', false],
              ['Systemkonfiguration ändern', false],
            ],
            'kv-admin (Realm: drk-kv-[name])',
            'EAF2FB', '2E75B6', '1F4E79'
          ),
          roleBox(
            'Standard-Nutzer',
            'Haupt- und Ehrenamtliche Mitarbeitende',
            [
              ['KI-Textfunktionen nutzen', true],
              ['Freigegebene Dokumente abrufen', true],
              ['RAG-Anfragen stellen', true],
              ['Nutzer verwalten', false],
              ['Dokumente anderer KV sehen', false],
              ['Unfreigegebene Docs abrufen', false],
            ],
            'kv-standard (Realm: drk-kv-[name])',
            'D5F5E3', '1A5C1A', '1A5C1A'
          ),
        ]})]
      }),
      ...gap(1),
      infoBox(
        'Datenschutz-Prinzip: Super-Admin ohne Mandanten-Einblick',
        'Der Super-Administrator (DRK LV MV) hat technisch keinen automatischen Einblick ' +
        'in die vertraulichen Dokumente der Kreisverbände. Dies ist durch PostgreSQL Row-Level Security ' +
        'und die Keycloak-Realm-Trennung (je ein Realm pro KV) sichergestellt. ' +
        'Ein Zugriff wäre nur mit expliziter technischer Eskalation (durch ST COMPUTER GmbH) möglich — ' +
        'dieser wird im Audit-Log protokolliert.',
        'EAF2FB', '2E75B6'
      ),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Kap. 4: Mandanten-Isolation ───────────────────────
      h1('4. Mandantenisolation — Strikte Datentrennung'),
      p('Jeder der 15 DRK-Kreisverbände ist ein vollständig isolierter Mandant. ' +
        'Die Isolation wird auf mehreren Ebenen gleichzeitig erzwungen — ein einzelner Fehler ' +
        'in einer Schicht kann nicht zur Datenpanne bei einem anderen KV führen.'),
      ...gap(1),

      tbl([2200, 2600, 4226], [
        row(
          cell('Isolations-Schicht', 2200, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Technologie', 2600, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Funktionsweise', 4226, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
        ),
        row(
          cell('Authentifizierung', 2200, { shade: 'EAF2FB' }),
          cell('Keycloak 24 — Realm pro KV', 2600),
          cell('Jeder KV erhält einen eigenen Keycloak-Realm. Ein Token aus Realm "drk-kv-parchim" ist in Realm "drk-kv-rostock" nicht gültig.', 4226),
        ),
        row(
          cell('Datenbank-Isolation', 2200, { shade: 'EAF2FB' }),
          cell('PostgreSQL Row-Level Security (RLS)', 2600),
          cell('Jede Datenbankzeile trägt ein tenant_id-Feld. RLS-Policies lassen SELECT/INSERT/UPDATE/DELETE nur für die tenant_id des aktuell authentifizierten Nutzers zu. Systemweit erzwungen — kein Application-Code kann dies umgehen.', 4226),
        ),
        row(
          cell('Vektor-Suche', 2200, { shade: 'EAF2FB' }),
          cell('pgvector mit tenant_id-Filter', 2600),
          cell('Jede ANN-Suche (Approximate Nearest Neighbor) wird mit WHERE tenant_id = $current_tenant gefiltert. Dokumente anderer KV sind für den Suchalgorithmus unsichtbar.', 4226),
        ),
        row(
          cell('Token-Herkunft', 2200, { shade: 'FADBD8' }),
          cell('JWT-Claims (ausschließlich)', 2600),
          cell('Die tenant_id wird ausschließlich aus dem signierten JWT-Token des Nutzers gelesen. Sie kann nicht durch einen Request-Parameter oder URL-Manipulation überschrieben werden.', 4226),
        ),
        row(
          cell('Datei-Speicher', 2200, { shade: 'EAF2FB' }),
          cell('MinIO — Bucket pro Mandant', 2600),
          cell('Jeder KV erhält einen eigenen MinIO-Bucket (drk-docs-{tenant_id}). Bucket-Policies verbieten mandantenübergreifenden Zugriff.', 4226),
        ),
        row(
          cell('Abnahme-Nachweis', 2200, { shade: 'FFF3CD' }),
          cell('Penetrationstest (§7)', 2600, { shade: 'FFF3CD' }),
          cell('Ein dokumentierter Pentest belegt vor Go-Live, dass kein KV Zugriff auf Daten, Vektordatenbanken oder Prompts eines anderen KV erlangen kann.', 4226, { shade: 'FFF3CD' }),
        ),
      ]),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Kap. 5: ACL — Dokument-Ebene §4.2 ────────────────
      h1('5. Daten- und Zugriffsschutz auf Dokument-Ebene (§4.2)'),
      p('Innerhalb jedes Kreisverbandes können Dokumente feingranular mit Zugriffsrechten versehen werden. ' +
        'Das Lastenheft nennt ausdrücklich vier Beispiel-Gruppen. Der Mandanten-Administrator kann beliebig ' +
        'viele weitere Gruppen definieren und Dokumente darauf zuweisen.'),
      ...gap(1),

      h2('5.1 Vorgegebene Zugriffsgruppen (Lastenheft §4.2)'),
      tbl([2400, 2400, 4226], [
        row(
          cell('Gruppe (Beispiel)', 2400, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Typische Mitglieder', 2400, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Beispiel-Dokumente', 4226, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
        ),
        row(
          cell('Nur Kreisverbands-Vorstand', 2400, { shade: 'FADBD8', bold: true }),
          cell('Vorsitzende, Stellvertreter, Schatzmeister', 2400),
          cell('Jahresabschluss, Personalakten, Strategiepapiere, Vorstandsprotokolle, vertrauliche Korrespondenz', 4226),
        ),
        row(
          cell('Fachbereich Pflege', 2400, { shade: 'EAF2FB', bold: true }),
          cell('Pflegedienstleitungen, Pflegekräfte, Teamleitungen', 2400),
          cell('Pflegestandards, Dienstpläne Pflege, Fallberichte, Qualitätshandbuch Pflege, Weiterbildungsunterlagen', 4226),
        ),
        row(
          cell('Bereichsleitung Rettungsdienst', 2400, { shade: 'EAF2FB', bold: true }),
          cell('RD-Leitung, Disponenten, Lehrrettungssanitäter', 2400),
          cell('RD-Handbücher, Einsatzprotokolle, Alarmierungspläne, Fahrzeug-Dokumentation, Ausbildungsunterlagen', 4226),
        ),
        row(
          cell('Offen für alle Mitarbeitenden', 2400, { shade: 'D5F5E3', bold: true }),
          cell('Alle haupt- und ehrenamtlichen Mitarbeitenden', 2400),
          cell('Interne Mitteilungen, Veranstaltungshinweise, allgemeine Formulare, Organigramm, öffentliche Arbeitsanweisungen', 4226),
        ),
      ]),
      ...gap(1),

      h2('5.2 Rechtegeprüfte Generierung (Kernprinzip §4.2)'),
      infoBox(
        'Pflicht: Das RAG-System darf keine Informationen aus nicht freigegebenen Dokumenten heranziehen',
        'Bei jeder RAG-Anfrage wird vor der Vektorsuche ein ACL-Filter gesetzt: Es werden ausschließlich ' +
        'Dokumente durchsucht, für die der aktuell angemeldete Nutzer eine aktive Leseberechtigung besitzt. ' +
        'Dokumente ohne passende ACL sind für den Suchalgorithmus nicht sichtbar — sie können weder ' +
        'direkt noch indirekt (durch Schlussfolgerungen) in die KI-Antwort einfließen.',
        'FADBD8', 'C0392B'
      ),
      ...gap(1),

      p('Technischer Ablauf einer rechtegeprüften RAG-Anfrage:'),
      ...gap(1),
      tbl([600, 2600, 5826], [
        row(
          cell('Schritt', 600, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Aktion', 2600, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Technisches Detail', 5826, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
        ),
        row(cell('1', 600, { shade: 'EAF2FB' }), cell('Nutzer stellt Anfrage', 2600), cell('Nutzer tippt Frage in Open WebUI. JWT-Token aus der aktuellen Session wird automatisch mitgeschickt.', 5826)),
        row(cell('2', 600, { shade: 'EAF2FB' }), cell('JWT-Validierung im API-Gateway', 2600), cell('Das API-Gateway prüft Signatur und Ablaufzeit des Tokens. tenant_id und Rollen werden aus den Token-Claims extrahiert — nie aus Request-Parametern.', 5826)),
        row(cell('3', 600, { shade: 'EAF2FB' }), cell('ACL-Filter wird gesetzt', 2600), cell('Der RAG-Service stellt für die Datenbankabfrage sicher: WHERE tenant_id = $tenant AND (acl_groups && $user_roles OR acl_groups IS NULL). Nur Dokumente mit passender Zugriffsgruppe werden in die Suche einbezogen.', 5826)),
        row(cell('4', 600, { shade: 'EAF2FB' }), cell('Vektorsuche (pgvector)', 2600), cell('Semantische Ähnlichkeitssuche (ANN) wird ausschließlich auf den gefilterten Dokumenten durchgeführt. Dokumente aus anderen Gruppen oder anderen KV sind für den Algorithmus nicht vorhanden.', 5826)),
        row(cell('5', 600, { shade: 'EAF2FB' }), cell('Antwort mit Quellenangabe', 2600), cell('Die KI-Antwort enthält ausschließlich Informationen aus freigegebenen Dokumenten. Pflichtangabe: Dokumentenname, Seite, Absatz (Zitationspflicht §3.2).', 5826)),
        row(cell('6', 600, { shade: 'D5F5E3' }), cell('Abnahmetest §7', 2600, { shade: 'D5F5E3' }), cell('Testfall: Nutzer ohne Pflege-Berechtigung fragt nach Pflegestandards → KI antwortet "Ich habe keine Informationen zu diesem Thema" oder verweist auf fehlende Berechtigung. Keine indirekte Information durch Schlussfolgerung.', 5826, { shade: 'D5F5E3' })),
      ]),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Kap. 6: Keycloak-Konfiguration ────────────────────
      h1('6. Keycloak-Konfiguration'),
      p('Keycloak 24 übernimmt die gesamte Authentifizierung und Autorisierung. ' +
        'Die Konfiguration folgt dem Prinzip "ein Realm pro Kreisverband" — ' +
        'damit sind Token nicht mandantenübergreifend verwendbar.'),
      ...gap(1),

      h2('6.1 Realm-Struktur'),
      tbl([2200, 2600, 4226], [
        row(
          cell('Realm', 2200, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Nutzung', 2600, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Rollen', 4226, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
        ),
        row(cell('drk-system', 2200, { shade: 'FADBD8' }), cell('DRK LV MV — System-Ebene', 2600), cell('super-admin', 4226)),
        row(cell('drk-kv-parchim', 2200, { shade: 'EAF2FB' }), cell('KV Parchim — Mandanten-Ebene', 2600), cell('kv-admin · kv-vorstand · kv-pflege · kv-rettungsdienst · kv-standard · (weitere frei definierbar)', 4226)),
        row(cell('drk-kv-rostock', 2200, { shade: 'EAF2FB' }), cell('KV Rostock — Mandanten-Ebene', 2600), cell('kv-admin · kv-vorstand · kv-pflege · kv-rettungsdienst · kv-standard · (weitere frei definierbar)', 4226)),
        row(cell('drk-kv-[name] × 13', 2200, { shade: 'F8F8F8', italic: true }), cell('Je ein Realm pro weiterem KV', 2600), cell('Identische Rollen-Struktur, vollständig voneinander isoliert', 4226)),
      ]),
      ...gap(1),

      h2('6.2 Authentifizierungs-Optionen (§6.2 Lastenheft)'),
      tbl([2400, 6626], [
        row(
          cell('Methode', 2400, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Details', 6626, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
        ),
        row(cell('Keycloak native (Benutzername / Passwort)', 2400, { shade: 'EAF2FB' }), cell('Standard-Login. Passwortregeln und MFA (TOTP) konfigurierbar durch Mandanten-Admin.', 6626)),
        row(cell('Active Directory / LDAP', 2400, { shade: 'EAF2FB' }), cell('Keycloak User-Federation: KV-Mitarbeitende melden sich mit ihren bestehenden AD-Zugangsdaten an. Automatische Rollen-Zuweisung aus AD-Gruppen möglich.', 6626)),
        row(cell('OpenID Connect / OAuth2 (SSO)', 2400, { shade: 'EAF2FB' }), cell('Vorbereitung für SSO-Integration mit DRK-übergreifenden Identitätsdiensten. Keycloak fungiert als Identity Broker.', 6626)),
        row(cell('Multi-Factor Authentication', 2400, { shade: 'D5F5E3' }), cell('Empfohlen für Mandanten-Administratoren und Vorstand-Gruppe. TOTP (Google Authenticator, FreeOTP) oder WebAuthn (Hardware-Key).', 6626)),
      ]),
      ...gap(1),

      h2('6.3 Audit-Log'),
      p('Das Lastenheft (§6.2) schreibt ein revisionssicheres Audit-Log für administrative Aktionen vor ' +
        'bei gleichzeitigem striktem Verzicht auf die Speicherung von Prompt-Inhalten.'),
      ...gap(1),
      tbl([3000, 2000, 4026], [
        row(
          cell('Ereignis', 3000, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Protokolliert', 2000, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Nicht protokolliert', 4026, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
        ),
        row(cell('Nutzer angelegt / deaktiviert', 3000, { shade: 'D5F5E3' }), cell('Wer, wann, durch wen', 2000), cell('—', 4026)),
        row(cell('Rechtevergabe / -entzug', 3000, { shade: 'D5F5E3' }), cell('Rolle, Nutzer, Zeitstempel', 2000), cell('—', 4026)),
        row(cell('Dokument hochgeladen / gelöscht', 3000, { shade: 'D5F5E3' }), cell('Dateiname, Uploader, Zeit', 2000), cell('Dateiinhalt', 4026)),
        row(cell('ACL-Zuweisung geändert', 3000, { shade: 'D5F5E3' }), cell('Dokument, Gruppe, Admin', 2000), cell('—', 4026)),
        row(cell('KI-Anfrage (Chat)', 3000, { shade: 'FADBD8' }), cell('tenant_id, Zeitstempel, Modell', 2000), cell('Prompt-Text, Antwort-Text (Datenschutz by Design)', 4026)),
        row(cell('RAG-Suchanfrage', 3000, { shade: 'FADBD8' }), cell('tenant_id, Zeitstempel, Treffer-Anzahl', 2000), cell('Suchbegriff / Anfrage-Text', 4026)),
        row(cell('Login / Logout', 3000, { shade: 'EAF2FB' }), cell('Nutzer-ID, Zeitstempel, IP', 2000), cell('Passwort, Token-Inhalt', 4026)),
        row(cell('Fehlgeschlagene Logins', 3000, { shade: 'EAF2FB' }), cell('Nutzer-ID, Zeitstempel, IP, Anzahl', 2000), cell('Eingegebenes Passwort', 4026)),
      ]),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Kap. 7: Technische Implementierung ────────────────
      h1('7. Technische Implementierung'),
      h2('7.1 Datenbankschema (Auszug)'),
      p('Die Zugriffskontrolle auf Dokument-Ebene wird in PostgreSQL durch zwei Mechanismen umgesetzt: ' +
        'Row-Level Security für die Mandanten-Isolation und ein Array-Feld für die ACL-Gruppen pro Dokument.'),
      ...gap(1),

      new Table({
        width: { size: CW, type: WidthType.DXA }, columnWidths: [CW],
        rows: [new TableRow({ children: [new TableCell({
          width: { size: CW, type: WidthType.DXA },
          shading: { fill: '1E1E1E', type: ShadingType.CLEAR },
          borders: hdrBorder('444444'),
          margins: { top: 120, bottom: 120, left: 200, right: 200 },
          children: [
            'CREATE TABLE documents (',
            '  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),',
            '  tenant_id   UUID NOT NULL,          -- Mandanten-Isolation (RLS)',
            '  name        TEXT NOT NULL,',
            '  content     TEXT,',
            '  acl_groups  TEXT[] DEFAULT \'{kv-standard}\',  -- Zugriffsgruppen-Array',
            '  uploaded_by UUID NOT NULL,',
            '  created_at  TIMESTAMPTZ DEFAULT now()',
            ');',
            '',
            '-- Row-Level Security: Nutzer sieht nur eigenen Mandanten',
            'ALTER TABLE documents ENABLE ROW LEVEL SECURITY;',
            'CREATE POLICY tenant_isolation ON documents',
            '  USING (tenant_id = current_setting(\'app.tenant_id\')::UUID);',
            '',
            '-- pgvector: ACL-gefilterter Embedding-Store',
            'CREATE TABLE document_chunks (',
            '  id          UUID PRIMARY KEY,',
            '  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,',
            '  tenant_id   UUID NOT NULL,',
            '  acl_groups  TEXT[] NOT NULL,',
            '  embedding   vector(1024),',
            '  chunk_text  TEXT NOT NULL',
            ');',
          ].map(l => new Paragraph({ children: [new TextRun({ text: l, font: 'Courier New', size: 16, color: 'D4D4D4' })] })),
        })]})],
      }),
      ...gap(1),

      h2('7.2 Rechtegeprüfte Vektorsuche'),
      new Table({
        width: { size: CW, type: WidthType.DXA }, columnWidths: [CW],
        rows: [new TableRow({ children: [new TableCell({
          width: { size: CW, type: WidthType.DXA },
          shading: { fill: '1E1E1E', type: ShadingType.CLEAR },
          borders: hdrBorder('444444'),
          margins: { top: 120, bottom: 120, left: 200, right: 200 },
          children: [
            '-- RAG-Suche: nur freigegebene Docs des eigenen Mandanten',
            'SELECT dc.chunk_text, d.name, d.page_number',
            'FROM document_chunks dc',
            'JOIN documents d ON d.id = dc.document_id',
            'WHERE dc.tenant_id = $tenant_id          -- Mandanten-Filter (RLS)',
            '  AND dc.acl_groups && $user_roles        -- ACL-Filter: Schnittmenge Gruppen',
            'ORDER BY dc.embedding <=> $query_vector   -- ANN-Ähnlichkeitssuche',
            'LIMIT 5;',
            '',
            '-- $user_roles = Array der Keycloak-Rollen des Nutzers aus JWT-Claims',
            '-- z.B.: ARRAY[\'kv-pflege\', \'kv-standard\']',
            '-- && = PostgreSQL Array-Überschneidungsoperator',
          ].map(l => new Paragraph({ children: [new TextRun({ text: l, font: 'Courier New', size: 16, color: 'D4D4D4' })] })),
        })]})],
      }),
      ...gap(2),

      // ── Kap. 8: Abnahmetest ───────────────────────────────
      h1('8. Abnahmekriterien Rechte-System (§7)'),
      p('Die folgenden Testfälle müssen vor Go-Live erfolgreich nachgewiesen werden ' +
        '(Lastenheft §7, Punkt 2: "Funktionstest des RAG-Rechtesystems").'),
      ...gap(1),
      tbl([600, 2600, 2800, 3026], [
        row(
          cell('TC', 600, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Ausgangssituation', 2600, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Aktion', 2800, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Erwartetes Ergebnis', 3026, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
        ),
        row(cell('TC-01', 600, { shade: 'EAF2FB' }), cell('Nutzer mit Rolle kv-pflege (KV Parchim)', 2600), cell('Fragt nach Pflegestandard', 2800), cell('Antwort mit korrekter Quellenangabe aus Pflege-Dokumenten', 3026)),
        row(cell('TC-02', 600, { shade: 'FADBD8' }), cell('Nutzer mit Rolle kv-pflege (KV Parchim)', 2600), cell('Fragt nach Finanzdaten / Vorstandsprotokoll', 2800), cell('Keine Antwort aus geschützten Docs — KI: "Keine freigegebenen Informationen"', 3026)),
        row(cell('TC-03', 600, { shade: 'FADBD8' }), cell('Nutzer KV Parchim (beliebige Rolle)', 2600), cell('Fragt nach Dokumenten von KV Rostock', 2800), cell('Technisch keine Treffer — RLS verhindert Zugriff auf anderen Mandanten', 3026)),
        row(cell('TC-04', 600, { shade: 'FADBD8' }), cell('Nutzer manipuliert tenant_id im Request-Body', 2600), cell('Schickt Request mit tenant_id=KV_Rostock', 2800), cell('API-Gateway verwirft Parameter — tenant_id stammt ausschließlich aus JWT', 3026)),
        row(cell('TC-05', 600, { shade: 'EAF2FB' }), cell('Mandanten-Admin KV Parchim', 2600), cell('Versucht Nutzer in KV Rostock anzulegen', 2800), cell('Keycloak verweigert — Admin hat nur Rechte im eigenen Realm', 3026)),
        row(cell('TC-06', 600, { shade: 'EAF2FB' }), cell('Super-Admin (DRK LV MV)', 2600), cell('Versucht direkt auf Dokumente von KV Parchim zuzugreifen', 2800), cell('Kein automatischer Zugriff — RLS und Realm-Isolation verhindern Direktzugriff', 3026)),
        row(cell('TC-07', 600, { shade: 'D5F5E3' }), cell('Nutzer mit kv-standard (KV Rostock)', 2600), cell('Fragt nach öffentlichen Dokumenten', 2800), cell('Korrekte Antwort mit Quellenangabe aus freigegebenen Docs', 3026)),
        row(cell('TC-08', 600, { shade: 'D5F5E3' }), cell('Audit-Log-Prüfung', 2600), cell('Review der Audit-Logs nach Testdurchlauf', 2800), cell('Alle Rechtevergaben und Logins protokolliert — kein Prompt-Inhalt in Logs', 3026)),
      ]),
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
  fs.writeFileSync('C:/Projekte/drk-mv-ki-plattform/docs/Systemuebersicht-DRK-Rollen-Rechte.docx', buf);
  console.log('OK', buf.length, 'bytes');
});
