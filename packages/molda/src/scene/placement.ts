import type { Vec3 } from '../core/model'
import type { Bounds } from '../model/transform'
import { sceneBounds } from './bounds'
import { finishSceneCommand, requireEditableScene, sceneCommandSelection } from './commandContext'
import {
  addSceneShape,
  duplicateSceneNodes,
  type SceneIdFactory,
  type SceneShapeKind,
  transformSceneNodes,
} from './commands'
import type { MoldaSceneDocument } from './document'
import { indexSceneDocument } from './documentIndex'
import { evaluateSceneNodeFlags } from './evaluate'
import { reparentPreservingWorld } from './graph'
import { identityMatrix } from './matrix'
import { requireScene } from './validation'

/** Infer only an unambiguous destination; the UI displays it before the author adds anything. */
export function sceneInsertionParent(
  document: MoldaSceneDocument,
  ids: readonly string[],
): string | null {
  const nodes = new Map(document.nodes.map((node) => [node.id, node]))
  if (ids.length) {
    const parents = new Set(
      ids.map((id) => {
        const node = nodes.get(id)
        if (node?.kind === 'group') return node.id
        const parent = node?.parentId ? nodes.get(node.parentId) : null
        return parent?.kind === 'group' ? parent.id : null
      }),
    )
    return parents.size === 1 ? [...parents][0]! : null
  }
  const roots = document.nodes.filter((node) => node.parentId === null)
  return roots.length === 1 && roots[0]!.kind === 'group' ? roots[0]!.id : null
}

function offset(document: MoldaSceneDocument, ids: readonly string[], delta: Vec3) {
  const matrix = identityMatrix()
  matrix[12] = delta[0]
  matrix[13] = delta[1]
  matrix[14] = delta[2]
  return transformSceneNodes(document, ids, matrix)
}

function moved(bounds: Bounds, delta: Vec3): Bounds {
  return {
    min: bounds.min.map((value, axis) => value + delta[axis]!) as Vec3,
    max: bounds.max.map((value, axis) => value + delta[axis]!) as Vec3,
  }
}

function intersects(a: Bounds, b: Bounds) {
  return [0, 1, 2].every((axis) => {
    if (a.min[axis] === a.max[axis])
      return a.min[axis]! >= b.min[axis]! && a.min[axis]! <= b.max[axis]!
    if (b.min[axis] === b.max[axis])
      return b.min[axis]! >= a.min[axis]! && b.min[axis]! <= a.max[axis]!
    return a.min[axis]! < b.max[axis]! && a.max[axis]! > b.min[axis]!
  })
}

/** Try nearby cardinal placements, then the free edge of the entire visible creation. */
function beside(
  document: MoldaSceneDocument,
  created: readonly string[],
  reference: readonly string[],
) {
  const selected = sceneCommandSelection(document, created)
  const own = sceneBounds(selected.index, { nodeIds: selected.covered, includeMirrors: false })
  if (!own) return document
  const others = new Set(
    document.nodes.filter((node) => !selected.covered.has(node.id)).map((node) => node.id),
  )
  const all = sceneBounds(selected.index, { nodeIds: others, includeHidden: false })
  if (!all) return document
  const near =
    sceneBounds(selected.index, {
      nodeIds: sceneCommandSelection(document, reference).covered,
      includeHidden: false,
    }) ?? all
  const gap = Math.max(0.25, (own.max[0] - own.min[0]) * 0.1)
  const obstacles = [...others].flatMap((id) => {
    const bounds = sceneBounds(selected.index, { nodeIds: new Set([id]), includeHidden: false })
    return bounds ? [bounds] : []
  })
  // "Ao lado" é ao lado DE VERDADE: a peça nova fica na mesma altura da base da referência e
  // centrada no outro eixo do chão. Antes só um eixo andava, e uma forma acrescentada ao lado de
  // uma peça erguida e afastada nascia no chão, longe dela.
  const center = (bounds: Bounds, axis: 0 | 2) => (bounds.min[axis] + bounds.max[axis]) / 2
  const base = (target: Bounds) => target.min[1] - own.min[1]
  const alongX = (target: Bounds, x: number): Vec3 => [
    x,
    base(target),
    center(target, 2) - center(own, 2),
  ]
  const alongZ = (target: Bounds, z: number): Vec3 => [
    center(target, 0) - center(own, 0),
    base(target),
    z,
  ]
  const candidates: Vec3[] = [
    alongX(near, near.max[0] + gap - own.min[0]),
    alongX(near, near.min[0] - gap - own.max[0]),
    alongZ(near, near.max[2] + gap - own.min[2]),
    alongZ(near, near.min[2] - gap - own.max[2]),
    alongX(all, all.max[0] + gap - own.min[0]),
  ]
  const delta = candidates.find(
    (candidate) => !obstacles.some((bounds) => intersects(moved(own, candidate), bounds)),
  )
  requireScene(delta, 'position', 'Não há espaço aqui. Escolha outro lugar para a peça.')
  return offset(document, created, delta)
}

