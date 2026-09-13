import { useId } from 'react'
import { Button } from '../../components/ui/Button'
import { CloseIcon, DiceIcon, SearchIcon } from '../../components/ui/icons'
import { cn } from '../../lib/cn'
import { formatInteger } from '../../lib/format'

export type HouseFilter = 'todas' | 'guardadas' | 'pendentes'

interface ToolbarProps {
  filter: HouseFilter
  onFilterChange: (filter: HouseFilter) => void
  search: string
  onSearchChange: (value: string) => void
  onDraw: () => void
  counts: { todas: number; guardadas: number; pendentes: number }
  drawDisabled: boolean
}

const FILTERS: readonly { id: HouseFilter; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'guardadas', label: 'Guardadas' },
  { id: 'pendentes', label: 'Pendentes' },
]

export function Toolbar({
  filter,
  onFilterChange,
  search,
  onSearchChange,
  onDraw,
  counts,
  drawDisabled,
}: ToolbarProps) {
  const searchId = useId()

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
      <div
        role="group"
        aria-label="Filtrar casinhas"
        className="flex gap-1 rounded-xl border border-line bg-surface-2 p-1"
      >
        {FILTERS.map((option) => {
          const active = filter === option.id
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onFilterChange(option.id)}
              className={cn(
                'min-h-[36px] flex-1 rounded-lg px-3 text-sm font-medium transition-colors duration-150',
                active
                  ? 'bg-surface text-ink shadow-soft'
                  : 'text-muted hover:text-ink',
              )}
            >
              {option.label}
              <span className="ml-1.5 text-xs text-muted num">{formatInteger(counts[option.id])}</span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-1 gap-2">
        <div className="relative flex-1">
          <label htmlFor={searchId} className="sr-only">
            Buscar casinha pelo número
          </label>
          <SearchIcon
            width={18}
            height={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            id={searchId}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Ir para o número…"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className={cn(
              'h-11 w-full rounded-xl border border-line bg-surface-2 pl-10 pr-10 text-sm text-ink',
              'placeholder:text-muted transition-colors duration-150 focus:border-brand-500 focus:bg-surface',
            )}
          />
          {search && (
            <button
              type="button"
              aria-label="Limpar busca"
              onClick={() => onSearchChange('')}
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:text-ink"
            >
              <CloseIcon width={16} height={16} />
            </button>
          )}
        </div>

        <Button
          onClick={onDraw}
          disabled={drawDisabled}
          aria-label="Sortear uma casinha pendente"
          className="shrink-0"
        >
          <DiceIcon width={18} height={18} />
          <span className="hidden sm:inline">Sortear</span>
        </Button>
      </div>
    </div>
  )
}
