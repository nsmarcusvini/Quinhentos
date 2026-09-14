import { Reveal } from '../../components/Reveal'
import { CheckIcon } from '../../components/ui/icons'
import { HOUSE_COUNT } from '../../lib/constants'
import { formatCurrency } from '../../lib/format'
import { PLANO_MENSAL } from '../../lib/pricing'
import type { ChallengeStats } from '../../state/useStats'
import { CtaButton } from './CtaButton'

const ITEMS = [
  {
    title: `As ${HOUSE_COUNT} casinhas, com progresso salvo`,
    text: 'Marque na ordem que quiser. O total, o percentual e o que falta aparecem sempre no topo.',
  },
  {
    title: 'Estatísticas do seu ritmo',
    text: 'Média semanal, projeção de quando você conclui, maior e menor casinha pendente, e o gráfico do acumulado ao longo do tempo.',
  },
  {
    title: 'Histórico com data e hora',
    text: 'Cada lançamento registrado, do mais recente ao mais antigo, com desfazer por item.',
  },
  {
    title: 'Sorteio, filtro e busca',
    text: 'Sem ideia de qual marcar? O sorteio escolhe uma pendente. Filtre por guardadas ou pendentes, ou vá direto a um número.',
  },
  {
    title: 'Marcos e comemoração',
    text: 'Confete a cada 10%, marcos ancorados em coisas reais e contador de dias seguidos.',
  },
  {
    title: 'Instala no celular e funciona offline',
    text: 'Vira ícone na tela inicial e abre sem internet — no ônibus, no elevador, no avião.',
  },
  {
    title: 'Backup que é seu de verdade',
    text: 'Exporte um arquivo JSON quando quiser e importe em outro aparelho. Seus dados não ficam reféns de ninguém.',
  },
  {
    title: 'Você escolhe como paga',
    text: 'Mensal para começar barato e cancelar sozinho quando quiser, ou pagamento único e o acesso é seu para sempre. Sem upsell depois, sem versão premium escondida.',
  },
] as const

export function WhatYouGet({ stats }: { stats: ChallengeStats }) {
  return (
    <section className="px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            O que entra a partir de {formatCurrency(PLANO_MENSAL.preco)}
          </h2>
          <p className="mt-2 text-sm text-muted sm:text-base">Uma vez. Para sempre.</p>
        </Reveal>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {ITEMS.map(({ title, text }, index) => (
            <li key={title}>
              <Reveal delay={Math.min(index, 5) * 0.06} className="card h-full p-4">
                <div className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/12 text-accent"
                  >
                    <CheckIcon width={14} height={14} strokeWidth={3} />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
                  </div>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>

        <Reveal delay={0.2} className="mt-8">
          <CtaButton position="what_you_get" saved={stats.saved} reassurance />
        </Reveal>
      </div>
    </section>
  )
}
