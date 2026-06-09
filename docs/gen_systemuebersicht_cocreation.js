// Systemuebersicht-DRK-CoCreation.docx
// Entscheidungsvorlage: P-01 Co-Creation-Workshop-Zyklus
'use strict';
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageBreak, LevelFormat, Header, Footer, PageNumber,
} = require('docx');
const fs = require('fs');

const CONTENT_W = 9026;
const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
}
function p(text) {
  return new Paragraph({ children: [new TextRun({ text, font: 'Arial', size: 22 })] });
}
function gap(n = 1) {
  return Array.from({ length: n }, () => new Paragraph({ children: [] }));
}
function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    children: [new TextRun({ text, font: 'Arial', size: 22 })],
  });
}

function cell(text, w, { header = false, shade = null, bold = false, color = '000000', italic = false } = {}) {
  return new TableCell({
    borders, width: { size: w, type: WidthType.DXA },
    shading: shade ? { fill: shade, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, bold: bold || header, color, font: 'Arial', size: header ? 20 : 18, italics: italic })] })],
  });
}
function row(...cells) { return new TableRow({ children: cells }); }

function table(colWidths, rows2) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: rows2,
  });
}

function warningBox(titleText, bodyText) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: CONTENT_W, type: WidthType.DXA },
      shading: { fill: 'FFF3CD', type: ShadingType.CLEAR },
      borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'FFC107' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'FFC107' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'FFC107' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'FFC107' } },
      margins: { top: 120, bottom: 120, left: 160, right: 160 },
      children: [
        new Paragraph({ children: [new TextRun({ text: titleText, bold: true, font: 'Arial', size: 20, color: '856404' })] }),
        new Paragraph({ children: [new TextRun({ text: bodyText, font: 'Arial', size: 18, color: '856404' })] }),
      ],
    })]})],
  });
}

