import { Suspense, lazy } from 'react'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { formatDate } from '../../lib/date'
import {
  formatCurrency,
  formatCurrencyCompact,
  formatInteger,
  formatPercent,
} from '../../lib/format'
import type { ChallengeStats } from '../../state/useStats'

const SavingsChart = lazy(() => import('./SavingsChart'))

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3.5">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="num mt-1 text-lg font-semibold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}

export function StatsPanel({ stats }: { stats: ChallengeStats }) {
  if (stats.markedCount === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
        Marque a primeira casinha para começar a ver seus números aqui.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <section>
        <div className="flex items-baseline justify-between gap-3">
          <p className="num text-2xl font-bold text-ink">{formatCurrency(stats.saved)}</p>
          <p className="num text-sm font-semibold text-brand-500">{formatPercent(stats.ratio)}</p>
        </div>
        <ProgressBar
          className="mt-2"
          value={stats.ratio}
          label={`Progresso do desafio: ${formatPercent(stats.ratio)}`}
        />
        <p className="mt-2 text-xs text-muted">
          Faltam <span className="num text-ink">{formatCurrency(stats.remaining)}</span> para
          fechar o desafio.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-2.5">
        <Stat label="Guardadas" value={formatInteger(stats.markedCount)} hint="de 500 casinhas" />
        <Stat label="Pendentes" value={formatInteger(stats.pendingCount)} hint="ainda por riscar" />
        <Stat
          label="Média semanal"
          value={formatCurrencyCompact(stats.weeklyAverage)}
          hint={`em ${formatInteger(stats.activeDays)} dias de desafio`}
        />
        <Stat
          label="Dias seguidos"
          value={formatInteger(stats.streakDays)}
          hint="com pelo menos uma marcação"
        />
        <Stat
          label="Maior pendente"
          value={stats.largestPending ? formatCurrencyCompact(stats.largestPending) : '—'}
          hint="a casinha mais cara que sobrou"
        />
        <Stat
          label="Menor pendente"
          value={stats.smallestPending ? formatCurrencyCompact(stats.smallestPending) : '—'}
          hint="a mais fácil de riscar hoje"
        />
      </section>

      <section className="rounded-2xl border border-line bg-surface p-3.5">
        <p className="text-xs uppercase tracking-wider text-muted">Projeção de conclusão</p>
        {stats.isComplete ? (
          <p className="mt-1 text-lg font-semibold text-brand-500">
            Desafio completo. Todas as 500 riscadas.
          </p>
        ) : stats.projectedFinishAt ? (
          <>
            <p className="mt-1 text-lg font-semibold text-ink">
              {formatDate(stats.projectedFinishAt)}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              Mantendo o ritmo de {formatCurrencyCompact(stats.weeklyAverage)} por semana.
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted">Marque mais casinhas para estimar uma data.</p>
        )}
      </section>

      <section>
        <p className="mb-2 text-xs uppercase tracking-wider text-muted">Acumulado ao longo do tempo</p>
        <div className="rounded-2xl border border-line bg-surface p-3">
          <Suspense
            fallback={<div className="h-56 animate-pulse rounded-xl bg-surface-2" aria-hidden />}
          >
            <SavingsChart data={stats.chart} />
          </Suspense>
        </div>
      </section>
    </div>
  )
}
