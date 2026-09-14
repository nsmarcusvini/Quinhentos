import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { trackOnce } from '../../lib/analytics'
import { useStats } from '../../state/useStats'
import type { ChallengeStats } from '../../state/useStats'
import { BarraTopo } from './BarraTopo'
import { CtaButton } from './CtaButton'
import { Faq } from './Faq'
import { FinalCta } from './FinalCta'
import { GoalCalculator } from './GoalCalculator'
import { Hero } from './Hero'
import { HowItWorks } from './HowItWorks'
import { LoopGrid } from './LoopGrid'
import { MilestonesTimeline } from './MilestonesTimeline'
import { PriceBlock } from './PriceBlock'
import { Problem } from './Problem'
import { StickyCta } from './StickyCta'
import { WhatYouGet } from './WhatYouGet'

/** CTA de intervalo: numa página de vendas longa ele repete depois de cada bloco de valor. */
function CtaBreak({ position, stats }: { position: string; stats: ChallengeStats }) {
  return (
    <div className="flex justify-center px-4 pb-12 sm:pb-16">
      <CtaButton position={position} saved={stats.saved} reassurance />
    </div>
  )
}

export default function LandingPage() {
  const stats = useStats()

  useEffect(() => {
    trackOnce('landing_view')
  }, [])

  return (
    <div className="min-h-dvh bg-bg pb-20 sm:pb-0">
      <BarraTopo />

      <main id="conteudo">
        {/* dor → mecanismo → payoff → oferta → objeção → fechamento */}
        <Hero stats={stats} />
        <Problem />
        <HowItWorks />
        <CtaBreak position="apos_como_funciona" stats={stats} />
        <GoalCalculator stats={stats} />
        <CtaBreak position="apos_calculadora" stats={stats} />
        <MilestonesTimeline stats={stats} />
        <LoopGrid />
        <WhatYouGet stats={stats} />
        <PriceBlock stats={stats} />
        <Faq />
        <FinalCta stats={stats} />
      </main>

      <footer className="border-t border-line px-4 py-8 text-center text-xs text-muted">
        <p className="mx-auto max-w-md leading-relaxed">
          Desafio 500 — mensal ou pagamento único, você escolhe. Seu progresso fica no aparelho e
          na sua conta, para voltar em qualquer celular.
        </p>
        <nav aria-label="Documentos" className="mt-4 flex justify-center gap-5">
          <Link to="/termos" className="underline underline-offset-2 hover:text-ink">
            Termos de uso
          </Link>
          <Link to="/privacidade" className="underline underline-offset-2 hover:text-ink">
            Privacidade
          </Link>
        </nav>
      </footer>

      <StickyCta stats={stats} />
    </div>
  )
}
