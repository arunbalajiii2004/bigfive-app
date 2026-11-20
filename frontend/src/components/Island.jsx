import { motion, AnimatePresence } from 'motion/react'

// A "Dynamic Island"-style notice: a small black pill that expands with a spring to show a message and actions,
// then tucks itself away. Tap the pill to expand it again.
export default function Island({ open, onToggle, tone = 'ok', collapsedLabel, title, body, children }) {
  const dot = tone === 'good' ? 'bg-[#30d158]' : 'bg-[#ff9f0a]'
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3 sm:top-[72px]">
      <motion.div
        layout
        style={{ borderRadius: open ? 30 : 22 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="pointer-events-auto overflow-hidden bg-black text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)] ring-1 ring-white/10"
      >
        {open ? (
          <motion.div layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08, duration: 0.2 }}
            className="w-[min(92vw,430px)] px-5 py-4">
            <div className="flex items-start gap-3">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-white/70">{body}</p>
              </div>
              <button onClick={onToggle} aria-label="Collapse" className="-mr-1 shrink-0 rounded-full p-1 text-white/50 transition hover:text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">{children}</div>
          </motion.div>
        ) : (
          <button onClick={onToggle} className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium" aria-label="Show details">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${dot}`} />
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dot}`} />
            </span>
            {collapsedLabel}
          </button>
        )}
      </motion.div>
    </div>
  )
}

export const IslandAction = ({ primary, ...props }) => (
  <button
    {...props}
    className={`rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-95 ${primary ? 'bg-white text-black hover:bg-white/90' : 'bg-white/15 text-white hover:bg-white/25'}`}
  />
)
