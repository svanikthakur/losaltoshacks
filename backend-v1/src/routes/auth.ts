import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '../db/store.js'

const router = Router()
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

function sign(id: string) {
  return jwt.sign({ sub: id }, SECRET, { expiresIn: '7d' })
}

function publicFounder(f: any) {
  return { id: f.id, email: f.email, name: f.name }
}

router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body || {}
  if (!email || !password || !name) return res.status(400).json({ error: 'Missing fields' })
  if (db.getFounderByEmail(email)) return res.status(409).json({ error: 'Email already in use' })
  const passwordHash = await bcrypt.hash(password, 10)
  const f = db.createFounder({ email, name, passwordHash })
  res.json({ token: sign(f.id), user: publicFounder(f) })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {}
  const f = db.getFounderByEmail(email)
  if (!f) return res.status(401).json({ error: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, f.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  res.json({ token: sign(f.id), user: publicFounder(f) })
})

router.post('/logout', (_req, res) => {
  res.json({ ok: true })
})

export default router
