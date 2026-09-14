import { Reveal } from '../../components/Reveal'
import { ChevronDownIcon } from '../../components/ui/icons'
import { trackEvent } from '../../lib/analytics'
import { HOUSE_COUNT, TOTAL_AMOUNT } from '../../lib/constants'
import { formatCurrency, formatCurrencyCompact } from '../../lib/format'
import { GUARANTEE_DAYS, PRICE_BRL, SUPPORT_EMAIL } from '../../lib/pricing'

const QUESTIONS: readonly { id: string; question: string; answer: string }[] = [
  {
    id: 'formas-de-pagamento',
    question: 'Quais formas de pagamento você aceita?',
    answer:
      'Pix e cartão de crédito. No Pix o QR code aparece dentro do próprio app — você não sai para lugar nenhum — e o acesso libera assim que o pagamento cai, normalmente em segundos. No cartão, o acesso libera na hora da aprovação.',
  },
  {
    id: 'cobranca',
    question: `${formatCurrency(PRICE_BRL)} é uma vez só mesmo? Não vem cobrança depois?`,
    answer:
      'Uma vez só. Não existe plano mensal, renovação automática, versão premium ou upsell depois. Você paga — no Pix ou no cartão — recebe o acesso e ele é seu, inclusive se trocar de celular. Se algum dia aparecer uma cobrança recorrente com esse nome no seu cartão, não fui eu.',
  },
  {
    id: 'garantia',
    question: 'E se eu não gostar?',
    answer: `Você tem ${GUARANTEE_DAYS} dias para pedir o dinheiro de volta, sem precisar justificar e sem formulário de retenção. Um e-mail para ${SUPPORT_EMAIL} resolve. Prefiro devolver ${formatCurrency(PRICE_BRL)} a ter alguém carregando um app que não usa.`,
  },
  {
    id: 'por-que-pago',
    question: 'Por que não é de graça?',
    answer:
      'Porque as alternativas para ser de graça são piores: anúncio no meio do seu progresso, venda dos seus dados, ou conexão com o seu banco para monetizar depois. Não faço nenhuma das três. Alguém precisa pagar pelo app, e prefiro que seja você, uma vez, sabendo exatamente quanto.',
  },
  {
    id: 'sem-sobra',
    question: 'Não tenho R$ 500 sobrando. Dá pra fazer assim mesmo?',
    answer: `Dá — você nunca precisa de R$ 500 de uma vez. Cada casinha é um valor separado: dá pra começar pela 1, pela 7, pela 23. Em um mês guardando as casinhas pequenas você já tem algumas centenas de reais. As casinhas grandes ficam para os meses em que sobrar mais.`,
  },
  {
    id: 'pular',
    question: 'E se eu pular uma semana?',
    answer:
      'Nada acontece. Não existe prazo, multa nem sequência quebrada que te elimina. O desafio é seu: some as casinhas quando puder e pule quando não der. O app continua exatamente onde você parou.',
  },
  {
    id: 'trocar-aparelho',
    question: 'Perco o acesso se trocar de celular ou limpar o navegador?',
    answer:
      'Não. Seu acesso e seu progresso ficam na conta que você cria antes de pagar — no aparelho novo é só entrar com o mesmo e-mail e senha, e tudo volta no lugar. Não existe código para guardar nem arquivo para transferir.',
  },
  {
    id: 'dados',
    question: 'Onde ficam meus dados?',
    answer:
      'Por padrão, as casinhas ficam só no armazenamento local do seu navegador — não sobem para servidor nenhum. Se você criar a conta opcional, aí sim o desafio passa a ser copiado para a nuvem, porque é isso que permite recuperá-lo em outro aparelho. Você escolhe: sem conta, nada sai daqui.',
  },
  {
    id: 'offline',
    question: 'Funciona offline?',
    answer:
      'Sim. Depois de desbloqueado, o app fica instalado no aparelho e abre sem internet — no ônibus, no avião, no elevador. Marcar casinhas funciona normalmente offline e tudo fica salvo localmente.',
  },
  {
    id: 'matematica',
    question: `Por que exatamente ${formatCurrencyCompact(TOTAL_AMOUNT)}?`,
    answer: `Porque é a soma de todos os números de 1 a ${HOUSE_COUNT} — ${HOUSE_COUNT} × ${HOUSE_COUNT + 1} ÷ 2, que dá ${formatCurrency(TOTAL_AMOUNT)}. Riscando as ${HOUSE_COUNT} casinhas você necessariamente guardou esse valor. Pode conferir na calculadora.`,
  },
]

export function Faq() {
  return (
    <section className="border-y border-line bg-surface/40 px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Perguntas honestas
          </h2>
        </Reveal>

        <div className="mt-6 space-y-2">
          {QUESTIONS.map(({ id, question, answer }) => (
            <details
              key={id}
              onToggle={(event) => {
                if (event.currentTarget.open) trackEvent('faq_open', { question: id })
              }}
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
