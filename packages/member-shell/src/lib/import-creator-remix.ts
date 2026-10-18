import { creatorStorageNamespace } from './creator-storage-namespace'
import {
  remixRequirementFromSnapshot,
  type StudioRemixCapability,
  studioRemixCovered,
} from './studio-tier'

export class RemixCapabilityError extends Error {}
export async function importCreatorRemix(
  snapshot: unknown,
  options: {
    viewerId: string
    audience: 'adult' | 'kids'
    capability: StudioRemixCapability
    name: string
    signal?: AbortSignal
  },
) {
  if (!studioRemixCovered(options.capability, remixRequirementFromSnapshot(snapshot)))
    throw new RemixCapabilityError('Este jogo usa ferramentas ainda não liberadas.')
  const studio = await import('@sistemazero/studio')
  options.signal?.throwIfAborted()
  const namespace = creatorStorageNamespace(options.viewerId, options.audience)
  studio.setStudioStorageNamespace(namespace)
  const result = await studio.importProjectSnapshot(snapshot, { name: options.name, namespace })
  return result.project.id
}
