import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * Peças repetidas do painel.
 *
 * Mesmos tokens do resto do app (`surface`, `line`, `muted`, `accent`), então
 * o painel acompanha o tema claro/escuro sem ter cor própria.
 */

export function Kpi({
  rotulo,
  valor,
  dica,
  tom = 'neutro',
}: {
  rotulo: string
  valor: string
  dica?: string
  tom?: 'neutro' | 'bom' | 'atencao'
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs uppercase tracking-wider text-muted">{rotulo}</p>
      <p
        className={cn(
          // No celular o cartão tem metade da largura; um faturamento de sete
          // dígitos em 24px não cabe e quebra no meio do número.
          'num mt-1 text-xl font-bold sm:text-2xl',
          tom === 'bom' && 'text-accent',
          tom === 'atencao' && 'text-danger',
          tom === 'neutro' && 'text-ink',
        )}
      >
        {valor}
      </p>
      {dica && <p className="mt-1 text-xs text-muted">{dica}</p>}
    </div>
  )
}

export function Secao({
  titulo,
  descricao,
  acao,
  children,
}: {
  titulo: string
  descricao?: string
  acao?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">{titulo}</h2>
          {descricao && <p className="mt-1 text-xs text-muted">{descricao}</p>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  )
}

const TONS: Record<string, string> = {
  bom: 'bg-brand-500/15 text-accent border-brand-500/30',
  atencao: 'bg-danger/10 text-danger border-danger/30',
  neutro: 'bg-surface-2 text-muted border-line',
}

export function Badge({
  children,
  tom = 'neutro',
}: {
  children: ReactNode
  tom?: 'neutro' | 'bom' | 'atencao'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        TONS[tom],
      )}
    >
      {children}
    </span>
  )
}

/**
 * Tabela com rolagem horizontal própria.
 *
 * O painel é de uso pessoal e frequentemente aberto no celular: sem o
 * contêiner rolável, uma tabela de oito colunas empurra a página inteira para
 * o lado e quebra o layout de tudo.
 */
export function Tabela({ cabecalho, children }: { cabecalho: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-line">
            {cabecalho.map((coluna) => (
              <th
                key={coluna}
                scope="col"
                className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted"
              >
                {coluna}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  )
}

export function Celula({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <td className={cn('whitespace-nowrap px-3 py-2.5 text-ink', className)}>{children}</td>
}

export function Vazio({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
      {children}
    </p>
  )
}
