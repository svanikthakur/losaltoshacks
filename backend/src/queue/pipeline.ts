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
import { createReportPage } from '../services/notion.js'

/** Main pipeline body — agnostic to how it's scheduled. */
async function executePipeline(reportId: string): Promise<void> {
  const report = await db.getReport(reportId)
  if (!report) {
    console.warn(`[pipeline ${reportId.slice(0, 8)}] no report row — aborting`)
    return
  }

  const short = reportId.slice(0, 8)
  const log = (agent: string, msg: string) => broadcast(reportId, { type: 'log', agent, msg })
  const status = (agent: string, s: 'running' | 'complete' | 'error', output?: unknown) =>
    broadcast(reportId, { type: 'status', agent, status: s, output })
  const stage = (label: string) => {
    const ts = new Date().toISOString().slice(11, 19)
    console.log(`[pipeline ${short}] ${ts}  ${label}`)
  }

  const pipelineStart = Date.now()
  stage(`▶ START · "${report.ideaText.slice(0, 72)}${report.ideaText.length > 72 ? '…' : ''}"`)

  try {
    await db.updateReport(reportId, { status: 'running' })

    /* ───── SCOUT ───── */
    stage('Scout running…')
    status('scout', 'running')
    log('scout', 'Querying Serper + trends…')
    const t0 = Date.now()
    const scoutOut = await runScout(report.ideaText)
    await db.updateReport(reportId, { scout_output: scoutOut })
    status('scout', 'complete', scoutOut)
    stage(`Scout complete (${Date.now() - t0}ms) · demand=${(scoutOut as any).demandSignal}/${(scoutOut as any).demandScore}`)

    /* ───── ATLAS ───── */
    stage('Atlas running…')
    status('atlas', 'running')
    log('atlas', 'Sizing market…')
    const t1 = Date.now()
    const atlasOut = await runAtlas(report.ideaText, scoutOut)
    await db.updateReport(reportId, {
      atlas_output: atlasOut,
      validationScore: atlasOut.validationScore,
    })
    await db.insertScoreHistory(reportId, atlasOut.validationScore)
    status('atlas', 'complete', atlasOut)
    stage(`Atlas complete (${Date.now() - t1}ms) · score=${atlasOut.validationScore}/10 · TAM=${atlasOut.tam}`)

    /* ───── FORGE (stub) ───── */
    stage('Forge running…')
    status('forge', 'running')
    log('forge', 'Scaffolding MVP…')
    const forgeOut = await runForge(report.ideaText, atlasOut)
    await db.updateReport(reportId, { forge_output: forgeOut, github_repo_url: forgeOut.repoUrl })
    status('forge', 'complete', forgeOut)
    stage(`Forge complete · ${forgeOut.repoUrl}`)

    /* ───── DECK (stub) ───── */
    stage('Deck running…')
    status('deck', 'running')
    log('deck', 'Drafting pitch deck…')
    const deckOut = await runDeck(reportId, report.ideaText, scoutOut, atlasOut)
    await db.updateReport(reportId, { deck_output: deckOut, pitch_deck_url: deckOut.pptxUrl, deck_url: deckOut.slidesUrl })
    status('deck', 'complete', deckOut)
    stage(`Deck complete · ${deckOut.slides.length} slides`)

    /* ───── CONNECT (stub) ───── */
    stage('Connect running…')
    status('connect', 'running')
    log('connect', 'Ranking investors…')
    const connectOut = await runConnect(reportId, report.ideaText, atlasOut)
    await db.updateReport(reportId, { connect_output: connectOut, investor_sheet_url: connectOut.sheetsUrl })
    status('connect', 'complete', connectOut)
    stage(`Connect complete · ${connectOut.investors.length} funds ranked`)

    /* ───── NOTION EXPORT (optional, runs if key is set) ───── */
    let notionUrl: string | undefined
    if (process.env.NOTION_API_KEY && process.env.NOTION_TEMPLATE_PAGE_ID) {
      try {
        stage('Notion export running…')
        log('notion', 'Filing dispatch to Notion…')
        notionUrl = await createReportPage({
          idea: report.ideaText,
          validationScore: atlasOut.validationScore,
          scout: scoutOut,
          atlas: atlasOut,
          forge: forgeOut,
          deck: deckOut,
          connect: connectOut,
        })
        await db.updateReport(reportId, { notion_url: notionUrl })
        stage(`Notion export complete · ${notionUrl}`)
      } catch (err) {
        console.warn(`[pipeline ${short}] Notion export failed: ${(err as Error).message}`)
      }
    }

    await db.updateReport(reportId, {
      status: 'complete',
      pdf_report_url: `https://storage.agentconnect.dev/reports/${reportId}.pdf`,
    })
    broadcast(reportId, { type: 'complete' })
    stage(`✓ PIPELINE COMPLETE · total ${Date.now() - pipelineStart}ms`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'pipeline failed'
    console.error(`[pipeline ${short}] ✗ FAILED: ${msg}`)
    await db.updateReport(reportId, { status: 'failed' })
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
