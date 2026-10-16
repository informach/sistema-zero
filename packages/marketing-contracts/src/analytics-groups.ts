import type { AnalyticsDimensions, AnalyticsRow } from './analytics'
import { type MetricKey, metricKeys } from './metrics'

export type AnalyticsGroup = {
  key: string
  label: string
  network: string
  format: string
  sourceType: AnalyticsRow['sourceType']
  ageBand: 'under-48h' | '2-14d' | '14-90d' | 'over-90d' | 'unavailable'
  collectionVersion: number | null
  posts: number
  ageHours: { min: number; max: number } | null
  metrics: Record<MetricKey, { total: number | null; observed: number }>
  savesPerView: { value: number | null; posts: number; saves: number; views: number }
}

/** Groups never merge networks, publication ages, formats or collection definitions.
 * Ratios use only paired observations with a positive denominator. No causal ranking. */
export function groupAnalytics(
  rows: AnalyticsRow[],
  dimension: keyof AnalyticsDimensions,
): AnalyticsGroup[] {
  const groups = new Map<string, AnalyticsGroup>()
  for (const row of rows) {
    const hours = row.metrics
      ? (Date.parse(row.metrics.capturedAt) - Date.parse(row.publishedAt)) / 3_600_000
      : null
    const age = hours !== null && hours >= 0 ? hours : null
    const ageBand: AnalyticsGroup['ageBand'] =
      age === null
        ? 'unavailable'
        : age < 48
          ? 'under-48h'
          : age < 336
            ? '2-14d'
            : age < 2160
              ? '14-90d'
              : 'over-90d'
    const label = row.dimensions[dimension].trim() || 'Não informado'
    const key = JSON.stringify([
      label,
      row.network,
      row.dimensions.format,
      row.sourceType,
      ageBand,
      row.collectionVersion,
    ])
    const group = groups.get(key) ?? {
      key,
      label,
      network: row.network,
      format: row.dimensions.format,
      sourceType: row.sourceType,
      ageBand,
      collectionVersion: row.collectionVersion,
      posts: 0,
      ageHours: null,
      metrics: Object.fromEntries(
        metricKeys.map((key) => [key, { total: null, observed: 0 }]),
      ) as AnalyticsGroup['metrics'],
      savesPerView: { value: null, posts: 0, saves: 0, views: 0 },
    }
    group.posts++
    if (age !== null)
      group.ageHours = {
        min: Math.min(group.ageHours?.min ?? age, age),
        max: Math.max(group.ageHours?.max ?? age, age),
      }
    for (const key of metricKeys) {
      const value =
        age !== null && row.metrics?.availability[key] === 'observed' ? row.metrics[key] : null
      if (value !== null) {
        group.metrics[key].total = (group.metrics[key].total ?? 0) + value
        group.metrics[key].observed++
      }
    }
    const metrics = row.metrics
    if (
      age !== null &&
      metrics?.availability.views === 'observed' &&
      metrics.availability.saves === 'observed' &&
      metrics.views !== null &&
      metrics.views > 0 &&
      metrics.saves !== null
    ) {
      group.savesPerView.posts++
      group.savesPerView.saves += metrics.saves
      group.savesPerView.views += metrics.views
      group.savesPerView.value = group.savesPerView.saves / group.savesPerView.views
    }
    groups.set(key, group)
  }
  return [...groups.values()].sort(
    (a, b) => a.label.localeCompare(b.label, 'pt-BR') || a.key.localeCompare(b.key),
  )
}
