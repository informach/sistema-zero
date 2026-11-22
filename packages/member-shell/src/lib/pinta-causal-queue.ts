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

export async function flushPintaCausalOutbox(options: {
  local: Pick<PintaCausalLocalPort, 'inspect' | 'inFlight' | 'prepare' | 'seal' | 'acknowledge'> &
    Partial<Pick<PintaCausalLocalPort, 'renew'>>
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
        if (
          renewed ||
          !(error instanceof PintaCausalRequestError) ||
          !['operation-expired', 'operation-aborted', 'not-found'].includes(error.reason) ||
          !cloud.snapshot ||
          !cloud.verifyEpoch ||
          !local.renew
        )
          throw error
        const snapshot = await cloud.snapshot(signal)
        if (!snapshot) throw error
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
        if (!preservesBasis || snapshot.epoch !== prior.baseEpoch) throw error
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
    const first = (await local.inspect()).pending[0]
    if (!first) return
    const prepared = await local.prepare(first.opId)
    if (!prepared) return
    const { pending, assets } = prepared
    if (pending.follows) return
    const readSet = pending.readSet.filter(
      (edge): edge is PintaCausalRead => edge.source !== 'predecessor',
    )
    if (readSet.length !== pending.readSet.length) return
    const byId = new Map(assets.map((asset) => [asset.id, asset]))
    const blobs = new Map<string, Blob>()
    const members: PintaCausalMember[] = []
    let sealedBytes = 0
    for (const part of pending.members) {
      const { itemId, baseRevision, action, operation } = part
      if (action === 'delete') {
        members.push({ action, itemId, baseRevision })
        continue
      }
      signal.throwIfAborted()
      const asset = byId.get(itemId)
      if (!asset || !operation)
        throw new Error('Não consegui montar todos os desenhos para guardar.')
      const formatVersion = pintaWriteFormatVersion(asset.kind)
      if (!pintaCanWriteNativeSchema(pintaAssetSchema(asset), formatVersion))
        throw new PintaClientOutdatedError()
      const source = new Blob([assetToJson(asset)])
      const gzip = await new Response(
        source.stream().pipeThrough(new CompressionStream('gzip')),
      ).blob()
      sealedBytes += gzip.size
      if (sealedBytes > MAX_BACKUP_FILE_BYTES)
        throw new Error('Estas mudanças juntas ultrapassam o espaço para sincronizar.')
      const sha256 = await pintaCausalGzipHash(await gzip.arrayBuffer())
      blobs.set(itemId, gzip)
      members.push({
        action,
        itemId,
        baseRevision,
        name: asset.name,
        kind: asset.kind,
        itemUpdatedAt: new Date(asset.updatedAt).toISOString(),
        formatVersion,
        bytes: gzip.size,
        sha256,
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
    if (!(await local.seal(pending.preparation, intent, intentHash, blobs))) return
  }
}
