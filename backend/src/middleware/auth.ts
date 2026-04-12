/**
 * JWT auth middleware. Matches the existing frontend's token flow:
 * - Tokens are signed by /api/auth/signup | /api/auth/login with sub = founder.id
 * - Subsequent requests send `Authorization: Bearer <token>`
 */
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { db } from '../db/index.js'

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      founderId?: string
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization
  const qToken = req.query.token as string | undefined
  const raw = h?.startsWith('Bearer ') ? h.slice(7) : qToken
  if (!raw) {
    res.status(401).json({ error: 'Missing token' })
    return
  }
  try {
    const payload = jwt.verify(raw, SECRET) as { sub: string }
    const founder = await db.getFounder(payload.sub)
    if (!founder) {
      res.status(401).json({ error: 'Unknown founder' })
      return
    }
    req.founderId = payload.sub
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

export function signFounderToken(id: string): string {
  return jwt.sign({ sub: id }, SECRET, { expiresIn: '7d' })
}
