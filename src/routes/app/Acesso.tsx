import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { CheckIcon } from '../../components/ui/icons'
import { trackEvent } from '../../lib/analytics'
import { resgatarLicenca } from '../../lib/api'
import { SUPPORT_EMAIL } from '../../lib/pricing'
import { useEntitlement } from '../../state/useEntitlement'

type Situacao = 'resgatando' | 'pronto' | 'erro'

/**
 * Volta do Stripe. Troca o session_id pela chave, destrava e segue para o app.
 * A pessoa não precisa copiar nada de e-mail nenhum.
 */
export default function Acesso() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { unlock } = useEntitlement()

  const sessionId = params.get('session_id')

  // Sem session_id já nasce em erro: derivar no estado inicial evita um render
  // extra e o "resgatando" piscando para quem caiu aqui sem vir do checkout.
  const [situacao, setSituacao] = useState<Situacao>(sessionId ? 'resgatando' : 'erro')
  const [chave, setChave] = useState<string | null>(null)
  const jaTentou = useRef(false)

  useEffect(() => {
    // StrictMode monta duas vezes em dev; o resgate roda uma só.
    if (jaTentou.current) return
    jaTentou.current = true

    if (!sessionId) return

    void (async () => {
      try {
        const emitida = await resgatarLicenca(sessionId)
        setChave(emitida)
        await unlock(emitida)
        trackEvent('checkout_success')
        setSituacao('pronto')
        window.setTimeout(() => navigate('/app', { replace: true }), 1600)
      } catch (erro) {
        console.error('[Desafio 500] Falha ao resgatar a licença.', erro)
        setSituacao('erro')
      }
    })()
  }, [navigate, sessionId, unlock])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md text-center">
        {situacao === 'resgatando' && (
          <>
            <div
              aria-hidden="true"
              className="mx-auto h-12 w-12 animate-pulse rounded-2xl bg-brand-500/20"
            />
            <p className="mt-5 text-base font-semibold text-ink">Confirmando seu pagamento…</p>
            <p className="mt-1 text-sm text-muted">Só um instante, não feche esta página.</p>
          </>
        )}

        {situacao === 'pronto' && (
          <>
            <div
              aria-hidden="true"
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-success-bg text-success-fg"
            >
              <CheckIcon width={24} height={24} strokeWidth={3} />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">
              Pronto. O desafio é seu.
            </h1>
            <p className="mt-2 text-sm text-muted">Abrindo as 500 casinhas…</p>

            {chave && (
              <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
                <p className="text-xs uppercase tracking-wider text-muted">Sua chave de acesso</p>
                <p className="mt-1.5 select-all font-mono text-base font-semibold text-ink">
                  {chave}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  Guarde num lugar seguro. Ela destrava o app em qualquer outro aparelho.
                </p>
              </div>
            )}
          </>
        )}

        {situacao === 'erro' && (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              Não consegui confirmar o pagamento
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {sessionId
                ? 'Se a cobrança apareceu no seu cartão, o acesso já está garantido — pode ser só uma demora do processamento. Tente de novo em alguns instantes.'
                : 'Esta página só funciona vindo do checkout. Se você já comprou, use sua chave de acesso na tela do app.'}
            </p>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              {sessionId && (
                <Button variant="primary" onClick={() => window.location.reload()}>
                  Tentar de novo
                </Button>
              )}
              <Link
                to="/app"
                className="tap-target inline-flex items-center justify-center rounded-xl border border-line px-4 text-sm text-muted transition-colors duration-150 hover:text-ink"
              >
                Ir para o app
              </Link>
            </div>

            <p className="mt-6 text-xs leading-relaxed text-muted">
              Continua sem funcionar? Escreva para{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-ink underline underline-offset-2 hover:text-accent"
              >
                {SUPPORT_EMAIL}
              </a>{' '}
              que eu resolvo na mão.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
