import {
  PintaClientOutdatedError,
  pintaCanWriteNativeSchema,
  pintaWriteFormatVersion,
} from '@sistemazero/core/creations'
import {
  type PintaCausalIntent,
  type PintaCausalMember,
  type PintaCausalRead,
  pintaCausalIntentHash,
} from '@sistemazero/core/creations/pinta-causal'
import type { PintaCausalLocalPort } from '@sistemazero/pinta'
import { assetToJson, MAX_BACKUP_FILE_BYTES, pintaAssetSchema } from '@sistemazero/pinta/assets'
import {
  type PintaCausalCloud,
  PintaCausalRequestError,
  pintaCausalGzipHash,
} from './pinta-causal-cloud'

type LocalCandidate = NonNullable<Awaited<ReturnType<PintaCausalLocalPort['prepare']>>>
type FrozenCandidate = NonNullable<Awaited<ReturnType<PintaCausalLocalPort['prepared']>>>

/** Carry the attempted seal across awaits so recovery cannot abort a different tab's upload. */
export class PintaCausalUploadError extends PintaCausalRequestError {
  constructor(
    error: PintaCausalRequestError,
    readonly opId: string,
    readonly intentHash: string,
  ) {
    super(error.status, error.reason, error.itemId)
    this.cause = error
  }
}

async function encodeCandidate(
  { assets }: LocalCandidate,
  signal: AbortSignal,
): Promise<FrozenCandidate> {
  const blobs = new Map<string, Blob>()
  const puts: FrozenCandidate['puts'][number][] = []
  let bytes = 0
  for (const asset of assets) {
    signal.throwIfAborted()
    const formatVersion = pintaWriteFormatVersion(asset.kind)
    if (!pintaCanWriteNativeSchema(pintaAssetSchema(asset), formatVersion))
      throw new PintaClientOutdatedError()
    const source = new Blob([assetToJson(asset)])
    const gzip = await new Response(
      source.stream().pipeThrough(new CompressionStream('gzip')),
    ).blob()
    bytes += gzip.size
    if (bytes > MAX_BACKUP_FILE_BYTES)
      throw new Error('Estas mudanças juntas ultrapassam o espaço para sincronizar.')
    const sha256 = await pintaCausalGzipHash(await gzip.arrayBuffer())
    blobs.set(asset.id, gzip)
    puts.push({
      itemId: asset.id,
      name: asset.name,
      kind: asset.kind,
      itemUpdatedAt: new Date(asset.updatedAt).toISOString(),
      formatVersion,
      bytes: gzip.size,
      sha256,
    })
  }
  signal.throwIfAborted()
  return { puts, blobs }
}

export async function freezePintaCausalPending(
  local: Pick<PintaCausalLocalPort, 'prepare' | 'freeze'>,
  opId: string,
  signal: AbortSignal,
): Promise<boolean> {
  const draft = await local.prepare(opId)
  if (!draft) return false
  const frozen = await encodeCandidate(draft, signal)
  return local.freeze(opId, draft.pending.preparation, frozen.puts, frozen.blobs)
}

export async function flushPintaCausalOutbox(options: {
  local: Pick<PintaCausalLocalPort, 'inspect' | 'inFlight' | 'prepare' | 'seal' | 'acknowledge'> &
    Partial<Pick<PintaCausalLocalPort, 'renew' | 'prepared'>>
  cloud: Pick<PintaCausalCloud, 'upload'> &
    Partial<Pick<PintaCausalCloud, 'snapshot' | 'verifyEpoch'>>
  reader: number
  signal: AbortSignal
}): Promise<void> {
  const { local, cloud, reader, signal } = options
  let renewed = false
  for (;;) {
    signal.throwIfAborted()
    const upload = await local.inFlight()
    if (upload) {
      let receipt: Awaited<ReturnType<PintaCausalCloud['upload']>>
      try {
        receipt = await cloud.upload({ ...upload.sealed, blobs: upload.blobs }, signal)
      } catch (error) {
        if (!(error instanceof PintaCausalRequestError)) throw error
        const failure = new PintaCausalUploadError(
          error,
          upload.sealed.intent.opId,
          upload.sealed.intentHash,
        )
        if (
          renewed ||
          !['operation-expired', 'operation-aborted', 'not-found'].includes(error.reason) ||
          !cloud.snapshot ||
          !cloud.verifyEpoch ||
          !local.renew
        )
          throw failure
        const snapshot = await cloud.snapshot(signal)
        if (!snapshot) throw failure
        const prior = upload.sealed.intent
        const visible = new Map(snapshot.entries.map((entry) => [entry.itemId, entry]))
        const preservesBasis =
          prior.members.every(
            (member) => (visible.get(member.itemId)?.revision ?? 0) === member.baseRevision,
          ) &&
          prior.readSet.every((edge) => {
            if (edge.source === 'unit') return true
            const entry = visible.get(edge.targetId)
            return (
              entry?.revision === edge.revision &&
              entry.sha256 === edge.sha256 &&
              (entry.layoutRevision ?? undefined) === edge.layoutRevision
            )
          })
        if (!preservesBasis || snapshot.epoch !== prior.baseEpoch) throw failure
        await cloud.verifyEpoch(snapshot.epoch, signal)
        const next = { ...prior, opId: crypto.randomUUID(), baseEpoch: snapshot.epoch }
        const hash = await pintaCausalIntentHash(next)
        signal.throwIfAborted()
        if (!(await local.renew(upload.sealed, next, hash, () => !signal.aborted))) return
        renewed = true
        continue
      }
      signal.throwIfAborted()
      if (!(await local.acknowledge(receipt, () => !signal.aborted))) return
      continue
    }
    const queue = await local.inspect()
    if (queue.sealed) continue
    const first = queue.pending[0]
    if (!first) return
    if (first.follows) throw new PintaCausalRequestError(409, 'unresolved-predecessor')
    let candidate = await local.prepared?.(first.opId)
    let pending = first
    if (!candidate) {
      const draft = await local.prepare(first.opId)
      if (!draft) return
      pending = draft.pending
      candidate = await encodeCandidate(draft, signal)
    }
    if (pending.follows) return
    const readSet = pending.readSet.filter(
      (edge): edge is PintaCausalRead => edge.source !== 'predecessor',
    )
    if (readSet.length !== pending.readSet.length) return
    const byId = new Map(candidate.puts.map((put) => [put.itemId, put]))
    const members: PintaCausalMember[] = []
    for (const part of pending.members) {
      const { itemId, baseRevision, action, operation } = part
      if (action === 'delete') {
        members.push({ action, itemId, baseRevision })
        continue
      }
      const put = byId.get(itemId)
      if (!put || !operation) throw new Error('Não consegui montar todos os desenhos para guardar.')
      members.push({
        ...put,
        action,
        baseRevision,
        operation,
      })
    }
    const intent: PintaCausalIntent = {
      protocol: 1,
      opId: pending.opId,
      baseEpoch: pending.baseEpoch,
      reader,
      members: members.sort((a, b) => (a.itemId < b.itemId ? -1 : 1)),
      readSet,
      ...(pending.inverseOf ? { inverseOf: pending.inverseOf } : {}),
    }
    const intentHash = await pintaCausalIntentHash(intent)
    signal.throwIfAborted()
    if (!(await local.seal(pending.preparation, intent, intentHash, candidate.blobs))) return
  }
}
