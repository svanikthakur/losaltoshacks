import { motion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

const EXAMPLES = [
  'An AI tutor for high-schoolers learning calculus, one problem at a time.',
  'A marketplace for renting climbing gear by the day from local climbers.',
  'A Chrome extension that summarizes every pull request on your GitHub dashboard.',
]

export default function Validate() {
  const [idea, setIdea] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const nav = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!idea.trim()) return
    setErr(null)
    setLoading(true)
    try {
      const r = await api.generate({ idea: idea.trim() })
      nav(`/report/${r.reportId}`)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="pt-32 pb-24 min-h-screen">
      <div className="shell max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="eyebrow mb-4">New validation</div>
          <h1 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-display font-medium">
            What are you <span className="text-accent">building?</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-ink-dim max-w-2xl leading-[1.6]">
            Describe your idea in 2–5 sentences. Be specific about the user and the pain. Every word you write gets read by every agent.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          onSubmit={submit}
          className="card p-2 mt-12"
        >
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={6}
            placeholder="e.g. A real-time coaching app that listens to sales calls and whispers objection responses to reps…"
            className="w-full bg-transparent border-0 outline-none resize-none font-body text-xl md:text-2xl leading-[1.45] tracking-tight text-ink placeholder:text-muted p-5"
          />
          <div className="flex items-center justify-between p-4 border-t border-line">
            <div className="text-sm text-ink-dim font-mono">{idea.length} / 500</div>
            <button type="submit" disabled={loading || !idea.trim()} className="btn disabled:opacity-40">
              {loading ? 'Launching…' : <>Run pipeline <span className="arrow">→</span></>}
            </button>
          </div>
          {err && <div className="text-sm text-accent px-5 pb-4">{err}</div>}
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-14"
        >
          <div className="text-sm text-ink-dim mb-4">Need inspiration? Try one of these:</div>
          <div className="space-y-3">
            {EXAMPLES.map((e, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdea(e)}
                className="w-full text-left card card-hover p-5 text-lg leading-[1.45]"
              >
                {e}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </main>
  )
}
