import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { TRAIT_COLORS } from '../api.js'
import CountUp from './CountUp.jsx'

const SIZE = 280
const C = SIZE / 2
const STROKE = 17
const GAP = 7

// Apple-Fitness-style concentric rings: arc length = percentile. A paler arc behind it shows the likely range.
export default function Rings({ traits }) {
  const best = useMemo(() => traits.reduce((a, b) => (b.percentile > a.percentile ? b : a)).code, [traits])
  const [active, setActive] = useState(best)
  const cur = traits.find((t) => t.code === active) || traits[0]

  const rings = traits.map((t, i) => {
    const r = C - STROKE / 2 - 6 - i * (STROKE + GAP)
    return { t, r, circ: 2 * Math.PI * r }
  })

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-center">
      <div className="relative w-full max-w-[260px] shrink-0">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full" role="img" aria-label="Percentile rings for the five traits">
          <g transform={`rotate(-90 ${C} ${C})`}>
            {rings.map(({ t, r, circ }) => {
              const color = TRAIT_COLORS[t.code]
              const dim = t.code === active ? 1 : 0.55
              const p = Math.max(0.004, t.percentile / 100)
              const hasRange = t.pct_lo != null
              return (
                <g key={t.code} style={{ opacity: dim, transition: 'opacity .25s' }}>
                  <circle cx={C} cy={C} r={r} fill="none" stroke={color} strokeOpacity="0.16" strokeWidth={STROKE} />
                  {hasRange && (
                    <motion.circle
                      cx={C} cy={C} r={r} fill="none" stroke={color} strokeOpacity="0.32" strokeWidth={STROKE}
                      initial={{ strokeDasharray: `0 ${circ}` }}
                      animate={{ strokeDasharray: `${(Math.max(0.004, (t.pct_hi - t.pct_lo) / 100)) * circ} ${circ}`, strokeDashoffset: -(t.pct_lo / 100) * circ }}
                      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )}
                  <motion.circle
                    cx={C} cy={C} r={r} fill="none" stroke={color} strokeWidth={STROKE} strokeLinecap="round"
                    initial={{ strokeDasharray: `0 ${circ}` }}
                    animate={{ strokeDasharray: `${p * circ} ${circ}` }}
                    transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                    style={{ filter: t.code === active ? `drop-shadow(0 0 6px ${color}88)` : 'none' }}
                  />
                </g>
              )
            })}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{cur.name}</span>
          <span className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
            <CountUp value={cur.percentile} decimals={0} duration={0.5} />
          </span>
          <span className="-mt-0.5 text-[11px] text-slate-400">percentile</span>
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-1.5 sm:w-auto">
        {traits.map((t) => (
          <li key={t.code}>
            <button
              onClick={() => setActive(t.code)} onMouseEnter={() => setActive(t.code)} onFocus={() => setActive(t.code)}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm transition-colors ${active === t.code ? 'bg-black/5 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: TRAIT_COLORS[t.code] }} />
              <span className="min-w-0 flex-1 truncate font-medium text-slate-800 dark:text-slate-100">{t.name}</span>
              <span className="tabular-nums text-slate-500 dark:text-slate-400">
                {t.score.toFixed(2)}{t.half_width != null && <span className="ml-1 text-xs text-slate-400">±{t.half_width.toFixed(2)}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
