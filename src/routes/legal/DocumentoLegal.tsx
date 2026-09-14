import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { formatDate } from '../../lib/date'

interface DocumentoLegalProps {
  titulo: string
  atualizadoEm: number
  children: ReactNode
}

/** Moldura compartilhada por Termos e Privacidade. */
export function DocumentoLegal({ titulo, atualizadoEm, children }: DocumentoLegalProps) {
  return (
    <div className="min-h-dvh bg-bg">
      <main
        id="conteudo"
        className="mx-auto w-full max-w-2xl px-4 pb-20 pt-[max(2rem,env(safe-area-inset-top))]"
      >
        <Link
          to="/"
          className="text-[11px] font-semibold uppercase tracking-wider text-muted transition-colors duration-150 hover:text-accent"
        >
          ← Norte Financeiro
        </Link>

        <h1 className="mt-5 text-3xl font-bold tracking-tight text-ink">{titulo}</h1>
        <p className="mt-1.5 text-xs text-muted">
          Última atualização: {formatDate(atualizadoEm)}
        </p>

        <div className="mt-8 space-y-7">{children}</div>
      </main>
    </div>
  )
}

export function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-ink">{titulo}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  )
}

/** Ponto que o leitor precisa notar mesmo passando o olho. */
export function Destaque({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-brand-500/30 bg-brand-500/5 p-4 text-sm leading-relaxed text-ink">
      {children}
    </p>
  )
}
