'use client'

import {
  ACQUISITION_ORIGIN_KINDS,
  type AcquisitionOriginKind,
  type OriginWeekRow,
} from '@sistemazero/core/referrals'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCents } from '@/lib/format'
import { ORIGIN_CHART_LABELS } from '@/lib/referral-origin'

/**
 * Faturamento por semana e origem (25/11/2026): barras empilhadas no molde do `sales-chart`
 * (cores fixas, eixos em cinza neutro). Cada barra é uma semana (segunda a domingo, Brasília).
 */
export const ORIGIN_COLORS: Record<AcquisitionOriginKind, string> = {
  course: '#0891b2',
  ambassador: '#1b5cf3',
  campaign: '#7c4dff',
  platform: '#16a34a',
  ads: '#f59e0b',
  none: '#94a3b8',
}
const COLOR_NEUTRAL = '#888888'

type Point = { week: string; total: number } & Partial<Record<AcquisitionOriginKind, number>>

/** "2026-11-23" → "23/11". */
export function weekLabel(day: string): string {
  const [, m, d] = day.split('-')
  return `${d}/${m}`
}

/** As semanas em reais por origem (a última, em curso, ganha o aviso no rótulo). */
export function originChartPoints(weeks: OriginWeekRow[]): Point[] {
  return weeks.map((row) => {
    const point: Point = { week: row.weekStart, total: 0 }
    for (const origin of ACQUISITION_ORIGIN_KINDS) {
      const reais = Number(row.revenueByOrigin[origin] ?? 0) / 100
      point[origin] = reais
      point.total += reais
    }
    return point
  })
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
        Semana de {typeof label === 'string' ? weekLabel(label) : label}
      </p>
      {payload.map((entry) => {
        const key = String(entry.dataKey) as AcquisitionOriginKind
        return (
          <p key={key} className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {ORIGIN_CHART_LABELS[key] ?? key}:{' '}
            <span className="font-medium">
              {formatCents(Math.round(Number(entry.value ?? 0) * 100))}
            </span>
          </p>
        )
      })}
    </div>
  )
}

export function OriginChart({ weeks }: { weeks: OriginWeekRow[] }) {
  const data = originChartPoints(weeks)
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid stroke={COLOR_NEUTRAL} strokeOpacity={0.2} strokeDasharray="4 4" />
        <XAxis
          dataKey="week"
          tickFormatter={(v: string) => weekLabel(v)}
          tick={{ fill: COLOR_NEUTRAL, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: COLOR_NEUTRAL, strokeOpacity: 0.4 }}
        />
        <YAxis
          tickFormatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`}
          tick={{ fill: COLOR_NEUTRAL, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={80}
        />
        <Tooltip content={<ChartTooltip />} />
        <Legend
          formatter={(value: string) => (
            <span className="text-xs text-muted-foreground">
              {ORIGIN_CHART_LABELS[value as AcquisitionOriginKind] ?? value}
            </span>
          )}
        />
        {ACQUISITION_ORIGIN_KINDS.map((origin) => (
          <Bar key={origin} dataKey={origin} stackId="origem" fill={ORIGIN_COLORS[origin]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
