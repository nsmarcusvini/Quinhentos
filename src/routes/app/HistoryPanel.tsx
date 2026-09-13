import { UndoIcon } from '../../components/ui/icons'
import { formatDateTime } from '../../lib/date'
import { formatCurrency, pluralize } from '../../lib/format'
import type { ChallengeStats } from '../../state/useStats'

interface HistoryPanelProps {
  stats: ChallengeStats
  onUndo: (houseNumber: number) => void
}

/** Lançamentos em ordem cronológica, do mais recente para o mais antigo. */
export function HistoryPanel({ stats, onUndo }: HistoryPanelProps) {
  if (stats.history.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
        Nenhum lançamento ainda. Assim que você riscar uma casinha ela aparece aqui.
      </p>
    )
  }

  return (
    <div>
      <p className="mb-3 text-xs text-muted">
        {pluralize(stats.history.length, 'lançamento', 'lançamentos')} ·{' '}
        <span className="num text-ink">{formatCurrency(stats.saved)}</span> no total
      </p>

      <ul className="space-y-1.5">
        {stats.history.map((item) => (
          <li
            key={item.number}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-2.5"
          >
            <span
              aria-hidden="true"
              className="num flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success-bg text-sm font-semibold text-success-fg"
            >
              {item.number}
            </span>

            <div className="min-w-0 flex-1">
              <p className="num text-sm font-semibold text-ink">{formatCurrency(item.number)}</p>
              <p className="text-xs text-muted">{formatDateTime(item.at)}</p>
            </div>

            <button
              type="button"
              onClick={() => onUndo(item.number)}
              aria-label={`Desfazer o lançamento da casinha ${item.number}`}
              title="Desfazer lançamento"
              className="tap-target inline-flex shrink-0 items-center justify-center rounded-xl text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-danger"
            >
              <UndoIcon width={18} height={18} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
