import type { SceneGeometry } from './document'
import { cachedParametricMesh } from './parametricGeometry'

/** Painting names a native surface; UV editing names its authorial faces, including cap triangles. */
export function scenePaintFaceIds(geometry: SceneGeometry, surfaceId: string): string[] {
  if (geometry.kind === 'mesh') return geometry.faces[surfaceId] ? [surfaceId] : []
  const result: string[] = []
  for (const [id, surface] of cachedParametricMesh(geometry).surfaceByFace)
    if (surface === surfaceId) result.push(id)
  return result
}
