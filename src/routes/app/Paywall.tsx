import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { ArrowRightIcon, CheckIcon } from '../../components/ui/icons'
import { trackEvent } from '../../lib/analytics'
import { criarCheckout } from '../../lib/api'
import { cn } from '../../lib/cn'
import { formatCurrency, formatCurrencyCompact } from '../../lib/format'
import { GUARANTEE_DAYS, PRICE_BRL, SUPPORT_EMAIL } from '../../lib/pricing'
import { HOUSE_COUNT, TOTAL_AMOUNT } from '../../lib/constants'
import { useAuth } from '../../state/AuthContext'
import type { ChallengeStats } from '../../state/useStats'
import { FormularioAuth } from './FormularioAuth'
import { PagarComPix } from './PagarComPix'

interface PaywallProps {
  stats: ChallengeStats
  /** true quando o acesso caiu por reembolso ou contestação. */
  revogada?: boolean
}

/**
 * Duas etapas, nesta ordem: conta e depois pagamento.
 *
 * A conta vem primeiro porque é ela que dá acesso — a licença nasce amarrada a
 * ela. Sem isso, quem comprasse num aparelho ficaria trancado em qualquer
 * outro, e um navegador limpo apagaria a compra junto com o progresso.
 */
export function Paywall({ stats, revogada }: PaywallProps) {
  const { usuario, sair, expirada } = useAuth()

  const [abrindoCheckout, setAbrindoCheckout] = useState(false)

  const [erroCheckout, setErroCheckout] = useState<string | null>(null)
  const [pagandoComPix, setPagandoComPix] = useState(false)

  const comprar = async () => {
    setAbrindoCheckout(true)
    setErroCheckout(null)
    trackEvent('checkout_start', { price: PRICE_BRL, metodo: 'cartao' })
    try {
      window.location.href = await criarCheckout()
    } catch (erro) {
      console.error('[Desafio 500] Falha ao abrir o checkout.', erro)
      // Sessão morta derruba o login sozinha e a tela volta ao passo 1, onde o
      // aviso explica o que houve — aqui só sobra o caso de gateway fora.
      if (!(erro instanceof Error && erro.message === 'nao_autenticado')) {
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
              Acesso completo ao desafio de {formatCurrencyCompact(TOTAL_AMOUNT)}, com estatísticas,
              histórico, sorteio e uso offline.
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
              <div className="card mt-6 p-5">
                <p className="num text-4xl font-bold leading-none text-ink">
                  {formatCurrency(PRICE_BRL)}
                </p>
                <p className="mt-1.5 text-sm font-medium text-ink">
                  Pagamento único · acesso vitalício
                </p>

                <div className="mt-4 space-y-1.5">
                  {[
                    'Pix libera na hora, sem sair do app',
                    `${GUARANTEE_DAYS} dias de garantia`,
                    'Sem mensalidade e sem renovação',
                    'Funciona offline depois de instalado',
                  ].map((item) => (
                    <p key={item} className="flex items-center gap-2 text-sm text-muted">
                      <CheckIcon
                        width={15}
                        height={15}
                        strokeWidth={3}
                        className="shrink-0 text-accent"
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
                    : `Pagar com cartão — ${formatCurrency(PRICE_BRL)}`}
                  {!abrindoCheckout && <ArrowRightIcon width={18} height={18} />}
                </button>
                {erroCheckout && (
                  <p role="alert" className="mt-2 text-center text-xs text-danger">
                    {erroCheckout}
                  </p>
                )}

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
                <p className="mt-1.5 text-center text-xs text-muted">Cai na hora, sem sair do app</p>
              </div>
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
