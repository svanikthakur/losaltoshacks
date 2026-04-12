/**
 * Minimal Notion API wrapper.
 * Creates a page as a child of NOTION_TEMPLATE_PAGE_ID containing all
 * five agent outputs as structured blocks.
 *
 * Docs: https://developers.notion.com/reference/post-page
 */
import type { ScoutOutput } from '../agents/Scout.js'
import type { AtlasOutput } from '../agents/Atlas.js'
import type { ForgeOutput } from '../agents/Forge.js'
import type { DeckOutput } from '../agents/Deck.js'
import type { ConnectOutput } from '../agents/Connect.js'

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

function headers() {
  const token = process.env.NOTION_API_KEY
  if (!token) throw new Error('NOTION_API_KEY not set')
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'content-type': 'application/json',
  }
}

/* ─── block helpers ─── */
type Block = Record<string, unknown>
const text = (s: string) => [{ type: 'text', text: { content: s } }]
const h1 = (s: string): Block => ({ object: 'block', type: 'heading_1', heading_1: { rich_text: text(s) } })
const h2 = (s: string): Block => ({ object: 'block', type: 'heading_2', heading_2: { rich_text: text(s) } })
const h3 = (s: string): Block => ({ object: 'block', type: 'heading_3', heading_3: { rich_text: text(s) } })
const p = (s: string): Block => ({ object: 'block', type: 'paragraph', paragraph: { rich_text: text(s) } })
const bullet = (s: string): Block => ({
  object: 'block',
  type: 'bulleted_list_item',
  bulleted_list_item: { rich_text: text(s) },
})
const divider = (): Block => ({ object: 'block', type: 'divider', divider: {} })
const callout = (s: string, emoji = '⚡'): Block => ({
  object: 'block',
  type: 'callout',
  callout: { rich_text: text(s), icon: { type: 'emoji', emoji } },
})
const quote = (s: string): Block => ({
  object: 'block',
  type: 'quote',
  quote: { rich_text: text(s) },
})

export interface ReportPageInput {
  idea: string
  validationScore: number
  scout: ScoutOutput
  atlas: AtlasOutput
  forge: ForgeOutput
  deck: DeckOutput
  connect: ConnectOutput
}

