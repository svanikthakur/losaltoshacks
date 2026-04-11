import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { db } from '../db/store.js'

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

declare global {
  namespace Express {
    interface Request {
      founderId?: string
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' })
  try {
    const payload = jwt.verify(h.slice(7), SECRET) as { sub: string }
    if (!db.getFounder(payload.sub)) return res.status(401).json({ error: 'Unknown founder' })
    req.founderId = payload.sub
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}
