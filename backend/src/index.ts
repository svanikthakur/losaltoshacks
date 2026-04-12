/**
 * Express entry point. Mounts all routes, wires WebSocket upgrade,
 * boots the in-process pipeline runner (Redis not required).
 */
import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'

import { initWebSocket } from './websocket.js'
import { initDB, db, dbMode } from './db/index.js'
import { startWeeklyRefresh, refreshReport } from './queue/weeklyRefresh.js'
import { requireAuth } from './middleware/auth.js'
import { errorHandler } from './middleware/errorHandler.js'

import authRouter from './routes/auth.js'
import reportsRouter from './routes/reports.js'
import investorsRouter from './routes/investors.js'
import exportRouter from './routes/export.js'
import founderRouter from './routes/founder.js'
import communityRouter from './routes/community.js'
import pivotRouter from './routes/pivot.js'
import trendsRouter from './routes/trends.js'
import calendarRouter from './routes/calendar.js'
import dnaRouter from './routes/dna.js'
import networkRouter from './routes/network.js'
import simulatorRouter from './routes/simulator.js'
import timelineRouter from './routes/timeline.js'
import launchkitRouter from './routes/launchkit.js'
import sendgridRouter from './routes/sendgrid.js'
import featuresRouter from './routes/features.js'
import pulseRouter from './routes/pulse.js'

const app = express()
const server = createServer(app)

app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(morgan('dev'))
app.use(express.json({ limit: '1mb' }))

// Static — generated decks (real .pptx) and other binaries live here
app.use(
  '/storage',
  express.static(path.join(process.cwd(), 'storage'), {
    setHeaders: (res) => {
      res.set('Cross-Origin-Resource-Policy', 'cross-origin')
    },
  }),
)

/* ───── Public ───── */
app.get('/health', (_req, res) =>
  res.json({ ok: true, ai: process.env.OPENAI_API_KEY ? 'openai' : 'unset' }),
)
app.use('/api/auth', authRouter)

// Email-open tracking pixel — public, 1x1 transparent GIF
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
app.get('/api/track/:token/open', async (req, res) => {
  await db.recordEmailOpen(req.params.token)
  res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' })
  res.send(PIXEL)
})

// SendGrid Event Webhook — public, threads events back to email_tracking
app.use('/api/sendgrid', sendgridRouter)

/* ───── Protected ───── */
app.use('/api/reports', requireAuth, reportsRouter)
app.use('/api/investors', requireAuth, investorsRouter)
app.use('/api/export', requireAuth, exportRouter)
app.use('/api/founder', requireAuth, founderRouter)
app.use('/api/community', requireAuth, communityRouter)
app.use('/api/pivot', requireAuth, pivotRouter)
app.use('/api/trends', requireAuth, trendsRouter)
app.use('/api/calendar', requireAuth, calendarRouter)
app.use('/api/dna', requireAuth, dnaRouter)
app.use('/api/network', requireAuth, networkRouter)
app.use('/api/simulator', requireAuth, simulatorRouter)
app.use('/api/timeline', requireAuth, timelineRouter)
app.use('/api/launchkit', requireAuth, launchkitRouter)
app.use('/api/features', requireAuth, featuresRouter)
app.use('/api/pulse', requireAuth, pulseRouter)

app.use(errorHandler)

async function main() {
  await initDB()
  initWebSocket(server)
  startWeeklyRefresh()

  const PORT = Number(process.env.PORT) || 4000
  server.listen(PORT, () => {
    console.log(`[venture-ai] backend :${PORT}`)
    console.log(`[venture-ai] ai       ${process.env.OPENAI_API_KEY ? 'openai (gpt-4o-mini)' : 'UNSET — set OPENAI_API_KEY in .env'}`)
    console.log(`[venture-ai] db       ${dbMode()}`)
    console.log(`[venture-ai] queue    ${process.env.REDIS_URL ? 'bullmq (stub)' : 'in-process'}`)
  })
}

main().catch((err) => {
  console.error('[venture-ai] fatal:', err)
  process.exit(1)
})
