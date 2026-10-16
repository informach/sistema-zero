import { randomUUID } from 'node:crypto'
import { assetDownloadSchema, assetManifestSchema } from '@sistemazero/marketing-contracts'
import type { LocalAssets } from '../assets'
import { downloadAsset } from './asset-download'
import type { LocalWorkspaceStore } from './local-store'
import type { SyncTransport } from './sync-engine'

/** The final has independent storage and an immutable pointer to its verified original. */
export async function prepareImportedFinal(
  resources: { assets: LocalAssets; store: LocalWorkspaceStore; transport: SyncTransport },
  projectId: string,
  originalId: string,
  expectedHash: string,
  signal: AbortSignal,
) {
  signal.throwIfAborted()
  const response = assetDownloadSchema.parse(
    await resources.transport.request(`/projects/${projectId}/assets/${originalId}/download`),
  )
  const original = response.manifest
  if (
    original.id !== originalId ||
    original.projectId !== projectId ||
    original.sha256 !== expectedHash ||
    original.role !== 'original' ||
    !original.mime.startsWith('image/')
  )
    throw new Error('O original não corresponde à conferência')
  const previous = resources.store
    .transfers(projectId)
    .find(
      (value) =>
        value.input.manifest.role === 'final' &&
        value.input.manifest.sourceAssetId === originalId &&
        value.input.manifest.sha256 === expectedHash,
    )
  if (previous) {
    if (previous.state === 'confirmed')
      await downloadAsset(
        projectId,
        previous.input.manifest.id,
        resources.assets,
        resources.transport,
        signal,
      )
    else await resources.assets.verify(previous.input.manifest.id)
    return previous.input.manifest
  }
  await downloadAsset(projectId, originalId, resources.assets, resources.transport, signal)
  const copied = await resources.assets.importFile(resources.assets.get(originalId).path, {
    expected: { sha256: original.sha256, size: original.size },
    signal,
    name: original.name,
  })
  const manifest = assetManifestSchema.parse({
    ...original,
    id: copied.id,
    name: copied.name,
    role: 'final',
    sourceAssetId: originalId,
  })
  resources.store.stageTransfer({ operationId: randomUUID(), manifest })
  return manifest
}
