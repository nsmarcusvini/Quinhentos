import { useCallback, useRef } from 'react'
import { useToast } from '../../components/ui/Toast'
import { useCountUp } from '../../hooks/useCountUp'
import { trackEvent } from '../../lib/analytics'
import { HOUSE_COUNT, TOTAL_AMOUNT } from '../../lib/constants'
import { formatCurrency, formatCurrencyCompact, pluralize } from '../../lib/format'
import { PRICE_BRL } from '../../lib/pricing'
import { useChallenge } from '../../state/ChallengeContext'
import type { ChallengeStats } from '../../state/useStats'
import { CtaButton } from './CtaButton'
import { MiniGrid } from './MiniGrid'

const MARKS_BEFORE_NUDGE = 3

export function Hero({ stats }: { stats: ChallengeStats }) {
  const { entries, mark } = useChallenge()
  const showToast = useToast()
  const marksInSession = useRef(0)
  const nudged = useRef(false)

  const animatedTotal = useCountUp(stats.saved, 500)

  const handleMark = useCallback(
    (houseNumber: number) => {
      if (entries[houseNumber] !== undefined) return

      mark(houseNumber)
      marksInSession.current += 1
      trackEvent('demo_mark', { count: marksInSession.current, house: houseNumber })

      if (marksInSession.current >= MARKS_BEFORE_NUDGE && !nudged.current) {
        nudged.current = true
        showToast({
          title: 'Sentiu?',
          description: `Isso são ${formatCurrencyCompact(
            stats.saved + houseNumber,
          )} que existem de verdade. Faltam ${HOUSE_COUNT - stats.markedCount - 1} casinhas.`,
          durationMs: 7000,
        })
      }
    },
    [entries, mark, showToast, stats.markedCount, stats.saved],
  )

  return (
    <section className="relative overflow-hidden px-4 pb-12 pt-[max(1.75rem,env(safe-area-inset-top))]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[680px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-brand-500/10 blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
          Desafio 500 · pagamento único · sem mensalidade
        </p>

        {/* Dor primeiro. O mecanismo vem no parágrafo seguinte. */}
        <h1 className="mt-3 text-[1.75rem] font-bold leading-[1.12] tracking-tight text-ink sm:text-5xl">
          Guardar dinheiro não falha por disciplina.
          <span className="block text-accent">Falha por falta de placar.</span>
        </h1>

        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          São {HOUSE_COUNT} casinhas numeradas de 1 a {HOUSE_COUNT}. Você guarda o valor de
          verdade, risca o número e vê o total subir até{' '}
          <span className="num font-semibold text-ink">
            {formatCurrencyCompact(TOTAL_AMOUNT)}
          </span>
          . Sem banco, sem mensalidade, sem cobrança recorrente.
        </p>

        {/* A oferta aparece antes da rolagem. A demo é a razão de rolar. */}
        <div className="mt-6">
          <CtaButton position="hero" saved={stats.saved} fullWidth reassurance className="sm:w-auto" />
        </div>

        <div className="mt-8 rounded-3xl border border-line bg-surface/70 p-4 backdrop-blur sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                Experimente antes de pagar
              </p>
              <p className="num mt-1 text-3xl font-bold leading-none text-accent sm:text-4xl">
                {formatCurrency(Math.round(animatedTotal))}
              </p>
            </div>
            <p className="text-xs text-muted">
              {pluralize(stats.markedCount, 'casinha riscada', 'casinhas riscadas')} de{' '}
              {HOUSE_COUNT}
            </p>
          </div>

          <div className="mt-4">
            <MiniGrid entries={entries} onMark={handleMark} />
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted">
            Uma amostra de 50 das {HOUSE_COUNT} casinhas, funcionando de verdade. O que você
            riscar aqui fica salvo e entra no seu desafio quando você destravar.
          </p>
        </div>

        <p className="mt-6 text-sm text-muted">
          <span className="num font-semibold text-ink">{formatCurrency(PRICE_BRL)}</span> uma vez.
          Não existe plano mensal, renovação nem cobrança surpresa.
        </p>
      </div>
    </section>
  )
}
