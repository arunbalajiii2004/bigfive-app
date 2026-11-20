import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { api } from '../api.js'
import TraitBars from '../components/TraitBars.jsx'
import CountUp from '../components/CountUp.jsx'
import Island, { IslandAction } from '../components/Island.jsx'
import { Card, Skeleton } from '../components/ui.jsx'

const SCALE = ['Disagree', 'Slightly disagree', 'Neutral', 'Slightly agree', 'Agree']

function Likert({ selected, disabled, onPick }) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {SCALE.map((label, i) => {
          const v = i + 1
          const on = selected === v
          return (
            <motion.button
              key={v}
              disabled={disabled}
              onClick={() => onPick(v)}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.9 }}
              animate={on ? { scale: 1.07 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 26 }}
              aria-label={`${v}: ${label}`}
              className={`flex aspect-square flex-col items-center justify-center rounded-full border text-xl font-semibold transition-colors sm:aspect-auto sm:rounded-[28px] sm:py-5 ${
                on
                  ? 'border-transparent bg-accent text-white shadow-lg shadow-[#007aff]/40'
                  : 'border-white/70 bg-white/55 text-slate-700 shadow-sm backdrop-blur-md hover:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/20'
              }`}
            >
              {v}
              <span className="mt-1 hidden text-[11px] font-normal leading-tight opacity-70 sm:block">{label}</span>
            </motion.button>
          )
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-400 sm:hidden">
        <span>{SCALE[0]}</span><span>{SCALE[4]}</span>
      </div>
    </div>
  )
}

