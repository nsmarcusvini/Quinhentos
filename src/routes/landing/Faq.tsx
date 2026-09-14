import { Reveal } from '../../components/Reveal'
import { ChevronDownIcon } from '../../components/ui/icons'
import { trackEvent } from '../../lib/analytics'
import { HOUSE_COUNT, TOTAL_AMOUNT } from '../../lib/constants'
import { formatCurrency, formatCurrencyCompact } from '../../lib/format'
import {
  GUARANTEE_DAYS,
  MESES_ATE_EMPATAR,
  PLANO_MENSAL,
  PLANO_VITALICIO,
  SUPPORT_EMAIL,
} from '../../lib/pricing'

const QUESTIONS: readonly { id: string; question: string; answer: string }[] = [
  {
    id: 'formas-de-pagamento',
    question: 'Quais formas de pagamento você aceita?',
    answer:
      'Pix e cartão de crédito. No Pix o QR code aparece dentro do próprio app — você não sai para lugar nenhum — e o acesso libera assim que o pagamento cai, normalmente em segundos. No cartão, o acesso libera na hora da aprovação.',
  },
  {
    id: 'cobranca',
    question: 'Qual a diferença entre o mensal e o vitalício?',
    answer: `Só a forma de pagar — o app é exatamente o mesmo, sem versão premium nem recurso trancado. No mensal são ${formatCurrency(PLANO_MENSAL.preco)} por mês, só no cartão de crédito (Pix não faz cobrança recorrente), e você cancela sozinho quando quiser. No vitalício são ${formatCurrency(PLANO_VITALICIO.preco)} uma vez, no Pix ou no cartão, e nunca mais vem cobrança. A partir do ${MESES_ATE_EMPATAR}º mês o vitalício já saiu mais barato.`,
  },
  {
    id: 'garantia',
    question: 'E se eu não gostar?',
    answer: `No mensal, você cancela dentro do app em dois cliques e não vem a próxima cobrança — sem formulário de retenção e sem precisar falar comigo. No vitalício você tem ${GUARANTEE_DAYS} dias para pedir o dinheiro de volta, sem justificar: um e-mail para ${SUPPORT_EMAIL} resolve. Prefiro devolver ${formatCurrency(PLANO_VITALICIO.preco)} a ter alguém carregando um app que não usa.`,
  },
  {
    id: 'por-que-pago',
    question: 'Por que não é de graça?',
    answer:
      'Porque as alternativas para ser de graça são piores: anúncio no meio do seu progresso, venda dos seus dados, ou conexão com o seu banco para monetizar depois. Não faço nenhuma das três. Alguém precisa pagar pelo app, e prefiro que seja você, sabendo exatamente quanto e podendo sair quando quiser.',
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
      'As casinhas ficam no armazenamento local do seu navegador e o app funciona offline a partir dali. Uma cópia sobe para a sua conta, porque é isso que devolve o desafio quando você troca de aparelho ou limpa o navegador. Guardamos e-mail, senha e as casinhas marcadas — nada de dados bancários: quem processa o pagamento é a Stripe ou o AbacatePay, e o cartão nunca passa por nós.',
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
