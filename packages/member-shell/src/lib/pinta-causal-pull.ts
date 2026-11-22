import { pintaCanReadFormatVersion } from '@sistemazero/core/creations'
import { awaitWithSignal } from '@sistemazero/core/http'
import type { PintaCausalLocalPort } from '@sistemazero/pinta'
import { assetFromJson, MAX_BACKUP_FILE_BYTES, type PintaAsset } from '@sistemazero/pinta/assets'
import {
  type PintaCausalCloud,
  PintaCausalRequestError,
  type PintaCloudSnapshot,
  pintaCausalGzipHash,
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

export class PintaCausalRecoveryNeedsFilesError extends Error {}

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

type LocalPull = Parameters<PintaCausalLocalPort['applyPull']>[0]
type QueueState = Awaited<ReturnType<PintaCausalLocalPort['inspect']>>
type RetainedPort = Partial<
  Pick<PintaCausalLocalPort, 'retained' | 'inFlight' | 'pinned' | 'decodeCandidate'>
>

async function readRetainedCandidates(
  local: RetainedPort,
  state: QueueState,
  recovery: LocalPull['recoverUnit'],
  budget: { remaining: number },
  signal: AbortSignal,
): Promise<Pick<LocalPull, 'archived' | 'archivedPins'>> {
  const sealed = recovery ? state.sealed : null
  const groups = [
    ...(sealed
      ? [sealed.local, ...state.pending].map(({ opId, members }) => ({
          opId,
          members: members.map(({ itemId, localRevision, action }) => ({
            itemId,
            localRevision,
            deleted: action === 'delete',
          })),
        }))
      : []),
    ...(!recovery && state.unbased ? [state.unbased] : []),
  ]
  const archived: NonNullable<LocalPull['archived']>[number][] = []
  const archivedPins: NonNullable<LocalPull['archivedPins']>[number][] = []
  const decoded = new Map<string, PintaAsset>()
  async function decode(
    put: NonNullable<Awaited<ReturnType<PintaCausalLocalPort['retained']>>>['puts'][number],
    blob: Blob | undefined,
  ): Promise<PintaAsset> {
    if (!blob || blob.size !== put.bytes)
      throw Error('Não consegui conferir os arquivos guardados neste aparelho.')
    signal.throwIfAborted()
    const data = new Uint8Array(await blob.arrayBuffer())
    if ((await pintaCausalGzipHash(data.buffer)) !== put.sha256)
      throw Error('Não consegui conferir os arquivos guardados neste aparelho.')
    const asset =
      decoded.get(put.sha256) ??
      local.decodeCandidate?.(await readPintaCausalJson(data, signal, budget))
    if (
      !asset ||
      asset.id !== put.itemId ||
      asset.kind !== put.kind ||
      asset.name !== put.name ||
      new Date(asset.updatedAt).toISOString() !== put.itemUpdatedAt
    )
      throw Error('Não consegui abrir os arquivos guardados neste aparelho.')
    decoded.set(put.sha256, asset)
    return asset
  }
  for (const group of groups) {
    const isSeal = group.opId === sealed?.intent.opId
    const sent = isSeal ? await local.inFlight?.() : null
    const retained = isSeal ? null : await local.retained?.(group.opId)
    const puts =
      sent && sent.sealed.intentHash === recovery?.intentHash
        ? sent.sealed.intent.members.filter((member) => member.action === 'put')
        : retained?.puts
    const members = new Map(group.members.map((member) => [member.itemId, member]))
    for (const put of puts ?? []) {
      const member = members.get(put.itemId)
      const blob = (sent?.blobs ?? retained?.blobs)?.get(put.itemId)
      if (!member || member.deleted)
        throw Error('Não consegui conferir os arquivos guardados neste aparelho.')
      const asset = await decode(put, blob)
      archived.push({
        opId: group.opId,
        localRevision: member.localRevision,
        sha256: put.sha256,
        asset,
      })
    }
    const resources = await local.pinned?.(group.opId)
    for (const put of resources?.puts ?? []) {
      const asset = await decode(put, resources?.blobs.get(put.itemId))
      archivedPins.push({ opId: group.opId, sha256: put.sha256, asset })
    }
  }
  return { archived, archivedPins }
}

/** The input represents every visible ID at the same server epoch. */
export async function pullPintaCausalSnapshot(options: {
  snapshot: PintaCloudSnapshot
  local: Pick<PintaCausalLocalPort, 'inspect' | 'capture' | 'pullImpact' | 'applyPull'> &
    RetainedPort
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
    ...owned,
    ...(state.unbased?.members.map(({ itemId }) => itemId) ?? []),
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
  const pull: LocalPull = {
    fromEpoch: state.epoch,
    epoch: snapshot.epoch,
    transitions,
    recoverInitial: true as const,
    ...(recoverDiverged ? { recoverDiverged: true as const } : {}),
    ...(recovery ? { recoverUnit: recovery } : {}),
  }
  let impact = await local.pullImpact(pull)
  if (impact.needsArchive && !impact.ids.some(options.isOpen)) {
    Object.assign(pull, await readRetainedCandidates(local, state, recovery, budget, signal))
    impact = await local.pullImpact(pull)
  }
  if (impact.ids.some(options.isOpen) || (impact.blocked && !impact.needsArchive)) return false
  await cloud.verifyEpoch(snapshot.epoch, signal)
  if (impact.needsArchive) throw new PintaCausalRecoveryNeedsFilesError()
  return options.withClosed(impact.ids, () =>
    local.applyPull(
      { ...pull, coveredIds: impact.ids },
      () => !signal.aborted && !impact.ids.some(options.isOpen),
    ),
  )
}
