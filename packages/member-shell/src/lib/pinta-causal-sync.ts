import type { PintaCausalLocalPort } from '@sistemazero/pinta'
import type {
  PintaCausalCloud,
  PintaCausalRequestError,
  PintaCloudSnapshot,
} from './pinta-causal-cloud'
import { discoverPintaCausalSnapshot, pullPintaCausalSnapshot } from './pinta-causal-pull'
import { flushPintaCausalOutbox, PintaCausalUploadError } from './pinta-causal-queue'

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
}): Promise<PintaCausalSyncOutcome> {
  const { cloud, local, reader, signal } = options
  let snapshot = await discoverPintaCausalSnapshot(options)
  if (!snapshot) return { mode: 'legacy' }
  const queued = await local.inspect()
  let recoverUnit: Parameters<PintaCausalLocalPort['applyPull']>[0]['recoverUnit']
  let failedUnit: PintaCausalRequestError | undefined
  if (queued.sealed || queued.pending.length > 0) {
    try {
      await flushPintaCausalOutbox({ local, cloud, reader, signal })
    } catch (error) {
      if (
        !cloud.settle ||
        !(error instanceof PintaCausalUploadError) ||
        ![
          'operation-expired',
          'operation-aborted',
          'not-found',
          'epoch-changed',
          'stale-base',
          'layout-stale',
        ].includes(error.reason)
      )
        throw error
      const candidate = await local.inFlight()
      if (
        !candidate ||
        candidate.sealed.intent.opId !== error.opId ||
        candidate.sealed.intentHash !== error.intentHash
      )
        throw error
      const settled = await cloud.settle(candidate.sealed, signal)
      signal.throwIfAborted()
      if (settled.state === 'committed') {
        await local.acknowledge(settled.result, () => !signal.aborted)
      } else {
        const observed = await local.inspect()
        if (
          observed.sealed?.intent.opId !== candidate.sealed.intent.opId ||
          observed.sealed.intentHash !== candidate.sealed.intentHash
        )
          throw error
        recoverUnit = {
          opId: candidate.sealed.intent.opId,
          intentHash: candidate.sealed.intentHash,
          terminal: settled.state,
          pending: observed.pending.map(({ opId, preparation }) => ({ opId, preparation })),
        }
        failedUnit = error
      }
    }
    const next = await discoverPintaCausalSnapshot(options)
    if (next) snapshot = next
  }
  for (;;) {
    const unknown = snapshot.entries.find((entry) => entry.coverage !== 'certified')
    if (!unknown) break
    if (!options.canContinue()) {
      if (failedUnit) throw failedUnit
      return { mode: 'causal', applied: false, snapshot }
    }
    await cloud.backfill(unknown, snapshot.epoch, signal)
    const next = await discoverPintaCausalSnapshot(options)
    if (!next || next.epoch === snapshot.epoch) return { mode: 'causal', applied: false, snapshot }
    snapshot = next
  }
  const applied = await pullPintaCausalSnapshot({ ...options, snapshot, recoverUnit })
  if (!applied && failedUnit) throw failedUnit
  return { mode: 'causal', applied, snapshot }
}
