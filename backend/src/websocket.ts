/**
 * WebSocket server. Rooms are keyed by reportId (jobId).
 * Emits shapes that the existing frontend listens for:
 *   { type: 'hello',    reportId }
 *   { type: 'log',      agent, msg }
 *   { type: 'status',   agent, status, output? }
 *   { type: 'complete' }
 *   { type: 'error',    msg }
 */
import { WebSocketServer, WebSocket } from 'ws'
import type { Server as HttpServer, IncomingMessage } from 'http'
import type { Socket } from 'net'

const rooms = new Map<string, Set<WebSocket>>()

export function initWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (req: IncomingMessage, socket: Socket, head: Buffer) => {
    const url = req.url || ''
    if (!url.startsWith('/ws/agent/')) {
      socket.destroy()
      return
    }
    const reportId = url.slice('/ws/agent/'.length).split('?')[0]
    wss.handleUpgrade(req, socket, head, (ws) => {
      if (!rooms.has(reportId)) rooms.set(reportId, new Set())
      rooms.get(reportId)!.add(ws)
      ws.on('close', () => {
        rooms.get(reportId)?.delete(ws)
        if (rooms.get(reportId)?.size === 0) rooms.delete(reportId)
      })
      ws.send(JSON.stringify({ type: 'hello', reportId }))
    })
  })
}

export function broadcast(reportId: string, data: Record<string, unknown>) {
  const msg = JSON.stringify(data)
  rooms.get(reportId)?.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg)
  })
}
