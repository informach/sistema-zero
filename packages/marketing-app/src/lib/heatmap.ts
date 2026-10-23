/**
 * Helpers PUROS do heatmap 7×24 de melhores horários (testados em
 * tests/heatmap.test.ts). A intensidade é NORMALIZADA pelo melhor
 * views-por-post do conjunto (0..4); célula sem post fica em 0.
 */

import type { BestTimesView } from './types'

export const DOW_LABELS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const

export interface HeatmapCell {
  dow: number
  hour: number
  posts: number
  views: number | null
  observedPosts: number
  /** Média de views por post (o que "melhor horário" significa aqui). */
  avgViews: number | null
  /** 0 = sem post · 1..4 = quartis do melhor avgViews do conjunto. */
  intensity: 0 | 1 | 2 | 3 | 4
}

/**
 * Grade DENSA 7×24 (linha = dia, coluna = hora) a partir das células esparsas
 * do backend. `grid[dow][hour]`.
 */
export function buildHeatmapGrid(
  view: Pick<BestTimesView, 'cells' | 'totalPosts'>,
): HeatmapCell[][] {
  const byKey = new Map(view.cells.map((cell) => [`${cell.dow}:${cell.hour}`, cell]))
  const maxAvg = Math.max(
    0,
    ...view.cells.map((cell) =>
      cell.viewsObserved > 0 && cell.views !== null ? cell.views / cell.viewsObserved : 0,
    ),
  )
  return Array.from({ length: 7 }, (_, dow) =>
    Array.from({ length: 24 }, (_, hour) => {
      const cell = byKey.get(`${dow}:${hour}`)
      if (!cell || cell.viewsObserved === 0 || cell.views === null) {
        return {
          dow,
          hour,
          posts: cell?.posts ?? 0,
          observedPosts: 0,
          views: null,
          avgViews: null,
          intensity: 0 as const,
        }
      }
      const avgViews = cell.views / cell.viewsObserved
      return {
        dow,
        hour,
        posts: cell.posts,
        observedPosts: cell.viewsObserved,
        views: cell.views,
        avgViews,
        intensity: intensityFor(avgViews, maxAvg),
      }
    }),
  )
}

/** Quartis do MELHOR avgViews: célula com post nunca fica em 0 (mínimo 1). */
export function intensityFor(avgViews: number, maxAvg: number): 0 | 1 | 2 | 3 | 4 {
  if (maxAvg <= 0) return 1 // há post, mas ninguém tem views ainda
  const ratio = avgViews / maxAvg
  if (ratio > 0.75) return 4
  if (ratio > 0.5) return 3
  if (ratio > 0.25) return 2
  return 1
}

/** Tooltip nativo da célula ("ter 19h · 3 posts · 450 views (150/post)"). */
export function cellTitle(cell: HeatmapCell): string {
  if (cell.posts === 0) return `${DOW_LABELS[cell.dow]} ${cell.hour}h · sem posts`
  if (cell.avgViews === null)
    return `${DOW_LABELS[cell.dow]} ${cell.hour}h · ${cell.posts} post(s) · views indisponíveis`
  const avg = Math.round(cell.avgViews)
  return `${DOW_LABELS[cell.dow]} ${cell.hour}h · ${cell.posts} ${cell.posts === 1 ? 'post' : 'posts'} · ${cell.views} views (${avg}/post com dado; ${cell.observedPosts}/${cell.posts} observados)`
}
