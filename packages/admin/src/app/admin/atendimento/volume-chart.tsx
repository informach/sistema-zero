'use client'

import type { DailyVolumePoint } from '@sistemazero/helpdesk-contracts'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const COLOR_NEUTRAL = '#888888'
const COLOR_CREATED = '#8b5cf6'

/** 'YYYY-MM-DD' → 'dd/MM' (a data JÁ é o dia civil de São Paulo, vinda do helpdesk). */
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
  payload?: { value?: number | string }[]
  label?: string | number
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-card-foreground">
        {typeof label === 'string' ? shortDaySp(label) : label}
      </p>
      <p className="text-muted-foreground">
        Recebidos: <span className="font-medium">{Number(payload[0]?.value ?? 0)}</span>
      </p>
    </div>
  )
}

/** Tickets recebidos por dia (14 dias), o mesmo gráfico do painel do app de atendimento. */
export function VolumeChart({ data }: { data: DailyVolumePoint[] }) {
  if (!data.some((p) => p.created > 0)) {
    return (
      <div className="flex h-[240px] items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
        <p className="px-6 text-center text-sm text-muted-foreground">
          Nenhum ticket recebido nos últimos 14 dias.
        </p>
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
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
      </BarChart>
    </ResponsiveContainer>
  )
}
