import { motion } from 'framer-motion'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setLoading(true)
    try {
      await login(email, password)
      nav('/dashboard')
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" lede="Sign in to continue where you left off.">
      <form onSubmit={submit} className="space-y-5">
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@domain.com" />
        <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
        {err && <div className="text-sm text-accent">{err}</div>}
        <button type="submit" disabled={loading} className="btn w-full justify-center">
          {loading ? 'Signing in…' : <>Sign in <span className="arrow">→</span></>}
        </button>
      </form>
      <div className="mt-8 text-sm text-ink-dim">
        New to Venture AI?{' '}
        <Link to="/signup" className="text-accent font-medium hover:underline">
          Create an account
        </Link>
      </div>
    </AuthLayout>
  )
}

export function Signup() {
  const { signup } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setLoading(true)
    try {
      await signup(email, password, name)
      nav('/dashboard')
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Create an account" lede="Free forever. No credit card required.">
      <form onSubmit={submit} className="space-y-5">
        <Field label="Full name" value={name} onChange={setName} placeholder="Ada Lovelace" />
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@domain.com" />
        <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
        {err && <div className="text-sm text-accent">{err}</div>}
        <button type="submit" disabled={loading} className="btn w-full justify-center">
          {loading ? 'Creating account…' : <>Create account <span className="arrow">→</span></>}
        </button>
      </form>
      <div className="mt-8 text-sm text-ink-dim">
        Already have an account?{' '}
        <Link to="/login" className="text-accent font-medium hover:underline">
          Sign in
        </Link>
      </div>
    </AuthLayout>
  )
}

function Field({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-ink mb-2">{label}</div>
      <input
        type={type}
        value={value}
        required
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="field"
      />
    </label>
  )
}

function AuthLayout({
  title,
  lede,
  children,
}: {
  title: string
  lede: string
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 pt-32 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <h1 className="font-display text-4xl md:text-5xl leading-[1] tracking-display font-medium">
          {title}
        </h1>
        <p className="mt-4 text-ink-dim text-lg">{lede}</p>

        <div className="card p-8 mt-10">{children}</div>
      </motion.div>
    </main>
  )
}
