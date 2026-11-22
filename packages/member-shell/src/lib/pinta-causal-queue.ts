import { pintaWriteFormatVersion } from '@sistemazero/core/creations'
import {
  type PintaCausalIntent,
  type PintaCausalMember,
  pintaCausalIntentHash,
} from '@sistemazero/core/creations/pinta-causal'
import type { PintaCausalLocalPort } from '@sistemazero/pinta'
import { assetToJson, MAX_BACKUP_FILE_BYTES } from '@sistemazero/pinta/assets'
import { type PintaCausalCloud, pintaCausalGzipHash } from './pinta-causal-cloud'

export async function flushPintaCausalOutbox(options: {
  local: Pick<PintaCausalLocalPort, 'inspect' | 'inFlight' | 'prepare' | 'seal' | 'acknowledge'>
  cloud: Pick<PintaCausalCloud, 'upload'>
  reader: number
  signal: AbortSignal
}): Promise<void> {
  const { local, cloud, reader, signal } = options
  for (;;) {
    signal.throwIfAborted()
    const upload = await local.inFlight()
    if (upload) {
      const receipt = await cloud.upload({ ...upload.sealed, blobs: upload.blobs }, signal)
      signal.throwIfAborted()
      await local.acknowledge(receipt, () => !signal.aborted)
      continue
    }
    const first = (await local.inspect()).pending[0]
    if (!first) return
    const prepared = await local.prepare(first.opId)
    if (!prepared) return
    const { pending, assets } = prepared
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
        formatVersion: pintaWriteFormatVersion(asset.kind),
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
      readSet: [...pending.readSet],
      ...(pending.inverseOf ? { inverseOf: pending.inverseOf } : {}),
    }
    const intentHash = await pintaCausalIntentHash(intent)
    signal.throwIfAborted()
    if (!(await local.seal(pending.preparation, intent, intentHash, blobs))) return
  }
}
