import { pintaCanReadFormatVersion } from '@sistemazero/core/creations'
import { awaitWithSignal } from '@sistemazero/core/http'
import type { PintaCausalLocalPort } from '@sistemazero/pinta'
import { assetFromJson, MAX_BACKUP_FILE_BYTES, type PintaAsset } from '@sistemazero/pinta/assets'
import {
  type PintaCausalCloud,
  PintaCausalRequestError,
  type PintaCloudSnapshot,
} from './pinta-causal-cloud'

/** A 404 is a compatibility signal only before the account has used the new protocol. */
export async function discoverPintaCausalSnapshot(options: {
  local: Pick<PintaCausalLocalPort, 'inspect' | 'rememberProtocol'>
  cloud: Pick<PintaCausalCloud, 'snapshot'>
  signal: AbortSignal
}): Promise<PintaCloudSnapshot | null> {
  const { local, cloud, signal } = options
  const snapshot = await cloud.snapshot(signal)
  signal.throwIfAborted()
  if (snapshot === null) {
    const state = await local.inspect()
    signal.throwIfAborted()
    if (state.protocolKnown || state.unbased || state.sealed || state.pending.length > 0)
      throw new PintaCausalRequestError(409, 'protocol-required')
    return null
  }
  await local.rememberProtocol()
  return snapshot
}

export async function readPintaCausalJson(
  bytes: Uint8Array<ArrayBuffer>,
  signal: AbortSignal,
  budget = { remaining: MAX_BACKUP_FILE_BYTES },
): Promise<string> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
  const reader = stream.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  const parts: string[] = []
  try {
    while (true) {
      const chunk = await awaitWithSignal(() => reader.read(), signal)
      if (chunk.done) break
      budget.remaining -= chunk.value.byteLength
      if (budget.remaining < 0) throw new Error('A galeria inteira não cabe neste aparelho.')
      parts.push(decoder.decode(chunk.value, { stream: true }))
    }
    parts.push(decoder.decode())
    return parts.join('')
  } finally {
    void reader.cancel().catch(() => {})
  }
}

/** The input represents every visible ID at the same server epoch. */
export async function pullPintaCausalSnapshot(options: {
  snapshot: PintaCloudSnapshot
  local: Pick<PintaCausalLocalPort, 'inspect' | 'capture' | 'pullImpact' | 'applyPull'>
  cloud: Pick<PintaCausalCloud, 'download' | 'verifyEpoch'>
  signal: AbortSignal
  isOpen(id: string): boolean
  withClosed(ids: readonly string[], apply: () => Promise<boolean>): Promise<boolean>
  recoverUnit?: Parameters<PintaCausalLocalPort['applyPull']>[0]['recoverUnit']
}): Promise<boolean> {
  const { snapshot, local, cloud, signal } = options
  const state = await local.inspect()
  const visible = new Map(snapshot.entries.map((entry) => [entry.itemId, entry]))
  const recovery = options.recoverUnit
  if (recovery && state.sealed?.intent.opId !== recovery.opId) return false
  const recoverDiverged =
    !!recovery || (state.epoch !== null && !state.sealed && !state.pending.length && !state.unbased)
  const owned = new Set(
    recovery && state.sealed
      ? [state.sealed.local, ...state.pending].flatMap((unit) =>
          unit.members.map(({ itemId }) => itemId),
        )
      : [],
  )
  function differentRemote(item: PintaCloudSnapshot['entries'][number]): boolean {
    if (owned.has(item.itemId)) return true
    const previous = state.confirmed.get(item.itemId)
    return (
      !previous ||
      previous.deleted ||
      previous.revision !== item.revision ||
      previous.sha256 !== item.sha256 ||
      previous.layoutRevision !== item.layoutRevision
    )
  }
  const removed = [...state.confirmed]
    .filter(([id, mark]) => !mark.deleted && !visible.has(id))
    .map(([id]) => id)
  const captureIds = [
    ...snapshot.entries
      .filter((entry) => recoverDiverged || differentRemote(entry))
      .map(({ itemId }) => itemId),
    ...removed,
  ]
  const bases = new Map((await local.capture(captureIds)).map((base) => [base.id, base]))
  const changed = snapshot.entries.filter(
    (entry) =>
      differentRemote(entry) ||
      (recoverDiverged &&
        state.confirmed.get(entry.itemId)?.localRevision !==
          bases.get(entry.itemId)?.beforeRevision),
  )
  const ids = [...changed.map(({ itemId }) => itemId), ...removed]
  if (ids.some(options.isOpen)) return false
  if (changed.some((entry) => !pintaCanReadFormatVersion(entry.formatVersion))) return false
  const staged = new Map<string, PintaAsset>()
  const budget = { remaining: MAX_BACKUP_FILE_BYTES }
  for (const entry of changed) {
    signal.throwIfAborted()
    const bytes = await cloud.download(entry, snapshot.epoch, signal)
    const json = await readPintaCausalJson(bytes, signal, budget)
    const parsed = assetFromJson(json)
    if (
      !parsed.asset ||
      parsed.warnings.length > 0 ||
      parsed.asset.id !== entry.itemId ||
      parsed.asset.kind !== entry.kind ||
      parsed.asset.name !== entry.name
    )
      return false
    staged.set(entry.itemId, parsed.asset)
  }
  const transitions = ids.map((id) => {
    const previous = bases.get(id)
    if (!previous) throw new Error('Não encontrei o desenho guardado para conferir.')
    return {
      ...previous,
      after: staged.get(id) ?? null,
      remote: visible.get(id) ?? null,
    }
  })
  const pull = {
    fromEpoch: state.epoch,
    epoch: snapshot.epoch,
    transitions,
    recoverInitial: true as const,
    ...(recoverDiverged ? { recoverDiverged: true as const } : {}),
    ...(recovery ? { recoverUnit: recovery } : {}),
  }
  const impact = await local.pullImpact(pull)
  if (impact.blocked || impact.ids.some(options.isOpen)) return false
  await cloud.verifyEpoch(snapshot.epoch, signal)
  return options.withClosed(impact.ids, () =>
    local.applyPull(
      { ...pull, coveredIds: impact.ids },
      () => !signal.aborted && !impact.ids.some(options.isOpen),
    ),
  )
}
