import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import { formatInteger } from '../../lib/format'
import type { PontoSerie } from './useAdminAnalytics'

/**
 * Gráficos do painel de admin.
 *
 * Arquivo próprio e carregado com `lazy`, pela mesma razão do
 * [`SavingsChart`](../app/SavingsChart.tsx): Recharts é pesado e não tem por
 * que entrar no bundle de quem só abre a landing.
 *
 * Cores vêm de uma paleta fixa em vez dos tokens CSS porque o SVG do Recharts
 * não lê variável do Tailwind — o que dá para herdar do tema (eixos, grade)
 * usa `currentColor`, e o resto fica nesta lista.
 */

const PALETA = ['#22C55E', '#38BDF8', '#F59E0B', '#A78BFA', '#F472B6', '#94A3B8']

const eixoBase = {
  tick: { fill: 'currentColor', fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const

function Caixa({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-soft">{children}</div>
}

function DicaSerie({
  active,
  payload,
  formatar,
  sufixo,
}: TooltipContentProps & { formatar: (valor: number) => string; sufixo: string }) {
  if (!active || !payload || payload.length === 0) return null
  const ponto = payload[0]?.payload as PontoSerie | undefined
  if (!ponto) return null

  return (
    <Caixa>
      <p className="text-xs text-muted">{ponto.label}</p>
      <p className="num text-sm font-semibold text-ink">
        {formatar(ponto.valor)} {sufixo}
      </p>
      <p className="text-xs text-muted">Acumulado: {formatar(ponto.acumulado)}</p>
    </Caixa>
  )
}

/** Série diária como área — usada em cadastros e receita. */
export function SerieArea({
  dados,
  formatar = formatInteger,
  sufixo = '',
  acumulada = false,
}: {
  dados: PontoSerie[]
  formatar?: (valor: number) => string
  sufixo?: string
  /** true desenha o acumulado em vez do valor do dia. */
  acumulada?: boolean
}) {
  return (
    <div className="h-56 w-full text-muted">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="adminArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#22C55E" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.16} vertical={false} />
          <XAxis dataKey="label" minTickGap={28} {...eixoBase} />
          <YAxis width={58} tickFormatter={formatar} {...eixoBase} />
          <Tooltip
            content={(props: TooltipContentProps) => (
              <DicaSerie {...props} formatar={formatar} sufixo={sufixo} />
            )}
            cursor={{ stroke: '#22C55E', strokeOpacity: 0.4 }}
          />
          <Area
            type="monotone"
            dataKey={acumulada ? 'acumulado' : 'valor'}
            stroke="#22C55E"
            strokeWidth={2}
            fill="url(#adminArea)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

interface Categoria {
  nome: string
  valor: number
}

function DicaCategoria({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null
  const ponto = payload[0]?.payload as Categoria | undefined
  if (!ponto) return null

  return (
    <Caixa>
      <p className="text-xs text-muted">{ponto.nome}</p>
      <p className="num text-sm font-semibold text-ink">{formatInteger(ponto.valor)}</p>
    </Caixa>
  )
}

/** Barras verticais por categoria — distribuição de progresso. */
export function BarrasCategoria({ dados }: { dados: Categoria[] }) {
  return (
    <div className="h-56 w-full text-muted">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.16} vertical={false} />
          <XAxis dataKey="nome" interval={0} height={44} angle={-18} textAnchor="end" {...eixoBase} />
          <YAxis width={40} allowDecimals={false} {...eixoBase} />
          <Tooltip content={DicaCategoria} cursor={{ fill: 'currentColor', fillOpacity: 0.06 }} />
          <Bar dataKey="valor" radius={[6, 6, 0, 0]} isAnimationActive={false}>
            {dados.map((fatia, indice) => (
              <Cell key={fatia.nome} fill={PALETA[indice % PALETA.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Rosca com legenda própria em vez da do Recharts: a legenda nativa corta
 * rótulo em tela estreita, e aqui cabe mostrar o número junto do nome.
 */
export function Rosca({ dados }: { dados: Categoria[] }) {
  const total = dados.reduce((soma, fatia) => soma + fatia.valor, 0)

  if (total === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted">
        Sem dados ainda.
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dados}
              dataKey="valor"
              nameKey="nome"
              innerRadius="58%"
              outerRadius="100%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {dados.map((fatia, indice) => (
                <Cell key={fatia.nome} fill={PALETA[indice % PALETA.length]} />
              ))}
            </Pie>
            <Tooltip content={DicaCategoria} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="w-full space-y-1.5">
        {dados.map((fatia, indice) => (
          <li key={fatia.nome} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: PALETA[indice % PALETA.length] }}
              aria-hidden
            />
            <span className="text-ink">{fatia.nome}</span>
            <span className="num ml-auto text-muted">
              {formatInteger(fatia.valor)} · {((fatia.valor / total) * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
