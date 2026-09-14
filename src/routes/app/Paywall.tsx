import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { ArrowRightIcon, CheckIcon, ChevronDownIcon } from '../../components/ui/icons'
import { trackEvent } from '../../lib/analytics'
import { criarCheckout, type MotivoRecusa } from '../../lib/api'
import { FormularioAuth } from './FormularioAuth'
import { PagarComPix } from './PagarComPix'
import { cn } from '../../lib/cn'
import { formatCurrency, formatCurrencyCompact } from '../../lib/format'
import { GUARANTEE_DAYS, PRICE_BRL, SUPPORT_EMAIL } from '../../lib/pricing'
import { HOUSE_COUNT, TOTAL_AMOUNT } from '../../lib/constants'
import type { ChallengeStats } from '../../state/useStats'

interface PaywallProps {
  stats: ChallengeStats
  onUnlock: (key: string) => Promise<{ valida: boolean; motivo?: MotivoRecusa }>
  /** true quando o acesso caiu por reembolso ou contestação. */
  revogada?: boolean
}

const MENSAGENS: Record<MotivoRecusa, string> = {
  formato: 'Formato inválido. O código tem o padrão D500-0000-0000-0000.',
  inexistente: 'Código não encontrado. Confira se copiou inteiro e tente de novo.',
  revogada: 'Este código foi cancelado porque a compra foi reembolsada ou contestada.',
  indisponivel: 'Não consegui conferir o código agora. Verifique sua conexão e tente de novo.',
}

/** Chave de desenvolvimento, aceita só em dev pelo formato padrão. */
const DEV_KEY = 'D500-DEV0-DEV0-DEV0'

export function Paywall({ stats, onUnlock, revogada }: PaywallProps) {
  const fieldId = useId()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [abrindoCheckout, setAbrindoCheckout] = useState(false)
  const [erroCheckout, setErroCheckout] = useState<string | null>(null)
  const [pagandoComPix, setPagandoComPix] = useState(false)

  const comprar = async () => {
    setAbrindoCheckout(true)
    setErroCheckout(null)
    trackEvent('checkout_start', { price: PRICE_BRL })
    try {
      window.location.href = await criarCheckout()
    } catch (erro) {
      console.error('[Desafio 500] Falha ao abrir o checkout.', erro)
      setErroCheckout('Não consegui abrir o pagamento agora. Tente de novo em instantes.')
      setAbrindoCheckout(false)
    }
  }

  const submit = async (rawKey: string) => {
    setChecking(true)
    setError(null)
    const resultado = await onUnlock(rawKey)
    setChecking(false)
    if (!resultado.valida) {
      setError(MENSAGENS[resultado.motivo ?? 'inexistente'])
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
              A compra deste código foi reembolsada ou contestada. Seu progresso continua salvo
              neste aparelho — se foi engano, escreva para {SUPPORT_EMAIL}.
            </p>
          </div>
        )}

        {stats.markedCount > 0 ? (
          <div className="mt-5 rounded-2xl border border-brand-500/30 bg-brand-500/5 p-4">
            <p className="text-sm font-semibold text-ink">
              Você já riscou {stats.markedCount === 1 ? '1 casinha' : `${stats.markedCount} casinhas`} na demo
            </p>
            <p className="num mt-1 text-2xl font-bold text-accent">
              {formatCurrency(stats.saved)}
            </p>
            <p className="mt-1 text-xs text-muted">
              Está tudo salvo. Destrave e continue de onde parou.
            </p>
          </div>
        ) : null}

        <h1 className="mt-6 text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl">
          Destrave as {HOUSE_COUNT} casinhas
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Acesso completo ao desafio de {formatCurrencyCompact(TOTAL_AMOUNT)}, com estatísticas,
          histórico, sorteio e uso offline.
        </p>

        {pagandoComPix ? (
          <div className="mt-6">
            <PagarComPix
              onPago={(chaveEmitida) => {
                void onUnlock(chaveEmitida)
              }}
              onFechar={() => setPagandoComPix(false)}
            />
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
                <CheckIcon width={15} height={15} strokeWidth={3} className="shrink-0 text-accent" />
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
            {abrindoCheckout ? 'Abrindo pagamento…' : `Comprar acesso — ${formatCurrency(PRICE_BRL)}`}
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
          <p className="mt-1.5 text-center text-xs text-muted">
            Cai na hora, sem sair do app
          </p>
        </div>
        )}

        {/* Recolhido de propósito: quem compra nunca digita isto — o app
            destrava sozinho, e quem tem conta destrava entrando nela. Aberto,
            este campo disputava atenção com o botão de compra. */}
        <details className="group mt-6">
          <summary className="inline-flex min-h-[44px] cursor-pointer list-none items-center gap-1.5 text-sm text-muted transition-colors duration-150 hover:text-ink marker:content-none [&::-webkit-details-marker]:hidden">
            Já comprou? Recuperar meu acesso
            <ChevronDownIcon
              width={16}
              height={16}
              className="transition-transform duration-200 group-open:rotate-180"
            />
          </summary>

          {/* Entrar vem primeiro: é o caminho melhor, e traz o progresso junto.
              Sem isto aqui, quem comprasse num aparelho ficaria trancado do
              lado de fora em qualquer outro — o botão "Minha conta" só existe
              depois do app destravado. */}
          <p className="mt-3 text-sm font-medium text-ink">Entrar na minha conta</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            Se você criou conta, entrar já destrava o desafio e traz seu progresso de volta.
          </p>
          <div className="mt-3">
            <FormularioAuth modoInicial="entrar" />
          </div>

          <div className="mt-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs uppercase tracking-wider text-muted">ou</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <label htmlFor={fieldId} className="mt-4 block text-sm font-medium text-ink">
            Código de compra
          </label>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            É o código que apareceu na tela logo depois do pagamento, no formato
            D500-0000-0000-0000. Ele também fica guardado em Configurações, no aparelho onde você
            comprou. Se você criou conta, entrar nela já destrava — sem precisar de código.
          </p>

          <form
            className="mt-2 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void submit(value)
            }}
          >
            <input
              id={fieldId}
              type="text"
              value={value}
              autoComplete="off"
              spellCheck={false}
              placeholder="D500-0000-0000-0000"
              aria-invalid={error !== null}
              aria-describedby={error ? `${fieldId}-erro` : undefined}
              onChange={(event) => {
                setValue(event.target.value)
                setError(null)
              }}
              className="h-11 w-full rounded-xl border border-line bg-surface-2 px-3 font-mono text-sm uppercase text-ink placeholder:font-sans placeholder:normal-case placeholder:text-muted focus:border-brand-500 focus:bg-surface"
            />
            <Button type="submit" variant="secondary" disabled={checking || value.trim() === ''}>
              {checking ? 'Conferindo…' : 'Destravar'}
            </Button>
          </form>

          {error && (
            <p id={`${fieldId}-erro`} role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          )}
        </details>

        <nav aria-label="Documentos" className="mt-8 flex justify-center gap-5 text-xs text-muted">
          <Link to="/termos" className="underline underline-offset-2 hover:text-ink">
            Termos de uso
          </Link>
          <Link to="/privacidade" className="underline underline-offset-2 hover:text-ink">
            Privacidade
          </Link>
        </nav>

        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={() => void submit(DEV_KEY)}
            className="mt-6 w-full rounded-xl border border-dashed border-line py-3 text-xs text-muted transition-colors duration-150 hover:text-ink"
          >
            [dev] destravar com chave de teste
          </button>
        )}
      </div>
    </div>
  )
}
