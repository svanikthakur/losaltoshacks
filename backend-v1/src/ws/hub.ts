import { WebSocket } from 'ws'

/**
 * Tiny pub/sub hub: agents emit events for a reportId, connected sockets receive them.
 * In-process only — swap for Redis pub/sub when you scale out.
 */
const channels = new Map<string, Set<WebSocket>>()

export const hub = {
  subscribe(reportId: string, socket: WebSocket) {
    if (!channels.has(reportId)) channels.set(reportId, new Set())
    channels.get(reportId)!.add(socket)
    socket.on('close', () => channels.get(reportId)?.delete(socket))
  },
  emit(reportId: string, event: Record<string, unknown>) {
    const subs = channels.get(reportId)
    if (!subs) return
    const data = JSON.stringify(event)
    for (const s of subs) {
      if (s.readyState === s.OPEN) s.send(data)
    }
  },
}
