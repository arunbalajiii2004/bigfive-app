import { useEffect, useRef } from 'react'
import { animate, useReducedMotion } from 'motion/react'

// Number that glides to its new value. React renders the initial text only; the animation writes the DOM directly.
export default function CountUp({ value, decimals = 2, duration = 0.6, suffix = '', className = '' }) {
  const ref = useRef(null)
  const prev = useRef(value)
  const reduce = useReducedMotion()
  const initial = useRef(`${Number(value).toFixed(decimals)}${suffix}`).current

  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration: reduce ? 0 : duration,
      ease: 'easeOut',
      onUpdate: (v) => { if (ref.current) ref.current.textContent = `${v.toFixed(decimals)}${suffix}` },
    })
    prev.current = value
    return () => controls.stop()
  }, [value, decimals, duration, suffix, reduce])

  return <span ref={ref} className={`tabular-nums ${className}`}>{initial}</span>
}
