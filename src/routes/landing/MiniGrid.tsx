import { memo, useCallback } from 'react'
import { cn } from '../../lib/cn'
import { formatCurrencyCompact } from '../../lib/format'
import { CheckIcon } from '../../components/ui/icons'

/**
 * Amostra de 50 casinhas espalhadas por todo o desafio (5, 15, 25 … 495).
 * São casinhas REAIS: o que o visitante marca aqui vai junto para o /app.
 */
export const SAMPLE_NUMBERS: readonly number[] = Object.freeze(
  Array.from({ length: 50 }, (_, index) => index * 10 + 5),
)

interface MiniHouseProps {
  number: number
  marked: boolean
  onActivate: (houseNumber: number) => void
}

const MiniHouse = memo(function MiniHouse({ number, marked, onActivate }: MiniHouseProps) {
  const value = formatCurrencyCompact(number)

  return (
    <button
      type="button"
      aria-pressed={marked}
      aria-label={marked ? `Desmarcar ${value}` : `Guardar ${value}`}
      onClick={() => onActivate(number)}
      className={cn(
        'relative flex aspect-square min-h-[44px] items-center justify-center rounded-lg border',
        'text-xs font-semibold tabular-nums transition-[background-color,border-color,color,transform] duration-150',
        'active:scale-95',
        marked
          ? 'border-transparent bg-success-bg text-success-fg line-through decoration-success-fg/70 decoration-1'
          : 'border-line bg-surface-2 text-ink hover:border-brand-500/70 hover:bg-surface',
      )}
    >
      <span className="num">{number}</span>
      {marked && (
        <CheckIcon width={10} height={10} strokeWidth={4} className="absolute right-0.5 top-0.5" />
      )}
    </button>
  )
})

interface MiniGridProps {
  entries: Record<number, number>
  /** Marca a casinha, ou desmarca se já estiver marcada. */
  onToggle: (houseNumber: number) => void
}

export function MiniGrid({ entries, onToggle }: MiniGridProps) {
  const handleActivate = useCallback(
    (houseNumber: number) => {
      onToggle(houseNumber)
    },
    [onToggle],
  )

  return (
    <div
      role="group"
      aria-label="Amostra de casinhas do desafio"
      className="grid grid-cols-5 gap-1.5 sm:grid-cols-10"
    >
      {SAMPLE_NUMBERS.map((houseNumber) => (
        <MiniHouse
          key={houseNumber}
          number={houseNumber}
          marked={entries[houseNumber] !== undefined}
          onActivate={handleActivate}
        />
      ))}
    </div>
  )
}
