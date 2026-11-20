import { AnimatePresence, LayoutGroup, motion } from 'motion/react'

const WORDS = ['strongly disagree', 'disagree', 'neutral', 'agree', 'strongly agree']
const spring = { type: 'spring', stiffness: 140, damping: 22 }

// Diverging bars around a centre line: right = pushed the estimate up, left = pushed it down.
// Rows reorder smoothly when you switch trait.
export default function ContributionBars({ rows, color }) {
  const max = Math.max(0.0001, ...rows.map((r) => Math.abs(r.contribution)))
  return (
    <LayoutGroup>
      <div className="space-y-2.5">
        <AnimatePresence mode="popLayout" initial={false}>
          {rows.map((r) => {
            const w = (Math.abs(r.contribution) / max) * 50
            const up = r.contribution >= 0
            return (
              <motion.div
                key={r.item}
                layout="position"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={spring}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 text-sm sm:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-slate-700 dark:text-slate-200" title={r.text}>{r.text}</p>
                  <p className="text-xs text-slate-400">you said: {WORDS[r.answer - 1]}</p>
                </div>
                <div className="relative h-4">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-black/15 dark:bg-white/20" />
                  <motion.div
                    className="absolute inset-y-0.5 rounded-full"
                    style={{ background: up ? color : '#94a3b8' }}
                    initial={{ width: '0%', left: '50%' }}
                    animate={{ width: `${w}%`, left: up ? '50%' : `${50 - w}%` }}
                    transition={spring}
                  />
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  )
}
