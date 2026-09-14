/**
 * Analytics de funil via Plausible.
 *
 * Escolhido por ser sem cookie e sem dado pessoal — coerente com o que a
 * landing promete. Sem `VITE_ANALYTICS_DOMAIN` configurado, tudo vira no-op:
 * o app funciona igual, só não mede.
 *
 * Regra: nunca passar dado pessoal aqui. Só números e rótulos de posição.
 */

type EventProps = Record<string, string | number | boolean>

interface FilaPlausible {
  (event: string, options?: { props?: EventProps }): void
  q?: unknown[]
}

interface PlausibleWindow {
  plausible?: FilaPlausible
}

const DOMINIO = import.meta.env.VITE_ANALYTICS_DOMAIN
const SCRIPT = import.meta.env.VITE_ANALYTICS_SRC || 'https://plausible.io/js/script.js'

/**
 * Injeta o Plausible e cria a fila de eventos.
 *
 * A fila (`plausible.q`) é o padrão documentado por eles: sem ela, todo evento
 * disparado antes do script terminar de carregar se perde — e o `landing_view`
 * acontece justamente nesse intervalo.
 */
export function iniciarAnalytics(): void {
  if (typeof window === 'undefined' || !DOMINIO) return
  if (document.querySelector('script[data-domain]')) return

  const alvo = window as unknown as PlausibleWindow
  alvo.plausible =
    alvo.plausible ||
    (function (...args: unknown[]) {
      const fila = (alvo.plausible as FilaPlausible)
      fila.q = fila.q || []
      fila.q.push(args)
    } as unknown as FilaPlausible)

  const script = document.createElement('script')
  script.defer = true
  script.dataset.domain = DOMINIO
  script.src = SCRIPT
  document.head.appendChild(script)
}

export type FunnelEvent =
  | 'landing_view'
  | 'demo_mark'
  | 'calc_interact'
  | 'price_view'
  | 'cta_click'
  | 'faq_open'
  | 'checkout_start'
  | 'checkout_success'

export function trackEvent(event: FunnelEvent, props?: EventProps): void {
  if (typeof window === 'undefined') return

  const plausible = (window as PlausibleWindow).plausible
  if (plausible) {
    plausible(event, props ? { props } : undefined)
    return
  }

  if (import.meta.env.DEV) {
    console.debug('[funil]', event, props ?? {})
  }
}

/** true quando os eventos estão realmente saindo daqui. */
export const analyticsAtivo = (): boolean => Boolean(DOMINIO)

/**
 * Dispara um evento uma única vez por carregamento de página.
 * Usado para `price_view`, que senão dispara a cada scroll.
 */
const fired = new Set<string>()

export function trackOnce(event: FunnelEvent, props?: EventProps): void {
  const key = `${event}:${JSON.stringify(props ?? {})}`
  if (fired.has(key)) return
  fired.add(key)
  trackEvent(event, props)
}
