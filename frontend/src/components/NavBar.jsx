import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { useTitleState } from './LargeTitle.jsx'

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d.map((p, i) => <path key={i} d={p} />)}
  </svg>
)

const ITEMS = [
  { id: 'test', label: 'Test', to: '/', icon: ['M12 3a9 9 0 100 18 9 9 0 000-18z', 'M8.5 12.5l2.4 2.4 4.6-5'] },
  { id: 'about', label: 'About', to: '/about', icon: ['M12 3a9 9 0 100 18 9 9 0 000-18z', 'M12 11v5', 'M12 8h.01'] },
  { id: 'admin', label: 'Admin', to: '/admin', icon: ['M5 20V11', 'M12 20V5', 'M19 20v-6'] },
]

function activeId(pathname) {
  if (pathname.startsWith('/admin')) return 'admin'
  if (pathname.startsWith('/about')) return 'about'
  return 'test'
}

export default function NavBar() {
  const { pathname } = useLocation()
  const active = activeId(pathname)
  const { title, visible } = useTitleState()
  const { scrollY } = useScroll()
  const [compact, setCompact] = useState(false)
  useMotionValueEvent(scrollY, 'change', (y) => setCompact(y > 24))
  const showTitle = !!title && !visible

  return (
    <>
      {/* desktop and tablet: floating pill at the top */}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-40 hidden justify-center sm:flex">
        <motion.nav
          aria-label="Main"
          animate={{ scale: compact ? 0.94 : 1, y: compact ? -2 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          className="glass-strong pointer-events-auto flex items-center gap-1 rounded-full p-1.5 pl-4"
        >
          <Link to="/" className="mr-2 flex items-center gap-2 text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">
            <span className="h-3 w-3 rounded-full bg-gradient-to-br from-[#64d2ff] via-[#007aff] to-[#af52de] shadow-[0_0_12px_rgba(0,122,255,.6)]" />
            Big-Five
          </Link>
          {ITEMS.map((it) => (
            <Link key={it.id} to={it.to} aria-current={active === it.id ? 'page' : undefined}
              className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${active === it.id ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}>
              {active === it.id && (
                <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-white shadow-sm dark:bg-white/20"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
              )}
              <span className="relative">{it.label}</span>
            </Link>
          ))}
        </motion.nav>
      </div>

      {/* phones: floating tab bar at the bottom, like an iPhone app */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center sm:hidden" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <nav aria-label="Main" className="glass-strong pointer-events-auto flex items-center gap-1 rounded-full p-1.5">
          {ITEMS.map((it) => (
            <Link key={it.id} to={it.to} aria-current={active === it.id ? 'page' : undefined}
              className={`relative flex min-w-[76px] flex-col items-center rounded-full px-4 py-2 text-[11px] font-medium transition-colors ${active === it.id ? 'text-accent' : 'text-slate-500 dark:text-slate-400'}`}>
              {active === it.id && (
                <motion.span layoutId="tab-pill" className="absolute inset-0 -z-10 rounded-full bg-white shadow-sm dark:bg-white/20"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
              )}
              <Icon d={it.icon} />
              <span className="mt-0.5">{it.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* the large title slides into the bar's neighbourhood once it scrolls away */}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-30 flex justify-center sm:top-[72px]">
        <AnimatePresence>
          {showTitle && (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="glass-strong rounded-full px-4 py-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100"
            >
              {title}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
