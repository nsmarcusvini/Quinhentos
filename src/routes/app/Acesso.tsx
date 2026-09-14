import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { CheckIcon } from '../../components/ui/icons'
import { trackEvent } from '../../lib/analytics'
import { resgatarLicenca } from '../../lib/api'
import { cn } from '../../lib/cn'
import { SUPPORT_EMAIL } from '../../lib/pricing'
import { useEntitlement } from '../../state/EntitlementContext'

type Situacao = 'resgatando' | 'aguardando' | 'pronto' | 'erro'

/** A cada 4s por ~3 minutos. Pix costuma confirmar em segundos. */
const INTERVALO_MS = 4000
const MAX_TENTATIVAS = 45

/**
 * Volta do Stripe. Troca o session_id pela chave, destrava e mostra a chave.
 *
 * Cartão confirma na hora; Pix e boleto não. Daí o estado de espera: o
 * pagamento pode ainda estar processando quando a pessoa chega aqui, e dizer
 * "não consegui confirmar" nesse momento seria mentira — o dinheiro pode estar
 * a caminho. Sem redirect automático: a chave é a única coisa que ela precisa
 * guardar, e 1,6s não dá para ler e salvar 19 caracteres.
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
  const [copiado, setCopiado] = useState(false)
  const [tentativas, setTentativas] = useState(0)
  const jaTentou = useRef(false)

  const tentarResgatar = useCallback(async () => {
    if (!sessionId) return

    try {
      const emitida = await resgatarLicenca(sessionId)
      setChave(emitida)
      await unlock(emitida)
      trackEvent('checkout_success')
      setSituacao('pronto')
    } catch (erro) {
      // Pix e boleto ainda processando: não é falha, é espera.
      if (erro instanceof Error && erro.message === 'pagamento_pendente') {
        setSituacao('aguardando')
        return
      }

      console.error('[Desafio 500] Falha ao resgatar a licença.', erro)
      setSituacao('erro')
    }
  }, [sessionId, unlock])

  // Primeira tentativa. O ref segura o StrictMode, que monta duas vezes em dev.
  useEffect(() => {
    if (jaTentou.current || !sessionId) return
    jaTentou.current = true
    void tentarResgatar()
  }, [sessionId, tentarResgatar])

  // Enquanto estiver pendente, pergunta de novo de tempos em tempos.
  useEffect(() => {
    if (situacao !== 'aguardando' || tentativas >= MAX_TENTATIVAS) return

    const timer = window.setTimeout(() => {
      setTentativas((atual) => atual + 1)
      void tentarResgatar()
    }, INTERVALO_MS)

    return () => window.clearTimeout(timer)
  }, [situacao, tentativas, tentarResgatar])

  const desistiu = tentativas >= MAX_TENTATIVAS

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

        {situacao === 'aguardando' && (
          <div aria-live="polite">
            <div
              aria-hidden="true"
              className={cn(
                'mx-auto h-12 w-12 rounded-2xl bg-brand-500/20',
                !desistiu && 'animate-pulse',
              )}
            />

            {desistiu ? (
              <>
                <h1 className="mt-5 text-xl font-bold tracking-tight text-ink">
                  O Pix ainda não caiu
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Pagamento por Pix quase sempre confirma em segundos, mas este está demorando
                  mais que o normal. Se você já pagou, o acesso está garantido.
                </p>
                <p className="mt-3 rounded-2xl border border-line bg-surface p-3 text-sm leading-relaxed text-ink">
                  Guarde o endereço desta página. Quando o pagamento confirmar, é só abri-la de
                  novo que o desafio destrava.
                </p>
                <Button
                  variant="primary"
                  className="mt-4"
                  onClick={() => {
                    setTentativas(0)
                    setSituacao('resgatando')
                    void tentarResgatar()
                  }}
                >
                  Verificar de novo
                </Button>
              </>
            ) : (
              <>
                <h1 className="mt-5 text-xl font-bold tracking-tight text-ink">
                  Aguardando a confirmação do Pix
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Assim que o seu banco confirmar, o desafio destrava sozinho aqui. Costuma levar
                  poucos segundos — pode deixar esta página aberta.
                </p>
              </>
            )}

            <p className="mt-6 text-xs leading-relaxed text-muted">
              Pagou e continua travado? Escreva para{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-ink underline underline-offset-2 hover:text-accent"
              >
                {SUPPORT_EMAIL}
              </a>{' '}
              que eu libero na mão.
            </p>
          </div>
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
            <p className="mt-2 text-sm text-muted">Antes de entrar, guarde isto:</p>

            {chave && (
              <div className="mt-5 rounded-2xl border border-brand-500/30 bg-brand-500/5 p-4">
                <p className="text-xs uppercase tracking-wider text-muted">Sua chave de acesso</p>
                <p className="mt-1.5 select-all font-mono text-lg font-semibold tracking-wide text-ink">
                  {chave}
                </p>
                <Button
                  variant="secondary"
                  className="mt-3"
                  onClick={() => {
                    void navigator.clipboard?.writeText(chave).then(() => setCopiado(true))
                  }}
                >
                  {copiado ? 'Copiada!' : 'Copiar chave'}
                </Button>
                <p className="mt-3 text-xs leading-relaxed text-muted">
                  Ela destrava o app em qualquer aparelho. Também fica guardada nas Configurações,
                  então dá para pegar de volta depois.
                </p>
              </div>
            )}

            <Button
              variant="primary"
              fullWidth
              className="mt-4"
              onClick={() => navigate('/app', { replace: true })}
            >
              Já guardei — abrir o desafio
            </Button>
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
                <Button
                  variant="primary"
                  onClick={() => {
                    setSituacao('resgatando')
                    void tentarResgatar()
                  }}
                >
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
