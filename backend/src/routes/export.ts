/**
 * Export routes. Currently return the URLs already stashed on the report —
 * real Google Slides / Notion / GitHub / Vercel calls land in Phase 3.
 */
import { Router } from 'express'
import { db } from '../db/index.js'

const router = Router()

async function guard(req: any, res: any) {
  const r = await db.getReport(req.body?.reportId)
  if (!r || r.founderId !== req.founderId) {
    res.status(404).json({ error: 'Not found' })
    return null
  }
  return r
}

router.post('/slides', async (req, res) => {
  const r = await guard(req, res)
  if (!r) return
  res.json({ url: r.pitch_deck_url || r.deck_url })
})

router.post('/notion', async (req, res) => {
  const r = await guard(req, res)
  if (!r) return
  res.json({ url: r.notion_url || null })
})

router.post('/pdf', async (req, res) => {
  const r = await guard(req, res)
  if (!r) return
  res.json({ url: r.pdf_report_url })
})

router.post('/github', async (req, res) => {
  const r = await guard(req, res)
  if (!r) return
  res.json({ url: r.github_repo_url })
})

router.post('/vercel', (_req, res) => {
  res.status(501).json({ error: 'Phase 3: vercel deploy not yet implemented' })
})

export default router
