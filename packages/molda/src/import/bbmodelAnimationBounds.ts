import type { Vec3 } from '../core/model'
import type { SceneAnimationClip } from '../scene/animation'
import type { ModelSceneNode, SceneMeshGeometry } from '../scene/document'
import { indexSceneNodes } from '../scene/graph'
import { UNIT_QUATERNION_TOLERANCE } from '../scene/matrix'
import { BbmodelInputError } from './bbmodelInput'
import { bbmodelKeyPath } from './bbmodelValues'

export interface BbmodelAnimationBoundsReport {
  clipId: string
  method: 'conservative-local-trs'
  nodes: number
  maximumScaleBound: number
  maximumTranslationBound: number
  maximumPointBound: number
}

/** Positive interval arithmetic, with a private scratch buffer and outward F64 rounding. */
function upperArithmetic() {
  const bits = new DataView(new ArrayBuffer(8))
  function next(value: number) {
    if (value === Infinity) return value
    bits.setFloat64(0, value, false)
    const low = bits.getUint32(4, false)
    bits.setUint32(4, low + 1, false)
    if (low === 0xffffffff) bits.setUint32(0, bits.getUint32(0, false) + 1, false)
    return bits.getFloat64(0, false)
  }
  function add(a: number, b: number) {
    return a === 0 ? b : b === 0 ? a : next(a + b)
  }
  function multiply(a: number, b: number) {
    return a === 0 || b === 0 ? 0 : next(a * b)
  }
  function radius(value: Vec3) {
    return add(add(Math.abs(value[0]), Math.abs(value[1])), Math.abs(value[2]))
  }
  // Conservative roundoff allowance for TRS composition, affine products and convex interpolation.
  // The 3x3/translation formulas use fewer than 64 elementary operations per bounded result.
  const roundoff = next(1 / (1 - 64 * Number.EPSILON)),
    tolerance = add(UNIT_QUATERNION_TOLERANCE, Number.EPSILON),
    // R(q) = |q|² R(q/|q|) + (1-|q|²)I, hence ||R(q)||₂ <= 1+4t+2t² for |q|<=1+t.
    rotation = multiply(
      add(1, add(multiply(4, tolerance), multiply(2, multiply(tolerance, tolerance)))),
      roundoff,
    )
  return { add, multiply, radius, roundoff, rotation }
}

const MAX_FINITE_FLOAT32 = 3.4028234663852886e38
const AXES = [0, 1, 2] as const
function requireRange(value: number, path: string) {
  if (!Number.isFinite(value) || value > MAX_FINITE_FLOAT32)
    throw new BbmodelInputError(
      'unsupported',
      path,
      'Não foi possível garantir a faixa de desenho deste movimento na hierarquia. Os dados não foram alterados.',
    )
}

/**
 * Matching immutable native clips/nodes/mesh geometry after strict source conversion. No skins,
 * affine bases or local-delta clips. This conservative envelope is not an exact extremum solver:
 * it may reject extreme cancelling/correlated poses that would individually fit the draw range.
 *
 * Per-axis key maxima enclose native step/linear/smooth translations/scales; rotations have a
 * bounded operator norm. Propagate scale products and translated radii in hierarchy order.
 * Nonanimated descendants and all authored mesh vertices count. No per-frame geometry scans,
 * time sampling, source-curve equivalence, data clamping or claim of GPU/camera/normal safety.
 */
