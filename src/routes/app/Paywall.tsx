import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { ArrowRightIcon, CheckIcon } from '../../components/ui/icons'
import { trackEvent } from '../../lib/analytics'
import { criarCheckout } from '../../lib/api'
import { cn } from '../../lib/cn'
import { formatCurrency, formatCurrencyCompact } from '../../lib/format'
import {
  GUARANTEE_DAYS,
  MESES_ATE_EMPATAR,
  PLANOS,
  PLANO_MENSAL,
  PLANO_VITALICIO,
  SUPPORT_EMAIL,
  type PlanoId,
} from '../../lib/pricing'
import { HOUSE_COUNT, TOTAL_AMOUNT } from '../../lib/constants'
import { useAuth } from '../../state/AuthContext'
import type { ChallengeStats } from '../../state/useStats'
import { FormularioAuth } from './FormularioAuth'
import { PagarComPix } from './PagarComPix'

interface PaywallProps {
  stats: ChallengeStats
  /** true quando o acesso caiu por reembolso ou contestação. */
  revogada?: boolean
  /** true quando a assinatura mensal acabou sem renovar. */
  assinaturaExpirada?: boolean
}

/**
 * Duas etapas, nesta ordem: conta e depois pagamento.
 *
 * A conta vem primeiro porque é ela que dá acesso — a licença nasce amarrada a
 * ela. Sem isso, quem comprasse num aparelho ficaria trancado em qualquer
 * outro, e um navegador limpo apagaria a compra junto com o progresso.
 */
