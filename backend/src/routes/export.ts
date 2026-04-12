/**
 * Export routes. Currently return the URLs already stashed on the report —
 * real Google Slides / Notion / GitHub / Vercel calls land in Phase 3.
 */
import { Router } from 'express'
import fs from 'fs'
import { db } from '../db/index.js'
import { generateValidationReport, generateMarketResearch } from '../services/pdfGenerator.js'

const router = Router()

async function guard(req: any, res: any) {
  const r = await db.getReport(req.body?.reportId)
  if (!r || r.founderId !== req.founderId) {
    res.status(404).json({ error: 'Not found' })
    return null
  }
  return r
}

async function guardById(req: any, res: any) {
  const r = await db.getReport(req.params.reportId)
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

/* ── PDF generation endpoints ── */

router.get('/validation-report/:reportId', async (req, res) => {
  const r = await guardById(req, res)
  if (!r) return

  try {
    const reportData = {
      idea: r.ideaText,
      validation_score: r.validationScore,
      scout_output: r.scout_output,
      atlas_output: r.atlas_output,
      forge_output: r.forge_output,
      deck_output: r.deck_output,
      connect_output: r.connect_output,
    }
    const filePath = await generateValidationReport(r.id, reportData)
    const startupName = (r.deck_output as any)?.startupName || 'Startup'
    const safeName = startupName.replace(/[^a-zA-Z0-9_-]/g, '_')

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_Validation_Report.pdf"`)

    const stream = fs.createReadStream(filePath)
    stream.pipe(res)
    stream.on('error', () => {
      if (!res.headersSent) res.status(500).json({ error: 'Failed to stream PDF' })
    })
  } catch (err) {
    console.error('[export] validation-report error:', err)
    if (!res.headersSent) res.status(500).json({ error: 'PDF generation failed' })
  }
})

router.get('/market-research/:reportId', async (req, res) => {
  const r = await guardById(req, res)
  if (!r) return

  try {
    const reportData = {
      idea: r.ideaText,
      validation_score: r.validationScore,
      scout_output: r.scout_output,
      atlas_output: r.atlas_output,
      deck_output: r.deck_output,
    }
    const filePath = await generateMarketResearch(r.id, reportData)
    const startupName = (r.deck_output as any)?.startupName || 'Startup'
    const safeName = startupName.replace(/[^a-zA-Z0-9_-]/g, '_')

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_Market_Research.pdf"`)

    const stream = fs.createReadStream(filePath)
    stream.pipe(res)
    stream.on('error', () => {
      if (!res.headersSent) res.status(500).json({ error: 'Failed to stream PDF' })
    })
  } catch (err) {
    console.error('[export] market-research error:', err)
    if (!res.headersSent) res.status(500).json({ error: 'PDF generation failed' })
  }
})

export default router
