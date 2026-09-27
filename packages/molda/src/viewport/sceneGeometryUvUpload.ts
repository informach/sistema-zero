import type { BufferAttribute } from 'three'
import type { SceneGeometryUvPatch } from '../scene/geometryUv'
import { markSceneAttributeUpload } from './sceneAttributeUpload'

/** Apply a prevalidated UV-only patch to an owned attribute; retain one pending upload envelope. */
export function applySceneGeometryUvUpload(
  attribute: BufferAttribute,
  patch: SceneGeometryUvPatch,
) {
  if (!patch.ranges.length) return
  let start = Infinity,
    end = -Infinity
  for (const range of patch.ranges) {
    attribute.array.set(range.values, range.start)
    start = Math.min(start, range.start)
    end = Math.max(end, range.start + range.values.length)
  }
  markSceneAttributeUpload(attribute, start, end)
}
