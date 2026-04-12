/**
 * Pipeline runner.
 *
 * Flow:
 *   [Scout || Atlas]   ← Promise.all, both in parallel
 *        ↓
 *      Forge           ← waits for both
 *        ↓
 *      Deck            ← waits for Forge
 *        ↓
 *      Connect         ← waits for Deck
 *
 * Every agent runs through runAgentWithTimeout() with a soft 15s cap.
 * If an agent times out, the pipeline keeps moving with a partial flag and
 * the original promise continues in the background — when it eventually
 * settles, the late-arrival hook patches the DB and broadcasts the update.
 *
 * Cache: exact key + Jaccard fuzzy match (≥0.85) skip the OpenAI calls
 * entirely and replay the previous run.
 */
import { db } from '../db/index.js'
import { broadcast } from '../websocket.js'
import { runScout, type ScoutOutput } from '../agents/Scout.js'
import { runAtlas, type AtlasOutput } from '../agents/Atlas.js'
import { runForge, type ForgeOutput } from '../agents/Forge.js'
import { runDeck, type DeckOutput } from '../agents/Deck.js'
import { runConnect, type ConnectOutput } from '../agents/Connect.js'
import { runPivot, type PivotOutput } from '../agents/Pivot.js'
import { createReportPage } from '../services/notion.js'
import { cacheKey, getCached, setCached, findFuzzyMatch } from '../services/cache.js'
import { dnaFromFounder, dnaSignature } from '../services/dnaContext.js'
import { runAgentWithTimeout, dataOrNull, type AgentResult } from '../services/orchestrator.js'

/* ============================================================
   Helpers
   ============================================================ */

