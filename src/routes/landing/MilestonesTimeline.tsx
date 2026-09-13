import { Reveal } from '../../components/Reveal'
import { CheckIcon } from '../../components/ui/icons'
import { cn } from '../../lib/cn'
import { formatCurrencyCompact } from '../../lib/format'
import { MILESTONES } from '../../lib/milestones'
import { TOTAL_AMOUNT } from '../../lib/constants'
import type { ChallengeStats } from '../../state/useStats'

export function MilestonesTimeline({ stats }: { stats: ChallengeStats }) {
  return (
    <section className="border-y border-line bg-surface/40 px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            O caminho até {formatCurrencyCompact(TOTAL_AMOUNT)}
          </h2>
          <p className="mt-2 text-sm text-muted sm:text-base">
            Cada marco é um pedaço concreto de vida, não só um número maior.
          </p>
        </Reveal>

        <ol className="mt-8 space-y-0">
          {MILESTONES.map((milestone, index) => {
            const reached = stats.saved >= milestone.amount
            const isLast = index === MILESTONES.length - 1

            return (
              <li key={milestone.amount} className="relative flex gap-4 pb-6 last:pb-0">
                {/* trilho */}
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute left-[15px] top-9 h-[calc(100%-1.5rem)] w-0.5 rounded-full',
                      reached ? 'bg-brand-500/60' : 'bg-line',
                    )}
                  />
                )}

                <span
                  aria-hidden="true"
                  className={cn(
                    'relative z-10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
                    reached
                      ? 'border-brand-500 bg-brand-500 text-[#06210F]'
                      : 'border-line bg-surface text-muted',
                  )}
                >
                  {reached ? (
                    <CheckIcon width={16} height={16} strokeWidth={3} />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-current" />
                  )}
                </span>

                <Reveal delay={Math.min(index, 4) * 0.06} className="flex-1">
                  <div
                    className={cn(
                      'rounded-2xl border p-4',
                      reached ? 'border-brand-500/40 bg-brand-500/5' : 'border-line bg-surface',
                    )}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <p className="num text-xl font-bold text-ink">
                        {formatCurrencyCompact(milestone.amount)}
                        <span className="ml-2 text-sm font-semibold text-muted">
                          {milestone.title}
                        </span>
                      </p>
                      {reached && (
                        <p className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand-500">
                          Conquistado
                        </p>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{milestone.anchor}</p>
                  </div>
                </Reveal>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
