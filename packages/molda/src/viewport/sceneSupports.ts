import type { Vec3 } from '../core/model'
import type { indexSceneDocument } from '../scene/documentIndex'
import { evaluateSceneNodeFlags } from '../scene/evaluate'
import { requireScene } from '../scene/validation'

export interface SceneSupportPoint {
  id: string
  position: Vec3
  parent: number | null
  selected: boolean
  locked: boolean
}

/** Presentation snapshot of authorial groups/locators, never the flat bones of a skin palette. */
export function prepareSceneSupports(
  index: ReturnType<typeof indexSceneDocument>,
  selected: ReadonlySet<string>,
  isolated: ReadonlySet<string> | null,
): SceneSupportPoint[] {
  const flags = evaluateSceneNodeFlags(index.scene),
    associated = new Set<string>()
  if (isolated) {
    for (const skin of index.skins.values()) {
      if (!isolated.has(skin.nodeId) || flags.get(skin.nodeId)?.hidden) continue
      for (const joint of skin.joints) associated.add(joint.nodeId)
    }
  }
  const points: SceneSupportPoint[] = [],
    nearest = new Map<string, number | null>()
  for (const id of index.scene.order) {
    const node = index.scene.nodes.get(id)!,
      state = flags.get(id)!,
      parent = node.parentId === null ? null : (nearest.get(node.parentId) ?? null)
    if (
      node.kind === 'mesh' ||
      state.hidden ||
      (isolated && !isolated.has(id) && !associated.has(id))
    ) {
      nearest.set(id, parent)
      continue
    }
    const world = index.scene.worldMatrices.get(id)
    requireScene(world, `nodes.${id}`, 'A pose de um apoio está incompleta.')
    const position: Vec3 = [world[12], world[13], world[14]]
    requireScene(
      position.every((value) => Number.isFinite(Math.fround(value))),
      `nodes.${id}`,
      'Um apoio está longe demais para desenhar seu guia. Sua posição continua guardada.',
    )
    nearest.set(id, points.length)
    points.push({ id, position, parent, selected: selected.has(id), locked: state.locked })
  }
  return points
}
