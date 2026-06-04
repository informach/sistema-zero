'use client'

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCents } from '@/lib/format'
import type { DailyPaymentBucket } from '@/lib/types'

// Cores fixas (dark-safe), estilo Hotmart: líquido verde, estornos vermelho,
// transações azul. Grid/eixos em cinza neutro p/ funcionar nos dois temas.
const COLOR_NET = '#16a34a'
const COLOR_CANCEL = '#dc2626'
const COLOR_TX = '#2563eb'
const COLOR_NEUTRAL = '#888888'

interface ChartPoint {
  day: string
  /** Faturamento líquido em REAIS (p/ o eixo monetário). */
  net: number
  cancellations: number
  transactions: number
}

/** "YYYY-MM-DD" → "dd/MM" (rótulo curto do eixo X). */
function shortDay(day: string): string {
  const [, m, d] = day.split('-')
  return `${d}/${m}`
}

const SERIES_LABELS: Record<string, string> = {
  net: 'Faturamento líquido',
  cancellations: 'Cancelamentos',
  transactions: 'Transações',
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { dataKey?: string | number; value?: number | string; color?: string }[]
  label?: string | number
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-card-foreground">
        {typeof label === 'string' ? shortDay(label) : label}
      </p>
      {payload.map((entry) => {
        const key = String(entry.dataKey)
        const raw = Number(entry.value ?? 0)
        const value = key === 'net' ? formatCents(Math.round(raw * 100)) : String(raw)
        return (
          <p key={key} className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {SERIES_LABELS[key] ?? key}: <span className="font-medium">{value}</span>
          </p>
        )
      })}
    </div>
  )
}

/** Gráfico de linha diário: líquido (R$, eixo esq.) × contagens (eixo dir.). */
export function SalesChart({ days }: { days: DailyPaymentBucket[] }) {
  const data: ChartPoint[] = days.map((b) => ({
    day: b.day,
    net: Number(b.netAmountInCents) / 100,
    cancellations: b.cancellations,
    transactions: b.transactions,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid stroke={COLOR_NEUTRAL} strokeOpacity={0.2} strokeDasharray="4 4" />
        <XAxis
          dataKey="day"
          tickFormatter={shortDay}
          tick={{ fill: COLOR_NEUTRAL, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: COLOR_NEUTRAL, strokeOpacity: 0.4 }}
          minTickGap={24}
        />
        <YAxis
          yAxisId="money"
          tickFormatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`}
          tick={{ fill: COLOR_NEUTRAL, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={80}
        />
        <YAxis
          yAxisId="count"
          orientation="right"
          allowDecimals={false}
          tick={{ fill: COLOR_NEUTRAL, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip content={<ChartTooltip />} />
        <Legend
          formatter={(value: string) => (
            <span className="text-xs text-muted-foreground">{SERIES_LABELS[value] ?? value}</span>
          )}
        />
        <Line
          yAxisId="money"
          type="monotone"
          dataKey="net"
          stroke={COLOR_NET}
          strokeWidth={2}
          dot={{ r: 2 }}
          activeDot={{ r: 4 }}
        />
        <Line
          yAxisId="count"
          type="monotone"
          dataKey="cancellations"
          stroke={COLOR_CANCEL}
          strokeWidth={2}
          dot={{ r: 2 }}
          activeDot={{ r: 4 }}
        />
        <Line
          yAxisId="count"
          type="monotone"
          dataKey="transactions"
          stroke={COLOR_TX}
          strokeWidth={2}
          dot={{ r: 2 }}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
