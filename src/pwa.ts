import { registerSW } from 'virtual:pwa-register'

/** Evento disparado quando o app terminou de ficar disponível offline. */
export const OFFLINE_READY_EVENT = 'desafio500:offline-ready'

export function registerServiceWorker(): void {
  if (import.meta.env.DEV) return

  registerSW({
    immediate: true,
    onOfflineReady() {
      window.dispatchEvent(new CustomEvent(OFFLINE_READY_EVENT))
    },
  })
}
