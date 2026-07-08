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
import { buildFollowersChartRows, seriesColor, shortDaySp } from '@/lib/metrics'
import { NETWORK_LABELS } from '@/lib/networks'
import type { FollowersSeriesView } from '@/lib/types'

const COLOR_NEUTRAL = '#888888'
const NUMBER_FMT = new Intl.NumberFormat('pt-BR')

function ChartTooltip({
  active,
  payload,
  label,
  names,
}: {
  active?: boolean
  payload?: { dataKey?: string | number; value?: number | string; color?: string }[]
  label?: string | number
  names: Map<string, string>
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
            {names.get(key) ?? key}:{' '}
            <span className="font-medium">{NUMBER_FMT.format(Number(entry.value ?? 0))}</span>
          </p>
        )
      })}
    </div>
  )
}

/** Série de seguidores: uma linha por CONTA (rótulo "Nome · Rede"). */
export function FollowersChart({ view }: { view: FollowersSeriesView }) {
  const rows = buildFollowersChartRows(view)
  const names = new Map(
    view.series.map((s) => [s.accountId, `${s.displayName} · ${NETWORK_LABELS[s.network]}`]),
  )
  if (rows.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
        <p className="px-6 text-center text-sm text-muted-foreground">
          Ainda não há snapshots suficientes no período. A série cresce um ponto por dia de coleta.
        </p>
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid stroke={COLOR_NEUTRAL} strokeOpacity={0.2} strokeDasharray="4 4" />
        <XAxis
          dataKey="date"
          tickFormatter={shortDaySp}
          tick={{ fill: COLOR_NEUTRAL, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: COLOR_NEUTRAL, strokeOpacity: 0.4 }}
          minTickGap={24}
        />
        <YAxis
          allowDecimals={false}
          tickFormatter={(v: number) => NUMBER_FMT.format(v)}
          tick={{ fill: COLOR_NEUTRAL, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={64}
        />
        <Tooltip content={<ChartTooltip names={names} />} />
        <Legend
          formatter={(value: string) => (
            <span className="text-xs text-muted-foreground">{names.get(value) ?? value}</span>
          )}
        />
        {view.series.map((serie, index) => (
          <Line
            key={serie.accountId}
            type="monotone"
            dataKey={serie.accountId}
            stroke={seriesColor(index)}
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 4 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