export default function Quiz() {
  const nav = useNavigate()
  const { state } = useLocation()
  const sid = state?.sid ?? sessionStorage.getItem('sid')
  const reduce = useReducedMotion()

  const [cfg, setCfg] = useState(null)
  const [answered, setAnswered] = useState(0)
  const [selected, setSelected] = useState(null)
  const [live, setLive] = useState(null)
  const [islandOpen, setIslandOpen] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [err, setErr] = useState('')
  const answeredRef = useRef(0)
  const queue = useRef(Promise.resolve())
  const failed = useRef(false)
  const lock = useRef(false)

  useEffect(() => {
    if (!sid) { nav('/', { replace: true }); return }
    let alive = true
    Promise.all([api.config(), api.state(sid)])
      .then(([c, s]) => {
        if (!alive) return
        setCfg(c); answeredRef.current = s.answered; setAnswered(s.answered); setLive(s)
      })
      .catch((e) => alive && setErr(e.message))
    return () => { alive = false }
  }, [sid, nav])

  const finish = useCallback(async () => {
    setFinishing(true)
    try { await queue.current } catch { /* errors are shown by the queue itself */ }
    nav(`/result/${sid}`)
  }, [nav, sid])

  // The question order is known up front, so the next question appears instantly.
  // Answers are sent to the server in the background, strictly one after another.
  const choose = useCallback((value) => {
    if (lock.current || !cfg || finishing || failed.current) return
    const idx = answeredRef.current
    if (idx >= cfg.limits.max) return
    lock.current = true
    setSelected(value)
    const item = cfg.order[idx].item
    queue.current = queue.current.then(async () => {
      if (failed.current) return
      try { setLive(await api.answer(sid, item, value)) }
      catch (e) { failed.current = true; setErr(e.message) }
    })
    setTimeout(() => {
      answeredRef.current = idx + 1
      setAnswered(idx + 1)
      setSelected(null)
      lock.current = false
      if (idx + 1 >= cfg.limits.max) finish()
    }, reduce ? 0 : 160)
  }, [cfg, sid, finishing, reduce, finish])

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea')) return
      if (e.key >= '1' && e.key <= '5') choose(Number(e.key))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [choose])

  const limits = cfg?.limits
  const canFinish = !!cfg && answered >= limits.min
  const confident = !!live?.confident
  const tone = confident ? 'good' : 'ok'
  const showIsland = canFinish && (confident || answered >= limits.default)

  // expand the island when it first appears (and when the estimate becomes precise), then tuck it away
  useEffect(() => {
    if (!showIsland) return
    setIslandOpen(true)
    const t = setTimeout(() => setIslandOpen(false), 7000)
    return () => clearTimeout(t)
  }, [showIsland, tone])

  if (err && !cfg) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-red-600">{err}</p>
        <Link to="/" className="mt-4 inline-block text-accent underline">Start again</Link>
      </div>
    )
  }
  if (!cfg) {
    return (
      <div className="grid gap-8 md:grid-cols-[1fr_300px]">
        <div className="space-y-4"><Skeleton className="h-3 w-full" /><Skeleton className="h-72" /></div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  const q = cfg.order[Math.min(answered, limits.max - 1)]
  const pct = (answered / limits.max) * 100

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_300px]">
      {showIsland && (
        <Island
          open={islandOpen} onToggle={() => setIslandOpen((o) => !o)} tone={tone}
          collapsedLabel={confident ? 'Estimate is precise' : `${answered} answered`}
          title={confident ? 'Your estimate is precise' : `${answered} questions answered`}
          body={confident
            ? `Typically within ±${live.uncertainty.toFixed(2)} points. You can stop here or keep going to narrow it further.`
            : 'That is usually enough for a good estimate. Keep going to narrow the range, or see your results now.'}
        >
          <IslandAction primary onClick={finish}>See results</IslandAction>
          <IslandAction onClick={() => setIslandOpen(false)}>Keep going</IslandAction>
        </Island>
      )}

      <section className="min-w-0">
        <div className="mb-2 flex justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>Question {Math.min(answered + 1, limits.max)} of up to {limits.max}</span>
          <span>{canFinish ? 'You can finish any time' : `${limits.min - answered} more to unlock results`}</span>
        </div>
        <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/10">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-[#0a84ff] to-[#bf5af2]"
            animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 120, damping: 22 }} />
        </div>

        <Card lift={false} className="sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">How accurately does this describe you?</p>
          <div className="relative mt-4 min-h-[6.5rem]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.h2
                key={q.item}
                initial={{ opacity: 0, x: 30, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -30, filter: 'blur(4px)' }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="text-3xl font-semibold leading-tight tracking-[-0.025em] text-slate-900 sm:text-4xl dark:text-slate-50"
              >
                {q.text}
              </motion.h2>
            </AnimatePresence>
          </div>
          <div className="mt-6">
            <Likert selected={selected} disabled={finishing} onPick={choose} />
          </div>
          <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
            <span className="hidden sm:inline">Tip: press 1 to 5 on your keyboard</span>
            {canFinish && (
              <button onClick={finish} className="ml-auto underline decoration-slate-300 underline-offset-2 transition hover:text-accent">Finish now and see results</button>
            )}
          </div>
        </Card>
        {finishing && <p className="mt-3 text-sm text-slate-500">Finishing up…</p>}
        {err && <p className="mt-3 text-sm text-red-600">{err} <Link to="/" className="underline">Start again</Link></p>}
      </section>

      <aside className="glass h-fit p-5">
        <h3 className="mb-4 text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">Live estimate</h3>
        {live?.estimate
          ? <TraitBars traits={live.estimate} />
          : <p className="text-sm text-slate-400">Appears after your third answer.</p>}
        {live?.uncertainty != null && (
          <p className="mt-5 text-xs text-slate-500 dark:text-slate-400">
            Typical uncertainty: <b>±<CountUp value={live.uncertainty} /></b> points
            <span className="block text-slate-400">The shaded range around each marker should narrow as you answer.</span>
          </p>
        )}
        {live?.accuracy != null && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Captures about <b><CountUp value={live.accuracy * 100} decimals={0} suffix="%" /></b> of what the full 50-question test would.
          </p>
        )}
      </aside>
    </div>
  )
}
