import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useInView } from 'motion/react'

// iOS-style large titles: the big heading scrolls away and the nav bar shows a small title chip instead.
const Ctx = createContext({ title: '', visible: true, set: () => {} })

export function TitleProvider({ children }) {
  const [s, setS] = useState({ title: '', visible: true })
  const set = useCallback((p) => setS((prev) => ({ ...prev, ...p })), [])
  return <Ctx.Provider value={{ ...s, set }}>{children}</Ctx.Provider>
}

export const useTitleState = () => useContext(Ctx)

export function LargeTitle({ children, className = '' }) {
  const ref = useRef(null)
  const { set } = useContext(Ctx)
  const inView = useInView(ref, { margin: '-76px 0px 0px 0px' })   // counts as gone once it slides under the nav bar
  const text = typeof children === 'string' ? children : ''

  useEffect(() => { set({ title: text, visible: inView }) }, [text, inView, set])
  useEffect(() => () => set({ title: '', visible: true }), [set])

  return (
    <h1 ref={ref} className={`text-4xl font-bold tracking-[-0.03em] text-slate-900 sm:text-5xl dark:text-white ${className}`}>
      {children}
    </h1>
  )
}
