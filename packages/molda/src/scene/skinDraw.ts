import type { Vec3 } from '../core/model'
import type { SceneMeshGeometry } from './document'
import type { SceneGeometryBuffers } from './geometry'
import type { PreparedSceneSkin } from './skinPose'
import * as v from './validation'

export interface SceneSkinBounds {
  min: Vec3
  max: Vec3
}
export interface SceneSkinDraw {
  indices: Uint16Array
  weights: Float32Array
  /** Bind-local Float32 points influenced by each joint; no source geometry retained. */
  clusters: Array<SceneSkinBounds | null>
  maximumWeightError: number
}

/** The existing triangulator/corner map is authoritative, including omitted faces. */
export function prepareSceneSkinDraw(
  skin: PreparedSceneSkin,
  geometry: SceneMeshGeometry,
  buffers: SceneGeometryBuffers,
): SceneSkinDraw {
  const count = buffers.positions.length / 3
  v.requireScene(
    Number.isSafeInteger(count) &&
      count === buffers.cornerIndices.length &&
      count === buffers.faceIds.length * 3,
    'skin',
    'O desenho não corresponde aos cantos da malha.',
  )
  const indices = new Uint16Array(count * 4),
    weights = new Float32Array(count * 4),
    vertices = new Map(skin.vertexIds.map((id, i) => [id, i])),
    clusters: SceneSkinDraw['clusters'] = Array.from({ length: skin.joints.length }, () => null)
  let maximumWeightError = 0
  for (let drawVertex = 0; drawVertex < count; drawVertex++) {
    const face = geometry.faces[buffers.faceIds[Math.floor(drawVertex / 3)]!],
      vertexId = face?.corners[buffers.cornerIndices[drawVertex]!]?.vertexId,
      vertex = vertexId === undefined ? undefined : vertices.get(vertexId)
    v.requireScene(vertex !== undefined, 'skin', 'O desenho aponta para um ponto fora do vínculo.')
    const position: Vec3 = [
      buffers.positions[drawVertex * 3]!,
      buffers.positions[drawVertex * 3 + 1]!,
      buffers.positions[drawVertex * 3 + 2]!,
    ]
    v.requireScene(
      position.every(
        (value, axis) =>
          Number.isFinite(value) && value === Math.fround(skin.positions[vertex * 3 + axis]!),
      ),
      'skin',
      'Os pontos do vínculo pertencem a outro desenho.',
    )
    let total = 0
    for (let slot = 0; slot < 4; slot++) {
      const sourceOffset = vertex * 4 + slot,
        targetOffset = drawVertex * 4 + slot,
        weight = Math.fround(skin.weights[sourceOffset]!),
        joint = skin.jointIndices[sourceOffset]!
      v.requireScene(
        Number.isFinite(weight) && (weight > 0 || skin.weights[sourceOffset] === 0),
        'skin',
        'Um peso não cabe na precisão de desenho sem perder seu osso.',
      )
      weights[targetOffset] = weight
      indices[targetOffset] = joint
      total += weight
      if (weight === 0) continue
      const cluster = clusters[joint]
      if (cluster) {
        for (let axis = 0; axis < 3; axis++) {
          cluster.min[axis] = Math.min(cluster.min[axis]!, position[axis]!)
          cluster.max[axis] = Math.max(cluster.max[axis]!, position[axis]!)
        }
      } else clusters[joint] = { min: [...position], max: [...position] }
    }
    maximumWeightError = Math.max(maximumWeightError, Math.abs(total - 1))
  }
  return { indices, weights, clusters, maximumWeightError }
}

const FLOAT32_MAX = 3.4028234663852886e38
const FLOAT32_EPSILON = 2 ** -23

/** Conservative convex blend bounds: O(joints), not a per-frame vertex/triangle bake.
 * Includes stored weight-sum error and Float32 product/sum roundoff, even under cancellation.
 */
export function sceneSkinDrawBounds(
  draw: SceneSkinDraw,
  palette: Float64Array,
): SceneSkinBounds | null {
  v.requireScene(
    palette.length === draw.clusters.length * 16,
    'skin',
    'A pose não corresponde ao esqueleto de desenho.',
  )
  const min: Vec3 = [Infinity, Infinity, Infinity],
    max: Vec3 = [-Infinity, -Infinity, -Infinity]
  let populated = false
  for (const [joint, cluster] of draw.clusters.entries()) {
    if (!cluster) continue
    populated = true
    for (let axis = 0; axis < 3; axis++) {
      const offset = joint * 16 + axis,
        translation = Math.fround(palette[offset + 12]!)
      let lower = translation,
        upper = translation,
        magnitude = Math.abs(translation)
      for (let dimension = 0; dimension < 3; dimension++) {
        const coefficient = Math.fround(palette[offset + dimension * 4]!),
          left = coefficient * cluster.min[dimension]!,
          right = coefficient * cluster.max[dimension]!
        lower += Math.min(left, right)
        upper += Math.max(left, right)
        magnitude += Math.max(Math.abs(left), Math.abs(right))
      }
      v.requireScene(
        Number.isFinite(magnitude) &&
          magnitude * (1 + draw.maximumWeightError) * (1 + 16 * FLOAT32_EPSILON) <= FLOAT32_MAX,
        'pose',
        'Essa pose ultrapassa a precisão de desenho.',
      )
      // Dot products plus up to four weighted influences and their final sum.
      const padding = magnitude * (16 * FLOAT32_EPSILON)
      min[axis] = Math.min(min[axis]!, lower - padding)
      max[axis] = Math.max(max[axis]!, upper + padding)
    }
  }
  if (!populated) return null
  for (let axis = 0; axis < 3; axis++) {
    const padding = Math.max(Math.abs(min[axis]!), Math.abs(max[axis]!)) * draw.maximumWeightError
    min[axis] = min[axis]! - padding
    max[axis] = max[axis]! + padding
  }
  return { min, max }
}
