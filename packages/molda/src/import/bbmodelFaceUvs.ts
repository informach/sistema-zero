import type { BbmodelAppearance } from './bbmodelAppearance'
import type {
  BbmodelCube,
  BbmodelCubeDirection,
  BbmodelGeometrySource,
} from './bbmodelGeometryTypes'
import { BbmodelInputError, requireBbmodel } from './bbmodelInput'
import type { BbmodelNativeGeometryPlan } from './bbmodelNativeGeometryPlan'
import { type BbmodelVec2, type BbmodelVec4, bbmodelKeyPath } from './bbmodelValues'

export interface BbmodelFaceUvOptions {
  missingMeshUvs?: 'reject' | 'zero'
}
export interface BbmodelFaceUvIssue {
  code: 'box-uv-materialized' | 'missing-mesh-uv-filled' | 'surplus-mesh-uv-omitted'
  node: number
  path: string
  /** Source faces for box UV, original corners for missing UV, source pairs for surplus UV. */
  count: number
}
export interface BbmodelFaceUvs {
  node: number
  geometryId: string
  /** Authorial UV units, indexed by original face and original corner, NOT normalized image UV. */
  faces: ReadonlyMap<number, BbmodelVec2[]>
}

export function readBbmodelFaceUvOptions(value: BbmodelFaceUvOptions) {
  requireBbmodel(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'options',
    'Escolha como converter o mapa de textura.',
  )
  for (const key of Object.keys(value))
    requireBbmodel(key === 'missingMeshUvs', `options.${key}`, 'Esta opção de UV não é conhecida.')
  const missingMeshUvs = value.missingMeshUvs === undefined ? 'reject' : value.missingMeshUvs
  requireBbmodel(
    missingMeshUvs === 'reject' || missingMeshUvs === 'zero',
    'options.missingMeshUvs',
    'Escolha como tratar cantos sem coordenadas UV.',
  )
  return { missingMeshUvs }
}

/** Free-format cube net: side strip, two caps, optional horizontal mirror and authored offset. */
function boxRects(shape: BbmodelCube): Map<BbmodelCubeDirection, BbmodelVec4> {
  const sizes = shape.to.map((end, axis) => Math.floor(end - shape.from[axis]! + 1e-7))
  const [width, height, depth] = sizes as [number, number, number]
  const rects = new Map<BbmodelCubeDirection, BbmodelVec4>()
  for (const [direction, start, length] of [
    ['east', 0, depth],
    ['north', depth, width],
    ['west', depth + width, depth],
    ['south', 2 * depth + width, width],
  ] as const) {
    rects.set(direction, [start, depth, start + length, depth + height])
  }
  rects.set('up', [depth + width, depth, depth, 0])
  rects.set('down', [depth + 2 * width, 0, depth + width, depth])
  if (shape.mirrorUv) {
    for (const rect of rects.values()) [rect[0], rect[2]] = [rect[2], rect[0]]
    const east = rects.get('east')!
    rects.set('east', rects.get('west')!)
    rects.set('west', east)
  }
  for (const rect of rects.values())
    for (let component = 0; component < 4; component++)
      rect[component]! += shape.uvOffset[component % 2]!
  return rects
}

function rotatedRect(rect: BbmodelVec4, rotation: number, path: string): BbmodelVec2[] {
  // Only retained surfaces need a generated rectangle; a disabled cap may overflow independently.
  if (!rect.every(Number.isFinite))
    throw new BbmodelInputError(
      'unsupported',
      `${path}.uv`,
      'O desdobramento UV desta face excede o limite numérico.',
    )
  // Unlike a source preview loop, work is constant even for very large quarter-turn counts.
  if (!Number.isSafeInteger(rotation) || rotation < 0 || rotation % 90 !== 0)
    throw new BbmodelInputError(
      'unsupported',
      `${path}.rotation`,
      'A rotação UV precisa ser um número não negativo de quartos de volta, sem arredondamento.',
    )
  const turns = (rotation / 90) % 4
  const corners: BbmodelVec2[] = [
    [rect[0], rect[1]],
    [rect[0], rect[3]],
    [rect[2], rect[3]],
    [rect[2], rect[1]],
  ]
  return corners.map((_, i) => corners[(i + turns) % 4]!)
}

/**
 * Authorial UV for matching private, budgeted topology and free-format source.
 * No pixel/UV-size normalization, frame selection, preview nudges, material or native adoption.
 */
export function convertBbmodelFaceUvs(
  source: readonly BbmodelGeometrySource[],
  plans: readonly BbmodelNativeGeometryPlan[],
  appearance: BbmodelAppearance,
  options: BbmodelFaceUvOptions = {},
) {
  const policy = readBbmodelFaceUvOptions(options)
  if (appearance.modelFormat !== 'free')
    throw new BbmodelInputError(
      'unsupported',
      'meta.model_format',
      'Este mapa UV precisa do formato genérico do Blockbench.',
    )
  const byNode = new Map(source.map((shape) => [shape.node, shape]))
  const geometries: BbmodelFaceUvs[] = [],
    issues: BbmodelFaceUvIssue[] = []
  for (const plan of plans) {
    const shape = byNode.get(plan.node)
    if (!shape || shape.kind === 'unresolved' || shape.kind !== plan.kind)
      throw new Error('Mismatched bbmodel UV source and topology')
    const faces = new Map<number, BbmodelVec2[]>()
    const counts = new Map<BbmodelFaceUvIssue['code'], number>()
    const issue = (code: BbmodelFaceUvIssue['code'], count: number) => {
      if (count) counts.set(code, (counts.get(code) ?? 0) + count)
    }
    const useBox = shape.kind === 'cube' && (shape.boxUv ?? appearance.project.boxUv ?? false)
    const rects = shape.kind === 'cube' && useBox && plan.faces.length > 0 ? boxRects(shape) : null
    for (const planned of plan.faces) {
      if (faces.has(planned.sourceFace)) continue
      if (shape.kind === 'cube') {
        const face = shape.faces[planned.sourceFace]!
        const path = bbmodelKeyPath(`${shape.sourcePath}.faces`, face.direction)
        faces.set(
          planned.sourceFace,
          rotatedRect(rects ? rects.get(face.direction)! : face.uv, face.rotation, path),
        )
        if (useBox) issue('box-uv-materialized', 1)
      } else {
        const face = shape.faces[planned.sourceFace]!
        const path = bbmodelKeyPath(`${shape.sourcePath}.faces`, face.id)
        let present = 0
        const corners = Array.from(face.vertices, (vertex) => {
          const id = shape.vertexIds[vertex]!
          const uv = face.uv.get(id)
          if (uv) {
            present++
            return [...uv] as BbmodelVec2
          }
          if (policy.missingMeshUvs === 'reject')
            throw new BbmodelInputError(
              'unsupported',
              bbmodelKeyPath(`${path}.uv`, id),
              'Este canto não tem UV. Escolha se quer preenchê-lo com zero, sem inventar um desdobramento.',
            )
          issue('missing-mesh-uv-filled', 1)
          return [0, 0] as BbmodelVec2
        })
        issue('surplus-mesh-uv-omitted', face.uv.size - present)
        faces.set(planned.sourceFace, corners)
      }
    }
    for (const [code, count] of counts)
      issues.push({ code, node: shape.node, path: shape.sourcePath, count })
    geometries.push({ node: shape.node, geometryId: plan.geometryId, faces })
  }
  return { geometries, issues }
}
