import { useRef, type KeyboardEvent } from 'react'
import { House } from './House'

interface HouseGridProps {
  numbers: readonly number[]
  entries: Record<number, number>
  highlighted: number | null
  onActivate: (houseNumber: number) => void
}

const NAVIGATION_KEYS = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End']

export function HouseGrid({ numbers, entries, highlighted, onActivate }: HouseGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)

  /** Setas movem o foco pelo grid; Home/End vão para a primeira/última casinha. */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!NAVIGATION_KEYS.includes(event.key)) return

    const grid = gridRef.current
    if (!grid) return

    const houses = Array.from(grid.querySelectorAll<HTMLButtonElement>('button[id^="casa-"]'))
    const current = houses.indexOf(document.activeElement as HTMLButtonElement)
    if (current === -1) return

    // O número de colunas muda por breakpoint: lemos do próprio layout.
    const columns = window.getComputedStyle(grid).gridTemplateColumns.split(' ').length

    let target = current
    if (event.key === 'ArrowRight') target = current + 1
    else if (event.key === 'ArrowLeft') target = current - 1
    else if (event.key === 'ArrowDown') target = current + columns
    else if (event.key === 'ArrowUp') target = current - columns
    else if (event.key === 'Home') target = 0
    else if (event.key === 'End') target = houses.length - 1

    target = Math.max(0, Math.min(houses.length - 1, target))
    if (target === current) return

    event.preventDefault()
    houses[target]?.focus()
  }

  if (numbers.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
        Nenhuma casinha neste filtro.
      </p>
    )
  }

  return (
    <div
      ref={gridRef}
      role="group"
      aria-label="Casinhas do desafio"
      onKeyDown={handleKeyDown}
      className="grid grid-cols-5 gap-2 sm:grid-cols-8 sm:gap-2.5 md:grid-cols-10 lg:grid-cols-12"
    >
      {numbers.map((houseNumber) => (
        <House
          key={houseNumber}
          number={houseNumber}
          marked={entries[houseNumber] !== undefined}
          highlighted={highlighted === houseNumber}
          onActivate={onActivate}
        />
      ))}
    </div>
  )
}