export function addScenePrimitiveNear(
  document: MoldaSceneDocument,
  kind: SceneShapeKind,
  name: string,
  ids: readonly string[],
  nextId?: SceneIdFactory,
  destination?: string | null,
): MoldaSceneDocument {
  const parentId = destination === undefined ? sceneInsertionParent(document, ids) : destination
  requireScene(
    parentId === null ||
      document.nodes.some((node) => node.id === parentId && node.kind === 'group'),
    'parentId',
    'Escolha um conjunto que existe neste modelo.',
  )
  if (parentId) {
    const flags = evaluateSceneNodeFlags(indexSceneDocument(document).scene).get(parentId)
    requireScene(
      !flags?.locked && !flags?.hidden,
      'parentId',
      'Mostre e destrave o conjunto antes de adicionar uma peça.',
    )
  }
  let next = addSceneShape(document, kind, name, nextId)
  const created = next.nodes.at(-1)!.id
  next = beside(next, [created], ids)
  if (parentId) {
    // This is a new node, intentionally inheriting its destination's animation. Existing
    // animated nodes still go through the stricter reparentSceneNodes command.
    next = finishSceneCommand({
      ...next,
      nodes: [...reparentPreservingWorld(next.nodes, [created], parentId)],
    })
  }
  return next
}

export function duplicateSceneNodesNearby(
  document: MoldaSceneDocument,
  ids: readonly string[],
  nextId?: SceneIdFactory,
) {
  const next = duplicateSceneNodes(document, ids, nextId)
  if (next === document) return document
  const old = new Set(document.nodes.map((node) => node.id))
  const created = next.nodes.filter((node) => !old.has(node.id)).map((node) => node.id)
  const names = new Set(document.nodes.map((node) => node.name))
  const nodes = next.nodes.map((node) => {
    if (old.has(node.id)) return node
    const stem = node.name.slice(0, 35)
    let name = `${stem} (cópia)`,
      number = 2
    while (names.has(name)) name = `${stem} (cópia ${number++})`
    names.add(name)
    return { ...node, name }
  })
  return beside({ ...next, nodes }, created, ids)
}

export function placeSceneNodesOnGround(document: MoldaSceneDocument, ids: readonly string[]) {
  const selected = sceneCommandSelection(document, ids)
  requireEditableScene(selected)
  const bounds = sceneBounds(selected.index, { nodeIds: selected.covered, includeMirrors: false })
  requireScene(bounds, 'selection', 'Escolha uma peça para colocar no chão.')
  return offset(document, ids, [0, -bounds.min[1], 0])
}

export function placeSceneNodesOnSupport(
  document: MoldaSceneDocument,
  ids: readonly string[],
  supportId: string,
) {
  const selected = sceneCommandSelection(document, ids)
  requireEditableScene(selected)
  requireScene(!selected.covered.has(supportId), 'support', 'Escolha outra peça como apoio.')
  const support = selected.index.scene.nodes.get(supportId)
  const geometry =
    support?.kind === 'mesh' ? selected.index.geometries.get(support.geometryId) : null
  const world = selected.index.scene.worldMatrices.get(supportId)
  const flags = evaluateSceneNodeFlags(selected.index.scene).get(supportId)
  requireScene(
    geometry &&
      (geometry.kind === 'box' || geometry.kind === 'cylinder') &&
      world &&
      !flags?.hidden,
    'support',
    'Escolha o topo plano de uma caixa ou cilindro. Para outros apoios, use Mover.',
  )
  // O topo é reto quando um eixo da peça fica de pé e os outros dois deitados. Na caixa vale
  // qualquer eixo (deitada de lado ela continua com o topo plano); no cilindro, só o da altura,
  // de pé ou de ponta-cabeça (a tampa é a única face plana dele).
  const flat = (axis: 0 | 1 | 2) =>
    ([0, 1, 2] as const).every((other) =>
      other === axis
        ? Math.abs(world[other * 4 + 1]!) > 1e-8
        : Math.abs(world[other * 4 + 1]!) < 1e-8,
    )
  requireScene(
    geometry.kind === 'box' ? flat(0) || flat(1) || flat(2) : flat(1),
    'support',
    'Esse apoio está inclinado. Use um apoio com o topo reto.',
  )
  const own = sceneBounds(selected.index, { nodeIds: selected.covered, includeMirrors: false })
  const target = sceneBounds(selected.index, {
    nodeIds: new Set([supportId]),
    includeMirrors: false,
  })
  requireScene(own && target, 'selection', 'Escolha uma peça e um apoio visíveis.')
  return offset(document, ids, [
    (target.min[0] + target.max[0] - own.min[0] - own.max[0]) / 2,
    target.max[1] - own.min[1],
    (target.min[2] + target.max[2] - own.min[2] - own.max[2]) / 2,
  ])
}
