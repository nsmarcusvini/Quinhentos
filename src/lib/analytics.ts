/**
 * Camada fina de analytics de funil.
 *
 * Não embute nenhum provedor: se existir um `window.plausible` (script add-on
 * no index.html), os eventos vão para lá; senão viram `console.debug` em dev e
 * no-op em produção. Isso deixa a página instrumentada desde já e adiar a
 * escolha do provedor não custa nada.
 *
 * Regra: nunca passar dado pessoal aqui. Só números e rótulos de posição.
 */

type EventProps = Record<string, string | number | boolean>

interface PlausibleWindow {
  plausible?: (event: string, options?: { props?: EventProps }) => void
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
