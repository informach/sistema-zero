import type { PintaCausalLocalPort } from '@sistemazero/pinta'
import type { PintaAsset } from '@sistemazero/pinta/assets'
import type { PintaCausalCloud, PintaCloudSnapshot } from './pinta-causal-cloud'
import { discoverPintaCausalSnapshot, pullPintaCausalSnapshot } from './pinta-causal-pull'
import { flushPintaCausalOutbox } from './pinta-causal-queue'

export type PintaCausalSyncOutcome =
  | { mode: 'legacy' }
  | { mode: 'causal'; applied: boolean; snapshot: PintaCloudSnapshot }

/** The worker uses the existing per-pass time budget without publishing a partial catalog. */
export async function syncPintaCausalAccount(options: {
  cloud: PintaCausalCloud
  local: PintaCausalLocalPort
  reader: number
  signal: AbortSignal
  canContinue(): boolean
  isOpen(id: string): boolean
  withClosed(ids: readonly string[], apply: () => Promise<boolean>): Promise<boolean>
  legacyBase?(asset: PintaAsset): { revision: number; localRevision: string } | undefined
}): Promise<PintaCausalSyncOutcome> {
  const { cloud, local, reader, signal } = options
  let snapshot = await discoverPintaCausalSnapshot(options)
  if (!snapshot) return { mode: 'legacy' }
  const queued = await local.inspect()
  if (queued.sealed || queued.pending.length > 0) {
    await flushPintaCausalOutbox({ local, cloud, reader, signal })
    const next = await discoverPintaCausalSnapshot(options)
    if (next) snapshot = next
  }
  for (;;) {
    const unknown = snapshot.entries.find((entry) => entry.coverage !== 'certified')
    if (!unknown) break
    if (!options.canContinue()) return { mode: 'causal', applied: false, snapshot }
    await cloud.backfill(unknown, snapshot.epoch, signal)
    const next = await discoverPintaCausalSnapshot(options)
    if (!next || next.epoch === snapshot.epoch) return { mode: 'causal', applied: false, snapshot }
    snapshot = next
  }
  const applied = await pullPintaCausalSnapshot({ ...options, snapshot })
  return { mode: 'causal', applied, snapshot }
}
