import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useChallenge } from '../state/ChallengeContext'

const LANDING_TITLE = 'Desafio 500 — junte R$ 125.250 riscando um número por vez'

/** Título por rota e volta ao topo ao trocar de página. */
export function useRouteEffects(): void {
  const { pathname } = useLocation()
  const { state } = useChallenge()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])

  useEffect(() => {
    document.title =
      pathname === '/app' ? `${state.challengeName} — Desafio 500` : LANDING_TITLE
  }, [pathname, state.challengeName])
}
