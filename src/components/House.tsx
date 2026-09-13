import { memo, useEffect, useRef, useState } from 'react'
import { cn } from '../lib/cn'
import { formatCurrencyCompact } from '../lib/format'
import { CheckIcon } from './ui/icons'

export interface HouseProps {
  number: number
  marked: boolean
  /** Casinha em destaque após um sorteio ou uma busca. */
  highlighted: boolean
  onActivate: (houseNumber: number) => void
}

/**
 * Uma casinha do grid. É `memo` e recebe apenas primitivos + um callback estável,
 * então marcar uma casinha re-renderiza exatamente uma das 500.
 */
function HouseComponent({ number, marked, highlighted, onActivate }: HouseProps) {
  const [justMarked, setJustMarked] = useState(false)
  const wasMarked = useRef(marked)

  useEffect(() => {
    // Anima só na transição pendente → guardada (não na montagem inicial).
    if (marked && !wasMarked.current) {
      setJustMarked(true)
      const timer = window.setTimeout(() => setJustMarked(false), 400)
      wasMarked.current = marked
      return () => window.clearTimeout(timer)
    }
    wasMarked.current = marked
  }, [marked])

  const value = formatCurrencyCompact(number)

  return (
    <button
      type="button"
      id={`casa-${number}`}
      aria-pressed={marked}
      aria-label={marked ? `Guardado: ${value}` : `Guardar ${value}`}
      onClick={() => onActivate(number)}
      className={cn(
        'tap-target relative flex aspect-square select-none items-center justify-center',
        'rounded-xl border text-sm font-semibold tabular-nums',
        'transition-[background-color,border-color,color,transform] duration-150',
        'active:scale-95',
        marked
          ? 'border-transparent bg-success-bg text-success-fg line-through decoration-success-fg/60 decoration-2'
          : 'border-line bg-surface-2 text-ink hover:border-brand-500/60 hover:bg-surface',
        highlighted && 'ring-2 ring-brand-400 ring-offset-2 ring-offset-bg',
        highlighted && !marked && 'animate-pulse-ring',
        justMarked && 'scale-110',
      )}
    >
      <span className="num">{number}</span>
      {marked && (
        <CheckIcon
          width={12}
          height={12}
          strokeWidth={3.5}
          className={cn('absolute right-1 top-1 opacity-90', justMarked && 'animate-pop-in')}
        />
      )}
    </button>
  )
}

export const House = memo(HouseComponent)