// Architecture image
const imgData = fs.readFileSync('C:/Projekte/drk-mv-ki-plattform/docs/architecture-cocreation.png');
const imgW = 840, imgH = Math.round(840 * 1640 / 2200);
const archImg = new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [new ImageRun({
    type: 'png', data: imgData,
    transformation: { width: imgW, height: imgH },
    altText: { title: 'Co-Creation-Workshop-Zyklus', description: 'Prozessdiagramm Co-Creation', name: 'architecture-cocreation' },
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
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
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
      default: new Header({ children: [new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '2E75B6', space: 1 } },
        children: [
          new TextRun({ text: 'DRK MV KI-Plattform — Co-Creation-Workshop-Zyklus (P-01)', font: 'Arial', size: 18, color: '2E75B6' }),
          new TextRun({ text: '\tST COMPUTER GmbH', font: 'Arial', size: 18, color: '888888' }),
        ],
        tabStops: [{ type: 'right', position: 9026 }],
      })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 6, color: '2E75B6', space: 1 } },
        children: [
          new TextRun({ text: 'Vertraulich — Nur für interne Verwendung', font: 'Arial', size: 16, color: '888888' }),
          new TextRun({ text: '\tSeite ', font: 'Arial', size: 16, color: '888888' }),
          new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: '888888' }),
        ],
        tabStops: [{ type: 'right', position: 9026 }],
      })] }),
    },
    children: [

      // ── Titelseite ─────────────────────────────────────────
      ...gap(3),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'DRK MV KI-Plattform', font: 'Arial', size: 48, bold: true, color: '1F4E79' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Co-Creation-Workshop-Zyklus', font: 'Arial', size: 36, bold: true, color: '2E75B6' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Agiles Entwicklungsmodell · Governance · Release-Zyklen', font: 'Arial', size: 24, color: '555555' })] }),
      ...gap(2),
      new Paragraph({ alignment: AlignmentType.CENTER, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '2E75B6', space: 2 } }, children: [] }),
      ...gap(1),
      table([2400, 3600], [
        row(cell('Erstellt von', 2400, { shade: 'D6E4F0', bold: true }), cell('ST COMPUTER GmbH · Sven Truderung', 3600)),
        row(cell('Auftraggeber', 2400, { shade: 'D6E4F0', bold: true }), cell('DRK Landesverband MV e.V.', 3600)),
        row(cell('Datum', 2400, { shade: 'D6E4F0', bold: true }), cell('09. Juni 2026', 3600)),
        row(cell('Version', 2400, { shade: 'D6E4F0', bold: true }), cell('0.1.0 — Konzeptionsphase', 3600)),
        row(cell('Grundlage', 2400, { shade: 'D6E4F0', bold: true }), cell('Lastenheft DRK LV MV §5.1 — Agiles Entwicklungsmodell & Release-Zyklen', 3600)),
        row(cell('Parked-Intent-Ref.', 2400, { shade: 'D6E4F0', bold: true }), cell('P-01 aus intents/PARKED.md', 3600)),
      ]),
      ...gap(2),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Kap. 1: Zielsetzung ────────────────────────────────
      h1('1. Zielsetzung'),
      p('Das Lastenheft (§5.1) verpflichtet den Systemhersteller zu einem agilen Entwicklungsmodell mit ' +
        'kurzen, stabilen Release-Zyklen und regelmäßiger aktiver Teilnahme an Co-Creation-Workshops der ' +
        'DRK-Kreisverbände. Dieses Dokument beschreibt den konkreten Prozess: Rollen, Zyklus-Phasen, ' +
        'Übergabe-Artefakte und Governance-Regeln.'),
      ...gap(1),
      p('Der Co-Creation-Zyklus sichert drei zentrale Ziele:'),
      bullet('Anforderungen der 15 KV werden strukturiert erfasst, priorisiert und in kurzen Sprints umgesetzt.'),
      bullet('Alle Stakeholder (DRK LV MV, KV-Vertreter, ST COMPUTER GmbH, DRK-IT) haben transparenten Zugriff auf Backlog und Fortschritt.'),
      bullet('Go-Live-Kriterien (Pentest, DPO-Freigabe) sind definiert und messbar.'),
      ...gap(1),

      h2('1.1 Abgrenzung'),
      table([3000, 6026], [
        row(cell('Dieser Prozess regelt', 3000, { header: true, shade: '1F4E79', color: 'FFFFFF' }), cell('Dieser Prozess regelt NICHT', 6026, { header: true, shade: '1F4E79', color: 'FFFFFF' })),
        row(cell('Anforderungserfassung und -priorisierung', 3000, { shade: 'EAF2FB' }), cell('Technische Implementierungsdetails (→ CLAUDE.md / INTENT-01)', 6026)),
        row(cell('Sprint-Planung und Review-Rhythmus', 3000, { shade: 'EAF2FB' }), cell('Betriebliche Incidents und SLA-Eskalationen (→ separater Betriebsvertrag)', 6026)),
        row(cell('Release- und Rollout-Entscheidungen', 3000, { shade: 'EAF2FB' }), cell('Datenschutzrechtliche Einzelfallentscheidungen (→ DPO-Prozess)', 6026)),
        row(cell('Governance und Eskalationswege', 3000, { shade: 'EAF2FB' }), cell('Vergütung und Vertragskonditionen (→ Rahmenvertrag ST COMPUTER / DRK)', 6026)),
      ]),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Kap. 2: Prozessdiagramm ────────────────────────────
      h1('2. Prozessdiagramm — Co-Creation-Zyklus'),
      p('Der Zyklus umfasst sechs Phasen, die sich alle 6 Wochen wiederholen. Sprints laufen alle 2 Wochen ' +
        'innerhalb des Zyklus. Das gemeinsame Product Backlog (GitHub Issues) ist kontinuierlich sichtbar ' +
        'für alle Stakeholder.'),
      ...gap(1),
      archImg,
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Abb. 1: Co-Creation-Workshop-Zyklus — Rollen, Phasen, Übergaben', font: 'Arial', size: 18, italics: true, color: '555555' })] }),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Kap. 3: Rollen ─────────────────────────────────────
      h1('3. Rollen und Verantwortlichkeiten'),
      table([2400, 2000, 4626], [
        row(
          cell('Rolle', 2400, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Besetzt durch', 2000, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Verantwortlichkeiten', 4626, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
        ),
        row(
          cell('Product Owner (Gesamt)', 2400, { shade: 'FADBD8' }),
          cell('DRK LV MV', 2000),
          cell('Priorisiert Backlog, trifft Release-Entscheidungen, vertritt Gesamtinteresse der 15 KV, verantwortet Go-Live-Freigabe', 4626),
        ),
        row(
          cell('Product Owner (KV)', 2400, { shade: 'EAF2FB' }),
          cell('Je 1 Person pro KV', 2000),
          cell('Bringt KV-spezifische Anforderungen ein, nimmt an Discovery-Workshops teil, gibt Feedback nach Demos', 4626),
        ),
        row(
          cell('Scrum Master', 2400, { shade: 'D5F5E3' }),
          cell('ST COMPUTER GmbH', 2000),
          cell('Moderiert Sprints und Workshops, räumt Hindernisse aus dem Weg, sorgt für Prozess-Einhaltung', 4626),
        ),
        row(
          cell('Technischer Lead', 2400, { shade: 'D5F5E3' }),
          cell('ST COMPUTER GmbH', 2000),
          cell('Architektur-Entscheidungen, Code Reviews, Deployment-Freigaben, Sicherheitsverantwortung', 4626),
        ),
        row(
          cell('Datenschutzbeauftragter (DPO)', 2400, { shade: 'FEF9E7' }),
          cell('DRK LV MV / extern', 2000),
          cell('Prüft datenschutzrelevante Features vor Release, gibt Freigabe für Go-Live (Pentest-Ergebnis + DSGVO-Konformität)', 4626),
        ),
        row(
          cell('Infrastruktur / Betrieb', 2400, { shade: 'E8DAEF' }),
          cell('DRK-IT', 2000),
          cell('Betreibt Server und Docker-Umgebung, führt Deployments durch, meldet Incidents, koordiniert AD-Integration', 4626),
        ),
        row(
          cell('Compliance-Reviewer', 2400, { shade: 'FEF9E7' }),
          cell('DRK LV MV / DPO', 2000),
          cell('Überprüft Audit-Logs, prüft Mandantenisolation bei Release, nimmt Pentest-Bericht ab', 4626),
        ),
      ]),
      ...gap(2),

      // ── Kap. 4: Phasen ─────────────────────────────────────
      h1('4. Zyklus-Phasen im Detail'),

      h2('Phase 1 — Discovery-Workshop'),
      table([2200, 6826], [
        row(cell('Rhythmus', 2200, { shade: 'EAF2FB', bold: true }), cell('Alle 6 Wochen · 1 Tag · Präsenz oder Remote', 6826)),
        row(cell('Teilnehmer', 2200, { shade: 'EAF2FB', bold: true }), cell('PO Gesamt (DRK LV MV), 2–4 KV-POs (rotierend), Scrum Master, Technischer Lead', 6826)),
        row(cell('Input', 2200, { shade: 'EAF2FB', bold: true }), cell('Offene Backlog-Items, Nutzerfeedback aus laufendem Betrieb, neue Anforderungen der KV', 6826)),
        row(cell('Aktivitäten', 2200, { shade: 'EAF2FB', bold: true }), cell('Anforderungen sammeln (User-Story-Format), Priorisierung (MoSCoW), technische Machbarkeits-Einschätzung durch ST COMPUTER', 6826)),
        row(cell('Output', 2200, { shade: 'EAF2FB', bold: true }), cell('Priorisiertes Backlog-Increment (neue/aktualisierte GitHub Issues), nächster Sprint-Plan', 6826)),
        row(cell('Verantwortlich', 2200, { shade: 'EAF2FB', bold: true }), cell('Scrum Master (Moderation), PO Gesamt (Priorisierung)', 6826)),
      ]),
      ...gap(1),

      h2('Phase 2 — Backlog-Refinement'),
      table([2200, 6826], [
        row(cell('Rhythmus', 2200, { shade: 'EAF2FB', bold: true }), cell('Wöchentlich · 2–4 Stunden · Remote', 6826)),
        row(cell('Teilnehmer', 2200, { shade: 'EAF2FB', bold: true }), cell('PO Gesamt, Scrum Master, Technischer Lead, bei Bedarf KV-PO', 6826)),
        row(cell('Aktivitäten', 2200, { shade: 'EAF2FB', bold: true }), cell('User Stories verfeinern, Akzeptanzkriterien definieren, Aufwand schätzen (Story Points), technische Abhängigkeiten klären', 6826)),
        row(cell('Output', 2200, { shade: 'EAF2FB', bold: true }), cell('Sprint-Ready-Backlog: User Stories mit Akzeptanzkriterien, geschätztem Aufwand und Definition of Done', 6826)),
        row(cell('Verantwortlich', 2200, { shade: 'EAF2FB', bold: true }), cell('PO Gesamt (fachlich), Technischer Lead (technisch)', 6826)),
      ]),
      ...gap(1),

      h2('Phase 3 — Sprint-Entwicklung'),
      table([2200, 6826], [
        row(cell('Rhythmus', 2200, { shade: 'D5F5E3', bold: true }), cell('2 Wochen Sprint-Dauer · täglich Daily Standup (15 Min.)', 6826)),
        row(cell('Teilnehmer', 2200, { shade: 'D5F5E3', bold: true }), cell('Entwicklungsteam ST COMPUTER GmbH (intern)', 6826)),
        row(cell('Aktivitäten', 2200, { shade: 'D5F5E3', bold: true }), cell('Feature-Entwicklung, Unit- und Integrationstests, Code Review, CI-Pipeline, Staging-Deployment', 6826)),
        row(cell('Output', 2200, { shade: 'D5F5E3', bold: true }), cell('Potenziell auslieferbares Produktinkrement auf Staging-Umgebung, aktualisierte Dokumentation', 6826)),
        row(cell('Qualitätskriterien', 2200, { shade: 'D5F5E3', bold: true }), cell('Definition of Done: Tests grün, Code Review bestanden, Staging lauffähig, Compliance-Marker geprüft (kein Prompt-Logging, tenant_id aus JWT)', 6826)),
      ]),
      ...gap(1),

      h2('Phase 4 — Sprint-Review / Demo'),
      table([2200, 6826], [
        row(cell('Rhythmus', 2200, { shade: 'FEF9E7', bold: true }), cell('Nach jedem Sprint · 2 Stunden · Remote oder Präsenz', 6826)),
        row(cell('Teilnehmer', 2200, { shade: 'FEF9E7', bold: true }), cell('PO Gesamt, 2–4 KV-POs, Scrum Master, Technischer Lead; optional: DRK-IT, DPO', 6826)),
        row(cell('Aktivitäten', 2200, { shade: 'FEF9E7', bold: true }), cell('Demo der fertigen Features auf Staging, Abnahme durch PO, strukturiertes Feedback, Entscheidung über Produktions-Deployment', 6826)),
        row(cell('Output', 2200, { shade: 'FEF9E7', bold: true }), cell('Abnahme-Protokoll (schriftlich), aktualisiertes Backlog, Deployment-Entscheidung (ja/nein/aufgeschoben)', 6826)),
        row(cell('Verantwortlich', 2200, { shade: 'FEF9E7', bold: true }), cell('PO Gesamt (Abnahme-Entscheidung), Scrum Master (Moderation)', 6826)),
      ]),
      ...gap(1),

      h2('Phase 5 — Pilot-Rollout'),
      table([2200, 6826], [
        row(cell('Zeitrahmen', 2200, { shade: 'E8DAEF', bold: true }), cell('3–6 Monate mit 1 Pilot-KV, dann schrittweiser Rollout auf weitere KV', 6826)),
        row(cell('Teilnehmer', 2200, { shade: 'E8DAEF', bold: true }), cell('Pilot-KV (Schlüsselnutzer), DRK-IT (Deployment), ST COMPUTER GmbH (Support)', 6826)),
        row(cell('Aktivitäten', 2200, { shade: 'E8DAEF', bold: true }), cell('Produktions-Deployment, Schulung der KV-Mitarbeitenden, Monitoring-Aufbau, First-Level-Support', 6826)),
        row(cell('Rollout-Voraussetzungen', 2200, { shade: 'E8DAEF', bold: true }), cell('Bestandener Pentest (dokumentiert), DPO-Freigabe, Abnahme durch PO Gesamt, Infrastruktur-Bereitschaft durch DRK-IT', 6826)),
        row(cell('Rollout-Reihenfolge', 2200, { shade: 'E8DAEF', bold: true }), cell('1 Pilot-KV → Bewertung nach 4 Wochen → nächste Welle (2–3 KV) → vollständiger Rollout 15 KV', 6826)),
      ]),
      ...gap(1),

      h2('Phase 6 — Retrospektive und Release'),
      table([2200, 6826], [
        row(cell('Rhythmus', 2200, { shade: 'FADBD8', bold: true }), cell('Nach jedem Sprint · 1,5 Stunden · Team-intern (ST COMPUTER GmbH)', 6826)),
        row(cell('Aktivitäten', 2200, { shade: 'FADBD8', bold: true }), cell('Was lief gut / schlecht / soll geändert werden? Prozess-Verbesserungen für nächsten Sprint festhalten.', 6826)),
        row(cell('Release-Notes', 2200, { shade: 'FADBD8', bold: true }), cell('Bei Produktions-Deployment: Release-Notes in GitHub erstellen (neue Features, Bugfixes, Breaking Changes, Sicherheits-Updates)', 6826)),
        row(cell('Output', 2200, { shade: 'FADBD8', bold: true }), cell('Retrospektiven-Protokoll (intern), Release-Notes (für DRK LV MV + KV), aktualisiertes CHANGELOG.md', 6826)),
        row(cell('Neuer Zyklus', 2200, { shade: 'FADBD8', bold: true }), cell('Nahtloser Übergang: Retrospektiven-Erkenntnisse fließen direkt in nächsten Discovery-Workshop ein.', 6826)),
      ]),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Kap. 5: Product Backlog ────────────────────────────
      h1('5. Gemeinsames Product Backlog'),
      p('Das Product Backlog ist das zentrale Steuerungsinstrument. Es wird in GitHub Issues geführt und ' +
        'ist für alle Stakeholder lesbar. Schreibzugriff haben ausschließlich der PO Gesamt (DRK LV MV) ' +
        'und ST COMPUTER GmbH.'),
      ...gap(1),

      h2('5.1 Issue-Typen und Labels'),
      table([2000, 2500, 4526], [
        row(
          cell('Label', 2000, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Erstellt von', 2500, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Bedeutung', 4526, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
        ),
        row(cell('feature', 2000, { shade: 'EAF2FB' }), cell('KV-PO oder PO Gesamt', 2500), cell('Neues Feature aus Discovery-Workshop. Muss User-Story-Format haben.', 4526)),
        row(cell('bug', 2000, { shade: 'EAF2FB' }), cell('Beliebig (über DRK-IT)', 2500), cell('Reproduzierbarer Fehler im Produktivsystem. Priorität: critical / high / low.', 4526)),
        row(cell('compliance', 2000, { shade: 'FADBD8' }), cell('DPO oder PO Gesamt', 2500), cell('Datenschutz- oder Sicherheitsanforderung. Pflicht-Sprint wenn critical.', 4526)),
        row(cell('tech-debt', 2000, { shade: 'EAF2FB' }), cell('ST COMPUTER GmbH', 2500), cell('Technische Schulden, Refactoring, Dependency-Updates.', 4526)),
        row(cell('infra', 2000, { shade: 'E8DAEF' }), cell('DRK-IT oder ST COMPUTER', 2500), cell('Infrastruktur-Aufgaben: Deployment, Backup, Monitoring-Anpassung.', 4526)),
        row(cell('pentest', 2000, { shade: 'FADBD8' }), cell('PO Gesamt / extern', 2500), cell('Sicherheitsfunde aus Penetrationstest. Blocking für Go-Live wenn severity: high.', 4526)),
      ]),
      ...gap(1),

      h2('5.2 Definition of Ready (vor Sprint-Aufnahme)'),
      bullet('User Story im Format: "Als [Rolle] möchte ich [Ziel], damit [Nutzen]"'),
      bullet('Akzeptanzkriterien vollständig und testbar'),
      bullet('Aufwand geschätzt (Story Points)'),
      bullet('Technische Abhängigkeiten bekannt und dokumentiert'),
      bullet('Compliance-relevante Stories: DPO informiert, kein DPO-Block ausstehend'),
      ...gap(1),

      h2('5.3 Definition of Done (nach Sprint-Abschluss)'),
      bullet('Alle Akzeptanzkriterien erfüllt und durch Tests abgedeckt'),
      bullet('Code Review durch zweiten Entwickler abgeschlossen'),
      bullet('Compliance-Marker geprüft: kein Prompt-Logging, tenant_id ausschließlich aus JWT-Claims'),
      bullet('Staging-Umgebung lauffähig und durch PO abgenommen'),
      bullet('Dokumentation (CHANGELOG.md, API-Docs) aktualisiert'),
      bullet('Security-relevante Changes: Kurz-Review durch Technischen Lead'),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Kap. 6: Governance ─────────────────────────────────
      h1('6. Governance und Eskalation'),

      h2('6.1 Entscheidungsmatrix'),
      table([3000, 1800, 1800, 2426], [
        row(
          cell('Entscheidung', 3000, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Entscheidet', 1800, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Informiert', 1800, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Veto-Recht', 2426, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
        ),
        row(cell('Backlog-Priorisierung', 3000, { shade: 'EAF2FB' }), cell('PO Gesamt', 1800), cell('KV-POs, ST COMPUTER', 1800), cell('—', 2426)),
        row(cell('Sprint-Inhalt', 3000, { shade: 'EAF2FB' }), cell('PO Gesamt + ST COMPUTER', 1800), cell('DRK-IT', 1800), cell('PO Gesamt (Priorität)', 2426)),
        row(cell('Produktions-Deployment', 3000, { shade: 'EAF2FB' }), cell('PO Gesamt', 1800), cell('DRK-IT, DPO', 1800), cell('DPO (Compliance)', 2426)),
        row(cell('Go-Live-Freigabe', 3000, { shade: 'FADBD8' }), cell('PO Gesamt + DPO', 1800), cell('DRK-IT, KV-POs', 1800), cell('DPO (zwingend)', 2426)),
        row(cell('Architektur-Änderungen', 3000, { shade: 'EAF2FB' }), cell('ST COMPUTER GmbH', 1800), cell('PO Gesamt, DRK-IT', 1800), cell('PO Gesamt (Budget)', 2426)),
        row(cell('Modell-Wechsel (LLM)', 3000, { shade: 'EAF2FB' }), cell('ST COMPUTER + PO Gesamt', 1800), cell('DPO, KV-POs', 1800), cell('DPO (Datenschutz)', 2426)),
        row(cell('Neue KV-Integration', 3000, { shade: 'E8DAEF' }), cell('PO Gesamt + DRK-IT', 1800), cell('ST COMPUTER, DPO', 1800), cell('DPO (Mandanten)', 2426)),
      ]),
      ...gap(1),

      h2('6.2 Eskalationspfade'),
      table([2000, 3513, 3513], [
        row(
          cell('Situation', 2000, { header: true, shade: '2E75B6', color: 'FFFFFF' }),
          cell('Erste Eskalation', 3513, { header: true, shade: '2E75B6', color: 'FFFFFF' }),
          cell('Zweite Eskalation', 3513, { header: true, shade: '2E75B6', color: 'FFFFFF' }),
        ),
        row(cell('Sprint-Verzögerung >3 Tage', 2000, { shade: 'EAF2FB' }), cell('Scrum Master → PO Gesamt (sofort melden)', 3513), cell('Gemeinsames Review Sprint-Scope-Anpassung', 3513)),
        row(cell('Security-Incident (Produktion)', 2000, { shade: 'FADBD8' }), cell('Technischer Lead → DRK-IT → PO Gesamt (max. 1h)', 3513), cell('DPO einschalten, ggf. Abschaltung Betroffener Service', 3513)),
        row(cell('Datenschutz-Konflikt', 2000, { shade: 'FADBD8' }), cell('DPO → PO Gesamt (Feature pausieren)', 3513), cell('Rechtliche Prüfung, ggf. Feature-Ablehnung', 3513)),
        row(cell('KV lehnt Feature ab', 2000, { shade: 'EAF2FB' }), cell('KV-PO → PO Gesamt (Discovery-Workshop)', 3513), cell('Alternativ-Lösung oder Backlog-Streichung', 3513)),
        row(cell('Technische Schuld kritisch', 2000, { shade: 'EAF2FB' }), cell('Technischer Lead → Scrum Master (Backlog-Prio erhöhen)', 3513), cell('Tech-Debt-Sprint einplanen', 3513)),
      ]),
      ...gap(1),

      h2('6.3 Go-Live-Kriterien (Lastenheft §7)'),
      warningBox(
        'Pflichtkriterien vor Produktionsfreigabe (Lastenheft §7)',
        'Alle folgenden Punkte müssen erfüllt und dokumentiert sein, bevor die Plattform für den ersten Kreisverband freigegeben wird.',
      ),
      ...gap(1),
      table([3000, 2000, 4026], [
        row(
          cell('Kriterium', 3000, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Verantwortlich', 2000, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Nachweis / Artefakt', 4026, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
        ),
        row(cell('Penetrationstest bestanden', 3000, { shade: 'FADBD8' }), cell('ST COMPUTER GmbH', 2000), cell('Pentest-Bericht (extern), alle Findings severity:high behoben', 4026)),
        row(cell('DPO-Freigabe erteilt', 3000, { shade: 'FADBD8' }), cell('DPO (DRK LV MV)', 2000), cell('Schriftliche DPO-Freigabe, Datenschutz-Folgenabschätzung abgeschlossen', 4026)),
        row(cell('Mandantenisolation auditiert', 3000, { shade: 'FADBD8' }), cell('ST COMPUTER GmbH', 2000), cell('Audit-Protokoll: RLS-Test mit 2 Mandanten, tenant_id-Isolation bestätigt', 4026)),
        row(cell('Kein Prompt-Logging nachgewiesen', 3000, { shade: 'FADBD8' }), cell('ST COMPUTER GmbH', 2000), cell('Code-Audit: keine Prompt-Inhalte in Logs/DB, Compliance-Kommentare geprüft', 4026)),
        row(cell('Time-to-First-Token < 2s', 3000, { shade: 'EAF2FB' }), cell('ST COMPUTER GmbH', 2000), cell('Lasttest-Protokoll: TTFT-Messung unter realistischer Last (10 parallele User)', 4026)),
        row(cell('Backup & Recovery getestet', 3000, { shade: 'EAF2FB' }), cell('DRK-IT', 2000), cell('Recovery-Test: vollständige Wiederherstellung aus Backup < 4h', 4026)),
        row(cell('Keycloak-Rollenvergabe geprüft', 3000, { shade: 'EAF2FB' }), cell('DRK-IT + ST COMPUTER', 2000), cell('Mind. 1 Admin und 1 User pro Pilot-KV konfiguriert und getestet', 4026)),
        row(cell('Schulung Pilot-KV abgeschlossen', 3000, { shade: 'EAF2FB' }), cell('ST COMPUTER GmbH', 2000), cell('Schulungsprotokoll, Nutzer-Handbuch übergeben', 4026)),
      ]),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Kap. 7: Zeitplan ───────────────────────────────────
      h1('7. Grob-Zeitplan'),
      table([1600, 2400, 2400, 2626], [
        row(
          cell('Phase', 1600, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Zeitraum (ca.)', 2400, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Meilenstein', 2400, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Beteiligte', 2626, { header: true, shade: '1F4E79', color: 'FFFFFF' }),
        ),
        row(cell('Projekt-Kick-off', 1600, { shade: 'EAF2FB' }), cell('Woche 1', 2400), cell('Erster Discovery-Workshop, Backlog initial gefüllt', 2400), cell('DRK LV MV, ST COMPUTER, 2 KV', 2626)),
        row(cell('Sprint 1–3', 1600, { shade: 'EAF2FB' }), cell('Woche 1–6', 2400), cell('MVP: Chat + RAG für 1 KV auf Staging', 2400), cell('ST COMPUTER GmbH', 2626)),
        row(cell('Pentest', 1600, { shade: 'FADBD8' }), cell('Woche 6–8', 2400), cell('Pentest-Bericht, Findings behoben', 2400), cell('Externer Pentester, ST COMPUTER', 2626)),
        row(cell('DPO-Freigabe', 1600, { shade: 'FADBD8' }), cell('Woche 8–10', 2400), cell('Schriftliche Freigabe für Pilotbetrieb', 2400), cell('DPO, PO Gesamt', 2626)),
        row(cell('Pilot-KV', 1600, { shade: 'E8DAEF' }), cell('Woche 10–22', 2400), cell('1 KV produktiv, Feedback-Sammlung', 2400), cell('Pilot-KV, DRK-IT, ST COMPUTER', 2626)),
        row(cell('Rollout Welle 1', 1600, { shade: 'E8DAEF' }), cell('Woche 22–28', 2400), cell('3–5 weitere KV in Produktion', 2400), cell('DRK-IT, ST COMPUTER', 2626)),
        row(cell('Vollständiger Rollout', 1600, { shade: 'D5F5E3' }), cell('Woche 28–40', 2400), cell('Alle 15 KV in Produktion', 2400), cell('DRK-IT, alle KV-POs', 2626)),
      ]),
      ...gap(1),
      warningBox(
        'Abhängigkeit: Pentest und DPO-Freigabe sind Blocking-Meilensteine',
        'Kein Produktions-Deployment ohne bestandenen Pentest und schriftliche DPO-Freigabe. Der Zeitplan verschiebt sich entsprechend, wenn diese Kriterien nicht fristgerecht erfüllt werden.',
      ),
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
  fs.writeFileSync('C:/Projekte/drk-mv-ki-plattform/docs/Systemuebersicht-DRK-CoCreation.docx', buf);
  console.log('OK', buf.length, 'bytes');
});
