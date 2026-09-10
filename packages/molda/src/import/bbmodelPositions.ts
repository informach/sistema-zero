import type { Vec3 } from '../core/model'
import { boxMesh } from '../model/mesh'
import { transformPoint } from '../scene/matrix'
import type { BbmodelCube, BbmodelGeometrySource } from './bbmodelGeometryTypes'
import { BbmodelInputError, requireBbmodel } from './bbmodelInput'
import type { BbmodelNativeGeometryPlan } from './bbmodelNativeGeometryPlan'
import type { BbmodelTransform } from './bbmodelTransforms'
import { bbmodelKeyPath } from './bbmodelValues'

export interface BbmodelPositionOptions {
  /** Preserve authored collapsed/inverted endpoints, never the preview's implicit thickening. */
  nonPositiveCubes?: 'reject' | 'preserve'
}
export interface BbmodelPositionIssue {
  code:
    | 'zero-cube-extents'
    | 'inverted-cube-extents'
    | 'sub-float32-local-points'
    | 'sub-float32-world-points'
  node: number
  path: string
  /** Axes for cube-extents issues; points with at least one underflowing component otherwise. */
  count: number
}
export interface BbmodelNativePositions {
  node: number
  geometryId: string
  /** Own Float64 XYZ, matching the topology plan's vertex indices. No baked world transform. */
  positions: Float64Array
}

export function readBbmodelPositionOptions(value: BbmodelPositionOptions) {
  requireBbmodel(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'options',
    'Escolha como converter as coordenadas.',
  )
  for (const key of Object.keys(value))
    requireBbmodel(
      key === 'nonPositiveCubes',
      `options.${key}`,
      'Esta opção de coordenadas não é conhecida.',
    )
  const nonPositiveCubes = value.nonPositiveCubes === undefined ? 'reject' : value.nonPositiveCubes
  requireBbmodel(
    nonPositiveCubes === 'reject' || nonPositiveCubes === 'preserve',
    'options.nonPositiveCubes',
    'Escolha como tratar cubos achatados ou invertidos.',
  )
  return { nonPositiveCubes }
}

function drawable(point: Vec3, path: string): void {
  if (!point.every((value) => Number.isFinite(Math.fround(value))))
    throw new BbmodelInputError(
      'unsupported',
      path,
      'Um ponto excede o limite numérico de desenho. Suas coordenadas não foram alteradas.',
    )
}
function underflows(point: Vec3): boolean {
  return point.some((value) => value !== 0 && Math.fround(value) === 0)
}
function cubePoints(
  shape: BbmodelCube,
  policy: ReturnType<typeof readBbmodelPositionOptions>,
  issues: BbmodelPositionIssue[],
): Vec3[] {
  const from: Vec3 = [0, 0, 0],
    to: Vec3 = [0, 0, 0]
  let zero = 0,
    inverted = 0
  for (let axis = 0; axis < 3; axis++) {
    const half = (shape.to[axis]! - shape.from[axis]!) / 2
    const center = shape.from[axis]! + half
    const extent = (half + shape.inflate) * shape.stretch[axis]!
    from[axis] = center - extent - shape.origin[axis]!
    to[axis] = center + extent - shape.origin[axis]!
    // Finite source parameters can overflow when combined, even if no surface is enabled.
    if (!Number.isFinite(from[axis]) || !Number.isFinite(to[axis]))
      throw new BbmodelInputError(
        'unsupported',
        shape.sourcePath,
        'Os parâmetros do cubo excedem o limite numérico.',
      )
    if (from[axis] === to[axis]) zero++
    else if (from[axis]! > to[axis]!) inverted++
  }
  if ((zero || inverted) && policy.nonPositiveCubes === 'reject')
    throw new BbmodelInputError(
      'unsupported',
      shape.sourcePath,
      'O cubo tem um eixo achatado ou invertido. Escolha se deseja preservar essa forma sem engrossá-la ou trocar seus limites.',
    )
  if (zero)
    issues.push({
      code: 'zero-cube-extents',
      node: shape.node,
      path: shape.sourcePath,
      count: zero,
    })
  if (inverted)
    issues.push({
      code: 'inverted-cube-extents',
      node: shape.node,
      path: shape.sourcePath,
      count: inverted,
    })
  // Same own topology as the plan, including its binary XYZ vertex order.
  return Object.values(boxMesh(from, to).vertices)
}

