import { TOTAL_AMOUNT } from './constants'

export interface Milestone {
  amount: number
  /** Nome curto do marco. */
  title: string
  /** O que esse dinheiro significa na vida real. */
  anchor: string
}

/**
 * Marcos do desafio. Cada valor é ancorado em algo concreto para que o número
 * deixe de ser abstrato — é o que sustenta a motivação no meio do caminho.
 */
export const MILESTONES: readonly Milestone[] = Object.freeze([
  {
    amount: 1_000,
    title: 'O primeiro fôlego',
    anchor: 'Dá pra resolver o pneu furado ou a ida ao pronto-socorro sem recorrer ao cartão.',
  },
  {
    amount: 5_000,
    title: 'Um mês tranquilo',
    anchor: 'Um mês inteiro de aluguel, mercado e contas pagos sem depender de ninguém.',
  },
  {
    amount: 10_000,
    title: 'Reserva de verdade',
    anchor: 'Cerca de três meses de despesas para quem gasta R$ 3.300 por mês.',
  },
  {
    amount: 25_000,
    title: 'A entrada do carro',
    anchor: 'Entrada de um seminovo — ou aquele curso técnico que você adia há anos.',
  },
  {
    amount: 50_000,
    title: 'A obra que faltava',
    anchor: 'Reforma completa da cozinha e do banheiro, à vista, sem financiamento.',
  },
  {
    amount: 100_000,
    title: 'A entrada do apartamento',
    anchor: 'Entrada de um imóvel de R$ 500 mil — a conversa com o banco muda de tom.',
  },
  {
    amount: TOTAL_AMOUNT,
    title: 'Desafio completo',
    anchor: 'As 500 casinhas riscadas. R$ 125.250 que você juntou R$ 1 por vez.',
  },
])

export const nextMilestone = (saved: number): Milestone | null =>
  MILESTONES.find((milestone) => milestone.amount > saved) ?? null

export const reachedMilestones = (saved: number): Milestone[] =>
  MILESTONES.filter((milestone) => saved >= milestone.amount)
