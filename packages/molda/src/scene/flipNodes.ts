import type { Vec3 } from '../core/model'
import { sceneBounds } from './bounds'
import { finishSceneCommand, requireEditableScene, sceneCommandSelection } from './commandContext'
import { transformSceneNodes } from './commands'
import type { MoldaSceneDocument } from './document'
import { identityMatrix, transformPoint } from './matrix'
import { sceneNodePivot } from './pivot'
import { boolean, choice, requireScene } from './validation'

/** Reflect authored subtrees once, including their generated mirror planes. No geometry is baked. */
export function flipSceneNodes(
  document: MoldaSceneDocument,
  ids: readonly string[],
  axis: 'x' | 'y' | 'z',
  inPlace = false,
): MoldaSceneDocument {
  choice(axis, ['x', 'y', 'z'], 'axis')
  boolean(inPlace, 'inPlace')
  const selected = sceneCommandSelection(document, ids)
  requireEditableScene(selected)
  if (!selected.roots.size) return document
  // A bound mesh follows its joints. Reflecting both together preserves the authored binding.
  for (const skin of document.skins ?? []) {
    const affected =
      selected.covered.has(skin.nodeId) || skin.joints.some((j) => selected.covered.has(j.nodeId))
    if (affected)
      requireScene(
        selected.covered.has(skin.nodeId) &&
          skin.joints.every((j) => selected.covered.has(j.nodeId)),
        'skin',
        'Para virar uma peça com ossos, escolha a peça e todos os seus ossos ou o grupo que contém esse conjunto.',
      )
  }
  const component = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
  const center: Vec3 = [0, 0, 0]
  if (inPlace) {
    const bounds = sceneBounds(selected.index, { nodeIds: selected.covered })
    if (bounds) {
      for (const a of [0, 1, 2] as const) center[a] = bounds.min[a] / 2 + bounds.max[a] / 2
    } else
      for (const id of selected.roots) {
        const point = transformPoint(
          selected.index.scene.worldMatrices.get(id)!,
          sceneNodePivot(selected.index.scene.nodes.get(id)!),
        )
        for (const a of [0, 1, 2] as const) center[a] += point[a] / selected.roots.size
      }
  }
  const delta = identityMatrix()
  delta[component * 5] = -1
  delta[12 + component] = 2 * center[component]
  const flipped = transformSceneNodes(document, ids, delta)
  const changesMirrors = document.mirrors.some(
    (m) => m.axis === axis && selected.covered.has(m.sourceId),
  )
  if (!changesMirrors) return flipped
  const mirrors = document.mirrors.map((m) =>
    m.axis === axis && selected.covered.has(m.sourceId)
      ? { ...m, offset: center[component] + (center[component] - m.offset) }
      : m,
  )
  return finishSceneCommand({ ...flipped, mirrors })
}