export function Paywall({ stats, revogada, assinaturaExpirada }: PaywallProps) {
  const { usuario, sair, expirada } = useAuth()

  const [abrindoCheckout, setAbrindoCheckout] = useState(false)
  // Vitalício por padrão: é a oferta melhor para quem fica, e quem quiser o
  // mensal muda com um toque. Escolher por ninguém seria pior — uma tela sem
  // opção marcada faz a pessoa parar para decidir antes de querer decidir.
  const [plano, setPlano] = useState<PlanoId>('vitalicio')

  const [erroCheckout, setErroCheckout] = useState<string | null>(null)
  const [pagandoComPix, setPagandoComPix] = useState(false)

  const escolhido = plano === 'mensal' ? PLANO_MENSAL : PLANO_VITALICIO

  const comprar = async () => {
    setAbrindoCheckout(true)
    setErroCheckout(null)
    trackEvent('checkout_start', { price: escolhido.preco, metodo: 'cartao', plano })
    try {
      window.location.href = await criarCheckout(plano)
    } catch (erro) {
      console.error('[Desafio 500] Falha ao abrir o checkout.', erro)
      // Sessão morta derruba o login sozinha e a tela volta ao passo 1, onde o
      // aviso explica o que houve — aqui sobram o gateway fora e o mensal que
      // ainda não foi criado no painel do Stripe.
      if (erro instanceof Error && erro.message === 'plano_indisponivel') {
        setErroCheckout('O plano mensal ainda não está disponível. Use o vitalício por enquanto.')
      } else if (!(erro instanceof Error && erro.message === 'nao_autenticado')) {
        setErroCheckout('Não consegui abrir o pagamento agora. Tente de novo em instantes.')
      }
      setAbrindoCheckout(false)
    }
  }

  return (
    <div className="min-h-dvh bg-bg px-4 py-[max(2rem,env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-lg">
        <Link
          to="/"
          className="text-[11px] font-semibold uppercase tracking-wider text-muted transition-colors duration-150 hover:text-accent"
        >
          ← Desafio 500
        </Link>

        {revogada && (
          <div className="mt-5 rounded-2xl border border-danger/40 bg-danger/10 p-4">
            <p className="text-sm font-semibold text-ink">Seu acesso foi encerrado</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              A compra desta conta foi reembolsada ou contestada. Seu progresso continua salvo — se
              foi engano, escreva para {SUPPORT_EMAIL}.
            </p>
          </div>
        )}

        {/* Sem isto, quem teve o cartão recusado via a página de vendas
            comum e concluía que a conta sumiu junto com o dinheiro. */}
        {assinaturaExpirada && !revogada && (
          <div className="mt-5 rounded-2xl border border-gold/40 bg-gold/10 p-4">
            <p className="text-sm font-semibold text-ink">Sua assinatura terminou</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              O período pago acabou e a renovação não passou — pode ter sido cancelamento seu ou
              uma cobrança recusada. Seu progresso está todo salvo e volta assim que você assinar
              de novo. Qualquer dúvida, escreva para {SUPPORT_EMAIL}.
            </p>
          </div>
        )}

        {stats.markedCount > 0 && (
          <div className="mt-5 rounded-2xl border border-brand-500/30 bg-brand-500/5 p-4">
            <p className="text-sm font-semibold text-ink">
              Você já riscou{' '}
              {stats.markedCount === 1 ? '1 casinha' : `${stats.markedCount} casinhas`} na demo
            </p>
            <p className="num mt-1 text-2xl font-bold text-accent">
              {formatCurrency(stats.saved)}
            </p>
            <p className="mt-1 text-xs text-muted">
              Está tudo salvo. Destrave e continue de onde parou.
            </p>
          </div>
        )}

        {/* ---------------- etapa 1: conta ---------------- */}
        {!usuario ? (
          <>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-wider text-accent">
              {expirada ? 'Sessão encerrada' : 'Passo 1 de 2'}
            </p>
            <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl">
              {expirada ? 'Entre de novo' : 'Crie sua conta'}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {expirada
                ? 'Seu acesso neste aparelho expirou. Sua compra e seu progresso continuam salvos na conta — é só entrar com o mesmo e-mail.'
                : 'É a conta que guarda seu acesso e seu progresso. Com ela, entrar em qualquer aparelho traz o desafio de volta — sem código, sem arquivo de backup.'}
            </p>

            <div className="card mt-5 p-5">
              <FormularioAuth modoInicial={expirada ? 'entrar' : 'cadastrar'} />
            </div>

            <p className="mt-4 text-xs leading-relaxed text-muted">
              {expirada
                ? `Não consegue entrar? Escreva para ${SUPPORT_EMAIL} que eu resolvo na mão.`
                : 'Só pedimos e-mail e senha. Nada de cartão nesta etapa.'}
            </p>
          </>
        ) : (
          /* ---------------- etapa 2: pagamento ---------------- */
          <>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-wider text-accent">
              Passo 2 de 2
            </p>
            <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl">
              Destrave as {HOUSE_COUNT} casinhas
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Acesso completo ao desafio de {formatCurrencyCompact(TOTAL_AMOUNT)}. O app é o mesmo
              nos dois planos — muda só como você paga.
            </p>

            <p className="mt-2 break-all text-xs text-muted">
              Conta: <span className="text-ink">{usuario.email}</span> ·{' '}
              <button
                type="button"
                onClick={() => void sair()}
                className="underline underline-offset-2 hover:text-ink"
              >
                trocar
              </button>
            </p>

            {pagandoComPix ? (
              <div className="mt-6">
                <PagarComPix onFechar={() => setPagandoComPix(false)} />
              </div>
            ) : (
              <>
                <div
                  role="radiogroup"
                  aria-label="Escolha o plano"
                  className="mt-6 grid gap-3 sm:grid-cols-2"
                >
                  {PLANOS.map((opcao) => {
                    const ativo = opcao.id === plano
                    return (
                      <button
                        key={opcao.id}
                        type="button"
                        role="radio"
                        aria-checked={ativo}
                        onClick={() => setPlano(opcao.id)}
                        className={cn(
                          'rounded-2xl border p-4 text-left transition-colors duration-150',
                          ativo
                            ? 'border-brand-500 bg-brand-500/10'
                            : 'border-line bg-surface hover:border-brand-500/50',
                        )}
                      >
                        <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                          {opcao.nome}
                        </span>
                        <span className="num mt-1 block text-2xl font-bold leading-none text-ink">
                          {formatCurrency(opcao.preco)}
                        </span>
                        <span className="mt-1 block text-xs text-muted">{opcao.sufixo}</span>
                        <span className="mt-2 block text-xs leading-relaxed text-muted">
                          {opcao.metodos} · {opcao.seguranca}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="card mt-4 p-5">
                  <div className="space-y-1.5">
                    {[
                      `As ${HOUSE_COUNT} casinhas, estatísticas, histórico e sorteio`,
                      'Progresso salvo na conta, em qualquer aparelho',
                      'Funciona offline depois de instalado',
                      plano === 'mensal'
                        ? 'Cancele sozinho no app, sem falar com ninguém'
                        : `${GUARANTEE_DAYS} dias de garantia, sem justificar`,
                    ].map((item) => (
                      <p key={item} className="flex items-start gap-2 text-sm text-muted">
                        <CheckIcon
                          width={15}
                          height={15}
                          strokeWidth={3}
                          className="mt-0.5 shrink-0 text-accent"
                        />
                        {item}
                      </p>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={abrindoCheckout}
                    onClick={() => void comprar()}
                    className={cn(
                      'mt-5 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl',
                      'bg-brand-500 font-semibold text-[#06210F] shadow-glow',
                      'transition-[background-color,transform] duration-150 hover:bg-brand-400 active:scale-[0.98]',
                      'disabled:cursor-not-allowed disabled:opacity-60',
                    )}
                  >
                    {abrindoCheckout
                      ? 'Abrindo pagamento…'
                      : plano === 'mensal'
                        ? `Assinar no cartão — ${formatCurrency(escolhido.preco)}/mês`
                        : `Pagar com cartão — ${formatCurrency(escolhido.preco)}`}
                    {!abrindoCheckout && <ArrowRightIcon width={18} height={18} />}
                  </button>
                  {erroCheckout && (
                    <p role="alert" className="mt-2 text-center text-xs text-danger">
                      {erroCheckout}
                    </p>
                  )}

                  {plano === 'vitalicio' ? (
                    <>
                      <div className="mt-3 flex items-center gap-3">
                        <span className="h-px flex-1 bg-line" />
                        <span className="text-xs uppercase tracking-wider text-muted">ou</span>
                        <span className="h-px flex-1 bg-line" />
                      </div>

                      <Button
                        variant="secondary"
                        fullWidth
                        className="mt-3"
                        onClick={() => setPagandoComPix(true)}
                      >
                        Pagar com Pix
                      </Button>
                      <p className="mt-1.5 text-center text-xs text-muted">
                        Cai na hora, sem sair do app
                      </p>
                    </>
                  ) : (
                    /* Dizer POR QUE não tem Pix evita a pessoa procurar, não
                       achar e sair achando que o site está quebrado. */
                    <p className="mt-3 text-center text-xs leading-relaxed text-muted">
                      O mensal é só no cartão de crédito: Pix não faz cobrança recorrente. A
                      partir do {MESES_ATE_EMPATAR}º mês o vitalício sai mais barato.
                    </p>
                  )}
                </div>
              </>
            )}
          </>
        )}

        <nav
          aria-label="Documentos"
          className="mt-8 flex justify-center gap-5 text-xs text-muted"
        >
          <Link to="/termos" className="underline underline-offset-2 hover:text-ink">
            Termos de uso
          </Link>
          <Link to="/privacidade" className="underline underline-offset-2 hover:text-ink">
            Privacidade
          </Link>
        </nav>
      </div>
    </div>
  )
}
