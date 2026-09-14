import { useEffect, useRef } from 'react'
import { Reveal } from '../../components/Reveal'
import { CheckIcon, WifiOffIcon } from '../../components/ui/icons'
import { trackOnce } from '../../lib/analytics'
import { HOUSE_COUNT, TOTAL_AMOUNT } from '../../lib/constants'
import { formatCurrency, formatCurrencyCompact } from '../../lib/format'
import { MONTHLY_ANCHOR_BRL, PRICE_BRL } from '../../lib/pricing'
import type { ChallengeStats } from '../../state/useStats'
import { CtaButton } from './CtaButton'

export function PriceBlock({ stats }: { stats: ChallengeStats }) {
  const sectionRef = useRef<HTMLElement>(null)

  // Ver o preço é o evento que separa curioso de comprador.
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) trackOnce('price_view')
      },
      { threshold: 0.4 },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  const yearlyAnchor = MONTHLY_ANCHOR_BRL * 12

  return (
    <section ref={sectionRef} className="px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <Reveal>
          <div className="overflow-hidden rounded-3xl border border-brand-500/30 bg-gradient-to-b from-brand-500/12 to-transparent p-6 text-center sm:p-9">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Acesso completo
            </p>

            <p className="num mt-4 text-5xl font-bold leading-none text-ink sm:text-6xl">
              {formatCurrency(PRICE_BRL)}
            </p>
            <p className="mt-2 text-sm font-medium text-ink">
              Pagamento único · acesso vitalício
            </p>

            <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted">
              Apps de controle financeiro no Brasil custam de {formatCurrencyCompact(12.9)} a{' '}
              {formatCurrencyCompact(MONTHLY_ANCHOR_BRL)} <strong>por mês</strong> — mais de{' '}
              {formatCurrencyCompact(yearlyAnchor)} em um ano. Aqui você paga uma vez e acabou.
            </p>

            <div className="mt-7">
              <CtaButton position="price_block" saved={stats.saved} fullWidth />
            </div>

            <div className="mt-6 flex flex-col gap-2 text-left sm:mx-auto sm:max-w-sm">
              {[
                'Sem mensalidade, sem renovação automática',
                'Acesso vitalício — paga uma vez e é seu',
                'Sem anúncio e sem conexão com o seu banco',
                'Funciona offline depois de instalado',
              ].map((item) => (
                <p key={item} className="flex items-start gap-2 text-sm text-muted">
                  <CheckIcon
                    width={16}
                    height={16}
                    strokeWidth={3}
                    className="mt-0.5 shrink-0 text-accent"
                  />
                  {item}
                </p>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Transparência no lugar de prova social que não existe. */}
        <Reveal delay={0.15}>
          <div className="card mt-4 p-5 sm:p-6">
            <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
              <WifiOffIcon width={18} height={18} className="text-accent" />
              Por que confiar numa página recém-nascida
            </h3>

            <p className="mt-3 text-sm leading-relaxed text-muted">
              Este produto acabou de sair. Não tenho depoimento de cliente para te mostrar e não
              vou inventar nenhum — a mentira seria óbvia: juntar{' '}
              {formatCurrencyCompact(TOTAL_AMOUNT)} leva anos, então ninguém no mundo terminou
              este desafio ainda.
            </p>

            <p className="mt-3 text-sm leading-relaxed text-muted">O que eu tenho no lugar:</p>

            <ul className="mt-2 space-y-2 text-sm leading-relaxed text-muted">
              <li>
                <strong className="font-semibold text-ink">A conta é conferível.</strong> Some os
                números de 1 a {HOUSE_COUNT} — ou use a fórmula, {HOUSE_COUNT} × {HOUSE_COUNT + 1}{' '}
                ÷ 2. Dá {formatCurrencyCompact(TOTAL_AMOUNT)}, exatamente o que a página promete.
              </li>
              <li>
                <strong className="font-semibold text-ink">A demo é o app de verdade.</strong> O
                grid lá em cima não é vídeo nem imagem: é o produto rodando, e o que você riscou
                continua salvo.
              </li>
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