export function assessBbmodelAnimationBounds(
  nodes: readonly ModelSceneNode[],
  geometries: readonly SceneMeshGeometry[],
  animations: readonly SceneAnimationClip[],
): BbmodelAnimationBoundsReport[] {
  if (!animations.length) return []
  for (const clip of animations)
    if (clip.space !== 'local')
      throw new BbmodelInputError(
        'unsupported',
        `${bbmodelKeyPath('native.animations', clip.id)}.space`,
        'Esta análise precisa de movimentos locais absolutos.',
      )
  const localShapes = new Map(
    nodes.map((node) => {
      if (node.transform.kind !== 'trs')
        throw new BbmodelInputError(
          'unsupported',
          bbmodelKeyPath('native.nodes', node.id),
          'Esta análise de movimento precisa de transformações locais TRS.',
        )
      return [
        node.id,
        {
          node,
          translation: node.transform.translation,
          scale: Math.max(...node.transform.scale.map(Math.abs)),
        },
      ]
    }),
  )
  const math = upperArithmetic(),
    graph = indexSceneNodes(nodes),
    radii = new Map<string, number>()
  for (const geometry of geometries) {
    const maximum: Vec3 = [0, 0, 0]
    for (const id in geometry.vertices) {
      if (!Object.hasOwn(geometry.vertices, id)) continue
      const point = geometry.vertices[id]
      if (!point) throw new Error('Missing immutable bbmodel mesh point')
      for (const axis of AXES) maximum[axis] = Math.max(maximum[axis], Math.abs(point[axis]))
    }
    radii.set(geometry.id, math.radius(maximum))
  }
  const base = graph.order.map((id) => {
    const entry = localShapes.get(id)
    if (!entry) throw new Error('Missing bbmodel range node')
    const { node } = entry
    const radius = node.kind === 'mesh' ? radii.get(node.geometryId) : 0
    if (radius === undefined) throw new Error('Missing bbmodel range geometry')
    return {
      ...entry,
      radius,
    }
  })
  return animations.map((clip) => {
    const path = bbmodelKeyPath('native.animations', clip.id)
    const local = new Map(
        base.map((entry): [string, { translation: Vec3; scale: number }] => [
          entry.node.id,
          { translation: [...entry.translation], scale: entry.scale },
        ]),
      ),
      world = new Map<string, { scale: number; translation: number }>()
    for (const track of clip.tracks) {
      const bounds = local.get(track.nodeId)
      if (!bounds) throw new Error('Missing bbmodel range animation target')
      if (track.channel === 'rotation') continue
      if (track.channel === 'translation') bounds.translation = [0, 0, 0]
      else bounds.scale = 0
      for (const key of track.keys) {
        for (const axis of AXES) {
          const magnitude = Math.abs(key.value[axis])
          if (track.channel === 'translation')
            bounds.translation[axis] = Math.max(bounds.translation[axis], magnitude)
          else bounds.scale = Math.max(bounds.scale, magnitude)
        }
      }
    }
    let maximumScaleBound = 0,
      maximumTranslationBound = 0,
      maximumPointBound = 0
    for (const entry of base) {
      const bounds = local.get(entry.node.id),
        parent = entry.node.parentId === null ? null : world.get(entry.node.parentId)
      if (!bounds || (entry.node.parentId !== null && !parent))
        throw new Error('Mismatched bbmodel range hierarchy')
      const localScale = math.multiply(bounds.scale, math.rotation),
        localTranslation = math.multiply(math.radius(bounds.translation), math.roundoff),
        scale = parent
          ? math.multiply(math.multiply(parent.scale, localScale), math.roundoff)
          : localScale,
        translation = parent
          ? math.multiply(
              math.add(parent.translation, math.multiply(parent.scale, localTranslation)),
              math.roundoff,
            )
          : localTranslation,
        point = math.multiply(
          math.add(translation, math.multiply(scale, entry.radius)),
          math.roundoff,
        ),
        nodePath = bbmodelKeyPath(`${path}.nodes`, entry.node.id)
      requireRange(scale, `${nodePath}.scale`)
      requireRange(translation, `${nodePath}.translation`)
      requireRange(point, `${nodePath}.points`)
      world.set(entry.node.id, { scale, translation })
      maximumScaleBound = Math.max(maximumScaleBound, scale)
      maximumTranslationBound = Math.max(maximumTranslationBound, translation)
      maximumPointBound = Math.max(maximumPointBound, point)
    }
    return {
      clipId: clip.id,
      method: 'conservative-local-trs',
      nodes: base.length,
      maximumScaleBound,
      maximumTranslationBound,
      maximumPointBound,
    }
  })
}
