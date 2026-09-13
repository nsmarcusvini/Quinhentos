import { useEffect, useMemo, useRef } from 'react'
import { useConfetti } from '../../components/Confetti'
import { HOUSE_NUMBERS, TOTAL_AMOUNT } from '../../lib/constants'
import { formatCurrencyCompact } from '../../lib/format'
import { prefersReducedMotion } from '../../lib/motion'

const FILL_MS = 6500
const HOLD_MS = 2200
const FILLED_CLASS = 'bg-brand-500'
const EMPTY_CLASS = 'bg-surface-2'

/** Embaralhamento determinístico: a demo parece uso real, mas é sempre igual. */
function shuffledOrder(): number[] {
  const order = [...HOUSE_NUMBERS]
  let seed = 20250500
  for (let index = order.length - 1; index > 0; index--) {
    seed = (seed * 1103515245 + 12345) % 2147483648
    const swap = seed % (index + 1)
    ;[order[index], order[swap]] = [order[swap] as number, order[index] as number]
  }
  return order
}

/**
 * As 500 casinhas se preenchendo sozinhas até 100%, em loop, com confete no fim.
 * A animação escreve direto no DOM (classList/textContent) — o React renderiza
 * os 500 nós uma única vez e não participa dos frames.
 */
export function LoopGrid() {
  const fireConfetti = useConfetti()
  const containerRef = useRef<HTMLDivElement>(null)
  const amountRef = useRef<HTMLSpanElement>(null)
  const order = useMemo(shuffledOrder, [])

  useEffect(() => {
    const container = containerRef.current
    const amountNode = amountRef.current
    if (!container || !amountNode) return

    const cells = Array.from(container.children) as HTMLElement[]

    if (prefersReducedMotion()) {
      cells.forEach((cell) => cell.classList.replace(EMPTY_CLASS, FILLED_CLASS))
      amountNode.textContent = formatCurrencyCompact(TOTAL_AMOUNT)
      return
    }

    let frame = 0
    let startedAt = 0
    let filled = 0
    let filledAmount = 0
    let running = false

    const setFilledCount = (count: number) => {
      // Só mexe nas células que mudaram de estado desde o último frame.
      while (filled < count) {
        const houseNumber = order[filled] as number
        cells[houseNumber - 1]?.classList.replace(EMPTY_CLASS, FILLED_CLASS)
        filledAmount += houseNumber
        filled += 1
      }
      while (filled > count) {
        filled -= 1
        const houseNumber = order[filled] as number
        cells[houseNumber - 1]?.classList.replace(FILLED_CLASS, EMPTY_CLASS)
        filledAmount -= houseNumber
      }
      amountNode.textContent = formatCurrencyCompact(filledAmount)
    }

    const tick = (now: number) => {
      if (!startedAt) startedAt = now
      const elapsed = now - startedAt

      if (elapsed <= FILL_MS) {
        const progress = elapsed / FILL_MS
        const target = Math.round(progress * cells.length)
        if (target !== filled) setFilledCount(target)
      } else if (elapsed <= FILL_MS + HOLD_MS) {
        if (filled < cells.length) {
          setFilledCount(cells.length)
          fireConfetti(110)
        }
      } else {
        startedAt = now
        setFilledCount(0)
      }

      frame = requestAnimationFrame(tick)
    }

    // Só anima enquanto está na tela — economiza bateria e CPU.
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry?.isIntersecting ?? false
        if (visible && !running) {
          running = true
          startedAt = 0
          frame = requestAnimationFrame(tick)
        } else if (!visible && running) {
          running = false
          cancelAnimationFrame(frame)
        }
      },
      { threshold: 0.2 },
    )

    observer.observe(container)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [fireConfetti, order])

  return (
    <section className="px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          É isso que você vai ver enchendo
        </h2>
        <p className="mt-2 text-sm text-muted sm:text-base">
          500 casinhas. Uma de cada vez, até a última.
        </p>

        <div className="card mt-6 p-4 sm:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <span
              ref={amountRef}
              aria-hidden="true"
              className="num text-2xl font-bold text-brand-400 sm:text-3xl"
            >
              {formatCurrencyCompact(0)}
            </span>
            <span className="num text-sm text-muted">
              de {formatCurrencyCompact(TOTAL_AMOUNT)}
            </span>
          </div>

          <div
            ref={containerRef}
            aria-hidden="true"
            className="mt-4 grid grid-cols-[repeat(25,minmax(0,1fr))] gap-[3px] sm:grid-cols-[repeat(50,minmax(0,1fr))]"
          >
            {HOUSE_NUMBERS.map((houseNumber) => (
              <span
                key={houseNumber}
                className={`aspect-square rounded-[2px] transition-colors duration-300 ${EMPTY_CLASS}`}
              />
            ))}
          </div>

          <p className="sr-only">
            Animação demonstrativa das 500 casinhas sendo preenchidas até o total de{' '}
            {formatCurrencyCompact(TOTAL_AMOUNT)}.
          </p>
        </div>
      </div>
    </section>
  )
}