/**
 * Private synchronous stage: matching immutable source, budgeted topology plans and rest transforms.
 * Local/world representability checks, not a native geometry, camera fit or GPU/normal/UV approval.
 */
export function convertBbmodelPositions(
  source: readonly BbmodelGeometrySource[],
  plans: readonly BbmodelNativeGeometryPlan[],
  transforms: ReadonlyMap<number, BbmodelTransform>,
  options: BbmodelPositionOptions = {},
) {
  const policy = readBbmodelPositionOptions(options)
  const byNode = new Map(source.map((shape) => [shape.node, shape]))
  // Fail programmer mismatches before any numeric materialization; this is not an external plan reader.
  const selected = plans.map((plan) => {
    const shape = byNode.get(plan.node),
      pose = transforms.get(plan.node)
    if (
      !shape ||
      shape.kind === 'unresolved' ||
      shape.kind !== plan.kind ||
      !pose ||
      plan.vertexCount !== (shape.kind === 'cube' ? 8 : shape.vertexIds.length)
    )
      throw new Error('Mismatched bbmodel position source, topology or transforms')
    return { plan, shape, pose }
  })
  const geometries: BbmodelNativePositions[] = [],
    issues: BbmodelPositionIssue[] = []
  for (const { plan, shape, pose } of selected) {
    const points = shape.kind === 'cube' ? cubePoints(shape, policy, issues) : null
    const positions = new Float64Array(plan.vertexCount * 3)
    const min: Vec3 = [Infinity, Infinity, Infinity],
      max: Vec3 = [-Infinity, -Infinity, -Infinity]
    let localUnderflows = 0,
      worldUnderflows = 0
    for (let vertex = 0; vertex < plan.vertexCount; vertex++) {
      const offset = vertex * 3
      const point: Vec3 =
        shape.kind === 'mesh'
          ? [shape.positions[offset]!, shape.positions[offset + 1]!, shape.positions[offset + 2]!]
          : points![vertex]!
      const path =
        shape.kind === 'mesh'
          ? bbmodelKeyPath(`${shape.sourcePath}.vertices`, shape.vertexIds[vertex]!)
          : `${shape.sourcePath}.vertices[${vertex}]`
      drawable(point, path)
      const world = transformPoint(pose.world, point)
      drawable(world, `${path}.world`)
      if (underflows(point)) localUnderflows++
      if (underflows(world)) worldUnderflows++
      positions.set(point, offset)
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis]!, point[axis]!)
        max[axis] = Math.max(max[axis]!, point[axis]!)
      }
    }
    // Native bounds use transformed local AABB corners, which need not be authored mesh points.
    if (plan.vertexCount > 0)
      for (const x of [min[0], max[0]])
        for (const y of [min[1], max[1]])
          for (const z of [min[2], max[2]])
            drawable(transformPoint(pose.world, [x, y, z]), `${shape.sourcePath}.bounds`)
    if (localUnderflows)
      issues.push({
        code: 'sub-float32-local-points',
        node: shape.node,
        path: shape.sourcePath,
        count: localUnderflows,
      })
    if (worldUnderflows)
      issues.push({
        code: 'sub-float32-world-points',
        node: shape.node,
        path: shape.sourcePath,
        count: worldUnderflows,
      })
    geometries.push({ node: plan.node, geometryId: plan.geometryId, positions })
  }
  return { geometries, issues }
}
