import { type Camera, Raycaster, Vector2, Vector3 } from 'three'
import type { indexSceneDocument } from '../scene/documentIndex'
import { evaluateSceneNodeFlags } from '../scene/evaluate'
import type { AffineMatrix } from '../scene/matrix'
import { pointInSelection, type SceneSelectionRegion } from '../scene/regionSelection'
import type { SceneRenderResource } from './sceneRenderResource'

/** Object-mode region selection contains projected pivots, not approximated mesh silhouettes. */
export function pickSceneRegion(
  index: ReturnType<typeof indexSceneDocument>,
  resource: SceneRenderResource,
  camera: Camera,
  region: SceneSelectionRegion,
  through: boolean,
  isolated?: ReadonlySet<string>,
): string[] {
  camera.updateMatrixWorld(true)
  const flags = evaluateSceneNodeFlags(index.scene)
  const visible = resource.root.children.filter((object) => object.visible)
  const ray = new Raycaster()
  const hits = new Map<string, ReturnType<Raycaster['intersectObjects']>[number] | null>()
  const candidates: Array<{ id: string; world: Readonly<AffineMatrix> }> = []
  for (const id of index.scene.order) {
    const world = index.scene.worldMatrices.get(id)
    if (world) candidates.push({ id, world })
  }
  for (const object of visible) {
    const instance = resource.instanceFor(object)
    if (instance && instance.id !== instance.sourceNodeId)
      candidates.push({ id: instance.sourceNodeId, world: instance.worldMatrix })
  }
  const chosen = new Set<string>()
  for (const { id, world } of candidates) {
    if (chosen.has(id)) continue
    const node = index.scene.nodes.get(id)
    const state = flags.get(id)
    if (!node || !world || state?.hidden || state?.locked || (isolated && !isolated.has(id)))
      continue
    const position = new Vector3(world[12], world[13], world[14])
    const projected = position.clone().project(camera)
    if (
      ![projected.x, projected.y, projected.z].every(Number.isFinite) ||
      projected.z < -1 ||
      projected.z > 1 ||
      !pointInSelection([(projected.x + 1) / 2, (1 - projected.y) / 2], region)
    )
      continue
    if (!through) {
      const key = `${projected.x}:${projected.y}`
      let hit = hits.get(key)
      if (hit === undefined) {
        ray.setFromCamera(new Vector2(projected.x, projected.y), camera)
        hit = ray.intersectObjects(visible, false)[0] ?? null
        hits.set(key, hit)
      }
      if (hit) {
        const instance = resource.instanceFor(hit.object)
        let current = instance?.sourceNodeId ?? null
        let related = false
        while (current !== null) {
          if (current === id) {
            related = true
            break
          }
          current = index.scene.nodes.get(current)?.parentId ?? null
        }
        // A pivot inside its own geometry is still selectable. Unrelated geometry may cover it.
        if (!related && hit.point.clone().project(camera).z < projected.z - 1e-9) continue
      }
    }
    chosen.add(id)
  }
  return [...chosen]
}
