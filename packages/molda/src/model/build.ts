/**
 * A MALHA do export: a geometria de toda peça (gêmeos inclusos) levada ao
 * espaço do modelo pela matriz da peça, com as UVs já no atlas, FUNDIDA numa
 * malha só (1 malha, 1 material = dentro dos orçamentos do runtime do
 * Estúdio) e transladada para o chão (y = 0) com o centro em x = z = 0.
 */
import type { MoldaModelAsset, Vec3 } from '../core/model'
import { type AtlasLayout, mapFaceUv } from './atlas'
import { buildPartGeometry } from './geometry'
import { partMatrix, transformDirection, transformPoint } from './transform'

export interface BuiltMesh {
  positions: Float32Array
  normals: Float32Array
  uvs: Float32Array
  indices: Uint16Array | Uint32Array
  vertexCount: number
  triangleCount: number
  min: Vec3
  max: Vec3
}

export const MAX_UINT16_VERTICES = 65_535

export function buildModelMesh(model: MoldaModelAsset, layout: AtlasLayout): BuiltMesh {
  const byId = new Map(model.parts.map((part) => [part.id, part]))
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  for (const part of model.parts) {
    const source = (part.mirrorOf ? byId.get(part.mirrorOf) : undefined) ?? part
    const built = buildPartGeometry(part)
    const matrix = partMatrix(part)
    for (let t = 0; t < built.triangleCount; t += 1) {
      const face = built.faceOfTriangle[t]
      if (!face) continue
      for (let v = 0; v < 3; v += 1) {
        const p = t * 9 + v * 3
        const point = transformPoint(matrix, [
          built.positions[p] as number,
          built.positions[p + 1] as number,
          built.positions[p + 2] as number,
        ])
        const normal = transformDirection(matrix, [
          built.normals[p] as number,
          built.normals[p + 1] as number,
          built.normals[p + 2] as number,
        ])
        const u = built.uvs[t * 6 + v * 2] as number
        const w = built.uvs[t * 6 + v * 2 + 1] as number
        const [au, av] = mapFaceUv(layout, part, source, face, u, w)
        positions.push(point[0], point[1], point[2])
        normals.push(normal[0], normal[1], normal[2])
        uvs.push(au, av)
      }
    }
  }
  const vertexCount = positions.length / 3
  const min: Vec3 = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]
  const max: Vec3 = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k += 1) {
      const value = positions[i + k] as number
      if (value < (min[k] as number)) min[k] = value
      if (value > (max[k] as number)) max[k] = value
    }
  }
  if (vertexCount === 0) {
    min[0] = min[1] = min[2] = 0
    max[0] = max[1] = max[2] = 0
  }
  // Para o chão e para o centro: o Estúdio põe o modelo no chão, no ponto pedido.
  const shift: Vec3 = [-(min[0] + max[0]) / 2, -min[1], -(min[2] + max[2]) / 2]
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = (positions[i] as number) + shift[0]
    positions[i + 1] = (positions[i + 1] as number) + shift[1]
    positions[i + 2] = (positions[i + 2] as number) + shift[2]
  }
  const shiftedMin: Vec3 = [min[0] + shift[0], min[1] + shift[1], min[2] + shift[2]]
  const shiftedMax: Vec3 = [max[0] + shift[0], max[1] + shift[1], max[2] + shift[2]]
  const indices =
    vertexCount <= MAX_UINT16_VERTICES
      ? Uint16Array.from({ length: vertexCount }, (_, i) => i)
      : Uint32Array.from({ length: vertexCount }, (_, i) => i)
  return {
    positions: Float32Array.from(positions),
    normals: Float32Array.from(normals),
    uvs: Float32Array.from(uvs),
    indices,
    vertexCount,
    triangleCount: vertexCount / 3,
    min: shiftedMin,
    max: shiftedMax,
  }
}