async function executePipeline(reportId: string): Promise<void> {
  const report = await db.getReport(reportId)
  if (!report) return

  const short = reportId.slice(0, 8)
  const log = (agent: string, msg: string) => broadcast(reportId, { type: 'log', agent, msg })
  const status = (
    agent: string,
    s: 'running' | 'complete' | 'error' | 'partial',
    output?: unknown,
  ) => broadcast(reportId, { type: 'status', agent, status: s, output })
  const stage = (label: string) => {
    const ts = new Date().toISOString().slice(11, 19)
    console.log(`[pipeline ${short}] ${ts}  ${label}`)
  }
  const tokenBroadcast = (agent: string) => (delta: string) =>
    broadcast(reportId, { type: 'token', agent, delta })

  const pipelineStart = Date.now()
  stage(`▶ START · "${report.ideaText.slice(0, 72)}${report.ideaText.length > 72 ? '…' : ''}"`)

  // Pull operator DNA + cache key
  const founder = await db.getFounder(report.founderId)
  const dna = dnaFromFounder(founder)
  const sig = dnaSignature(dna)
  const ckey = cacheKey(report.ideaText, sig)

  // Cache lookup — exact, then fuzzy
  const cached = getCached(ckey) || findFuzzyMatch(report.ideaText, sig)
  if (cached) {
    stage('CACHE HIT — replaying previous run')
    await db.updateReport(reportId, {
      status: 'running',
      scout_output: cached.scout,
      atlas_output: cached.atlas,
      forge_output: cached.forge,
      deck_output: cached.deck,
      connect_output: cached.connect,
      validationScore: cached.validationScore,
    })
    status('scout', 'complete', cached.scout)
    status('atlas', 'complete', cached.atlas)
    status('forge', 'complete', cached.forge)
    status('deck', 'complete', cached.deck)
    status('connect', 'complete', cached.connect)
    await db.updateReport(reportId, { status: 'complete' })
    broadcast(reportId, { type: 'complete' })
    stage(`✓ PIPELINE COMPLETE (cached) · total ${Date.now() - pipelineStart}ms`)
    return
  }

  try {
    await db.updateReport(reportId, { status: 'running' })

    /* ───── SCOUT || ATLAS in PARALLEL ───── */
    stage('Scout + Atlas running in parallel…')
    status('scout', 'running')
    status('atlas', 'running')
    log('scout', 'Querying Serper + synthesising brief…')
    log('atlas', 'Sizing market + mapping opportunity…')

    const tParallel = Date.now()
    const [scoutResult, atlasResult] = await Promise.all([
      runAgentWithTimeout<ScoutOutput>({
        name: 'scout',
        // Scout fans out to Serper + Trends + Solana + PH + YC + LLM — gets 30s
        timeoutMs: 30_000,
        fn: () => runScout(report.ideaText, dna, report.founderId),
        onLate: async (data) => {
          await db.updateReport(reportId, { scout_output: data })
          status('scout', 'complete', data)
        },
      }),
      runAgentWithTimeout<AtlasOutput>({
        name: 'atlas',
        timeoutMs: 30_000,
        fn: () => runAtlas(report.ideaText, dna),
        onLate: async (data) => {
          await db.updateReport(reportId, {
            atlas_output: data,
            validationScore: Math.round(data.opportunityScore / 10),
          })
          await db.insertScoreHistory(reportId, Math.round(data.opportunityScore / 10))
          status('atlas', 'complete', data)
        },
      }),
    ])

    const scoutOut = dataOrNull(scoutResult)
    const atlasOut = dataOrNull(atlasResult)

    if (scoutOut) {
      await db.updateReport(reportId, { scout_output: scoutOut })
      status('scout', 'complete', scoutOut)
    } else {
      status('scout', 'partial', { error: scoutResult.ok ? '' : scoutResult.error })
      log('scout', '⚠ partial result — retrying in background')
    }

    if (atlasOut) {
      const score = Math.round(atlasOut.opportunityScore / 10)
      await db.updateReport(reportId, { atlas_output: atlasOut, validationScore: score })
      await db.insertScoreHistory(reportId, score)
      status('atlas', 'complete', atlasOut)

      // AUTO-PIVOT: if opportunity is weak, quietly kick off the Pivot engine
      // in the background so the dashboard has 5 alternatives ready when the
      // user lands on it. Fire-and-forget — never blocks the main pipeline.
      if (atlasOut.opportunityScore < 50 && scoutOut) {
        stage(`Opportunity ${atlasOut.opportunityScore}/100 < 50 — auto-pivot engaged`)
        status('pivot', 'running')
        runPivot(report.ideaText, scoutOut, atlasOut, dna)
          .then(async (pivotOut: PivotOutput) => {
            await db.updateReport(reportId, { pivot_output: pivotOut })
            broadcast(reportId, { type: 'status', agent: 'pivot', status: 'complete', output: pivotOut })
            stage(`Auto-pivot complete (${pivotOut.pivots?.length || 0} directions)`)
          })
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : 'pivot failed'
            console.warn(`[pipeline ${short}] auto-pivot failed: ${msg}`)
            broadcast(reportId, { type: 'status', agent: 'pivot', status: 'error', output: { error: msg } })
          })
      }
    } else {
      status('atlas', 'partial', { error: atlasResult.ok ? '' : atlasResult.error })
      log('atlas', '⚠ partial result — retrying in background')
    }

    stage(`Scout + Atlas finished (${Date.now() - tParallel}ms)`)

    // Forge needs Atlas at minimum. If Atlas timed out, we cannot continue.
    if (!atlasOut) {
      stage('✗ ABORTING — Atlas required for downstream agents')
      throw new Error('Atlas timed out — pipeline cannot continue without market sizing')
    }

    /* ───── FORGE (waits for Scout + Atlas) ───── */
    stage('Forge running…')
    status('forge', 'running')
    log('forge', 'Generating technical blueprint…')
    const tForge = Date.now()
    const forgeResult = await runAgentWithTimeout<ForgeOutput>({
      name: 'forge',
      // Blueprint LLM call + GitHub API commits OR JSZip → needs ~45s
      timeoutMs: 60_000,
      fn: () => runForge(report.ideaText, scoutOut, atlasOut, dna),
      onLate: async (data) => {
        await db.updateReport(reportId, {
          forge_output: data,
          github_repo_url: data.repoUrl ?? undefined,
        })
        status('forge', 'complete', data)
      },
    })
    const forgeOut = dataOrNull(forgeResult)
    if (forgeOut) {
      await db.updateReport(reportId, {
        forge_output: forgeOut,
        github_repo_url: forgeOut.repoUrl ?? undefined,
      })
      status('forge', 'complete', forgeOut)
      stage(`Forge complete (${Date.now() - tForge}ms)`)
    } else {
      status('forge', 'partial', { error: forgeResult.ok ? '' : forgeResult.error })
      log('forge', '⚠ partial result — retrying in background')
    }

    /* ───── DECK (waits for Forge) ───── */
    stage('Deck running…')
    status('deck', 'running')
    log('deck', 'Drafting 10-slide pitch deck…')
    const tDeck = Date.now()
    const deckResult = await runAgentWithTimeout<DeckOutput>({
      name: 'deck',
      // Deck = LLM copy + 10 Pexels fetches + buffer download + pptx render
      timeoutMs: 90_000,
      fn: () => runDeck(reportId, report.ideaText, scoutOut, atlasOut, forgeOut, dna),
      onLate: async (data) => {
        await db.updateReport(reportId, {
          deck_output: data,
          pitch_deck_url: data.pptxUrl,
          deck_url: data.slidesUrl,
        })
        status('deck', 'complete', data)
      },
    })
    const deckOut = dataOrNull(deckResult)
    if (deckOut) {
      await db.updateReport(reportId, {
        deck_output: deckOut,
        pitch_deck_url: deckOut.pptxUrl,
        deck_url: deckOut.slidesUrl,
      })
      status('deck', 'complete', deckOut)
      stage(`Deck complete (${Date.now() - tDeck}ms)`)
    } else {
      status('deck', 'partial', { error: deckResult.ok ? '' : deckResult.error })
      log('deck', '⚠ partial result — retrying in background')
    }

    /* ───── CONNECT (waits for Deck) ───── */
    stage('Connect running…')
    status('connect', 'running')
    log('connect', 'Matching VCs + drafting outreach…')
    const tConnect = Date.now()
    const connectResult = await runAgentWithTimeout<ConnectOutput>({
      name: 'connect',
      // Connect = tag call + full-shot call that writes 10 personalized emails
      // + readiness + accelerators + strategy. Needs the biggest budget.
      timeoutMs: 90_000,
      fn: () => runConnect(reportId, report.ideaText, atlasOut, scoutOut, dna),
      onLate: async (data) => {
        await db.updateReport(reportId, {
          connect_output: data,
          investor_sheet_url: '',
        })
        status('connect', 'complete', data)
      },
    })
    const connectOut = dataOrNull(connectResult)
    if (connectOut) {
      await db.updateReport(reportId, {
        connect_output: connectOut,
        investor_sheet_url: '',
      })
      status('connect', 'complete', connectOut)
      stage(`Connect complete (${Date.now() - tConnect}ms)`)
    } else {
      status('connect', 'partial', { error: connectResult.ok ? '' : connectResult.error })
      log('connect', '⚠ partial result — retrying in background')
    }

    // Cache the run if everything resolved
    if (scoutOut && atlasOut && forgeOut && deckOut && connectOut) {
      setCached(ckey, report.ideaText, sig, {
        scout: scoutOut,
        atlas: atlasOut,
        forge: forgeOut,
        deck: deckOut,
        connect: connectOut,
        validationScore: Math.round(atlasOut.opportunityScore / 10),
      })
    }

    /* ───── NOTION EXPORT (if key set) ───── */
    if (process.env.NOTION_API_KEY && process.env.NOTION_TEMPLATE_PAGE_ID && scoutOut && forgeOut && deckOut && connectOut) {
      try {
        stage('Notion export running…')
        log('notion', 'Filing dispatch to Notion…')
        const notionUrl = await createReportPage({
          idea: report.ideaText,
          validationScore: Math.round(atlasOut.opportunityScore / 10),
          scout: scoutOut as any,
          atlas: atlasOut as any,
          forge: forgeOut as any,
          deck: deckOut as any,
          connect: connectOut as any,
        })
        await db.updateReport(reportId, { notion_url: notionUrl })
        stage(`Notion export complete · ${notionUrl}`)
      } catch (err) {
        console.warn(`[pipeline ${short}] Notion export failed: ${(err as Error).message}`)
      }
    }

    await db.updateReport(reportId, {
      status: 'complete',
      pdf_report_url: `${process.env.STORAGE_PUBLIC_BASE || 'http://localhost:4000/storage'}/reports/${reportId}.pdf`,
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

export function schedulePipeline(reportId: string) {
  // 400ms delay so the client has time to open its WebSocket
  setTimeout(() => executePipeline(reportId), 400)
}

/* ============================================================
   Single-agent regeneration — reruns one agent using whatever
   upstream outputs already exist on the report, then patches
   the DB and broadcasts status updates.
   ============================================================ */

export type AgentName = 'scout' | 'atlas' | 'forge' | 'deck' | 'connect'

async function executeSingleAgent(reportId: string, agent: AgentName): Promise<void> {
  const report = await db.getReport(reportId)
  if (!report) return

  const founder = await db.getFounder(report.founderId)
  const dna = dnaFromFounder(founder)
  const status = (s: 'running' | 'complete' | 'error', output?: unknown) =>
    broadcast(reportId, { type: 'status', agent, status: s, output })

  try {
    status('running')
    if (agent === 'scout') {
      const out = await runScout(report.ideaText, dna, report.founderId)
      await db.updateReport(reportId, { scout_output: out })
      status('complete', out)
    } else if (agent === 'atlas') {
      const out = await runAtlas(report.ideaText, dna)
      const score = Math.round(out.opportunityScore / 10)
      await db.updateReport(reportId, { atlas_output: out, validationScore: score })
      await db.insertScoreHistory(reportId, score)
      status('complete', out)
    } else if (agent === 'forge') {
      if (!report.atlas_output) throw new Error('Atlas output required before Forge')
      const out = await runForge(
        report.ideaText,
        (report.scout_output ?? null) as ScoutOutput | null,
        report.atlas_output as AtlasOutput,
        dna,
      )
      await db.updateReport(reportId, {
        forge_output: out,
        github_repo_url: out.repoUrl ?? undefined,
      })
      status('complete', out)
    } else if (agent === 'deck') {
      if (!report.atlas_output) throw new Error('Atlas output required before Deck')
      const out = await runDeck(
        reportId,
        report.ideaText,
        (report.scout_output ?? null) as ScoutOutput | null,
        report.atlas_output as AtlasOutput,
        (report.forge_output ?? null) as ForgeOutput | null,
        dna,
      )
      await db.updateReport(reportId, {
        deck_output: out,
        pitch_deck_url: out.pptxUrl,
        deck_url: out.slidesUrl,
      })
      status('complete', out)
    } else if (agent === 'connect') {
      if (!report.atlas_output) throw new Error('Atlas output required before Connect')
      const out = await runConnect(
        reportId,
        report.ideaText,
        report.atlas_output as AtlasOutput,
        (report.scout_output ?? null) as ScoutOutput | null,
        dna,
      )
      await db.updateReport(reportId, { connect_output: out, investor_sheet_url: '' })
      status('complete', out)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'agent failed'
    status('error', { error: msg })
    broadcast(reportId, { type: 'error', agent, msg })
  }
}

export function scheduleSingleAgent(reportId: string, agent: AgentName) {
  setTimeout(() => executeSingleAgent(reportId, agent), 400)
}
