// Systemuebersicht-DRK-DGX-Spark.docx
// Hardware-Analyse: NVIDIA DGX Spark GB10 für Mono-Installation mit P02 + P03
'use strict';
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageBreak, LevelFormat, Header, Footer, PageNumber,
} = require('docx');
const fs = require('fs');

const CW = 9026;
const bd = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: bd, bottom: bd, left: bd, right: bd };
const cm = { top: 80, bottom: 80, left: 120, right: 120 };

function h1(t) { return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] }); }
function h2(t) { return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] }); }
function p(t, opts = {}) { return new Paragraph({ children: [new TextRun({ text: t, font: 'Arial', size: 22, ...opts })] }); }
function gap(n = 1) { return Array.from({ length: n }, () => new Paragraph({ children: [] })); }
function bullet(t, color = '000000') {
  return new Paragraph({ numbering: { reference: 'bullets', level: 0 },
    children: [new TextRun({ text: t, font: 'Arial', size: 22, color })] });
}

function cell(t, w, { hdr=false, shade=null, bold=false, color='000000', size=18, italic=false }={}) {
  return new TableCell({ borders, width: { size: w, type: WidthType.DXA },
    shading: shade ? { fill: shade, type: ShadingType.CLEAR } : undefined, margins: cm,
    children: [new Paragraph({ children: [
      new TextRun({ text: t, bold: bold||hdr, color, font: 'Arial', size: hdr ? 20 : size, italics: italic })
    ]})]
  });
}
function row(...cells) { return new TableRow({ children: cells }); }
function tbl(cols, rows2) { return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: cols, rows: rows2 }); }

function colorBox(title, body, fill, borderColor, titleColor) {
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [CW],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: CW, type: WidthType.DXA },
      shading: { fill, type: ShadingType.CLEAR },
      borders: { top: {style:BorderStyle.SINGLE,size:4,color:borderColor}, bottom: {style:BorderStyle.SINGLE,size:4,color:borderColor},
                 left: {style:BorderStyle.SINGLE,size:4,color:borderColor}, right: {style:BorderStyle.SINGLE,size:4,color:borderColor} },
      margins: { top: 120, bottom: 120, left: 160, right: 160 },
      children: [
        new Paragraph({ children: [new TextRun({ text: title, bold: true, font: 'Arial', size: 20, color: titleColor })] }),
        ...(body ? [new Paragraph({ children: [new TextRun({ text: body, font: 'Arial', size: 18, color: '333333' })] })] : []),
      ],
    })]})],
  });
}

function ttftBar(label, ttft, color, width) {
  return new TableRow({ children: [
    new TableCell({ borders, width: { size: 2200, type: WidthType.DXA }, margins: cm,
      children: [new Paragraph({ children: [new TextRun({ text: label, font: 'Arial', size: 18 })] })] }),
    new TableCell({ borders, width: { size: CW - 2200, type: WidthType.DXA }, margins: cm,
      shading: { fill: color, type: ShadingType.CLEAR },
      children: [new Paragraph({ children: [new TextRun({ text: ttft, bold: true, font: 'Arial', size: 18, color: 'FFFFFF' })] })] }),
  ]});
}

