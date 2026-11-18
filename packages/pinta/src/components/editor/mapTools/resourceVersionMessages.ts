import { COPY } from '../../../core/copy'
import type { ResourceVersionFailure } from '../../../tiles/resourceVersions'

export const RESOURCE_VERSION_MESSAGES: Readonly<Record<ResourceVersionFailure, string>> = {
  locked: COPY.layers.lockedWarning,
  missing: COPY.scene.resourceMissing,
  unsupported: COPY.scene.resourceUnsupported,
  'version-limit': COPY.scene.resourceVersionLimit,
  'memory-budget': COPY.scene.resourceMemoryLimit,
  'animation-missing': COPY.scene.resourceAnimationMissing,
  'layout-changed': COPY.scene.resourceLayoutChanged,
}
