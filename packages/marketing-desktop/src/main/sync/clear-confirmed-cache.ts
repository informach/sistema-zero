import { assetConfirmationSchema } from '../../../../marketing-contracts/src/assets'
import type { LocalAssets } from '../assets'
import type { SyncTransport } from './sync-engine'

/** Query bounded groups, then remove only equivalent confirmed copies. Pending
 * work is excluded before the request; the manager holds its maintenance lock. */
export async function clearConfirmedAssets(
  input: {
    projectId: string
    assets: Pick<LocalAssets, 'list' | 'evict'>
    protectedIds: Set<string>
    transport: SyncTransport
    signal: AbortSignal
  },
  targetBytes = 1024 ** 3,
) {
  if (!Number.isSafeInteger(targetBytes) || targetBytes <= 0)
    throw new Error('Limite de limpeza inválido')
  const files = input.assets.list(),
    candidates = files
      .filter((file) => !input.protectedIds.has(file.id))
      .sort((left, right) => right.size - left.size || left.id.localeCompare(right.id))
  let freedBytes = 0,
    removed = 0,
    unavailable = 0
  const preserved = files.length - candidates.length
  for (let offset = 0; offset < candidates.length && freedBytes < targetBytes; offset += 100) {
    input.signal.throwIfAborted()
    const batch = candidates.slice(offset, offset + 100),
      ids = new Set(batch.map((file) => file.id)),
      result = assetConfirmationSchema.parse(
        await input.transport.request(`/projects/${input.projectId}/assets/confirmed`, 'POST', {
          ids: [...ids],
        }),
      ),
      manifests = new Map(result.manifests.map((manifest) => [manifest.id, manifest]))
    if (
      result.projectId !== input.projectId ||
      manifests.size !== result.manifests.length ||
      result.manifests.some(
        (manifest) => manifest.projectId !== input.projectId || !ids.has(manifest.id),
      )
    )
      throw new Error('O servidor retornou uma confirmação de arquivos inválida')
    // Validate the whole batch before removing any copy from it.
    for (const file of batch) {
      const remote = manifests.get(file.id)
      if (remote && (remote.sha256 !== file.sha256 || remote.size !== file.size))
        throw new Error(
          'O servidor não confirmou uma cópia equivalente; o arquivo local foi preservado',
        )
    }
    for (const file of batch) {
      input.signal.throwIfAborted()
      if (freedBytes >= targetBytes) break
      if (!manifests.has(file.id)) {
        unavailable++
        continue
      }
      freedBytes += await input.assets.evict(file.id)
      removed++
    }
  }
  return { freedBytes, removed, preserved, unavailable }
}
