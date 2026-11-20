import { motion } from 'motion/react'

export const EASE = [0.22, 1, 0.36, 1]

export function Card({ title, subtitle, action, children, className = '', lift = true }) {
  return (
    <section className={`glass ${lift ? 'glass-lift' : ''} p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={title || action ? 'mt-4' : ''}>{children}</div>
    </section>
  )
}

// fades and lifts content in when it scrolls into view
export function Reveal({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.55, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-3xl bg-white/50 dark:bg-white/10 ${className}`} />
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-12 w-72" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
      <Skeleton className="h-40" />
    </div>
  )
}

export function Chip({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-black/5 text-slate-600 dark:bg-white/10 dark:text-slate-300',
    green: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
    blue: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  }
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>
}

// iOS-style segmented control with a sliding thumb
export function Segmented({ options, value, onChange, id = 'seg' }) {
  return (
    <div role="tablist" className="relative inline-flex rounded-full bg-black/5 p-1 dark:bg-white/10">
      {options.map((o) => {
        const on = value === o.value
        return (
          <button
            key={o.value} role="tab" aria-selected={on} onClick={() => onChange(o.value)}
            className={`relative z-10 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${on ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            {on && (
              <motion.span layoutId={id} className="absolute inset-0 -z-10 rounded-full bg-white shadow-sm dark:bg-white/20"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
            )}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
      className={`rounded-full bg-accent px-7 py-3.5 font-medium text-white shadow-lg shadow-[#007aff]/30 transition-colors hover:bg-accent-strong disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  )
}

export function GlassButton({ children, className = '', ...props }) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
      className={`glass-strong rounded-full px-5 py-2.5 text-sm font-medium text-slate-800 transition-colors disabled:opacity-50 dark:text-slate-100 ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  )
}
