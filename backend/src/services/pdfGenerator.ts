/**
 * PDF generation service for AgentConnect reports.
 *
 * Produces two PDF variants:
 *   1. VALIDATION_REPORT — full report with all 5 agent outputs
 *   2. MARKET_RESEARCH   — Scout + Atlas market data only
 */
import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'

/* ── colour palette ── */
const DARK_HEADER = '#07090D'
const ACCENT_GREEN = '#00FF41'
const SECTION_BLUE = '#1a1a2e'
const BODY_TEXT = '#1a1a1a'
const AMBER = '#FFA500'
const RED = '#FF4444'
const LIGHT_GRAY = '#E0E0E0'
const WHITE = '#FFFFFF'

/* ── helpers ── */

const STORAGE_DIR = path.resolve(process.cwd(), 'storage', 'reports')

function ensureDir() {
  if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true })
}

function scoreColor(score: number): string {
  if (score >= 7) return ACCENT_GREEN
  if (score >= 5) return AMBER
  return RED
}

function safeTxt(val: unknown): string {
  if (val === null || val === undefined) return '—'
  return String(val)
}

function safeArr(val: unknown): any[] {
  return Array.isArray(val) ? val : []
}

/* ── shared drawing primitives ── */

function drawHeader(doc: PDFKit.PDFDocument, startupName: string, subtitle: string) {
  doc
    .rect(0, 0, doc.page.width, 90)
    .fill(DARK_HEADER)

  doc
    .font('Helvetica-Bold')
    .fontSize(22)
    .fillColor(WHITE)
    .text(startupName || 'AgentConnect Report', 50, 25, { width: doc.page.width - 100 })

  doc
    .font('Helvetica')
    .fontSize(11)
    .fillColor(ACCENT_GREEN)
    .text(subtitle, 50, 55, { width: doc.page.width - 100 })

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#888888')
    .text(`Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 50, 72, { width: doc.page.width - 100, align: 'right' })

  doc.fillColor(BODY_TEXT)
  doc.y = 110
}

function addPageNumbers(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#888888')
      .text(
        `Page ${i + 1} of ${range.count}  ·  AgentConnect`,
        50,
        doc.page.height - 40,
        { width: doc.page.width - 100, align: 'center' },
      )
  }
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string) {
  if (doc.y > doc.page.height - 120) doc.addPage()

  doc
    .moveDown(0.8)
    .rect(50, doc.y, doc.page.width - 100, 28)
    .fill(SECTION_BLUE)

  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor(WHITE)
    .text(title, 60, doc.y + 7, { width: doc.page.width - 120 })

  doc.fillColor(BODY_TEXT)
  doc.y += 36
}

function hr(doc: PDFKit.PDFDocument) {
  doc
    .moveDown(0.4)
    .strokeColor(LIGHT_GRAY)
    .lineWidth(0.5)
    .moveTo(50, doc.y)
    .lineTo(doc.page.width - 50, doc.y)
    .stroke()
  doc.moveDown(0.4)
}

function label(doc: PDFKit.PDFDocument, lbl: string, value: string) {
  if (doc.y > doc.page.height - 60) doc.addPage()
  doc.font('Helvetica-Bold').fontSize(10).fillColor(SECTION_BLUE).text(lbl, 60, doc.y, { continued: true })
  doc.font('Helvetica').fontSize(10).fillColor(BODY_TEXT).text(`  ${value}`)
}

function paragraph(doc: PDFKit.PDFDocument, text: string) {
  if (doc.y > doc.page.height - 60) doc.addPage()
  doc.font('Helvetica').fontSize(10).fillColor(BODY_TEXT).text(safeTxt(text), 60, doc.y, {
    width: doc.page.width - 120,
    lineGap: 3,
  })
}

function scoreBox(doc: PDFKit.PDFDocument, lbl: string, score: number) {
  if (doc.y > doc.page.height - 60) doc.addPage()
  const color = scoreColor(score)
  doc.font('Helvetica-Bold').fontSize(10).fillColor(SECTION_BLUE).text(`${lbl}: `, 60, doc.y, { continued: true })
  doc.font('Helvetica-Bold').fontSize(12).fillColor(color).text(`${score}/10`)
}

function bulletList(doc: PDFKit.PDFDocument, items: string[]) {
  for (const item of items) {
    if (doc.y > doc.page.height - 50) doc.addPage()
    doc.font('Helvetica').fontSize(10).fillColor(BODY_TEXT).text(`  •  ${safeTxt(item)}`, 60, doc.y, {
      width: doc.page.width - 130,
      lineGap: 2,
    })
  }
}

/* ── table helper ── */

function drawTable(doc: PDFKit.PDFDocument, headers: string[], rows: string[][], colWidths: number[]) {
  const startX = 60
  const rowHeight = 22
  const tableWidth = colWidths.reduce((a, b) => a + b, 0)

  // Header row
  if (doc.y > doc.page.height - 80) doc.addPage()
  const headerY = doc.y
  doc.rect(startX, headerY, tableWidth, rowHeight).fill(SECTION_BLUE)
  let cx = startX
  for (let i = 0; i < headers.length; i++) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(WHITE).text(headers[i], cx + 4, headerY + 6, {
      width: colWidths[i] - 8,
      height: rowHeight,
      ellipsis: true,
    })
    cx += colWidths[i]
  }
  doc.y = headerY + rowHeight

  // Data rows
  for (const row of rows) {
    if (doc.y > doc.page.height - 50) doc.addPage()
    const ry = doc.y
    cx = startX
    for (let i = 0; i < row.length; i++) {
      doc.font('Helvetica').fontSize(8).fillColor(BODY_TEXT).text(safeTxt(row[i]), cx + 4, ry + 5, {
        width: colWidths[i] - 8,
        height: rowHeight,
        ellipsis: true,
      })
      cx += colWidths[i]
    }
    // row border
    doc.strokeColor(LIGHT_GRAY).lineWidth(0.3).moveTo(startX, ry + rowHeight).lineTo(startX + tableWidth, ry + rowHeight).stroke()
    doc.y = ry + rowHeight
  }
  doc.moveDown(0.5)
}

/* ══════════════════════════════════════════════════════════════════════════
   SECTION RENDERERS
   ══════════════════════════════════════════════════════════════════════════ */

function renderScout(doc: PDFKit.PDFDocument, scout: any) {
  sectionTitle(doc, 'Scout  —  Market Intelligence')

  if (scout.summary) {
    paragraph(doc, scout.summary)
    doc.moveDown(0.5)
  }

  if (scout.collisionScore != null) scoreBox(doc, 'Collision Score', scout.collisionScore)
  if (scout.demandLevel) label(doc, 'Demand Level:', scout.demandLevel)
  doc.moveDown(0.3)

  // Competitors
  const competitors = safeArr(scout.competitors)
  if (competitors.length) {
    hr(doc)
    doc.font('Helvetica-Bold').fontSize(11).fillColor(SECTION_BLUE).text('Competitors', 60)
    doc.moveDown(0.3)
    const compRows = competitors.map((c: any) =>
      typeof c === 'string' ? [c, '', ''] : [safeTxt(c.name), safeTxt(c.description || c.overlap || ''), safeTxt(c.url || '')],
    )
    drawTable(doc, ['Name', 'Details', 'URL'], compRows, [130, 220, 130])
  }

  // Market signals
  const signals = safeArr(scout.marketSignals)
  if (signals.length) {
    hr(doc)
    doc.font('Helvetica-Bold').fontSize(11).fillColor(SECTION_BLUE).text('Market Signals', 60)
    doc.moveDown(0.3)
    bulletList(doc, signals.map((s: any) => (typeof s === 'string' ? s : safeTxt(s.signal || s.title || s))))
  }

  // Differentiation angles
  const angles = safeArr(scout.differentiationAngles)
  if (angles.length) {
    hr(doc)
    doc.font('Helvetica-Bold').fontSize(11).fillColor(SECTION_BLUE).text('Differentiation Angles', 60)
    doc.moveDown(0.3)
    bulletList(doc, angles.map((a: any) => (typeof a === 'string' ? a : safeTxt(a))))
  }

  // Market article
  if (scout.marketArticle) {
    hr(doc)
    doc.font('Helvetica-Bold').fontSize(11).fillColor(SECTION_BLUE).text('Market Article', 60)
    doc.moveDown(0.3)
    paragraph(doc, scout.marketArticle)
  }

  // Sources
  const sources = safeArr(scout.sources)
  if (sources.length) {
    hr(doc)
    doc.font('Helvetica').fontSize(8).fillColor('#666666').text('Sources:', 60)
    for (const s of sources.slice(0, 10)) {
      doc.font('Helvetica').fontSize(7).fillColor('#666666').text(`  → ${safeTxt(typeof s === 'string' ? s : s.url || s.title || s)}`, 60, doc.y, {
        width: doc.page.width - 130,
      })
    }
  }
}

function renderAtlas(doc: PDFKit.PDFDocument, atlas: any) {
  sectionTitle(doc, 'Atlas  —  Market Sizing & Geography')

  // TAM / SAM / SOM prominent display
  if (doc.y > doc.page.height - 120) doc.addPage()
  const boxY = doc.y
  const boxW = (doc.page.width - 140) / 3
  const boxes = [
    { label: 'TAM', value: safeTxt(atlas.tam) },
    { label: 'SAM', value: safeTxt(atlas.sam) },
    { label: 'SOM', value: safeTxt(atlas.som) },
  ]
  for (let i = 0; i < 3; i++) {
    const bx = 60 + i * (boxW + 10)
    doc.rect(bx, boxY, boxW, 50).fill(DARK_HEADER)
    doc.font('Helvetica').fontSize(9).fillColor(ACCENT_GREEN).text(boxes[i].label, bx, boxY + 8, { width: boxW, align: 'center' })
    doc.font('Helvetica-Bold').fontSize(13).fillColor(WHITE).text(boxes[i].value, bx, boxY + 22, { width: boxW, align: 'center' })
  }
  doc.y = boxY + 62
  doc.fillColor(BODY_TEXT)

  if (atlas.marketSizingRationale) {
    label(doc, 'Rationale:', atlas.marketSizingRationale)
    doc.moveDown(0.3)
  }

  if (atlas.opportunityScore != null) scoreBox(doc, 'Opportunity Score', atlas.opportunityScore)
  if (atlas.launchRegion) label(doc, 'Recommended Launch Region:', atlas.launchRegion)
  doc.moveDown(0.3)

  // Regions
  const regions = safeArr(atlas.topRegions)
  if (regions.length) {
    hr(doc)
    doc.font('Helvetica-Bold').fontSize(11).fillColor(SECTION_BLUE).text('Top Regions', 60)
    doc.moveDown(0.3)
    bulletList(doc, regions.map((r: any) => (typeof r === 'string' ? r : safeTxt(r.region || r.name || r))))
  }

  // Customer segments
  const segments = safeArr(atlas.customerSegments)
  if (segments.length) {
    hr(doc)
    doc.font('Helvetica-Bold').fontSize(11).fillColor(SECTION_BLUE).text('Customer Segments', 60)
    doc.moveDown(0.3)
    bulletList(doc, segments.map((s: any) => (typeof s === 'string' ? s : safeTxt(s.segment || s.name || s))))
  }

  // Tailwinds / Headwinds
  const tailwinds = safeArr(atlas.tailwinds)
  const headwinds = safeArr(atlas.headwinds)
  if (tailwinds.length) {
    hr(doc)
    doc.font('Helvetica-Bold').fontSize(11).fillColor(ACCENT_GREEN).text('Tailwinds', 60)
    doc.moveDown(0.3)
    bulletList(doc, tailwinds.map((t: any) => safeTxt(typeof t === 'string' ? t : t.description || t)))
  }
  if (headwinds.length) {
    hr(doc)
    doc.font('Helvetica-Bold').fontSize(11).fillColor(RED).text('Headwinds', 60)
    doc.moveDown(0.3)
    bulletList(doc, headwinds.map((h: any) => safeTxt(typeof h === 'string' ? h : h.description || h)))
  }

  if (atlas.summary) {
    hr(doc)
    paragraph(doc, atlas.summary)
  }
}

function renderForge(doc: PDFKit.PDFDocument, forge: any) {
  sectionTitle(doc, 'Forge  —  Technical Blueprint')

  if (forge.shortPitch) {
    paragraph(doc, forge.shortPitch)
    doc.moveDown(0.3)
  }

  if (forge.buildabilityScore != null) scoreBox(doc, 'Buildability Score', forge.buildabilityScore)
  doc.moveDown(0.3)

  // Tech stack table
  const stack = safeArr(forge.techStack)
  if (stack.length) {
    hr(doc)
    doc.font('Helvetica-Bold').fontSize(11).fillColor(SECTION_BLUE).text('Tech Stack', 60)
    doc.moveDown(0.3)
    drawTable(
      doc,
      ['Layer', 'Technology', 'Justification'],
      stack.map((s: any) => [safeTxt(s.layer), safeTxt(s.technology), safeTxt(s.justification)]),
      [100, 130, 250],
    )
  }

  // MVP features
  const features = safeArr(forge.mvpFeatures)
  if (features.length) {
    hr(doc)
    doc.font('Helvetica-Bold').fontSize(11).fillColor(SECTION_BLUE).text('MVP Features', 60)
    doc.moveDown(0.3)
    drawTable(
      doc,
      ['Feature', 'User Story', 'Complexity', 'Est. Days'],
      features.map((f: any) => [safeTxt(f.name), safeTxt(f.userStory), safeTxt(f.complexity), safeTxt(f.estimateDays)]),
      [100, 200, 80, 60],
    )
  }

  if (forge.repoUrl) label(doc, 'Repository:', forge.repoUrl)
  if (forge.zipUrl) label(doc, 'Download:', forge.zipUrl)
}

function renderDeck(doc: PDFKit.PDFDocument, deck: any) {
  sectionTitle(doc, 'Deck  —  Pitch Summary')

  if (deck.startupName) label(doc, 'Startup Name:', deck.startupName)
  if (deck.oneLiner) label(doc, 'One-Liner:', deck.oneLiner)
  doc.moveDown(0.3)

  if (deck.elevatorPitch) {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(SECTION_BLUE).text('Elevator Pitch', 60)
    doc.moveDown(0.2)
    paragraph(doc, deck.elevatorPitch)
    doc.moveDown(0.3)
  }

  const slides = safeArr(deck.slides)
  if (slides.length) {
    hr(doc)
    doc.font('Helvetica-Bold').fontSize(11).fillColor(SECTION_BLUE).text('Slide Deck Outline', 60)
    doc.moveDown(0.3)
    for (const slide of slides) {
      if (doc.y > doc.page.height - 60) doc.addPage()
      doc.font('Helvetica-Bold').fontSize(9).fillColor(SECTION_BLUE).text(safeTxt(slide.title || slide.name || 'Slide'), 70)
      if (slide.content || slide.body) {
        doc.font('Helvetica').fontSize(9).fillColor(BODY_TEXT).text(safeTxt(slide.content || slide.body), 80, doc.y, {
          width: doc.page.width - 160,
          lineGap: 2,
        })
      }
      doc.moveDown(0.3)
    }
  }
}

function renderConnect(doc: PDFKit.PDFDocument, connect: any) {
  sectionTitle(doc, 'Connect  —  Investor Intelligence')

  if (connect.investorReadinessScore != null)
    scoreBox(doc, 'Investor Readiness', connect.investorReadinessScore)
  doc.moveDown(0.3)

  // Fundraising strategy
  const fs_ = connect.fundraisingStrategy
  if (fs_) {
    if (fs_.amount) label(doc, 'Target Raise:', safeTxt(fs_.amount))
    if (fs_.valuationRange) label(doc, 'Valuation Range:', safeTxt(fs_.valuationRange))
    doc.moveDown(0.3)
  }

  // VC list
  const vcs = safeArr(connect.topVCs)
  if (vcs.length) {
    hr(doc)
    doc.font('Helvetica-Bold').fontSize(11).fillColor(SECTION_BLUE).text('Top VC Matches', 60)
    doc.moveDown(0.3)
    drawTable(
      doc,
      ['Investor', 'Firm', 'Compatibility', 'Thesis Match', 'Check Size'],
      vcs.map((v: any) => [
        safeTxt(v.name),
        safeTxt(v.firm),
        v.compatibilityScore != null ? `${v.compatibilityScore}/10` : '—',
        safeTxt(v.thesisMatch),
        safeTxt(v.checkSize),
      ]),
      [100, 100, 70, 120, 90],
    )
  }

  // Accelerators
  const accels = safeArr(connect.accelerators)
  if (accels.length) {
    hr(doc)
    doc.font('Helvetica-Bold').fontSize(11).fillColor(SECTION_BLUE).text('Accelerators', 60)
    doc.moveDown(0.3)
    bulletList(doc, accels.map((a: any) => (typeof a === 'string' ? a : safeTxt(a.name || a))))
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   PUBLIC API
   ══════════════════════════════════════════════════════════════════════════ */

export async function generateValidationReport(reportId: string, report: any): Promise<string> {
  ensureDir()
  const filePath = path.join(STORAGE_DIR, `${reportId}_VALIDATION_REPORT.pdf`)
  const startupName = report.deck_output?.startupName || 'Startup'

  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true })
  const stream = fs.createWriteStream(filePath)
  doc.pipe(stream)

  drawHeader(doc, startupName, 'Full Validation Report  ·  AgentConnect')

  // Overall score
  if (report.validation_score != null) {
    scoreBox(doc, 'Overall Validation Score', report.validation_score)
    doc.moveDown(0.2)
  }
  if (report.idea) {
    label(doc, 'Idea:', report.idea)
    doc.moveDown(0.3)
  }

  hr(doc)

  // Render each agent section
  if (report.scout_output) renderScout(doc, report.scout_output)
  if (report.atlas_output) renderAtlas(doc, report.atlas_output)
  if (report.forge_output) renderForge(doc, report.forge_output)
  if (report.deck_output) renderDeck(doc, report.deck_output)
  if (report.connect_output) renderConnect(doc, report.connect_output)

  addPageNumbers(doc)
  doc.end()

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath))
    stream.on('error', reject)
  })
}

export async function generateMarketResearch(reportId: string, report: any): Promise<string> {
  ensureDir()
  const filePath = path.join(STORAGE_DIR, `${reportId}_MARKET_RESEARCH.pdf`)
  const startupName = report.deck_output?.startupName || 'Startup'

  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true })
  const stream = fs.createWriteStream(filePath)
  doc.pipe(stream)

  drawHeader(doc, startupName, 'Market Research Report  ·  AgentConnect')

  if (report.idea) {
    label(doc, 'Idea:', report.idea)
    doc.moveDown(0.3)
  }

  hr(doc)

  if (report.scout_output) renderScout(doc, report.scout_output)
  if (report.atlas_output) renderAtlas(doc, report.atlas_output)

  addPageNumbers(doc)
  doc.end()

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath))
    stream.on('error', reject)
  })
}
