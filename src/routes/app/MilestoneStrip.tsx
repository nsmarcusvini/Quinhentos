import { ProgressBar } from '../../components/ui/ProgressBar'
import { FlameIcon, TrophyIcon } from '../../components/ui/icons'
import { formatCurrencyCompact, pluralize } from '../../lib/format'
import type { ChallengeStats } from '../../state/useStats'

/** Faixa de gamificação: dias seguidos e o próximo marco à vista. */
export function MilestoneStrip({ stats }: { stats: ChallengeStats }) {
  const milestone = stats.next
  const previousAmount = stats.reached.at(-1)?.amount ?? 0
  const span = milestone ? milestone.amount - previousAmount : 1
  const progress = milestone ? (stats.saved - previousAmount) / span : 1

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {stats.streakDays > 0 && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-3.5 py-3 sm:min-w-[11rem]">
          <FlameIcon width={18} height={18} className="shrink-0 text-gold" />
          <div>
            <p className="num text-sm font-semibold text-ink">
              {pluralize(stats.streakDays, 'dia seguido', 'dias seguidos')}
            </p>
            <p className="text-xs text-muted">com pelo menos uma casinha</p>
          </div>
        </div>
      )}

      {milestone && (
        <div className="flex-1 rounded-2xl border border-line bg-surface px-3.5 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <TrophyIcon width={16} height={16} className="shrink-0 text-gold" />
              Próximo marco: {formatCurrencyCompact(milestone.amount)}
            </p>
            <p className="num shrink-0 text-xs text-muted">
              faltam {formatCurrencyCompact(milestone.amount - stats.saved)}
            </p>
          </div>
          <ProgressBar
            size="sm"
            className="mt-2"
            value={progress}
            label={`Progresso até o marco de ${formatCurrencyCompact(milestone.amount)}`}
          />
        </div>
      )}
    </div>
  )
}
