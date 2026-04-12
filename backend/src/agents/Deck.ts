/**
 * Deck — pitch deck generator. Dynamic theming per idea + real Pexels imagery.
 *
 *  1. One OpenAI call produces structured slide copy AND a theme
 *     (palette + mood) that matches the flavour of the idea (not hard-coded
 *     black/neon). Each slide also returns a short Pexels search query.
 *  2. We fetch one real Pexels image per slide in parallel (free tier API).
 *  3. .pptx is rendered with the dynamic palette + embedded slide imagery.
 *  4. Slide[] returned to the frontend carries imageUrl + theme so the
 *     in-app deck viewer can match the same look.
 */
import PptxGenJS from 'pptxgenjs'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { callAgentJSON } from '../services/ai.js'
import { searchImage, fetchImageBuffer } from '../services/pexels.js'
import { dnaContextBlock, type DNA } from '../services/dnaContext.js'
import type { ScoutOutput } from './Scout.js'
import type { AtlasOutput } from './Atlas.js'
import type { ForgeOutput } from './Forge.js'

/* ────────────────────────── types ────────────────────────── */

export interface Slide {
  number: number
  section: string // e.g. "01 / PROBLEM"
  title: string
  content: string[] // 3-5 bullet sentences
  speakerNotes: string // 2-3 sentences for the presenter
  imageQuery: string // 2-4 words — Pexels search term
  imageUrl?: string // resolved Pexels URL
  imageCredit?: string // "Photo by <photographer>"
}

export interface DeckTheme {
  moodDescriptor: string // e.g. "warm, humanist, editorial"
  bgColor: string // hex — slide background
  panelColor: string // hex — cards/columns tint
  inkColor: string // hex — primary text
  inkDimColor: string // hex — secondary text
  accentColor: string // hex — brand accent
  accentSoftColor: string // hex — soft accent for ghost elements
  fontDisplay: string // CSS font-family string for title
  fontBody: string // CSS font-family string for body
}

export interface DeckOutput {
  startupName: string
  oneLiner: string
  elevatorPitch: string
  theme: DeckTheme
  slides: Slide[] // exactly 10 (Problem through Ask)
  pptxUrl: string
  slidesUrl: string
}

/* ────────────────────────── prompt ────────────────────────── */

const SECTIONS = [
  '01 / PROBLEM',
  '02 / SOLUTION',
  '03 / WHY NOW',
  '04 / MARKET',
  '05 / PRODUCT',
  '06 / BUSINESS MODEL',
  '07 / GO TO MARKET',
  '08 / COMPETITION',
  '09 / TRACTION',
  '10 / THE ASK',
] as const

const SYSTEM = `You are Deck, a senior pitch consultant writing a 10-slide pitch deck.

Given a startup idea + Scout brief + Atlas plan + Forge blueprint, return structured slide data
AND a theme that matches the *flavour* of the idea. Never default to black/neon-green. Pick a
palette that a real designer would pair with this specific idea (e.g. a health tech idea might get
warm clinical whites + deep teal; a crypto idea might get cool graphite + electric violet; a
consumer food idea might get cream + terracotta; a devtools idea might get graphite + amber).

Return ONLY valid JSON matching this EXACT shape:
{
  "startupName": string (one or two words — invent a real-feeling brand name),
  "oneLiner": string (one sentence pitch — under 18 words),
  "elevatorPitch": string (30-second pitch — 3-4 sentences),

  "theme": {
    "moodDescriptor": string (3-5 words describing the vibe, e.g. "warm humanist editorial"),
    "bgColor": string (hex, dark or light depending on mood — must give strong text contrast),
    "panelColor": string (hex, a surface one step off bgColor for cards),
    "inkColor": string (hex, primary text — readable against bgColor),
    "inkDimColor": string (hex, secondary text),
    "accentColor": string (hex, the brand accent — NOT #00FF41 unless the idea is truly cyberpunk),
    "accentSoftColor": string (hex, a softer tint of the accent),
    "fontDisplay": string (one of: "Helvetica", "Georgia", "Playfair Display", "Space Grotesk", "Inter", "DM Serif Display", "Work Sans"),
    "fontBody": string (one of: "Helvetica", "Inter", "Work Sans", "Source Sans Pro", "IBM Plex Sans", "Lora")
  },

  "slides": [
    {
      "number": number (1-10),
      "section": string (use exactly: "01 / PROBLEM", "02 / SOLUTION", "03 / WHY NOW", "04 / MARKET", "05 / PRODUCT", "06 / BUSINESS MODEL", "07 / GO TO MARKET", "08 / COMPETITION", "09 / TRACTION", "10 / THE ASK"),
      "title": string (UPPERCASE, max 4 words),
      "content": string[] (3-5 complete-sentence bullets, each max 16 words),
      "speakerNotes": string (2-3 sentences a presenter would actually say),
      "imageQuery": string (2-4 words — a concrete Pexels search term for an evocative photo for this slide; no brand names)
    }
  ] (exactly 10, in the section order above)
}

Hard rules:
- The 6 theme hex colors must render a deck a human designer would accept. Contrast > 4.5:1 between inkColor and bgColor. Accent must NOT collide with ink.
- ZERO spelling mistakes. Re-read every word.
- ZERO placeholder text. Every bullet is a real claim.
- Pull TAM/SAM/SOM from Atlas, real competitor names from Scout, real stack from Forge.
- Traction must be honest — if nothing yet, talk about validation signals + commitments.
- imageQuery must be a concrete NOUN phrase, not abstract ("hospital hallway" good, "healthcare" bad).`

