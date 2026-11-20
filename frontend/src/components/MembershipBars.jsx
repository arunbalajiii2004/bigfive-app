import { motion } from 'motion/react'
import CountUp from './CountUp.jsx'

export default function MembershipBars({ items }) {
  return (
    <div className="space-y-3">
      {items.map((m, i) => (
        <div key={m.id}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className={i === 0 ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'}>{m.name}</span>
            <span className="shrink-0 text-slate-500 dark:text-slate-400"><CountUp value={m.p * 100} decimals={0} suffix="%" /></span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/10">
            <motion.div
              className={`h-full rounded-full ${i === 0 ? 'bg-accent' : 'bg-slate-400/70 dark:bg-slate-500'}`}
              initial={{ width: '0%' }}
              animate={{ width: `${m.p * 100}%` }}
              transition={{ type: 'spring', stiffness: 90, damping: 18, delay: i * 0.06 }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
