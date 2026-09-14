import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useChallenge } from '../state/ChallengeContext'

const LANDING_TITLE = 'Norte Financeiro — junte R$ 125.250 riscando um número por vez'

/** Título por rota e volta ao topo ao trocar de página. */
export function useRouteEffects(): void {
  const { pathname } = useLocation()
  const { state } = useChallenge()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])

  useEffect(() => {
    if (pathname === '/app') {
      document.title = `${state.challengeName} — Norte Financeiro`
      return
    }
    // O título do painel fica aqui, e não dentro dele: este efeito roda de
    // novo sempre que o nome do desafio muda e sobrescreveria um título que a
    // própria página tivesse posto.
    document.title = pathname === '/admin' ? 'Painel — Norte Financeiro' : LANDING_TITLE
  }, [pathname, state.challengeName])
}
