import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import { formatCurrency, formatCurrencyCompact } from '../../lib/format'
import type { ChartPoint } from '../../state/useStats'

function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null

  const point = payload[0]?.payload as ChartPoint | undefined
  if (!point) return null

  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-soft">
      <p className="text-xs text-muted">{point.label}</p>
      <p className="num text-sm font-semibold text-ink">{formatCurrency(point.total)}</p>
      <p className="text-xs text-muted">
        {point.count === 1 ? '1 casinha no dia' : `${point.count} casinhas no dia`}
      </p>
    </div>
  )
}

/** Acumulado guardado ao longo do tempo. Carregado sob demanda (Recharts é pesado). */
export default function SavingsChart({ data }: { data: ChartPoint[] }) {
  return (
    <div className="h-56 w-full text-muted">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#22C55E" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.16} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'currentColor', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: 'currentColor', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={58}
            tickFormatter={(value: number) => formatCurrencyCompact(value)}
          />
          <Tooltip content={ChartTooltip} cursor={{ stroke: '#22C55E', strokeOpacity: 0.4 }} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#22C55E"
            strokeWidth={2}
            fill="url(#areaFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
