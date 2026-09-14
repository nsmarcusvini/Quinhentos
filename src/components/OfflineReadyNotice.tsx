import { useEffect } from 'react'
import { OFFLINE_READY_EVENT } from '../pwa'
import { useToast } from './ui/Toast'

/** Avisa uma única vez, quando o service worker terminou de guardar o app. */
export function OfflineReadyNotice() {
  const showToast = useToast()

  useEffect(() => {
    const onReady = () =>
      showToast({
        title: 'Pronto para usar offline',
        description: 'O Norte Financeiro já funciona sem internet neste aparelho.',
        durationMs: 6000,
      })

    window.addEventListener(OFFLINE_READY_EVENT, onReady)
    return () => window.removeEventListener(OFFLINE_READY_EVENT, onReady)
  }, [showToast])

  return null
}
