import type { SceneGeometry } from './document'
import type { SceneGeometryBuffers } from './geometry'
import { requireScene } from './validation'

export interface SceneGeometryUvPatch {
  ranges: Array<{ start: number; values: Float32Array }>
}

/**
 * Prepare owned UV-only changes without triangulating or touching live buffers.
 * Null means the full builder is required, not an empty patch. Sources are immutable.
 */
export function prepareSceneGeometryUv(
  before: SceneGeometry,
  after: SceneGeometry,
  buffers: SceneGeometryBuffers,
): SceneGeometryUvPatch | null {
  if (
    before.kind !== 'mesh' ||
    after.kind !== 'mesh' ||
    before.id !== after.id ||
    before.vertices !== after.vertices ||
    before.looseEdges !== after.looseEdges ||
    buffers.issues.length
  )
    return null
  const keys = Object.keys(before.faces),
    nextKeys = Object.keys(after.faces)
  if (keys.length !== nextKeys.length) return null
  const changed = new Set<string>()
  for (let i = 0; i < keys.length; i++) {
    const id = keys[i]!
    if (id !== nextKeys[i]) return null
    const left = before.faces[id]!,
      right = after.faces[id]!
    if (left === right) continue
    if (
      left.materialId !== right.materialId ||
      left.corners.length !== right.corners.length ||
      left.corners.some((corner, j) => corner.vertexId !== right.corners[j]!.vertexId)
    )
      return null
    changed.add(id)
  }
  const ranges: SceneGeometryUvPatch['ranges'] = []
  let start = -1
  let pending: number[] = []
  const flush = () => {
    if (pending.length) ranges.push({ start, values: Float32Array.from(pending) })
    pending = []
    start = -1
  }
  for (let triangle = 0; triangle < buffers.faceIds.length; triangle++) {
    const id = buffers.faceIds[triangle]!
    if (!changed.has(id)) continue
    const face = after.faces[id]!
    for (let vertex = 0; vertex < 3; vertex++) {
      const uv = face.corners[buffers.cornerIndices[triangle * 3 + vertex]!]!.uv
      for (const axis of [0, 1] as const) {
        const value = Math.fround(uv[axis])
        requireScene(
          Number.isFinite(value),
          'geometry',
          'A geometria excede a precisão de desenho.',
        )
        const offset = triangle * 6 + vertex * 2 + axis
        if (Object.is(value, buffers.uvs[offset])) continue
        if (start + pending.length !== offset) flush()
        if (!pending.length) start = offset
        pending.push(value)
      }
    }
  }
  flush()
  return { ranges }
}
