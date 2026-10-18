import type { UseStore } from 'idb-keyval'
import { MOLDA_LIMITS } from '../core/limits'
import { readSceneStorageSnapshot } from './sceneQuota'

export async function sceneStorageCapacityForStore(store: UseStore, id: string): Promise<number> {
  // Without an estimate there is no origin usage to subtract or gallery usage to add back.
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate)
    return MOLDA_LIMITS.maxGalleryBytes
  const snapshot = await readSceneStorageSnapshot(store, id)
  return sceneStorageCapacity([...snapshot.costs.values()].reduce((sum, bytes) => sum + bytes, 0))
}

/** Shared origin quota is an estimate, never permission to ignore a failed physical write. */
export async function sceneStorageCapacity(moldaBytes = 0): Promise<number> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      const { quota, usage } = await navigator.storage.estimate()
      if (typeof quota === 'number' && Number.isFinite(quota) && quota > 0)
        return Math.max(
          1,
          Math.floor(
            Math.min(
              2 * 1024 ** 3,
              quota -
                Math.max(
                  0,
                  (typeof usage === 'number' && Number.isFinite(usage) ? usage : 0) - moldaBytes,
                ) -
                Math.min(64 * 1024 ** 2, quota * 0.1),
            ),
          ),
        )
    }
  } catch {
    // The bounded fallback is usable offline and when estimates are denied.
  }
  return MOLDA_LIMITS.maxGalleryBytes
}
