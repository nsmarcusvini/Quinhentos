import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { CheckIcon, CloseIcon } from '../../components/ui/icons'
import { trackEvent } from '../../lib/analytics'
import { conferirPix, criarPix, type CobrancaPix } from '../../lib/api'
import { formatCurrency } from '../../lib/format'
import { PRICE_BRL, SUPPORT_EMAIL } from '../../lib/pricing'

type Fase = 'criando' | 'aguardando' | 'expirado' | 'erro'

/** A cada 3s por ~5 minutos. Pix cai em segundos; a folga é para o nervoso. */
const INTERVALO_MS = 3000
const MAX_TENTATIVAS = 100

interface PagarComPixProps {
  onPago: (chave: string) => void
  onFechar: () => void
}

/**
 * Checkout transparente: o QR aparece dentro do app, sem sair para lugar
 * nenhum. Enquanto a pessoa paga, o navegador vai perguntando se caiu.
 */
export function PagarComPix({ onPago, onFechar }: PagarComPixProps) {
  const [fase, setFase] = useState<Fase>('criando')
  const [cobranca, setCobranca] = useState<CobrancaPix | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [tentativas, setTentativas] = useState(0)
  const jaCriou = useRef(false)

  useEffect(() => {
    if (jaCriou.current) return
    jaCriou.current = true

    void (async () => {
      try {
        trackEvent('checkout_start', { price: PRICE_BRL, metodo: 'pix' })
        const criada = await criarPix()
        setCobranca(criada)
        setFase('aguardando')
      } catch (erro) {
        console.error('[Desafio 500] Falha ao criar a cobrança Pix.', erro)
        setFase('erro')
      }
    })()
  }, [])

  const conferir = useCallback(async () => {
    if (!cobranca) return
    try {
      const resultado = await conferirPix(cobranca.id)
      if (resultado.key) {
        trackEvent('checkout_success', { metodo: 'pix' })
        onPago(resultado.key)
        return
      }
      // EXPIRED, CANCELLED e FAILED não voltam atrás: para de perguntar.
      if (resultado.status && ['EXPIRED', 'CANCELLED', 'FAILED'].includes(resultado.status)) {
        setFase('expirado')
      }
    } catch (erro) {
      // Falha de rede não cancela a espera: o Pix pode cair mesmo assim.
      console.warn('[Desafio 500] Não consegui conferir o Pix agora.', erro)
    }
  }, [cobranca, onPago])

  useEffect(() => {
    if (fase !== 'aguardando' || tentativas >= MAX_TENTATIVAS) return

    const timer = window.setTimeout(() => {
      setTentativas((atual) => atual + 1)
      void conferir()
    }, INTERVALO_MS)

    return () => window.clearTimeout(timer)
  }, [conferir, fase, tentativas])

  const desistiu = tentativas >= MAX_TENTATIVAS

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">Pagar com Pix</p>
          <p className="num mt-1 text-2xl font-bold text-ink">{formatCurrency(PRICE_BRL)}</p>
        </div>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Cancelar pagamento por Pix"
          className="tap-target inline-flex items-center justify-center rounded-xl text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
        >
          <CloseIcon />
        </button>
      </div>

      {fase === 'criando' && (
        <div className="mt-5 text-center">
          <div
            aria-hidden="true"
            className="mx-auto h-40 w-40 animate-pulse rounded-2xl bg-surface-2"
          />
          <p className="mt-4 text-sm text-muted">Gerando o código…</p>
        </div>
      )}

      {fase === 'aguardando' && cobranca && (
        <div className="mt-5" aria-live="polite">
          {cobranca.devMode && (
            <p className="mb-3 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-ink">
              Modo de teste: nenhuma cobrança real será feita.
            </p>
          )}

          <img
            src={cobranca.brCodeBase64}
            alt="QR code do Pix. Se preferir, use o código copia-e-cola abaixo."
            className="mx-auto h-48 w-48 rounded-2xl bg-white p-2"
          />

          <p className="mt-4 text-sm font-medium text-ink">
            Abra o app do seu banco e leia o QR code
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Ou use o copia-e-cola. O desafio destrava sozinho assim que o pagamento cair.
          </p>

          <div className="mt-3 flex gap-2">
            <p className="flex-1 truncate rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-left font-mono text-xs text-muted">
              {cobranca.brCode}
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                void navigator.clipboard?.writeText(cobranca.brCode).then(() => {
                  setCopiado(true)
                  window.setTimeout(() => setCopiado(false), 2500)
                })
              }}
            >
              {copiado ? 'Copiado!' : 'Copiar'}
            </Button>
          </div>

          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted">
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full bg-brand-500 ${desistiu ? '' : 'animate-pulse'}`}
            />
            {desistiu ? 'Parei de verificar automaticamente' : 'Aguardando o pagamento…'}
          </p>

          {desistiu && (
            <Button
              variant="primary"
              fullWidth
              className="mt-3"
              onClick={() => {
                setTentativas(0)
                void conferir()
              }}
            >
              Já paguei — verificar agora
            </Button>
          )}
        </div>
      )}

      {fase === 'expirado' && (
        <div className="mt-5 text-center">
          <p className="text-sm font-semibold text-ink">Este código expirou</p>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Códigos Pix valem por uma hora. Gere um novo para continuar.
          </p>
          <Button variant="primary" fullWidth className="mt-4" onClick={onFechar}>
            Voltar e gerar outro
          </Button>
        </div>
      )}

      {fase === 'erro' && (
        <div className="mt-5 text-center">
          <p className="text-sm font-semibold text-ink">Não consegui gerar o código</p>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Tente de novo em instantes, ou pague com cartão. Se insistir, escreva para{' '}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-ink underline underline-offset-2 hover:text-accent"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
          <Button variant="secondary" fullWidth className="mt-4" onClick={onFechar}>
            Voltar
          </Button>
        </div>
      )}

      {fase === 'aguardando' && (
        <p className="mt-4 flex items-center justify-center gap-1.5 border-t border-line pt-4 text-xs text-muted">
          <CheckIcon width={13} height={13} strokeWidth={3} className="text-accent" />
          Pode deixar esta tela aberta enquanto paga
        </p>
      )}
    </div>
  )
}
