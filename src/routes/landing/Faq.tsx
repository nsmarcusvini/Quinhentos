import { Reveal } from '../../components/Reveal'
import { ChevronDownIcon } from '../../components/ui/icons'
import { formatCurrency } from '../../lib/format'
import { TOTAL_AMOUNT } from '../../lib/constants'

const QUESTIONS: readonly { question: string; answer: string }[] = [
  {
    question: 'Não tenho R$ 500 sobrando. Dá pra fazer assim mesmo?',
    answer:
      'Dá — você nunca precisa de R$ 500 de uma vez. Cada casinha é um valor separado: dá pra começar pela 1, pela 7, pela 23. Em um mês guardando as casinhas pequenas você já tem algumas centenas de reais. As casinhas grandes ficam para os meses em que sobrar mais.',
  },
  {
    question: 'E se eu pular uma semana?',
    answer:
      'Nada acontece. Não existe prazo, multa nem sequência quebrada que te elimina. O desafio é seu: some as casinhas quando puder e pule quando não der. O app continua exatamente onde você parou.',
  },
  {
    question: 'É pago? Tem anúncio?',
    answer:
      'Não e não. O Desafio 500 é gratuito, não pede cadastro, não pede e-mail, não tem anúncio e não se conecta a nenhum banco. Ele é só um placar bonito para um dinheiro que continua sendo seu, onde você quiser guardá-lo.',
  },
  {
    question: 'Onde ficam meus dados?',
    answer:
      'No seu próprio aparelho, no armazenamento local do navegador. Nada é enviado para servidor nenhum — não existe conta, não existe nuvem. Nas configurações você exporta um arquivo JSON de backup e importa quando trocar de celular.',
  },
  {
    question: 'Funciona offline?',
    answer:
      'Sim. Depois da primeira visita o app fica instalado no aparelho e abre sem internet — no ônibus, no avião, no elevador. Marcar casinhas funciona normalmente offline; tudo fica salvo localmente.',
  },
  {
    question: 'Por que exatamente R$ 125.250?',
    answer: `Porque é a soma de todos os números de 1 a 500 — 500 × 501 ÷ 2, que dá ${formatCurrency(TOTAL_AMOUNT)}. Riscando as 500 casinhas você necessariamente guardou esse valor.`,
  },
]

export function Faq() {
  return (
    <section className="px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Perguntas honestas
          </h2>
        </Reveal>

        <div className="mt-6 space-y-2">
          {QUESTIONS.map(({ question, answer }) => (
            <details
              key={question}
              className="group rounded-2xl border border-line bg-surface transition-colors duration-150 open:border-brand-500/40"
            >
              <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-left text-sm font-semibold text-ink marker:content-none [&::-webkit-details-marker]:hidden">
                {question}
                <ChevronDownIcon
                  width={18}
                  height={18}
                  className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <p className="px-4 pb-4 text-sm leading-relaxed text-muted">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
