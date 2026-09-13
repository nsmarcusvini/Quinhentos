import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../lib/motion'

const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3)

/**
 * Anima um número do valor anterior até o novo valor.
 * Com `prefers-reduced-motion` o valor salta direto, sem animação.
 */
export function useCountUp(target: number, durationMs = 600): number {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (prefersReducedMotion()) {
      fromRef.current = target
      setValue(target)
      return
    }

    const from = fromRef.current
    if (from === target) return

    const start = performance.now()

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs)
      const current = from + (target - from) * easeOut(progress)
      setValue(current)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
        frameRef.current = null
      }
    }

    frameRef.current = requestAnimationFrame(tick)

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      fromRef.current = value
    }
    // `value` é lido apenas na limpeza para retomar de onde parou.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs])

  return value
}
