import type { ScenePathGeometry, ScenePrimitiveGeometry } from './document'
import { pathMesh } from './pathMesh'
import { pathTriangleCount } from './pathParameters'
import { primitiveTriangleCount } from './primitiveDetail'
import { primitiveMesh } from './primitiveMesh'

type ParametricGeometry = ScenePrimitiveGeometry | ScenePathGeometry

export const parametricMesh = (source: ParametricGeometry) =>
  source.kind === 'path' ? pathMesh(source) : primitiveMesh(source)
export const parametricTriangleCount = (source: ParametricGeometry) =>
  source.kind === 'path'
    ? pathTriangleCount(source.points.length, source)
    : primitiveTriangleCount(source)
