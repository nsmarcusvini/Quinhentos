import { useCallback, useRef } from 'react'
import { useToast } from '../../components/ui/Toast'
import { useCountUp } from '../../hooks/useCountUp'
import { HOUSE_COUNT, TOTAL_AMOUNT } from '../../lib/constants'
import { formatCurrency, formatCurrencyCompact, pluralize } from '../../lib/format'
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

      if (marksInSession.current >= MARKS_BEFORE_NUDGE && !nudged.current) {
        nudged.current = true
        const total = stats.saved + houseNumber
        showToast({
          title: 'Boa! Já começou.',
          description: `Continue no app completo e leve esses ${formatCurrencyCompact(total)} com você.`,
          durationMs: 7000,
        })
      }
    },
    [entries, mark, showToast, stats.saved],
  )

  return (
    <section className="relative overflow-hidden px-4 pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
      {/* brilho de fundo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[680px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-brand-500/10 blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500">
          Desafio 500 · grátis e sem cadastro
        </p>

        <h1 className="mt-3 text-3xl font-bold leading-[1.12] tracking-tight text-ink sm:text-5xl">
          Junte{' '}
          <span className="num text-brand-400">{formatCurrencyCompact(TOTAL_AMOUNT)}</span> riscando
          um número por vez
        </h1>

        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          São {HOUSE_COUNT} casinhas numeradas de 1 a {HOUSE_COUNT}. Cada número é um valor em
          reais: você guarda a quantia de verdade e risca a casinha. Na ordem que quiser, no ritmo
          que der.
        </p>

        <div className="mt-7 rounded-3xl border border-line bg-surface/70 p-4 backdrop-blur sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                Experimente agora — vale de verdade
              </p>
              <p className="num mt-1 text-3xl font-bold leading-none text-brand-400 sm:text-4xl">
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
            Uma amostra das {HOUSE_COUNT} casinhas. O que você riscar aqui já fica salvo e aparece
            no app.
          </p>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <CtaButton saved={stats.saved} />
          <p className="text-xs text-muted sm:max-w-[14rem]">
            Funciona offline, instala no celular e os dados ficam só com você.
          </p>
        </div>
      </div>
    </section>
  )
}
