'use client'

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DailyVolumePoint } from '@/lib/types'

const COLOR_NEUTRAL = '#888888'
const COLOR_CREATED = '#8b5cf6'
const SERIES_LABELS: Record<string, string> = {
  created: 'Recebidos',
}

/** 'YYYY-MM-DD' → 'dd/MM' (a data JÁ é o dia civil de São Paulo). */
function shortDaySp(date: string): string {
  const [, month, day] = date.split('-')
  return month && day ? `${day}/${month}` : date
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
        {typeof label === 'string' ? shortDaySp(label) : label}
      </p>
      {payload.map((entry) => {
        const key = String(entry.dataKey)
        return (
          <p key={key} className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {SERIES_LABELS[key] ?? key}:{' '}
            <span className="font-medium">{Number(entry.value ?? 0)}</span>
          </p>
        )
      })}
    </div>
  )
}

/** Volume diário: barras de tickets recebidos. A IA só gera material para revisão humana. */
export function VolumeChart({ data }: { data: DailyVolumePoint[] }) {
  const hasData = data.some((p) => p.created > 0)
  if (!hasData) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
        <p className="px-6 text-center text-sm text-muted-foreground">
          Ainda não há tickets no período. O gráfico ganha uma barra por dia conforme as mensagens
          chegam no contato@.
        </p>
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid stroke={COLOR_NEUTRAL} strokeOpacity={0.2} strokeDasharray="4 4" />
        <XAxis
          dataKey="date"
          tickFormatter={shortDaySp}
          tick={{ fill: COLOR_NEUTRAL, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: COLOR_NEUTRAL, strokeOpacity: 0.4 }}
          minTickGap={16}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: COLOR_NEUTRAL, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={32}
        />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="created" fill={COLOR_CREATED} radius={[3, 3, 0, 0]} maxBarSize={28} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
