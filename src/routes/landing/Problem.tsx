import { Reveal } from '../../components/Reveal'
import { HOUSE_COUNT } from '../../lib/constants'

const REASONS = [
  {
    title: 'O dinheiro guardado é invisível',
    text: 'No app do banco, R$ 300 separados viram mais um número no meio de outros vinte. Você não vê que avançou — e o que não dá sensação de progresso ninguém repete.',
  },
  {
    title: 'Não existe linha de chegada',
    text: '"Guardar dinheiro" é uma tarefa sem fim. Sem um fim visível, todo mês é um mês razoável para pular, e pular uma vez vira pular sempre.',
  },
  {
    title: 'Um mês ruim vira desistência',
    text: 'Meta mensal fixa pune quem falha uma vez. Você fura, sente que está devendo, e abandona — não porque não dá, mas porque a régua não perdoa.',
  },
] as const

export function Problem() {
  return (
    <section className="border-y border-line bg-surface/40 px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Você já tentou. Não foi culpa sua.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Quase todo mundo já abriu uma poupança com a melhor das intenções e parou no segundo
            mês. Três coisas costumam estar por trás disso — e nenhuma delas é força de vontade.
          </p>
        </Reveal>

        <div className="mt-8 space-y-3">
          {REASONS.map(({ title, text }, index) => (
            <Reveal key={title} delay={index * 0.1} className="card p-5">
              <h3 className="text-lg font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3}>
          <p className="mt-8 rounded-2xl border border-brand-500/30 bg-brand-500/5 p-5 text-sm leading-relaxed text-ink sm:text-base">
            O Desafio 500 ataca os três de uma vez: cada casinha riscada é{' '}
            <strong className="font-semibold">visível</strong>, a linha de chegada tem{' '}
            <strong className="font-semibold">{HOUSE_COUNT} passos contados</strong>, e pular uma
            semana <strong className="font-semibold">não quebra nada</strong> — a ordem é livre e
            não existe prazo.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
