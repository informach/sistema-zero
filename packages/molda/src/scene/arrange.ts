import type { Vec3 } from '../core/model'
import type { Bounds } from '../model/transform'
import { finishSceneCommand, requireEditableScene, sceneCommandSelection } from './commandContext'
import type { ModelSceneNode, MoldaSceneDocument } from './document'
import { evaluateSceneNodeFlags } from './evaluate'
import {
  type AffineMatrix,
  affineInverse,
  identityMatrix,
  transformDirection,
  transformPoint,
} from './matrix'
import { sceneGeometryMesh } from './parametricGeometry'
import { compileSceneSkinGeometry, deformSceneSkin } from './skinPose'
import { choice, requireScene } from './validation'

export type SceneArrangement = 'minimum' | 'center' | 'maximum' | 'centers' | 'gaps'

/** World-space arrangement of authored subtrees; generated mirrors continue following their source. */
export function arrangeSceneNodes(
  document: MoldaSceneDocument,
  ids: readonly string[],
  axis: 'x' | 'y' | 'z',
  operation: SceneArrangement,
) {
  choice(axis, ['x', 'y', 'z'], 'axis')
  choice(operation, ['minimum', 'center', 'maximum', 'centers', 'gaps'], 'operation')
  const selected = sceneCommandSelection(document, ids)
  requireEditableScene(selected)
  const distribute = operation === 'centers' || operation === 'gaps'
  requireScene(
    selected.roots.size >= (distribute ? 3 : 2),
    'selection',
    distribute
      ? 'Escolha pelo menos três peças ou grupos independentes.'
      : 'Escolha pelo menos duas peças ou grupos independentes.',
  )
  const owners = new Map<string, string>(),
    boxes = new Map<string, Bounds>()
  const accumulate = (id: string, point: Vec3) => {
    requireScene(point.every(Number.isFinite), 'bounds', 'Uma peça está fora do limite numérico.')
    const box: Bounds = boxes.get(id) ?? { min: [...point], max: [...point] }
    for (const a of [0, 1, 2] as const) {
      box.min[a] = Math.min(box.min[a], point[a])
      box.max[a] = Math.max(box.max[a], point[a])
    }
    boxes.set(id, box)
  }
  // Assign the complete hierarchy before checking bindings: a joint can follow its mesh in order.
  for (const id of selected.index.scene.order) {
    const node = selected.index.scene.nodes.get(id)!
    const root = selected.roots.has(id)
      ? id
      : node.parentId === null
        ? undefined
        : owners.get(node.parentId)
    if (!root) continue
    owners.set(id, root)
  }
  for (const skin of document.skins ?? []) {
    const root = owners.get(skin.nodeId)
    if (!root && !skin.joints.some((joint) => owners.has(joint.nodeId))) continue
    requireScene(
      root && skin.joints.every((joint) => owners.get(joint.nodeId) === root),
      'skin',
      'Para alinhar uma peça com ossos, escolha o grupo que contém a peça e todos os seus ossos.',
    )
  }
  const flags = evaluateSceneNodeFlags(selected.index.scene)
  // Exact visible vertices, including the current bound form, with cached primitive meshes.
  for (const [id, root] of owners) {
    if (flags.get(id)?.hidden) continue
    const node = selected.index.scene.nodes.get(id)!
    const world = selected.index.scene.worldMatrices.get(id)!
    if (node.kind === 'mesh') {
      const geometry = selected.index.geometries.get(node.geometryId)!
      const skin = selected.index.skinsByNode.get(id)
      if (skin && geometry.kind === 'mesh') {
        const points = deformSceneSkin(
          compileSceneSkinGeometry(skin, geometry),
          selected.index.scene.worldMatrices,
        )
        for (let i = 0; i < points.length; i += 3)
          accumulate(root, transformPoint(world, [points[i]!, points[i + 1]!, points[i + 2]!]))
      } else
        for (const point of Object.values(sceneGeometryMesh(geometry).vertices))
          accumulate(root, transformPoint(world, point))
    } else if (node.kind === 'locator') accumulate(root, transformPoint(world, [0, 0, 0]))
  }
  const component = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
  const entries = [...selected.roots].map((id) => {
    const box = boxes.get(id)
    requireScene(box, 'bounds', 'Escolha peças ou grupos que tenham uma forma visível.')
    return {
      id,
      min: box.min[component],
      max: box.max[component],
      center: box.min[component] / 2 + box.max[component] / 2,
    }
  })
  const offsets = new Map<string, number>()
  if (!distribute) {
    const min = Math.min(...entries.map((entry) => entry.min)),
      max = Math.max(...entries.map((entry) => entry.max))
    const target = operation === 'minimum' ? min : operation === 'maximum' ? max : min / 2 + max / 2
    for (const entry of entries)
      offsets.set(
        entry.id,
        target -
          (operation === 'minimum'
            ? entry.min
            : operation === 'maximum'
              ? entry.max
              : entry.center),
      )
  } else {
    entries.sort((a, b) => a.center - b.center || a.id.localeCompare(b.id))
    const first = entries[0]!,
      last = entries[entries.length - 1]!
    const gap =
      (last.max - first.min - entries.reduce((sum, entry) => sum + entry.max - entry.min, 0)) /
      (entries.length - 1)
    requireScene(
      operation !== 'gaps' || gap >= 0,
      'space',
      'Afaste as peças das pontas para caberem todas sem sobreposição.',
    )
    let edge = first.min
    entries.forEach((entry, i) => {
      const target =
        operation === 'centers'
          ? first.center + (last.center - first.center) * (i / (entries.length - 1))
          : edge
      offsets.set(
        entry.id,
        i === 0 || i === entries.length - 1
          ? 0
          : target - (operation === 'centers' ? entry.center : entry.min),
      )
      edge += entry.max - entry.min + gap
    })
  }
  if ([...offsets.values()].every((value) => value === 0)) return document
  const nodes = document.nodes.map((node): ModelSceneNode => {
    const offset = offsets.get(node.id)
    if (offset === undefined || offset === 0) return node
    const inverse =
      node.parentId === null
        ? identityMatrix()
        : affineInverse(selected.index.scene.worldMatrices.get(node.parentId)!)
    requireScene(inverse, 'transform', 'O grupo tem uma escala que impede esse alinhamento.')
    const displacement: Vec3 = [0, 0, 0]
    displacement[component] = offset
    const local = transformDirection(inverse, displacement)
    if (node.transform.kind === 'trs')
      return {
        ...node,
        transform: {
          ...node.transform,
          translation: [
            node.transform.translation[0] + local[0],
            node.transform.translation[1] + local[1],
            node.transform.translation[2] + local[2],
          ],
        },
      }
    const matrix: AffineMatrix = [...node.transform.matrix]
    matrix[12] += local[0]
    matrix[13] += local[1]
    matrix[14] += local[2]
    return { ...node, transform: { kind: 'affine', matrix } }
  })
  return finishSceneCommand({ ...document, nodes })
}
