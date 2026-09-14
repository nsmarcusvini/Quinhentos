import { useId, useMemo, useState, type CSSProperties } from 'react'
import { useCountUp } from '../../hooks/useCountUp'
import { trackOnce } from '../../lib/analytics'
import { addDays, formatLongDate } from '../../lib/date'
import { formatCurrency, formatCurrencyCompact, formatInteger } from '../../lib/format'
import type { ChallengeStats } from '../../state/useStats'

const MIN_PER_WEEK = 50
const MAX_PER_WEEK = 1500
const STEP = 10
const WEEKS_PER_MONTH = 52 / 12

/** "68 semanas" vira "1 ano e 4 meses". */
function describeDuration(weeks: number): string {
  if (weeks <= 1) return 'menos de uma semana'
  if (weeks < 9) return `${formatInteger(weeks)} semanas`

  const months = Math.round(weeks / WEEKS_PER_MONTH)
  if (months < 12) return `${formatInteger(months)} meses`

  const years = Math.floor(months / 12)
  const restMonths = months % 12
  const yearLabel = years === 1 ? '1 ano' : `${formatInteger(years)} anos`
  if (restMonths === 0) return yearLabel

  return `${yearLabel} e ${restMonths === 1 ? '1 mês' : `${formatInteger(restMonths)} meses`}`
}

export function GoalCalculator({ stats }: { stats: ChallengeStats }) {
  const [perWeek, setPerWeek] = useState(200)
  const sliderId = useId()

  const { weeks, finishAt, perMonth } = useMemo(() => {
    const totalWeeks = Math.max(1, Math.ceil(stats.remaining / perWeek))
    return {
      weeks: totalWeeks,
      finishAt: addDays(Date.now(), totalWeeks * 7),
      perMonth: perWeek * WEEKS_PER_MONTH,
    }
  }, [perWeek, stats.remaining])

  const animatedWeeks = useCountUp(weeks, 450)
  const progressPercent = ((perWeek - MIN_PER_WEEK) / (MAX_PER_WEEK - MIN_PER_WEEK)) * 100

  return (
    <section className="px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Quanto tempo isso leva pra você?
        </h2>
        <p className="mt-2 text-sm text-muted sm:text-base">
          Arraste e veja quando você fecha {formatCurrencyCompact(stats.remaining)}.
        </p>

        <div className="card mt-6 p-5 sm:p-6">
          <label htmlFor={sliderId} className="text-sm font-medium text-ink">
            Quanto você guarda por semana?
          </label>

          <p className="num mt-1 text-3xl font-bold text-accent">{formatCurrency(perWeek)}</p>

          <input
            id={sliderId}
            type="range"
            min={MIN_PER_WEEK}
            max={MAX_PER_WEEK}
            step={STEP}
            value={perWeek}
            onChange={(event) => {
              setPerWeek(Number(event.target.value))
              trackOnce('calc_interact')
            }}
            aria-valuetext={`${formatCurrency(perWeek)} por semana`}
            className="mt-4 h-11 w-full cursor-pointer appearance-none bg-transparent"
            style={{ '--progress': `${progressPercent}%` } as CSSProperties}
          />

          <div className="flex justify-between text-xs text-muted">
            <span>{formatCurrencyCompact(MIN_PER_WEEK)}</span>
            <span>{formatCurrencyCompact(MAX_PER_WEEK)}</span>
          </div>

          <div
            aria-live="polite"
            className="mt-5 grid gap-3 border-t border-line pt-5 sm:grid-cols-3"
          >
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">Tempo até concluir</p>
              <p className="num mt-1 text-xl font-semibold text-ink">
                {describeDuration(Math.round(animatedWeeks))}
              </p>
              <p className="num mt-0.5 text-xs text-muted">
                {formatInteger(Math.round(animatedWeeks))} semanas
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">Data estimada</p>
              <p className="mt-1 text-xl font-semibold text-ink">{formatLongDate(finishAt)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">Equivale por mês</p>
              <p className="num mt-1 text-xl font-semibold text-ink">
                {formatCurrencyCompact(perMonth)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
