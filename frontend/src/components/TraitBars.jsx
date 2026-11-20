import { motion } from 'motion/react'
import { TRAIT_COLORS } from '../api.js'
import CountUp from './CountUp.jsx'

const spring = { type: 'spring', stiffness: 110, damping: 20 }
const pos = (v) => ((v - 1) / 4) * 100

// Score bars on the 1-5 scale. When intervals are available they are drawn as a soft band around the marker.
export default function TraitBars({ traits }) {
  return (
    <div className="space-y-4">
      {traits.map((t) => {
        const color = TRAIT_COLORS[t.code]
        const hasBand = t.lo != null
        return (
          <div key={t.code}>
            <div className="mb-1.5 flex items-baseline justify-between text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">{t.name}</span>
              <span className="text-slate-500 dark:text-slate-400">
                <CountUp value={t.score} />
                {t.half_width != null && <span className="ml-1 text-xs text-slate-400">±{t.half_width.toFixed(2)}</span>}
              </span>
            </div>
            <div className="relative h-3 rounded-full bg-black/[0.07] dark:bg-white/10">
              {hasBand ? (
                <motion.div
                  className="absolute inset-y-0 rounded-full"
                  style={{ background: color, opacity: 0.3 }}
                  initial={{ left: '50%', width: '0%' }}
                  animate={{ left: `${pos(t.lo)}%`, width: `${pos(t.hi) - pos(t.lo)}%` }}
                  transition={spring}
                />
              ) : (
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: color }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${pos(t.score)}%` }}
                  transition={spring}
                />
              )}
              {hasBand && (
                <motion.div
                  className="absolute top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow"
                  style={{ background: color }}
                  initial={{ left: '50%' }}
                  animate={{ left: `${pos(t.score)}%` }}
                  transition={spring}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
