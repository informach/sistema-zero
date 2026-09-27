import type { ScenePathGeometry, ScenePrimitiveGeometry } from './document'
import { pathMesh } from './pathMesh'
import { pathTriangleCount } from './pathParameters'
import { primitiveTriangleCount } from './primitiveDetail'
import { primitiveMesh } from './primitiveMesh'

type ParametricGeometry = ScenePrimitiveGeometry | ScenePathGeometry

export const parametricMesh = (source: ParametricGeometry) =>
  source.kind === 'path' ? pathMesh(source) : primitiveMesh(source)

/**
 * A mesma malha, guardada pela IDENTIDADE da geometria (imutável em cada revisão). Para quem só
 * LÊ a malha derivada várias vezes na mesma geometria: as faces da pintura, o em pé de cada face e
 * a lista das superfícies. Um tubo de 128 pontos por 64 lados custava ~40 ms a cada tesselação.
 * ⚠️ O resultado é compartilhado: nunca mexer nele.
 */
const cached = new WeakMap<ParametricGeometry, ReturnType<typeof parametricMesh>>()
export function cachedParametricMesh(
  source: ParametricGeometry,
): ReturnType<typeof parametricMesh> {
  let found = cached.get(source)
  if (!found) {
    found = parametricMesh(source)
    cached.set(source, found)
  }
  return found
}
export const parametricTriangleCount = (source: ParametricGeometry) =>
  source.kind === 'path'
    ? pathTriangleCount(source.points.length, source)
    : primitiveTriangleCount(source)
