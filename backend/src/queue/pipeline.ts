/**
 * Pipeline runner. Runs the five agents in sequence and streams status over WebSocket.
 *
 * - Uses BullMQ when REDIS_URL is set.
 * - Falls back to in-process fire-and-forget otherwise (Phase 1 default).
 */
import { db } from '../db/index.js'
import { broadcast } from '../websocket.js'
import { runScout } from '../agents/Scout.js'
import { runAtlas } from '../agents/Atlas.js'
import { runForge } from '../agents/Forge.js'
import { runDeck } from '../agents/Deck.js'
import { runConnect } from '../agents/Connect.js'

/** Main pipeline body — agnostic to how it's scheduled. */
async function executePipeline(reportId: string): Promise<void> {
  const report = db.getReport(reportId)
  if (!report) return

  const log = (agent: string, msg: string) => broadcast(reportId, { type: 'log', agent, msg })
  const status = (agent: string, s: 'running' | 'complete' | 'error', output?: unknown) =>
    broadcast(reportId, { type: 'status', agent, status: s, output })

  try {
    db.updateReport(reportId, { status: 'running' })

    /* ───── SCOUT ───── */
    status('scout', 'running')
    log('scout', 'Querying Serper + trends…')
    const scoutOut = await runScout(report.ideaText)
    db.updateReport(reportId, { scout_output: scoutOut })
    status('scout', 'complete', scoutOut)

    /* ───── ATLAS ───── */
    status('atlas', 'running')
    log('atlas', 'Sizing market…')
    const atlasOut = await runAtlas(report.ideaText, scoutOut)
    db.updateReport(reportId, {
      atlas_output: atlasOut,
      validationScore: atlasOut.validationScore,
    })
    db.insertScoreHistory(reportId, atlasOut.validationScore)
    status('atlas', 'complete', atlasOut)

    /* ───── FORGE (stub) ───── */
    status('forge', 'running')
    log('forge', 'Scaffolding MVP…')
    const forgeOut = await runForge(report.ideaText, atlasOut)
    db.updateReport(reportId, { forge_output: forgeOut, github_repo_url: forgeOut.repoUrl })
    status('forge', 'complete', forgeOut)

    /* ───── DECK (stub) ───── */
    status('deck', 'running')
    log('deck', 'Drafting pitch deck…')
    const deckOut = await runDeck(reportId, report.ideaText, scoutOut, atlasOut)
    db.updateReport(reportId, { deck_output: deckOut, pitch_deck_url: deckOut.pptxUrl, deck_url: deckOut.slidesUrl })
    status('deck', 'complete', deckOut)

    /* ───── CONNECT (stub) ───── */
    status('connect', 'running')
    log('connect', 'Ranking investors…')
    const connectOut = await runConnect(reportId, report.ideaText, atlasOut)
    db.updateReport(reportId, { connect_output: connectOut, investor_sheet_url: connectOut.sheetsUrl })
    status('connect', 'complete', connectOut)

    db.updateReport(reportId, {
      status: 'complete',
      pdf_report_url: `https://storage.agentconnect.dev/reports/${reportId}.pdf`,
    })
    broadcast(reportId, { type: 'complete' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'pipeline failed'
    console.error('[pipeline] error:', msg)
    db.updateReport(reportId, { status: 'failed' })
    broadcast(reportId, { type: 'error', msg })
  }
}

/**
 * Schedule a run. BullMQ when Redis is configured, otherwise fire-and-forget.
 * The delay lets the client open its WebSocket before events fire.
 */
export function schedulePipeline(reportId: string) {
  const hasRedis = !!process.env.REDIS_URL
  if (hasRedis) {
    // TODO: real BullMQ queue. For now Phase 1 uses the in-process path even if Redis is set.
    setTimeout(() => executePipeline(reportId), 400)
    return
  }
  setTimeout(() => executePipeline(reportId), 400)
}
