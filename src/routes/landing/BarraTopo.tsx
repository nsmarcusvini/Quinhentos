import { Link } from 'react-router-dom'
import { trackEvent } from '../../lib/analytics'
import { useAuth } from '../../state/AuthContext'

/**
 * Única coisa no topo além da marca: um jeito de entrar.
 *
 * Nada de menu com links concorrentes — a página tem um destino só. Mas quem
 * já comprou precisa de uma porta visível, senão volta ao site e não acha como
 * acessar o que pagou.
 */
export function BarraTopo() {
  const { usuario } = useAuth()

  return (
    <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-2">
        <div
          aria-hidden="true"
          className="grid w-[18px] grid-cols-3 gap-[2px]"
        >
          {[1, 0.4, 1, 0.4, 1, 0.4, 1, 0.4, 1].map((opacidade, indice) => (
            <span
              key={indice}
              className="aspect-square rounded-[2px] bg-brand-500"
              style={{ opacity: opacidade }}
            />
          ))}
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          Desafio 500
        </span>
      </div>

      <Link
        to="/app"
        onClick={() => trackEvent('cta_click', { position: 'topo_entrar' })}
        className="tap-target inline-flex items-center rounded-xl px-3 text-sm font-medium text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
      >
        {usuario ? 'Meu desafio' : 'Entrar'}
      </Link>
    </div>
  )
}
