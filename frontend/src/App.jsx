import { Suspense, lazy } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import Landing from './pages/Landing.jsx'
import Quiz from './pages/Quiz.jsx'
import About from './pages/About.jsx'
import NavBar from './components/NavBar.jsx'
import { TitleProvider } from './components/LargeTitle.jsx'
import { EASE, PageSkeleton } from './components/ui.jsx'

// the chart-heavy pages are loaded only when visited, so the landing page opens fast
const Result = lazy(() => import('./pages/Result.jsx'))
const Admin = lazy(() => import('./pages/Admin.jsx'))

export default function App() {
  const location = useLocation()
  const key = location.pathname.startsWith('/result') ? 'result' : location.pathname

  return (
    <TitleProvider>
      <div className="aurora" aria-hidden="true"><i /><i /><i /><i /></div>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 pb-32 pt-8 sm:pb-16 sm:pt-28">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <Suspense fallback={<PageSkeleton />}>
              <Routes location={location}>
                <Route path="/" element={<Landing />} />
                <Route path="/quiz" element={<Quiz />} />
                <Route path="/about" element={<About />} />
                <Route path="/result/:sid" element={<Result />} />
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
        <p className="mt-12 text-center text-xs text-slate-400">
          Estimates of self-reported Big-Five scores. Not a clinical or diagnostic tool.
        </p>
      </main>
    </TitleProvider>
  )
}
