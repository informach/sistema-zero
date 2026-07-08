/**
 * Helpers PUROS do dashboard de métricas (testados em tests/metrics.test.ts).
 * Transformam o contrato do backend (FollowersSeriesView) nas linhas que o
 * recharts consome e derivam os deltas dos cards por rede.
 */

import type { SocialNetwork } from './networks'
import type { FollowersSeriesView } from './types'

/** Linha do LineChart: `date` + uma coluna por accountId. */
export type FollowersChartRow = { date: string } & Record<string, number | string>

/**
 * União ordenada das datas de TODAS as séries; conta sem snapshot num dia fica
 * ausente na linha (o recharts pula com `connectNulls`).
 */
export function buildFollowersChartRows(view: FollowersSeriesView): FollowersChartRow[] {
  const dates = new Set<string>()
  for (const serie of view.series) {
    for (const point of serie.points) dates.add(point.date)
  }
  return [...dates].sort().map((date) => {
    const row: FollowersChartRow = { date }
    for (const serie of view.series) {
      const point = serie.points.find((p) => p.date === date)
      if (point) row[serie.accountId] = point.followers
    }
    return row
  })
}

/**
 * Delta de seguidores no período POR CONTA (último − primeiro ponto).
 * Série com menos de 2 pontos não tem delta (null — mostrar "—", não "0").
 */
export function followersDelta(serie: FollowersSeriesView['series'][number]): number | null {
  if (serie.points.length < 2) return null
  const first = serie.points[0]
  const last = serie.points[serie.points.length - 1]
  if (!first || !last) return null
  return last.followers - first.followers
}

/** Soma dos deltas das contas de uma rede (null = nenhuma conta com delta). */
export function followersDeltaByNetwork(
  view: FollowersSeriesView,
  network: SocialNetwork,
): number | null {
  const deltas = view.series
    .filter((s) => s.network === network)
    .map(followersDelta)
    .filter((d): d is number => d !== null)
  if (deltas.length === 0) return null
  return deltas.reduce((sum, d) => sum + d, 0)
}

/** Cores fixas dark-safe por índice de série (molde sales-chart do admin). */
const SERIES_COLORS = ['#8b5cf6', '#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#14b8a6']

export function seriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length] as string
}

/** 'YYYY-MM-DD' → 'dd/MM' (rótulo curto do eixo X — a data JÁ é dia SP). */
export function shortDaySp(date: string): string {
  const [, month, day] = date.split('-')
  return month && day ? `${day}/${month}` : date
}
