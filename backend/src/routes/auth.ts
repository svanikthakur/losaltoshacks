/**
 * Auth routes. Returns shapes the frontend already consumes:
 *   POST /signup  -> { token, user }
 *   POST /login   -> { token, user }
 *   POST /logout  -> { ok: true }
 */
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { db } from '../db/index.js'
import { signFounderToken } from '../middleware/auth.js'

const router = Router()

function publicFounder(f: { id: string; email: string; name: string }) {
  return { id: f.id, email: f.email, name: f.name }
}

router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body || {}
  if (!email || !password || !name) return res.status(400).json({ error: 'Missing fields' })
  if (db.getFounderByEmail(email)) return res.status(409).json({ error: 'Email already in use' })
  const passwordHash = await bcrypt.hash(password, 10)
  const f = db.createFounder({ email, name, passwordHash })
  res.json({ token: signFounderToken(f.id), user: publicFounder(f) })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {}
  const f = db.getFounderByEmail(email)
  if (!f) return res.status(401).json({ error: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, f.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  res.json({ token: signFounderToken(f.id), user: publicFounder(f) })
})

router.post('/logout', (_req, res) => {
  res.json({ ok: true })
})

export default router
