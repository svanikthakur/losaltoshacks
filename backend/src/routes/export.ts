/**
 * Export routes. Currently return the URLs already stashed on the report —
 * real Google Slides / Notion / GitHub / Vercel calls land in Phase 3.
 */
import { Router } from 'express'
import fs from 'fs'
import { db } from '../db/index.js'
import { generateValidationReport, generateMarketResearch } from '../services/pdfGenerator.js'
import { deployLandingPage } from '../services/vercel.js'

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

router.post('/vercel', async (req, res, next) => {
  try {
    const r = await guard(req, res)
    if (!r) return

    const launchkit = r.connect_output ? null : null
    let html = ''
    let projectName = 'landing'

    const lk = (r as any).launchkit_output as { landingHtml?: string; tagline?: string } | undefined
    if (lk?.landingHtml) {
      html = lk.landingHtml
      projectName = (lk.tagline || r.ideaText).slice(0, 40)
    } else {
      const deck = r.deck_output as { startupName?: string; oneLiner?: string } | undefined
      const atlas = r.atlas_output as { tam?: string; summary?: string } | undefined
      projectName = deck?.startupName || r.ideaText.slice(0, 30)
      html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${deck?.startupName || 'Venture AI Landing'}</title>
<script src="https://cdn.tailwindcss.com"></script>
</head><body class="bg-gray-950 text-white min-h-screen flex flex-col">
<header class="py-6 px-8 border-b border-white/10">
<div class="max-w-4xl mx-auto flex items-center justify-between">
<span class="text-xl font-bold">${deck?.startupName || 'Startup'}</span>
<a href="#waitlist" class="px-4 py-2 bg-white text-black rounded-full text-sm font-medium">Get Early Access</a>
</div></header>
<main class="flex-1 flex items-center justify-center px-8">
<div class="max-w-2xl text-center py-20">
<h1 class="text-5xl font-bold leading-tight mb-6">${deck?.oneLiner || r.ideaText}</h1>
<p class="text-lg text-gray-400 mb-8 max-w-xl mx-auto">${atlas?.summary || 'Validated by Venture AI — 5 AI agents analyzed this opportunity.'}</p>
<p class="text-sm text-gray-500 mb-2">TAM: ${atlas?.tam || '—'}</p>
<div id="waitlist" class="mt-8 flex gap-2 justify-center">
<input type="email" placeholder="you@email.com" class="px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white w-64 text-sm">
<button class="px-6 py-3 bg-white text-black rounded-lg font-medium text-sm">Join Waitlist</button>
</div></div></main>
<footer class="py-6 px-8 border-t border-white/10 text-center text-xs text-gray-600">
Built with Venture AI
</footer></body></html>`
    }

    const result = await deployLandingPage(projectName, html)
    res.json({ url: result.url, id: result.id, readyState: result.readyState })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'deploy failed'
    if (msg.includes('VERCEL_TOKEN')) return res.status(400).json({ error: msg })
    next(err)
  }
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
