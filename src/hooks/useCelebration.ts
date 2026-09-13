import { useEffect, useRef } from 'react'
import { useConfetti } from '../components/Confetti'
import { useToast } from '../components/ui/Toast'
import { formatCurrencyCompact, formatInteger } from '../lib/format'
import type { ChallengeStats } from '../state/useStats'

/**
 * Confete a cada 10% e aviso quando um marco cai.
 * Os refs começam no estado atual, então abrir o app não dispara nada.
 */
export function useCelebration(stats: ChallengeStats): void {
  const fireConfetti = useConfetti()
  const showToast = useToast()

  const lastDecile = useRef(Math.floor(stats.ratio * 10))
  const lastMilestoneCount = useRef(stats.reached.length)

  useEffect(() => {
    const decile = Math.floor(stats.ratio * 10)
    const milestoneCount = stats.reached.length

    const crossedDecile = decile > lastDecile.current
    const crossedMilestone = milestoneCount > lastMilestoneCount.current

    if (crossedDecile || crossedMilestone) {
      fireConfetti(stats.isComplete ? 220 : crossedMilestone ? 140 : 90)
    }

    if (crossedMilestone) {
      const milestone = stats.reached[milestoneCount - 1]
      if (milestone) {
        showToast({
          title: stats.isComplete
            ? 'Desafio completo! 500 de 500.'
            : `Marco batido: ${formatCurrencyCompact(milestone.amount)}`,
          description: milestone.anchor,
          durationMs: 7000,
        })
      }
    } else if (crossedDecile) {
      showToast({
        title: `${formatInteger(decile * 10)}% do desafio concluído`,
        description: `Você já guardou ${formatCurrencyCompact(stats.saved)}. Continue.`,
      })
    }

    lastDecile.current = decile
    lastMilestoneCount.current = milestoneCount
  }, [fireConfetti, showToast, stats.isComplete, stats.ratio, stats.reached, stats.saved])
}
