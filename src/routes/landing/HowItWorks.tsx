import { Reveal } from '../../components/Reveal'
import { CheckIcon, DiceIcon, TargetIcon } from '../../components/ui/icons'

const STEPS = [
  {
    Icon: DiceIcon,
    title: 'Escolha um número',
    text: 'Qualquer casinha de 1 a 500, na ordem que quiser. Sem ideia? O botão Sortear escolhe uma pendente pra você.',
  },
  {
    Icon: TargetIcon,
    title: 'Guarde o valor de verdade',
    text: 'Separe a quantia na poupança, no cofrinho ou numa conta à parte. O app não mexe no seu dinheiro — ele só marca o placar.',
  },
  {
    Icon: CheckIcon,
    title: 'Risque a casinha',
    text: 'Toque nela e veja o total subir na hora. O progresso fica salvo no seu aparelho, mesmo sem internet.',
  },
] as const

export function HowItWorks() {
  return (
    <section className="border-y border-line bg-surface/40 px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-4xl">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Como funciona</h2>
          <p className="mt-2 text-sm text-muted sm:text-base">Três passos. Nada além disso.</p>
        </Reveal>

        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ Icon, title, text }, index) => (
            <li key={title} className="h-full">
              <Reveal delay={index * 0.12} className="card h-full p-5">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/12 text-brand-400"
                  >
                    <Icon />
                  </span>
                  <span className="num text-sm font-semibold text-muted">
                    Passo {index + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
