import { db } from '../db/store.js'
import { hub } from '../ws/hub.js'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Each agent emits status + logs + final output.
// Currently stubbed with plausible mock data. Swap bodies for real Gemini / API calls
// without touching routing or WS plumbing.

async function runScout(reportId: string, idea: string) {
  hub.emit(reportId, { type: 'status', agent: 'scout', status: 'running' })
  hub.emit(reportId, { type: 'log', agent: 'scout', msg: 'Querying Google Trends…' })
  await sleep(600)
  hub.emit(reportId, { type: 'log', agent: 'scout', msg: 'Pulling ProductHunt launches…' })
  await sleep(600)
  hub.emit(reportId, { type: 'log', agent: 'scout', msg: 'Scanning Y Combinator directory…' })
  await sleep(600)
  hub.emit(reportId, { type: 'log', agent: 'scout', msg: 'Synthesizing demand signal with Gemini…' })
  await sleep(700)

  const output = {
    demandScore: 7 + Math.floor(Math.random() * 3),
    painPoints: ['Manual workflows', 'Data silos', 'Long onboarding', 'Poor retention'],
    sources: ['trends.google.com', 'producthunt.com', 'ycombinator.com'],
    quotes: [
      '"I spend 4 hours a week on this. I\'d pay $50/mo to automate it." — r/startups',
      '"No good tool exists for this today." — HN thread',
    ],
  }
  db.updateReport(reportId, { scout_output: output })
  hub.emit(reportId, { type: 'status', agent: 'scout', status: 'complete', output })
  return output
}

async function runAtlas(reportId: string, idea: string, scout: any) {
  hub.emit(reportId, { type: 'status', agent: 'atlas', status: 'running' })
  hub.emit(reportId, { type: 'log', agent: 'atlas', msg: 'Sizing market with Gemini…' })
  await sleep(700)
  hub.emit(reportId, { type: 'log', agent: 'atlas', msg: 'Scraping competitor landing pages…' })
  await sleep(800)
  hub.emit(reportId, { type: 'log', agent: 'atlas', msg: 'Building ICP profile…' })
  await sleep(500)

  const output = {
    tam: '$12.4B',
    sam: '$2.1B',
    som: '$84M',
    icp: 'Mid-market SaaS teams (50–500 employees) in NA & EU',
    competitors: [
      { name: 'Competitor A', weakness: 'No AI features' },
      { name: 'Competitor B', weakness: 'Enterprise-only pricing' },
    ],
    gtm: 'Product-led bottom-up with free tier + paid team plans',
    pivots: ['Vertical play in healthcare', 'Chrome extension first', 'Agency tool instead of end-user'],
  }
  db.updateReport(reportId, { atlas_output: output })
  hub.emit(reportId, { type: 'status', agent: 'atlas', status: 'complete', output })
  return output
}

async function runForge(reportId: string, idea: string) {
  hub.emit(reportId, { type: 'status', agent: 'forge', status: 'running' })
  hub.emit(reportId, { type: 'log', agent: 'forge', msg: 'Choosing tech stack with Gemini…' })
  await sleep(600)
  hub.emit(reportId, { type: 'log', agent: 'forge', msg: 'Generating scaffold files…' })
  await sleep(700)
  hub.emit(reportId, { type: 'log', agent: 'forge', msg: 'Creating GitHub repository…' })
  await sleep(700)

  const slug = idea
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 32)
  const output = {
    repoUrl: `https://github.com/venture-ai-demo/${slug || 'mvp'}`,
    techStack: ['Next.js', 'tRPC', 'Postgres', 'Vercel'],
    components: ['Auth', 'Dashboard', 'API layer', 'DB schema', 'Landing page'],
  }
  db.updateReport(reportId, { forge_output: output, github_repo_url: output.repoUrl })
  hub.emit(reportId, { type: 'status', agent: 'forge', status: 'complete', output })
  return output
}

async function runDeck(reportId: string, idea: string) {
  hub.emit(reportId, { type: 'status', agent: 'deck', status: 'running' })
  hub.emit(reportId, { type: 'log', agent: 'deck', msg: 'Drafting slides in Sequoia format…' })
  await sleep(700)
  hub.emit(reportId, { type: 'log', agent: 'deck', msg: 'Calling Google Slides API…' })
  await sleep(800)

  const output = {
    slides: [
      'Company purpose',
      'Problem',
      'Solution',
      'Why now',
      'Market size',
      'Competition',
      'Product',
      'Business model',
      'Team',
      'Financials',
      'Ask',
      'Vision',
    ],
    pptxUrl: `https://storage.venture-ai.dev/decks/${reportId}.pptx`,
    slidesUrl: `https://docs.google.com/presentation/d/${reportId}`,
  }
  db.updateReport(reportId, { deck_output: output, pitch_deck_url: output.pptxUrl })
  hub.emit(reportId, { type: 'status', agent: 'deck', status: 'complete', output })
  return output
}

async function runConnect(reportId: string, idea: string) {
  hub.emit(reportId, { type: 'status', agent: 'connect', status: 'running' })
  hub.emit(reportId, { type: 'log', agent: 'connect', msg: 'Matching investor theses…' })
  await sleep(700)
  hub.emit(reportId, { type: 'log', agent: 'connect', msg: 'Ranking fund fit…' })
  await sleep(600)
  hub.emit(reportId, { type: 'log', agent: 'connect', msg: 'Exporting Google Sheet…' })
  await sleep(500)

  const output = {
    investors: [
      { name: 'Sequoia Capital', thesis: 'Seed / AI', fit: 0.92 },
      { name: 'Accel', thesis: 'SaaS / PLG', fit: 0.88 },
      { name: 'Y Combinator', thesis: 'Pre-seed', fit: 0.95 },
      { name: 'Initialized', thesis: 'Developer tools', fit: 0.84 },
    ],
    sheetsUrl: `https://docs.google.com/spreadsheets/d/${reportId}`,
  }
  db.updateReport(reportId, { connect_output: output, investor_sheet_url: output.sheetsUrl })
  hub.emit(reportId, { type: 'status', agent: 'connect', status: 'complete', output })
  return output
}

export async function runPipeline(reportId: string) {
  const report = db.getReport(reportId)
  if (!report) return
  try {
    db.updateReport(reportId, { status: 'processing' })
    const scout = await runScout(reportId, report.idea)
    const atlas = await runAtlas(reportId, report.idea, scout)
    await runForge(reportId, report.idea)
    await runDeck(reportId, report.idea)
    await runConnect(reportId, report.idea)

    db.updateReport(reportId, {
      status: 'complete',
      validation_score: scout.demandScore,
      pdf_report_url: `https://storage.venture-ai.dev/reports/${reportId}.pdf`,
    })
    hub.emit(reportId, { type: 'complete' })
  } catch (err: any) {
    db.updateReport(reportId, { status: 'error' })
    hub.emit(reportId, { type: 'error', msg: err?.message || 'pipeline failed' })
  }
}
