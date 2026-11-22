import {
  isPintaVersionedKind,
  PINTA_MAP_WRITE_FORMAT_VERSION,
  PintaClientOutdatedError,
} from '@sistemazero/core/creations'
import {
  type PintaCausalIntent,
  type PintaCausalMember,
  type PintaCausalRead,
  pintaCausalIntentHash,
} from '@sistemazero/core/creations/pinta-causal'
import type { PintaCausalLocalPort as NativeCausalPort } from '@sistemazero/pinta'
import type { PintaMemoryAsset } from '@sistemazero/pinta/assets'
import { type PintaCausalCloud, PintaCausalRequestError } from './pinta-causal-cloud'

/** Carry the attempted seal across awaits so recovery cannot abort a different tab's upload. */
type PintaCausalLocalPort = NativeCausalPort<PintaMemoryAsset>

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

export async function freezePintaCausalPending(
  local: Pick<
    PintaCausalLocalPort,
    'prepare' | 'freeze' | 'retained' | 'inspect' | 'encodeCandidates'
  >,
  opId: string,
  signal: AbortSignal,
): Promise<boolean> {
  signal.throwIfAborted()
  const group = (await local.inspect()).pending.find((item) => item.opId === opId)
  if (!group) return false
  const saved = await local.retained(opId)
  signal.throwIfAborted()
  if (saved) return local.freeze(opId, group.preparation, saved.puts, saved.blobs)
  const draft = await local.prepare(opId)
  if (!draft) return false
  const frozen = await local.encodeCandidates(draft.assets, signal)
  return local.freeze(opId, draft.pending.preparation, frozen.puts, frozen.blobs)
}

export async function flushPintaCausalOutbox(options: {
  local: Pick<
    PintaCausalLocalPort,
    'inspect' | 'inFlight' | 'prepare' | 'seal' | 'acknowledge' | 'encodeCandidates'
  > &
    Partial<Pick<PintaCausalLocalPort, 'renew' | 'prepared' | 'retained'>>
  cloud: Pick<PintaCausalCloud, 'upload'> &
    Partial<Pick<PintaCausalCloud, 'snapshot' | 'verifyEpoch'>>
  reader: number
  writer?: number
  inventoryFloor?: number
  signal: AbortSignal
}): Promise<void> {
  const { local, cloud, reader, signal } = options
  const writer = Math.min(reader, options.writer ?? PINTA_MAP_WRITE_FORMAT_VERSION)
  function permit(members: readonly PintaCausalMember[], declaredReader: number) {
    if (
      declaredReader > writer ||
      (options.inventoryFloor ?? 1) > writer ||
      members.some(
        (part) =>
          part.action === 'put' &&
          part.formatVersion > (isPintaVersionedKind(part.kind) ? writer : 1),
      )
    )
      throw new PintaClientOutdatedError()
  }
  let renewed = false
  for (;;) {
    signal.throwIfAborted()
    const upload = await local.inFlight()
    if (upload) {
      permit(upload.sealed.intent.members, upload.sealed.intent.reader)
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
    let candidate = await (local.retained ?? local.prepared)?.(first.opId)
    let pending = first
    if (!candidate) {
      const draft = await local.prepare(first.opId)
      if (!draft) return
      pending = draft.pending
      candidate = await local.encodeCandidates(draft.assets, signal)
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
    permit(members, writer)
    const intent: PintaCausalIntent = {
      protocol: 1,
      opId: pending.opId,
      baseEpoch: pending.baseEpoch,
      reader: writer,
      members: members.sort((a, b) => (a.itemId < b.itemId ? -1 : 1)),
      readSet,
      ...(pending.inverseOf ? { inverseOf: pending.inverseOf } : {}),
    }
    const intentHash = await pintaCausalIntentHash(intent)
    signal.throwIfAborted()
    if (!(await local.seal(pending.preparation, intent, intentHash, candidate.blobs))) return
  }
}