/* ────────────────────────── helpers ────────────────────────── */

const STORAGE_DIR = path.join(process.cwd(), 'storage', 'decks')
const PUBLIC_BASE = process.env.STORAGE_PUBLIC_BASE || 'http://localhost:4000/storage/decks'

/** Strip leading '#' so pptxgenjs is happy. */
function hex(s: string): string {
  return (s || '').replace('#', '').trim() || '07090D'
}

/** Parse CSS font-family strings that may include quoted names. */
function ppFont(s: string): string {
  if (!s) return 'Helvetica'
  return s.replace(/['"]/g, '').split(',')[0].trim() || 'Helvetica'
}

interface DeckCopy {
  startupName: string
  oneLiner: string
  elevatorPitch: string
  theme: DeckTheme
  slides: Slide[]
}

async function generateDeckCopy(
  idea: string,
  scout: ScoutOutput | null,
  atlas: AtlasOutput,
  forge: ForgeOutput | null,
  dna?: DNA,
): Promise<DeckCopy> {
  const user = `Idea: "${idea}"${dna ? dnaContextBlock(dna) : ''}

Atlas plan:
${JSON.stringify(atlas, null, 2)}

${scout ? `Scout brief:\n${JSON.stringify(scout, null, 2)}` : '(Scout brief not available — work from Atlas + the idea.)'}

${forge ? `Forge blueprint (use the techStack and mvpFeatures for the PRODUCT slide):\n${JSON.stringify({ techStack: forge.techStack, mvpFeatures: forge.mvpFeatures, buildabilityScore: forge.buildabilityScore }, null, 2)}` : ''}

Write the full 10-slide pitch deck with a theme that matches the flavour of THIS idea.`

  return callAgentJSON<DeckCopy>('deck', SYSTEM + (dna ? dnaContextBlock(dna) : ''), user, {
    temperature: 0.4,
    maxTokens: 4000,
    timeoutMs: 90_000,
  })
}

/** Resolve one image URL per slide in parallel. Never throws. */
async function attachImages(slides: Slide[]): Promise<Slide[]> {
  const images = await Promise.all(
    slides.map(async (s) => {
      const q = (s.imageQuery || s.title || s.section).slice(0, 80)
      const img = await searchImage(q)
      return img
    }),
  )
  return slides.map((s, i) => {
    const img = images[i]
    if (!img) return s
    return {
      ...s,
      imageUrl: img.url,
      imageCredit: `Photo by ${img.photographer}`,
    }
  })
}

/* ────────────────────────── pptx render ────────────────────────── */

async function renderPptx(
  reportId: string,
  idea: string,
  copy: DeckCopy,
  atlas: AtlasOutput,
): Promise<string> {
  const theme = copy.theme
  const BG = hex(theme.bgColor)
  const PANEL = hex(theme.panelColor)
  const INK = hex(theme.inkColor)
  const INK_DIM = hex(theme.inkDimColor)
  const ACCENT = hex(theme.accentColor)
  const ACCENT_SOFT = hex(theme.accentSoftColor)
  const FONT_H = ppFont(theme.fontDisplay)
  const FONT_B = ppFont(theme.fontBody)

  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.title = copy.startupName || idea.slice(0, 80)
  pptx.author = 'AgentConnect'
  pptx.company = 'AgentConnect'

  /* Cover slide */
  const cover = pptx.addSlide()
  cover.background = { color: BG }
  cover.addShape('rect' as any, {
    x: 0, y: 7.0, w: 13.33, h: 0.5,
    fill: { color: ACCENT }, line: { color: ACCENT, width: 0 },
  })
  cover.addText(
    [{ text: `AGENTCONNECT · ${theme.moodDescriptor.toUpperCase()}`, options: { color: ACCENT, fontSize: 11, bold: true, fontFace: FONT_B } }],
    { x: 0.6, y: 0.5, w: 12, h: 0.4 },
  )
  cover.addText(
    [{ text: (copy.startupName || idea).toUpperCase(), options: { color: INK, fontSize: 60, bold: true, fontFace: FONT_H } }],
    { x: 0.6, y: 2.4, w: 12, h: 1.5, valign: 'top' },
  )
  cover.addText(
    [{ text: copy.oneLiner, options: { color: INK_DIM, fontSize: 22, fontFace: FONT_B } }],
    { x: 0.6, y: 4.3, w: 12, h: 1.5, valign: 'top' },
  )
  cover.addText(
    [{ text: `VALIDATION ${atlas.opportunityScore}/100  ·  TAM ${atlas.tam}`, options: { color: ACCENT, fontSize: 12, fontFace: FONT_B } }],
    { x: 0.6, y: 6.0, w: 12, h: 0.4 },
  )

  /* Content slides — left column text, right column image */
  for (const spec of copy.slides) {
    const s = pptx.addSlide()
    s.background = { color: BG }

    // Top accent bar
    s.addShape('rect' as any, {
      x: 0, y: 0, w: 13.33, h: 0.04,
      fill: { color: ACCENT }, line: { color: ACCENT, width: 0 },
    })

    // Section eyebrow
    s.addText(
      [{ text: spec.section, options: { color: ACCENT, fontSize: 11, bold: true, fontFace: FONT_B } }],
      { x: 0.6, y: 0.5, w: 12, h: 0.3 },
    )

    // Headline
    s.addText(
      [{ text: (spec.title || '').toUpperCase(), options: { color: INK, fontSize: 38, bold: true, fontFace: FONT_H } }],
      { x: 0.6, y: 1.0, w: 12, h: 1.5, valign: 'top' },
    )

    // Accent underline
    s.addShape('rect' as any, {
      x: 0.6, y: 2.5, w: 0.8, h: 0.04,
      fill: { color: ACCENT }, line: { color: ACCENT, width: 0 },
    })

    // Left column — bullets
    const bulletLines = (spec.content || []).map((b) => ({
      text: b,
      options: { color: INK, fontSize: 18, fontFace: FONT_B, bullet: { code: '25A0' } } as const,
      breakLine: true,
    }))
    s.addText(bulletLines as any, { x: 0.6, y: 3.0, w: 6.6, h: 3.6, valign: 'top', paraSpaceAfter: 12 })

    // Right column — image panel
    s.addShape('rect' as any, {
      x: 7.5, y: 1.0, w: 5.3, h: 5.6,
      fill: { color: PANEL }, line: { color: ACCENT_SOFT, width: 1 },
    })
    if (spec.imageUrl) {
      const buf = await fetchImageBuffer(spec.imageUrl)
      if (buf) {
        s.addImage({
          data: `data:image/jpeg;base64,${buf.toString('base64')}`,
          x: 7.5, y: 1.0, w: 5.3, h: 5.6,
          sizing: { type: 'cover', w: 5.3, h: 5.6 },
        })
      }
    }
    if (spec.imageCredit) {
      s.addText(
        [{ text: spec.imageCredit, options: { color: INK_DIM, fontSize: 8, italic: true, fontFace: FONT_B } }],
        { x: 7.5, y: 6.65, w: 5.3, h: 0.3 },
      )
    }

    // Footer
    s.addText(
      [{ text: spec.speakerNotes || '', options: { color: INK_DIM, fontSize: 10, italic: true, fontFace: FONT_B } }],
      { x: 0.6, y: 6.7, w: 6.8, h: 0.4, valign: 'top' },
    )
    s.addText(
      [{ text: `AGENTCONNECT // ${theme.moodDescriptor.toUpperCase()}`, options: { color: INK_DIM, fontSize: 9, fontFace: FONT_B } }],
      { x: 0.6, y: 7.05, w: 6, h: 0.3 },
    )
    s.addText(
      [{ text: `${spec.number} / 10`, options: { color: INK_DIM, fontSize: 9, fontFace: FONT_B, align: 'right' } }],
      { x: 11.3, y: 7.05, w: 1.5, h: 0.3 },
    )
  }

  const filePath = path.join(STORAGE_DIR, `${reportId}.pptx`)
  const buffer = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer
  await writeFile(filePath, buffer)
  return filePath
}

/* ────────────────────────── public entry ────────────────────────── */

export async function runDeck(
  reportId: string,
  idea: string,
  scout: ScoutOutput | null,
  atlas: AtlasOutput,
  forge: ForgeOutput | null,
  dna?: DNA,
): Promise<DeckOutput> {
  await mkdir(STORAGE_DIR, { recursive: true })

  const copy = await generateDeckCopy(idea, scout, atlas, forge, dna)

  // Ensure exactly 10 slides in canonical order — patch any drift from the model
  const canonical = copy.slides.slice(0, 10)
  if (canonical.length < 10) {
    for (let i = canonical.length; i < 10; i++) {
      canonical.push({
        number: i + 1,
        section: SECTIONS[i],
        title: SECTIONS[i].split('/')[1]?.trim() || `SLIDE ${i + 1}`,
        content: [],
        speakerNotes: '',
        imageQuery: idea.split(' ').slice(0, 3).join(' '),
      })
    }
  }

  // Fetch Pexels images (safe — returns original slide if Pexels key missing / fails)
  const withImages = await attachImages(canonical)
  copy.slides = withImages

  await renderPptx(reportId, idea, copy, atlas)

  return {
    startupName: copy.startupName,
    oneLiner: copy.oneLiner,
    elevatorPitch: copy.elevatorPitch,
    theme: copy.theme,
    slides: copy.slides,
    pptxUrl: `${PUBLIC_BASE}/${reportId}.pptx`,
    slidesUrl: `${PUBLIC_BASE}/${reportId}.pptx`,
  }
}
