import type { Vec3 } from '../core/model'
import {
  type AffineMatrix,
  affineMultiply,
  composeTransform,
  quaternionFromEulerRadians,
  type SceneTransform,
} from '../scene/matrix'
import type { BbmodelGraph } from './bbmodelGraph'
import { BbmodelInputError } from './bbmodelInput'
import { readBbmodelRestPose } from './bbmodelNodeProperties'
import type { BbmodelSelection } from './bbmodelSelection'
import { bbmodelBoolean, bbmodelRadians as radians } from './bbmodelValues'

export interface BbmodelTransform {
  /** Authored absolute pivot, also needed later to localize cube endpoints (not mesh vertices). */
  origin: Vec3
  angles: Vec3
  order: 'XYZ' | 'ZYX'
  rescaled: boolean
  local: Extract<SceneTransform, { kind: 'trs' }>
  world: AffineMatrix
}

function rescaleFactor(degrees: number): number {
  const magnitude = Math.abs(degrees)
  return 1 / Math.cos(radians(magnitude > 45 ? 90 - magnitude : magnitude))
}
function drawable(matrix: AffineMatrix, path: string): void {
  if (!matrix.every((value) => Number.isFinite(Math.fround(value))))
    throw new BbmodelInputError(
      'unsupported',
      path,
      'A transformação desta peça é grande demais para desenhar sem perder seus dados.',
    )
}

/**
 * Free-format rest transforms only, from the matching private graph/selection.
 * Retains source units and pivots; no geometry, pose, visibility, native adoption or IO.
 */
export function readBbmodelTransforms(
  graph: BbmodelGraph,
  selection: BbmodelSelection,
): ReadonlyMap<number, BbmodelTransform> {
  // 5.x separates definitions from outliner occurrences. Do not merge legacy/plugin overrides.
  for (const { node } of selection.nodes) {
    const entry = graph.nodes[node]!
    const occurrence = entry.outliner?.data
    if (!occurrence || occurrence === entry.source.data) continue
    for (const key of Object.keys(occurrence)) {
      if (key === 'uuid' || key === 'children' || key === 'isOpen' || key === 'selected') continue
      throw new BbmodelInputError(
        'unsupported',
        `${entry.outliner!.path}[${JSON.stringify(key)}]`,
        'A organização também contém dados da peça. Salve uma cópia atualizada no Blockbench para evitar substituições ambíguas.',
      )
    }
  }
  const transforms = new Map<number, BbmodelTransform>()
  for (const selected of selection.nodes) {
    const { data, path } = graph.nodes[selected.node]!.source
    const { origin, rotation: angles } = readBbmodelRestPose(data, path)
    const order = selected.kind === 'mesh' ? 'XYZ' : 'ZYX'
    const rescaled =
      selected.kind === 'cube' && bbmodelBoolean(data.rescale, `${path}.rescale`, false)
    const parent = selected.parent === null ? null : transforms.get(selected.parent)
    if (parent === undefined) throw new Error('Missing parent in bbmodel transform selection')
    const translation: Vec3 =
      parent === null
        ? [...origin]
        : [origin[0] - parent.origin[0], origin[1] - parent.origin[1], origin[2] - parent.origin[2]]
    const scale: Vec3 = [1, 1, 1]
    if (rescaled) {
      const [x, y, z] = angles.map(rescaleFactor)
      scale[0] = y! * z!
      scale[1] = x! * z!
      scale[2] = x! * y!
    }
    const rotation = quaternionFromEulerRadians(
      [radians(angles[0]), radians(angles[1]), radians(angles[2])],
      order,
    )
    if (![...translation, ...scale, ...rotation].every(Number.isFinite))
      throw new BbmodelInputError('unsupported', path, 'A transformação excede o limite numérico.')
    const local: BbmodelTransform['local'] = { kind: 'trs', translation, rotation, scale }
    let world: AffineMatrix
    try {
      const matrix = composeTransform(local)
      drawable(matrix, path)
      world = parent === null ? matrix : affineMultiply(parent.world, matrix)
      drawable(world, path)
    } catch (error) {
      if (!(error instanceof RangeError)) throw error
      throw new BbmodelInputError(
        'unsupported',
        path,
        'A transformação excede o limite numérico.',
        { cause: error },
      )
    }
    transforms.set(selected.node, { origin, angles, order, rescaled, local, world })
  }
  return transforms
}
