import {
  type MetricKey,
  metricKeys,
  type PublicationMetricsSnapshot,
} from '@sistemazero/marketing-contracts'
import type { AccountSnapshot, PublicationSnapshot } from '../ports/metrics-repository.port'

/** Missing/invalid provider values must not masquerade as an observed zero. */
export function metricCount(value: unknown): number | null {
  if (typeof value !== 'number' && !(typeof value === 'string' && /^\d+$/.test(value))) return null
  const result = Number(value)
  return Number.isSafeInteger(result) && result >= 0 ? result : null
}

export function metricValue(snapshot: PublicationSnapshot, key: MetricKey): number | null {
  const value = metricCount(snapshot[key])
  // Old collectors defaulted absent fields to zero. Keep their raw database value intact;
  // a later collection with version 1 can prove an actual zero.
  return snapshot.collectionVersion < 1 && value === 0 ? null : value
}
export function followerValue(snapshot: AccountSnapshot): number | null {
  const value = metricCount(snapshot.followers)
  return snapshot.collectionVersion < 1 && value === 0 ? null : value
}
export function metricSnapshotView(snapshot: PublicationSnapshot): PublicationMetricsSnapshot {
  const values = Object.fromEntries(
    metricKeys.map((key) => [key, metricValue(snapshot, key)]),
  ) as Record<MetricKey, number | null>
  const availability = Object.fromEntries(
    metricKeys.map((key) => [
      key,
      snapshot.collectionVersion < 1 && snapshot[key] === 0
        ? 'legacy-unknown'
        : values[key] === null
          ? 'unavailable'
          : 'observed',
    ]),
  ) as PublicationMetricsSnapshot['availability']
  return { id: snapshot.id, capturedAt: snapshot.capturedAt.toISOString(), ...values, availability }
}
