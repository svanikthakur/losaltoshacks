import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import authRouter from './routes/auth.js'
import founderRouter from './routes/founder.js'
import reportsRouter from './routes/reports.js'
import exportsRouter from './routes/exports.js'
import { hub } from './ws/hub.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRouter)
app.use('/api/founder', founderRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/export', exportsRouter)

const server = createServer(app)

// WebSocket upgrade: /ws/agent/:reportId
const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', (req, socket, head) => {
  const { url } = req
  if (!url?.startsWith('/ws/agent/')) {
    socket.destroy()
    return
  }
  const reportId = url.slice('/ws/agent/'.length)
  wss.handleUpgrade(req, socket, head, (ws) => {
    hub.subscribe(reportId, ws)
    ws.send(JSON.stringify({ type: 'hello', reportId }))
  })
})

const PORT = Number(process.env.PORT) || 4000
server.listen(PORT, () => {
  console.log(`[venture-ai] backend listening on :${PORT}`)
})
