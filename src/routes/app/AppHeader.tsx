import { Link } from 'react-router-dom'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { ChartIcon, HistoryIcon, SettingsIcon } from '../../components/ui/icons'
import { formatCurrency, formatPercent, pluralize } from '../../lib/format'
import type { ChallengeStats } from '../../state/useStats'
import type { PanelId } from './panels'

interface AppHeaderProps {
  challengeName: string
  stats: ChallengeStats
  onOpenPanel: (panel: PanelId) => void
}

const ACTIONS: readonly { id: PanelId; label: string; Icon: typeof ChartIcon }[] = [
  { id: 'stats', label: 'Estatísticas', Icon: ChartIcon },
  { id: 'history', label: 'Histórico', Icon: HistoryIcon },
  { id: 'settings', label: 'Configurações', Icon: SettingsIcon },
]

export function AppHeader({ challengeName, stats, onOpenPanel }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto w-full max-w-5xl px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to="/"
              className="text-[11px] font-semibold uppercase tracking-wider text-muted transition-colors duration-150 hover:text-accent"
            >
              Desafio 500
            </Link>
            <p className="truncate text-sm font-medium text-ink">{challengeName}</p>
          </div>

          <nav aria-label="Painéis do desafio" className="flex shrink-0 gap-0.5">
            {ACTIONS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onOpenPanel(id)}
                aria-label={label}
                title={label}
                className="tap-target inline-flex items-center justify-center rounded-xl text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
              >
                <Icon />
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="num text-3xl font-bold leading-none text-ink sm:text-4xl">
            {formatCurrency(stats.saved)}
          </p>
          <p className="num text-lg font-semibold leading-none text-accent">
            {formatPercent(stats.ratio)}
          </p>
        </div>

        <ProgressBar
          className="mt-3"
          value={stats.ratio}
          label={`Progresso do desafio: ${formatPercent(stats.ratio)} concluído`}
        />

        <p className="mt-2 text-xs text-muted">
          Faltam <span className="num font-medium text-ink">{formatCurrency(stats.remaining)}</span>{' '}
          · {pluralize(stats.pendingCount, 'casinha restante', 'casinhas restantes')}
        </p>
      </div>
    </header>
  )
}