/** Build the blocks for a single dispatch page. */
function buildBlocks(r: ReportPageInput): Block[] {
  const blocks: Block[] = []

  blocks.push(
    callout(
      `Validation ${r.validationScore}/10 · Opportunity ${r.atlas.opportunityScore}/100 · Demand ${r.scout.demandLevel}`,
      '📊',
    ),
  )
  blocks.push(p(r.idea))
  blocks.push(divider())

  /* Scout */
  blocks.push(h2('01 · Scout — Market intelligence'))
  blocks.push(p(r.scout.summary || ''))
  if (r.scout.competitors?.length) {
    blocks.push(h3('Competitors'))
    for (const c of r.scout.competitors.slice(0, 8)) {
      blocks.push(bullet(`${c.name} (${c.stage}) — weakness: ${c.weakness}${c.funding ? ' · ' + c.funding : ''}`))
    }
  }
  if (r.scout.differentiationAngles?.length) {
    blocks.push(h3('Differentiation angles'))
    for (const a of r.scout.differentiationAngles) blocks.push(bullet(a))
  }
  if (r.scout.marketSignals?.length) {
    blocks.push(h3('Market signals'))
    for (const s of r.scout.marketSignals) blocks.push(bullet(`[${s.source}] ${s.signal}`))
  }
  blocks.push(divider())

  /* Atlas */
  blocks.push(h2('02 · Atlas — Market sizing + opportunity'))
  blocks.push(p(r.atlas.summary || ''))
  blocks.push(bullet(`TAM: ${r.atlas.tam}`))
  blocks.push(bullet(`SAM: ${r.atlas.sam}`))
  blocks.push(bullet(`SOM: ${r.atlas.som}`))
  blocks.push(bullet(`Launch region: ${r.atlas.launchRegion}`))
  if (r.atlas.tailwinds?.length) {
    blocks.push(h3('Tailwinds'))
    for (const t of r.atlas.tailwinds) blocks.push(bullet(t))
  }
  if (r.atlas.headwinds?.length) {
    blocks.push(h3('Headwinds'))
    for (const t of r.atlas.headwinds) blocks.push(bullet(t))
  }
  blocks.push(divider())

  /* Forge */
  blocks.push(h2('03 · Forge — Technical blueprint'))
  if (r.forge.repoUrl) blocks.push(p(`Repository: ${r.forge.repoUrl}`))
  if (r.forge.zipUrl) blocks.push(p(`Scaffold: ${r.forge.zipUrl}`))
  blocks.push(h3('Tech stack'))
  for (const t of r.forge.techStack) blocks.push(bullet(`${t.layer}: ${t.technology} — ${t.justification}`))
  blocks.push(h3('MVP features'))
  for (const f of r.forge.mvpFeatures) blocks.push(bullet(`${f.name} (${f.complexity}, ~${f.estimateDays}d)`))
  blocks.push(divider())

  /* Deck */
  blocks.push(h2('04 · Deck — Pitch deck'))
  if (r.deck.oneLiner) blocks.push(quote(r.deck.oneLiner))
  blocks.push(p(`PPTX: ${r.deck.pptxUrl}`))
  blocks.push(h3('Slides'))
  for (const s of r.deck.slides) blocks.push(bullet(`${s.section} — ${s.title}`))
  blocks.push(divider())

  /* Connect */
  blocks.push(h2('05 · Connect — Investor outreach'))
  blocks.push(bullet(`Investor readiness: ${r.connect.investorReadinessScore}/100`))
  blocks.push(bullet(`Fundraising: ${r.connect.fundraisingStrategy.amount} at ${r.connect.fundraisingStrategy.valuationRange}`))
  for (const inv of r.connect.topVCs) {
    blocks.push(bullet(`${inv.name} — ${inv.firm} — ${inv.compatibilityScore}% fit`))
  }
  blocks.push(divider())

  blocks.push(callout('Generated by Venture AI', '🤖'))
  return blocks
}

/**
 * Create a Notion page as a child of the template page.
 * Notion caps page-create at 100 children blocks per request, so we
 * create the page with the first 100 then append the rest in batches
 * of 100 via the block-children endpoint.
 *
 * Returns the Notion page URL.
 */
export async function createReportPage(input: ReportPageInput): Promise<string> {
  const parentId = process.env.NOTION_TEMPLATE_PAGE_ID
  if (!parentId) throw new Error('NOTION_TEMPLATE_PAGE_ID not set')

  const title = `${input.idea.slice(0, 80)} — ${input.validationScore}/10`
  const allBlocks = buildBlocks(input)
  const first = allBlocks.slice(0, 100)
  const rest = allBlocks.slice(100)

  const body = {
    parent: { type: 'page_id', page_id: parentId },
    properties: {
      title: {
        title: text(title),
      },
    },
    children: first,
  }

  const createRes = await fetch(`${NOTION_API}/pages`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })

  if (!createRes.ok) {
    const txt = await createRes.text()
    throw new Error(`notion ${createRes.status}: ${txt.slice(0, 300)}`)
  }

  const json = (await createRes.json()) as any
  const pageId = json.id as string

  // Append remaining blocks in batches of 100
  for (let i = 0; i < rest.length; i += 100) {
    const batch = rest.slice(i, i + 100)
    const appendRes = await fetch(`${NOTION_API}/blocks/${pageId}/children`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ children: batch }),
    })
    if (!appendRes.ok) {
      const txt = await appendRes.text()
      console.warn(`[notion] append batch failed: ${appendRes.status} ${txt.slice(0, 200)}`)
      // Don't fail the whole export for a partial append
      break
    }
  }

  return json.url as string
}
