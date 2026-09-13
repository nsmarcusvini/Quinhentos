import { useStats } from '../../state/useStats'
import { Faq } from './Faq'
import { FinalCta } from './FinalCta'
import { GoalCalculator } from './GoalCalculator'
import { Hero } from './Hero'
import { HowItWorks } from './HowItWorks'
import { LoopGrid } from './LoopGrid'
import { MilestonesTimeline } from './MilestonesTimeline'
import { StickyCta } from './StickyCta'

export default function LandingPage() {
  const stats = useStats()

  return (
    <div className="min-h-dvh bg-bg pb-20 sm:pb-0">
      <main id="conteudo">
        <Hero stats={stats} />
        <HowItWorks />
        <GoalCalculator stats={stats} />
        <LoopGrid />
        <MilestonesTimeline stats={stats} />
        <Faq />
        <FinalCta stats={stats} />
      </main>

      <footer className="border-t border-line px-4 py-8 text-center text-xs text-muted">
        <p>
          Desafio 500 — seus dados ficam no seu aparelho. Feito para quem quer ver o dinheiro
          crescer sem depender de mais um cadastro.
        </p>
      </footer>

      <StickyCta stats={stats} />
    </div>
  )
}
