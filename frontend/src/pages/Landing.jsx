import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { api } from '../api.js'
import { EASE, PrimaryButton } from '../components/ui.jsx'

const fade = (i) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay: 0.08 * i, ease: EASE },
})

const STEPS = [
  ['1', 'Answer', 'One statement at a time, on a scale from 1 to 5. Press the number keys if you like.', '#007aff'],
  ['2', 'Watch it settle', 'Your estimate updates live, with a range that narrows as you answer.', '#af52de'],
  ['3', 'Understand it', 'See which of your answers drove each score, and which profile you sit closest to.', '#ff9500'],
]

export default function Landing() {
  const nav = useNavigate()
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function start() {
    setBusy(true); setErr('')
    try {
      const [s] = await Promise.all([api.start(consent), api.config()])
      sessionStorage.setItem('sid', s.session_id)
      nav('/quiz', { state: { sid: s.session_id } })
    } catch (e) { setErr(e.message); setBusy(false) }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <motion.p {...fade(0)} className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-accent">Big-Five personality</motion.p>
      <motion.h1 {...fade(1)} className="bg-gradient-to-br from-[#0a84ff] via-[#5e5ce6] to-[#bf5af2] bg-clip-text pb-1 text-5xl font-bold tracking-[-0.035em] text-transparent sm:text-6xl">
        A shorter personality test.
      </motion.h1>
      <motion.p {...fade(2)} className="mt-5 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
        The classic questionnaire has 50 questions. A neural network trained on about 600,000 real responses
        estimates the same five scores from a handful of well-chosen ones, usually 15 to 25.
      </motion.p>

      <div className="mt-9 grid gap-3 sm:grid-cols-3">
        {STEPS.map(([n, title, text, color], i) => (
          <motion.div key={n} {...fade(3 + i)} className="glass glass-lift p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white" style={{ background: color, boxShadow: `0 6px 16px ${color}55` }}>{n}</span>
            <h3 className="mt-3 font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h3>
            <p className="mt-1 text-sm leading-snug text-slate-500 dark:text-slate-400">{text}</p>
          </motion.div>
        ))}
      </div>

      <motion.label {...fade(6)} className="glass glass-lift mt-8 flex cursor-pointer items-start gap-3 p-4">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-[#007aff]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <b className="text-slate-800 dark:text-slate-100">Optional:</b> let this project store my anonymous answers and results for research and for the
          aggregate admin dashboard. No name, email or IP address is collected. If you leave this unticked,
          nothing is saved and your session disappears after a few hours.
        </span>
      </motion.label>

      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      <motion.div {...fade(7)}>
        <PrimaryButton onClick={start} disabled={busy} className="mt-7">{busy ? 'Starting…' : 'Start the test'}</PrimaryButton>
      </motion.div>
    </div>
  )
}
