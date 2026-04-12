/**
 * Weekly validation refresh.
 *
 * Every 7 days, iterate all complete reports, re-run Scout + Atlas (the two
 * cheap agents that track live market conditions), diff the new opportunity
 * score against the prior one, and append a score_history entry. Any deltas
 * are broadcast on the report's WebSocket channel so open dashboards update.
 *
 * Implemented with plain setInterval to avoid a new dependency. The interval
 * is computed relative to the process start time, so restarts reset the
 * cadence — fine for a single-instance demo.
 *
 * Toggle with:
 *   WEEKLY_REFRESH=off          → disable entirely
 *   WEEKLY_REFRESH_MS=<millis>  → override the default 7-day cadence
 */
import { db } from '../db/index.js'
import { broadcast } from '../websocket.js'
import { runScout } from '../agents/Scout.js'
import { runAtlas } from '../agents/Atlas.js'
import { dnaFromFounder } from '../services/dnaContext.js'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

async function refreshOne(reportId: string): Promise<{ before: number; after: number } | null> {
  const r = await db.getReport(reportId)
  if (!r) return null
  const founder = await db.getFounder(r.founderId)
  const dna = dnaFromFounder(founder)

  const [scoutOut, atlasOut] = await Promise.all([
    runScout(r.ideaText, dna, r.founderId).catch((err: unknown) => {
      console.warn(`[weekly] scout failed for ${reportId}:`, (err as Error).message)
      return null
    }),
    runAtlas(r.ideaText, dna).catch((err: unknown) => {
      console.warn(`[weekly] atlas failed for ${reportId}:`, (err as Error).message)
      return null
    }),
  ])

  if (!atlasOut) return null

  const before = r.validationScore || 0
  const after = Math.round(atlasOut.opportunityScore / 10)

  await db.updateReport(reportId, {
    scout_output: scoutOut ?? r.scout_output,
    atlas_output: atlasOut,
    validationScore: after,
  })
  await db.insertScoreHistory(reportId, after)

  broadcast(reportId, {
    type: 'weekly_refresh',
    before,
    after,
    delta: after - before,
    refreshedAt: Date.now(),
  })

  return { before, after }
}

async function refreshAll(): Promise<void> {
  const started = Date.now()
  console.log('[weekly] refresh sweep starting')

  // Walk all founders, collect their latest-complete reports
  const founders = await db.listAllFounders()
  const reportIds: string[] = []
  for (const f of founders) {
    const rs = await db.listReportsForFounder(f.id)
    for (const r of rs) {
      if (r.status === 'complete') reportIds.push(r.id)
    }
  }

  let touched = 0
  let up = 0
  let down = 0
  for (const id of reportIds) {
    try {
      const res = await refreshOne(id)
      if (!res) continue
      touched++
      if (res.after > res.before) up++
      else if (res.after < res.before) down++
    } catch (err) {
      console.warn(`[weekly] ${id} failed:`, (err as Error).message)
    }
  }

  console.log(
    `[weekly] refresh sweep done · ${touched} touched · ${up} up · ${down} down · ${Date.now() - started}ms`,
  )
}

export function startWeeklyRefresh(): void {
  if (process.env.WEEKLY_REFRESH === 'off') {
    console.log('[weekly] disabled (WEEKLY_REFRESH=off)')
    return
  }
  const ms = Number(process.env.WEEKLY_REFRESH_MS) || WEEK_MS
  console.log(`[weekly] refresh every ${Math.round(ms / 1000 / 60)}min`)
  setInterval(() => {
    refreshAll().catch((err: unknown) => {
      console.warn('[weekly] sweep crashed:', (err as Error).message)
    })
  }, ms)
}

/** Expose the single-report refresh for a manual-trigger endpoint. */
export async function refreshReport(reportId: string): Promise<{ before: number; after: number } | null> {
  return refreshOne(reportId)
}