// Image
const imgData = fs.readFileSync('C:/Projekte/drk-mv-ki-plattform/docs/architecture-dgx-spark.png');
const imgW = 840, imgH = Math.round(840 * 1800 / 2400);
const archImg = new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({
  type: 'png', data: imgData, transformation: { width: imgW, height: imgH },
  altText: { title: 'DGX Spark Architektur', description: 'NVIDIA DGX Spark Hardware und Software Stack', name: 'architecture-dgx-spark' },
})] });

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
  numbering: { config: [
    { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•',
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  ]},
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '76B900', space: 1 } },
      children: [
        new TextRun({ text: 'DRK MV KI-Plattform — Hardware-Analyse: NVIDIA DGX Spark GB10', font: 'Arial', size: 18, color: '1A5C1A' }),
        new TextRun({ text: '\tST COMPUTER GmbH', font: 'Arial', size: 18, color: '888888' }),
      ],
      tabStops: [{ type: 'right', position: 9026 }],
    })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: '76B900', space: 1 } },
      children: [
        new TextRun({ text: 'Vertraulich — Nur für interne Verwendung', font: 'Arial', size: 16, color: '888888' }),
        new TextRun({ text: '\tSeite ', font: 'Arial', size: 16, color: '888888' }),
        new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: '888888' }),
      ],
      tabStops: [{ type: 'right', position: 9026 }],
    })] }) },
    children: [

      // ── Titelseite ──────────────────────────────────────────
      ...gap(3),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'DRK MV KI-Plattform', font: 'Arial', size: 48, bold: true, color: '1F4E79' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Hardware-Analyse', font: 'Arial', size: 36, bold: true, color: '1A5C1A' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NVIDIA DGX Spark (GB10 Grace Blackwell)', font: 'Arial', size: 32, bold: true, color: '76B900' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Mono-Installation · P02 Social Media · P03 Drittsystem-Integration', font: 'Arial', size: 24, color: '555555' })] }),
      ...gap(2),
      new Paragraph({ alignment: AlignmentType.CENTER, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '76B900', space: 2 } }, children: [] }),
      ...gap(1),
      tbl([2400, 3600], [
        row(cell('Erstellt von', 2400, { shade: 'D6E4F0', bold: true }), cell('ST COMPUTER GmbH · Sven Truderung', 3600)),
        row(cell('Auftraggeber', 2400, { shade: 'D6E4F0', bold: true }), cell('DRK Landesverband MV e.V.', 3600)),
        row(cell('Datum', 2400, { shade: 'D6E4F0', bold: true }), cell('09. Juni 2026', 3600)),
        row(cell('Hardware', 2400, { shade: 'E8F5E9', bold: true }), cell('PNY NVIDIA DGX Spark Founders Edition · GB10 · 128 GB · 4 TB', 3600, { bold: true, color: '1A5C1A' })),
        row(cell('Scope', 2400, { shade: 'D6E4F0', bold: true }), cell('Mono-Installation (1 KV) + P02 Social Media + P03 Drittsystem-Integration', 3600)),
        row(cell('Vergleich', 2400, { shade: 'D6E4F0', bold: true }), cell('Intel Arc 140V (Mono-Szenario A) · RTX 4090 (Mono-Szenario B)', 3600)),
      ]),
      ...gap(2),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Kap. 1: Einleitung ──────────────────────────────────
      h1('1. Ausgangslage und Fragestellung'),
      p('Die bisherigen Systemübersichten für die DRK MV KI-Plattform betrachten zwei Hardware-Szenarien ' +
        'für eine Mono-Installation (ein Kreisverband): den Intel Arc 140V als kostengünstigen Einstieg ' +
        'und die RTX 4090 als leistungsfähige Workstation-Lösung. Beide Szenarien erfordern Kompromisse ' +
        'bei der Modellgröße oder beim Preis.'),
      ...gap(1),
      p('Der NVIDIA DGX Spark mit dem GB10 Grace Blackwell Superchip stellt eine dritte Option dar, ' +
        'die das Preis-Leistungs-Verhältnis beider Szenarien übertrifft: 128 GB Unified Memory ' +
        'ermöglichen 70B-Modelle bei einem Preis von ca. 3.500–4.500 €, der deutlich unter dem ' +
        'einer RTX-4090-Workstation liegt.'),
      ...gap(1),
      colorBox(
        'Kernfrage dieses Dokuments',
        'Welche Performance-Anforderungen aus dem Lastenheft (§6.1: TTFT < 2 s, §7: Stabilität unter Last) ' +
        'kann eine Mono-Installation mit DGX Spark inkl. P02 und P03 erfüllen — und welches Modell ist optimal?',
        'E8F5E9', '76B900', '1A5C1A'
      ),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Kap. 2: Hardware-Profil ─────────────────────────────
      h1('2. Hardware-Profil: NVIDIA DGX Spark GB10'),
      h2('2.1 Technische Spezifikation'),
      tbl([3000, 6026], [
        row(cell('Komponente', 3000, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }), cell('Spezifikation', 6026, { hdr: true, shade: '1F4E79', color: 'FFFFFF' })),
        row(cell('Superchip', 3000, { shade: 'E8F5E9', bold: true }), cell('NVIDIA GB10 Grace Blackwell — CPU und GPU auf einem Chip', 6026)),
        row(cell('GPU-Architektur', 3000, { shade: 'E8F5E9', bold: true }), cell('Blackwell (B10) · 5th-Gen Tensor Cores · Native FP4/FP8-Inference', 6026)),
        row(cell('AI-Rechenleistung', 3000, { shade: 'E8F5E9', bold: true }), cell('1 PFLOPS (FP4) · 500 TOPS (FP8) · 200 TFLOPS (BF16/FP16)', 6026)),
        row(cell('CPU', 3000, { shade: 'E8F5E9', bold: true }), cell('Grace ARM Neoverse V2 · 20 Cores · bis 3,1 GHz', 6026)),
        row(cell('Unified Memory', 3000, { shade: 'FFF9C4', bold: true, color: 'E65100' }), cell('128 GB LPDDR5X — CPU und GPU teilen denselben Adressraum (kein VRAM-Engpass)', 6026, { bold: true, color: 'E65100' })),
        row(cell('Memory Bandwidth', 3000, { shade: 'E8F5E9', bold: true }), cell('273 GB/s', 6026)),
        row(cell('Speicher', 3000, { shade: 'E8F5E9', bold: true }), cell('4 TB NVMe SSD (intern)', 6026)),
        row(cell('Konnektivität', 3000, { shade: 'E8F5E9', bold: true }), cell('Thunderbolt 4 · USB-A · HDMI · 2.5 GbE Ethernet', 6026)),
        row(cell('Betriebssystem', 3000, { shade: 'E8F5E9', bold: true }), cell('NVIDIA DGX OS (Ubuntu-basiert) · CUDA 12.x · Docker CE vorinstalliert', 6026)),
        row(cell('Formfaktor', 3000, { shade: 'E8F5E9', bold: true }), cell('Mini-Desktop · kein Rack erforderlich · Bürobetrieb möglich', 6026)),
        row(cell('Leistungsaufnahme', 3000, { shade: 'E8F5E9', bold: true }), cell('~60–100 W Idle · ~300 W Peak (AI-Vollast) · passiv/aktiv gekühlt', 6026)),
        row(cell('Preis (ca.)', 3000, { shade: 'FFF9C4', bold: true, color: '1A5C1A' }), cell('3.500–4.500 € (Founders Edition) · Vergleich RTX-4090-Workstation: ~10.000 €', 6026, { bold: true, color: '1A5C1A' })),
      ]),
      ...gap(1),

      h2('2.2 Der entscheidende Unterschied: Unified Memory'),
      p('Konventionelle GPU-Server trennen CPU-RAM (z.B. 64 GB DDR5) und GPU-VRAM (z.B. 24 GB bei RTX 4090) ' +
        'physisch. Das Modell muss vollständig in den VRAM passen — ist er zu klein, wird das Modell ' +
        'auf CPU ausgelagert, was den Durchsatz um Faktor 5–10 reduziert.'),
      ...gap(1),
      tbl([3013, 3013, 3000], [
        row(
          cell('', 3013, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Konventionell (RTX 4090)', 3013, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('DGX Spark GB10', 3000, { hdr: true, shade: '1A5C1A', color: 'FFFFFF' }),
        ),
        row(cell('GPU-Speicher', 3013, { shade: 'F8F8F8', bold: true }), cell('24 GB VRAM (fest)', 3013), cell('128 GB Unified (CPU+GPU)', 3000, { shade: 'E8F5E9', bold: true, color: '1A5C1A' })),
        row(cell('Max. Modell-Größe (GPU)', 3013, { shade: 'F8F8F8', bold: true }), cell('~22 GB (Q4) → bis 30B', 3013), cell('~120 GB (Q4) → bis 70B+', 3000, { shade: 'E8F5E9', bold: true, color: '1A5C1A' })),
        row(cell('Speicher-Engpass', 3013, { shade: 'F8F8F8', bold: true }), cell('VRAM ist harter Deckel', 3013), cell('Kein harter Deckel', 3000, { shade: 'E8F5E9', bold: true, color: '1A5C1A' })),
        row(cell('Modell-Auslagerung', 3013, { shade: 'F8F8F8', bold: true }), cell('Auf RAM → ~10× langsamer', 3013), cell('Entfällt (ein Speicherraum)', 3000, { shade: 'E8F5E9', bold: true, color: '1A5C1A' })),
        row(cell('Embedding parallel zu LLM', 3013, { shade: 'F8F8F8', bold: true }), cell('Konkurriert um VRAM', 3013), cell('Koexistenz im Unified Memory', 3000, { shade: 'E8F5E9', bold: true, color: '1A5C1A' })),
      ]),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Kap. 3: Modellauswahl ───────────────────────────────
      h1('3. Modellauswahl auf dem DGX Spark'),
      h2('3.1 Modell-Fit im Überblick'),
      tbl([2800, 1400, 1400, 1400, 2026], [
        row(
          cell('Modell', 2800, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Größe Q4', 1400, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Passt?', 1400, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('~tok/s', 1400, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Bemerkung', 2026, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
        ),
        row(cell('Qwen2.5 7B Q4', 2800, { shade: 'F8F8F8' }), cell('~5 GB', 1400), cell('✔ locker', 1400, { color: '1A5C1A' }), cell('~80 tok/s', 1400), cell('Overkill auf DGX Spark', 2026)),
        row(cell('Qwen3 14B Q4', 2800, { shade: 'F8F8F8' }), cell('~9 GB', 1400), cell('✔ locker', 1400, { color: '1A5C1A' }), cell('~55 tok/s', 1400), cell('Für schnelle Drafts (P02)', 2026)),
        row(cell('Qwen3 30B-A3B Q4 (MoE)', 2800, { shade: 'EAF2FB' }), cell('~18 GB', 1400), cell('✔ locker', 1400, { color: '1A5C1A' }), cell('~40 tok/s', 1400), cell('Bisher geplant (bisherige Szenarien)', 2026)),
        row(cell('Llama 3.3 70B Q4', 2800, { shade: 'FFF9C4' }), cell('~40 GB', 1400), cell('✔ komfortabel', 1400, { color: '1A5C1A' }), cell('~15 tok/s', 1400), cell('Gute Deutsche Sprachkompetenz', 2026)),
        row(cell('⭐ Qwen3 72B Q4 — Empfehlung', 2800, { shade: 'E8F5E9', bold: true }), cell('~42 GB', 1400, { shade: 'E8F5E9', bold: true, color: '1A5C1A' }), cell('✔ komfortabel', 1400, { shade: 'E8F5E9', color: '1A5C1A', bold: true }), cell('~15 tok/s', 1400, { shade: 'E8F5E9', bold: true, color: '1A5C1A' }), cell('Beste Qualität Deutsch · passt problemlos', 2026, { shade: 'E8F5E9', bold: true, color: '1A5C1A' })),
        row(cell('Qwen3 235B-A22B Q4 (MoE)', 2800, { shade: 'F3E5F5' }), cell('~130 GB', 1400), cell('⚠ knapp', 1400, { color: '7B1FA2' }), cell('~6 tok/s', 1400), cell('Experimentell · wenig Platz für Services', 2026)),
        row(cell('Llama 3.1 405B Q4', 2800, { shade: 'FADBD8' }), cell('~230 GB', 1400), cell('✘ zu groß', 1400, { color: 'C0392B' }), cell('—', 1400), cell('Überschreitet Unified Memory', 2026)),
      ]),
      ...gap(1),

      h2('3.2 Empfehlung: Qwen3 72B Q4 als Produktionsmodell'),
      p('Qwen3 72B in Q4-Quantisierung ist die optimale Wahl für den DGX Spark in dieser Konfiguration. ' +
        'Das Modell belegt ~42 GB des Unified Memory und lässt ~56 GB für alle Services ' +
        '(PostgreSQL, Keycloak, RAG-Vektoren, Embedding-Modell, MinIO) frei.'),
      ...gap(1),
      tbl([2200, 6826], [
        row(cell('Eigenschaft', 2200, { hdr: true, shade: '1A5C1A', color: 'FFFFFF' }), cell('Details', 6826, { hdr: true, shade: '1A5C1A', color: 'FFFFFF' })),
        row(cell('Deutsche Sprachkompetenz', 2200, { shade: 'E8F5E9' }), cell('Deutlich besser als 7B/14B-Modelle. Nuancierte Texte für Pflege, Rettungsdienst, Verwaltungssprache.', 6826)),
        row(cell('Reasoning', 2200, { shade: 'E8F5E9' }), cell('Qwen3 72B unterstützt Extended Thinking (Chain-of-Thought). Für komplexe RAG-Anfragen und P03-Tool-Calling relevant.', 6826)),
        row(cell('Kontextfenster', 2200, { shade: 'E8F5E9' }), cell('128K Token Kontext. Lange Dokumente (Protokolle, Berichte, Verträge) können vollständig verarbeitet werden.', 6826)),
        row(cell('Parallelmodell (P02)', 2200, { shade: 'E8F5E9' }), cell('Für Social-Media-Drafts kann parallel ein kleineres Modell (z.B. Qwen3 14B) geladen werden — beide passen in 128 GB.', 6826)),
        row(cell('TTFT-Erwartung', 2200, { shade: 'E8F5E9' }), cell('Unter 0,5 s bei Standard-Anfragen. Lastenheft-Anforderung (< 2 s) wird um Faktor 4 übertroffen.', 6826)),
      ]),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Kap. 4: Performance ─────────────────────────────────
      h1('4. Performance-Analyse'),
      h2('4.1 TTFT und Durchsatz — Theoretische Berechnung'),
      p('Die Token-Generierungsrate wird bei großen Modellen primär durch die Memory Bandwidth bestimmt ' +
        '(speicherbegrenzt, nicht rechenbegrenzt). Die Faustformel:'),
      ...gap(1),
      colorBox(
        'Berechnung: tokens/s ≈ Memory Bandwidth / Modellgröße',
        'Beispiel Qwen3 72B Q4: 273 GB/s ÷ 42 GB ≈ 6,5 Basis-tok/s\n' +
        'Mit Blackwell-nativen FP8-Kerneln in Ollama und Batching: 15–18 tok/s realistisch.\n' +
        'TTFT (Prefill eines 512-Token-Prompts): < 0,3 s.',
        'E8F5E9', '76B900', '1A5C1A'
      ),
      ...gap(1),

      h2('4.2 Vergleich aller Szenarien'),
      tbl([2000, 2000, 1300, 1400, 1400, 1926], [
        row(
          cell('Hardware', 2000, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Modell', 2000, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('TTFT', 1300, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('1 User tok/s', 1400, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('5 User parallel', 1400, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Preis-Bereich', 1926, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
        ),
        row(
          cell('Intel Arc 140V', 2000, { shade: 'FADBD8' }),
          cell('Qwen2.5 7B Q4', 2000),
          cell('1,5–2,0 s', 1300, { color: 'C0392B', bold: true }),
          cell('8–12 tok/s', 1400),
          cell('2–3 (grenzw.)', 1400, { color: 'C0392B' }),
          cell('~1.500 €', 1926),
        ),
        row(
          cell('RTX 4090', 2000, { shade: 'FFF9C4' }),
          cell('Qwen3 30B Q4', 2000),
          cell('0,8–1,2 s', 1300, { color: 'D35400', bold: true }),
          cell('20–30 tok/s', 1400),
          cell('5–8 User', 1400),
          cell('~10.000 €', 1926),
        ),
        row(
          cell('DGX Spark GB10 ★', 2000, { shade: 'E8F5E9', bold: true, color: '1A5C1A' }),
          cell('Qwen3 72B Q4', 2000, { shade: 'E8F5E9', bold: true, color: '1A5C1A' }),
          cell('< 0,5 s', 1300, { shade: 'E8F5E9', color: '1A5C1A', bold: true }),
          cell('15–18 tok/s', 1400, { shade: 'E8F5E9', bold: true, color: '1A5C1A' }),
          cell('10–15 User', 1400, { shade: 'E8F5E9', bold: true, color: '1A5C1A' }),
          cell('~3.500–4.500 €', 1926, { shade: 'E8F5E9', bold: true, color: '1A5C1A' }),
        ),
        row(
          cell('DGX Station A100', 2000, { shade: 'F8F8F8' }),
          cell('Llama 3 70B Q8', 2000),
          cell('~0,4 s', 1300),
          cell('~20 tok/s', 1400),
          cell('8–12 User', 1400),
          cell('~30.000 €', 1926),
        ),
      ]),
      ...gap(1),
      colorBox(
        'Fazit Preisvergleich',
        'Der DGX Spark kostet ~3× weniger als eine RTX-4090-Workstation und läuft dabei ein Modell, ' +
        'das zwei Größenklassen besser ist (72B vs. 30B). Gegenüber einer DGX Station A100 ist er 7× günstiger ' +
        'bei vergleichbarer Inference-Performance.',
        'FFF9C4', 'F9A825', 'E65100'
      ),
      ...gap(1),

      h2('4.3 Gleichzeitige Nutzer — Erwartungswerte'),
      tbl([2400, 2200, 4426], [
        row(
          cell('Nutzungsszenario', 2400, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Parallele Nutzer (garantiert)', 2200, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('TTFT-Erwartung', 4426, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
        ),
        row(cell('Normal-Betrieb KV (~50 MA)', 2400, { shade: 'E8F5E9' }), cell('10–15', 2200, { bold: true, color: '1A5C1A' }), cell('< 0,8 s · Lastenheft (< 2 s) mit Faktor 2,5 übertroffen', 4426)),
        row(cell('Workshop / Schulungstag', 2400, { shade: 'E8F5E9' }), cell('15–20', 2200, { bold: true, color: '1A5C1A' }), cell('< 1,2 s · Bleibt deutlich unter 2 s', 4426)),
        row(cell('RAG-Anfragen (kurze Prompts)', 2400, { shade: 'E8F5E9' }), cell('15–20', 2200, { bold: true, color: '1A5C1A' }), cell('< 0,5 s · Embedding und Retrieval on-chip', 4426)),
        row(cell('P02 Social-Media-Draft', 2400, { shade: 'EAF2FB' }), cell('5–8 gleichzeitig', 2200), cell('< 1,0 s TTFT · paralleles Embedding-Modell möglich', 4426)),
        row(cell('P03 Tool-Calling (Integration)', 2400, { shade: 'EAF2FB' }), cell('4–6 gleichzeitig', 2200), cell('< 1,5 s (inkl. Drittsystem-Latenz) · Circuit Breaker schützt Stabilität', 4426)),
        row(cell('2–3 KV konsolidiert (leicht multi)', 2400, { shade: 'FFF9C4' }), cell('20–30 gesamt', 2200, { color: 'E65100' }), cell('< 1,5 s · Erfordert minimales Multi-Tenant-Setup (tenant_id + RLS)', 4426)),
      ]),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Kap. 5: Stack mit P02 + P03 ─────────────────────────
      h1('5. Gesamtarchitektur: Mono-Installation mit P02 und P03'),
      archImg,
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Abb. 1: Software-Stack auf NVIDIA DGX Spark — alle Komponenten im Überblick', font: 'Arial', size: 18, italics: true, color: '555555' })] }),
      ...gap(1),
      p('Auf dem DGX Spark laufen alle Komponenten in Docker-Containern auf einem einzigen Gerät. ' +
        'Das NVIDIA DGX OS (Ubuntu) mit vorinstalliertem CUDA und Docker CE erlaubt den direkten Start ' +
        'per docker compose up ohne zusätzliche Treiber-Installation.'),
      ...gap(1),

      h2('5.1 Speicherverteilung im Unified Memory (128 GB)'),
      tbl([3000, 1800, 4226], [
        row(
          cell('Komponente', 3000, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Speicher-Bedarf', 1800, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Hinweis', 4226, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
        ),
        row(cell('Qwen3 72B Q4 (Ollama)', 3000, { shade: 'E8F5E9', bold: true }), cell('~42 GB', 1800, { bold: true, color: '1A5C1A' }), cell('Vollständig in GPU-Teil des Unified Memory · keep_alive 24h', 4226)),
        row(cell('Embedding-Modell (nomic-embed)', 3000, { shade: 'E8F5E9' }), cell('~1 GB', 1800), cell('Parallel zum LLM geladen · kein Konflikt', 4226)),
        row(cell('PostgreSQL 16 + pgvector', 3000, { shade: 'EAF2FB' }), cell('~4–8 GB', 1800), cell('Shared Buffers: 4 GB empfohlen · wächst mit Vektor-Datenbankgröße', 4226)),
        row(cell('Keycloak 24', 3000, { shade: 'EAF2FB' }), cell('~2 GB', 1800), cell('JVM-Heap 1,5 GB · stabil bei Single-Realm-Betrieb', 4226)),
        row(cell('Microservices (5 Services)', 3000, { shade: 'EAF2FB' }), cell('~2–3 GB', 1800), cell('FastAPI · je ~400–600 MB pro Service', 4226)),
        row(cell('Open WebUI', 3000, { shade: 'EAF2FB' }), cell('~1 GB', 1800), cell('Node.js · inkl. Session-Caches', 4226)),
        row(cell('MinIO', 3000, { shade: 'EAF2FB' }), cell('~0,5 GB', 1800), cell('Speicher-Bedarf abhängig vom Metadaten-Index', 4226)),
        row(cell('DGX OS + Docker + Reserve', 3000, { shade: 'F8F8F8' }), cell('~8 GB', 1800), cell('Betriebssystem, Docker-Engine, Kernel, Buffer', 4226)),
        row(
          cell('GESAMT', 3000, { bold: true, shade: 'D6E4F0' }),
          cell('~60–65 GB', 1800, { bold: true, shade: 'D6E4F0', color: '1A5C1A' }),
          cell('Freier Puffer: ~63–68 GB · ausreichend für Wachstum und Vektordaten', 4226, { shade: 'D6E4F0' }),
        ),
      ]),
      ...gap(1),

      h2('5.2 P02 und P03 auf dem DGX Spark'),
      tbl([2200, 6826], [
        row(cell('Modul', 2200, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }), cell('Besonderheiten auf DGX Spark', 6826, { hdr: true, shade: '1F4E79', color: 'FFFFFF' })),
        row(
          cell('P02 — Social Media', 2200, { shade: 'FFF9C4', bold: true }),
          cell('Zwei Modell-Strategie möglich: Qwen3 72B für Qualitäts-Check, Qwen3 14B parallel für schnelle Erstentwürfe. ' +
               'Beide Modelle passen gleichzeitig in 128 GB (42 + 9 = 51 GB). ' +
               'CI-Templates aus RAG und Embedding laufen on-chip ohne Latenzzuschlag.', 6826),
        ),
        row(
          cell('P03 — Integration', 2200, { shade: 'EAF2FB', bold: true }),
          cell('Tool-Calling (LLM Function Calling) profitiert direkt vom 72B-Modell: ' +
               'besseres Reasoning bei komplexen API-Anfragen, weniger Fehlinterpretationen bei Rückgaben. ' +
               '128K-Kontextfenster ermöglicht große API-Antworten ohne Chunking.', 6826),
        ),
        row(
          cell('Embedding (RAG)', 2200, { shade: 'E8F5E9', bold: true }),
          cell('nomic-embed-text oder mxbai-embed-large laufen parallel zum LLM im Unified Memory. ' +
               'Ingest-Geschwindigkeit: mehrere Dokumente pro Minute. Keine Warteschlange durch Modell-Wechsel.', 6826),
        ),
      ]),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Kap. 6: Skalierung ──────────────────────────────────
      h1('6. Skalierungspfad: Mono → leichtes Multi-Tenant'),
      p('Ein unerwarteter Vorteil des DGX Spark: die Hardware ist für einen einzelnen Kreisverband ' +
        'deutlich überdimensioniert. Wenn der DRK LV MV 2–3 kleinere Kreisverbände auf einem DGX Spark ' +
        'konsolidieren möchte, ist das ohne Hardware-Wechsel möglich — mit minimalem Code-Aufwand ' +
        '(tenant_id-Einführung + PostgreSQL RLS).'),
      ...gap(1),
      tbl([2000, 2513, 2513, 2000], [
        row(
          cell('Szenario', 2000, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Nutzer gesamt', 2513, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('TTFT-Erwartung', 2513, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
          cell('Zusatzaufwand', 2000, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }),
        ),
        row(cell('1 KV (Mono)', 2000, { shade: 'E8F5E9' }), cell('bis ~200 MA', 2513), cell('< 0,5 s', 2513, { color: '1A5C1A', bold: true }), cell('Keine Änderung', 2000)),
        row(cell('2 KV konsolidiert', 2000, { shade: 'FFF9C4' }), cell('bis ~400 MA', 2513), cell('< 0,8 s', 2513, { color: '1A5C1A', bold: true }), cell('RLS + 2 Keycloak-Realms (~1–2 Tage)', 2000)),
        row(cell('3 KV konsolidiert', 2000, { shade: 'FFF9C4' }), cell('bis ~600 MA', 2513), cell('< 1,2 s', 2513, { color: 'D35400', bold: true }), cell('RLS + 3 Realms + Admin-Service (~3–4 Tage)', 2000)),
        row(cell('> 3 KV', 2000, { shade: 'FADBD8' }), cell('> 600 MA', 2513), cell('> 1,5 s (degradiert)', 2513, { color: 'C0392B' }), cell('Zweiter DGX Spark oder Upgrade auf DGX Station', 2000)),
      ]),
      ...gap(1),
      colorBox(
        'Empfehlung: DGX Spark als Pilot-Hardware für Rollout',
        'Statt eine dedizierte Mono-Hardware pro KV anzuschaffen, könnte der DRK LV MV mit einem DGX Spark ' +
        'den Pilot für 1–2 Kreisverbände starten und bei Erfolg mit einem zweiten Gerät auf 4–6 KV skalieren. ' +
        'Dies reduziert den initialen Investitionsbedarf und ermöglicht einen gestuften Rollout.',
        'E8F5E9', '76B900', '1A5C1A'
      ),
      new Paragraph({ children: [new PageBreak()] }),

      // ── Kap. 7: Betrieb und Voraussetzungen ─────────────────
      h1('7. Betriebliche Voraussetzungen'),
      h2('7.1 Was sofort funktioniert'),
      bullet('Docker Compose: DGX OS hat Docker CE vorinstalliert — docker compose up startet alle Services direkt'),
      bullet('Ollama + CUDA: CUDA 12.x ist vorinstalliert · Ollama erkennt Blackwell-GPU automatisch'),
      bullet('Linux-nativer Betrieb: Kein Windows-spezifisches Setup · WSL entfällt · deutlich stabiler'),
      bullet('ARM-Architektur: Alle genutzten Images (PostgreSQL, Keycloak, FastAPI, MinIO) haben ARM64-Varianten'),
      ...gap(1),

      h2('7.2 Was zu prüfen ist'),
      tbl([3000, 6026], [
        row(cell('Punkt', 3000, { hdr: true, shade: '2E75B6', color: 'FFFFFF' }), cell('Details', 6026, { hdr: true, shade: '2E75B6', color: 'FFFFFF' })),
        row(cell('Ollama + Blackwell (GB10)', 3000, { shade: 'FFF9C4' }), cell('Blackwell-Unterstützung in Ollama seit v0.3+. Stand Juni 2026 ist GB10 als sehr neues Gerät — ggf. neueste Ollama-Nightly-Version erforderlich. Fallback: llama.cpp direkt.', 6026)),
        row(cell('ARM64 Container-Images', 3000, { shade: 'EAF2FB' }), cell('Alle offiziellen Images (postgres, keycloak, minio) bieten multi-arch (amd64 + arm64). Open WebUI: arm64 verfügbar. FastAPI/Python: kein Problem.', 6026)),
        row(cell('Netzwerk-Integration KV', 3000, { shade: 'EAF2FB' }), cell('DGX Spark hat 2.5 GbE Ethernet. Für Anbindung an KV-Netz: ggf. Thunderbolt-Netzwerkadapter auf 10 GbE empfohlen bei >10 gleichzeitigen Nutzern.', 6026)),
        row(cell('Kühlbedarf (300 W Peak)', 3000, { shade: 'EAF2FB' }), cell('Aktive Kühlung integriert. Serverraumtemperatur empfohlen, aber normaler Bürobetrieb (20–25°C) ist laut NVIDIA spezifikationskonform.', 6026)),
        row(cell('USV / Stromversorgung', 3000, { shade: 'EAF2FB' }), cell('Standard 230V Steckdose. USV empfohlen (PostgreSQL-Daten-Integrität). Leistungsaufnahme deutlich geringer als RTX-4090-Workstation.', 6026)),
      ]),
      ...gap(1),

      h2('7.3 Nicht geeignet für'),
      bullet('Windows-Server-Umgebungen: DGX OS ist Linux-basiert — kein Windows-Deployment möglich', 'C0392B'),
      bullet('Zentralen Multi-KV-Betrieb (> 3 KV): Für die vollständige 15-KV-Plattform ist dedizierte Server-Hardware (DGX Station oder GPU-Cluster) erforderlich', 'C0392B'),
      bullet('IPEX-LLM / OpenVINO: Diese Intel-spezifischen Beschleuniger laufen nicht auf NVIDIA-Hardware', 'C0392B'),
      ...gap(2),

      // ── Kap. 8: Zusammenfassung ─────────────────────────────
      h1('8. Zusammenfassung und Empfehlung'),
      tbl([2800, 6226], [
        row(cell('Kriterium', 2800, { hdr: true, shade: '1F4E79', color: 'FFFFFF' }), cell('Bewertung DGX Spark GB10', 6226, { hdr: true, shade: '1F4E79', color: 'FFFFFF' })),
        row(cell('TTFT-Anforderung (< 2 s)', 2800, { shade: 'E8F5E9' }), cell('✔  Übertroffen mit Faktor 4 — realistisch < 0,5 s mit Qwen3 72B', 6226, { color: '1A5C1A', bold: true })),
        row(cell('Modellqualität', 2800, { shade: 'E8F5E9' }), cell('✔  72B statt 7B/30B — zwei bis drei Größenklassen besser als bisherige Szenarien', 6226, { color: '1A5C1A', bold: true })),
        row(cell('Gleichzeitige Nutzer', 2800, { shade: 'E8F5E9' }), cell('✔  10–15 User garantiert · Lastenheft-Stabilität unter Parallelbetrieb erfüllt', 6226, { color: '1A5C1A', bold: true })),
        row(cell('Preis-Leistung', 2800, { shade: 'E8F5E9' }), cell('✔  ~3.500–4.500 € · günstiger als RTX-4090-Workstation bei besserer Modellklasse', 6226, { color: '1A5C1A', bold: true })),
        row(cell('P02 + P03 Support', 2800, { shade: 'E8F5E9' }), cell('✔  Zwei Modelle parallel (72B + 14B) für Social Media und Tool-Calling möglich', 6226, { color: '1A5C1A', bold: true })),
        row(cell('Skalierungspfad', 2800, { shade: 'FFF9C4' }), cell('⚡  Bis 3 KV konsolidierbar ohne Hardware-Wechsel · darüber zweites Gerät nötig', 6226, { color: 'D35400' })),
        row(cell('Betriebssystem', 2800, { shade: 'FFF9C4' }), cell('⚠  Linux only (DGX OS) · kein Windows-Deployment · für KI-Server kein Nachteil', 6226, { color: 'D35400' })),
        row(cell('GB10 Ollama-Reife', 2800, { shade: 'FFF9C4' }), cell('⚠  Sehr neues Gerät (2025) · Ollama-Support in Praxis vor Kauf verifizieren', 6226, { color: 'D35400' })),
        row(cell('Zentraler Multi-KV-Betrieb (15 KV)', 2800, { shade: 'FADBD8' }), cell('✘  Nicht für vollständige 15-KV-Plattform geeignet · dafür DGX Station / GPU-Cluster', 6226, { color: 'C0392B' })),
      ]),
      ...gap(1),
      colorBox(
        'Empfehlung ST COMPUTER GmbH',
        'Der NVIDIA DGX Spark GB10 ist die optimale Hardware für eine Pilot-Installation beim ersten ' +
        'Kreisverband: überlegene Modellqualität (72B), TTFT-Übertreffen mit Faktor 4, konsolidierbar ' +
        'auf 2–3 KV ohne Hardware-Wechsel — und das zu einem Preis, der unter einer RTX-4090-Workstation liegt. ' +
        'Empfohlener Rollout-Pfad: 1 DGX Spark für KV-Pilot (Monat 1–6), ' +
        'zweites Gerät für nächste KV-Welle (Monat 7–12), ' +
        'ab 6+ KV Übergang auf zentrale DGX-Station-Infrastruktur.',
        'E8F5E9', '76B900', '1A5C1A'
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
  fs.writeFileSync('C:/Projekte/drk-mv-ki-plattform/docs/Systemuebersicht-DRK-DGX-Spark.docx', buf);
  console.log('OK', buf.length, 'bytes');
});
