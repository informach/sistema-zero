import { type Camera, Matrix3, SkinnedMesh } from 'three'
import type { Vec3 } from '../core/model'
import type { indexSceneDocument } from '../scene/documentIndex'
import type { SceneSkinPaintSample } from '../scene/skinPaint'
import type { SceneBrushSurface } from './SceneBrushCursor'
import type { SceneSkinWeightTarget } from './SceneSkinWeightOverlay'
import type { SceneRenderResource } from './sceneRenderResource'
import { sceneSurfaceHit } from './sceneSurfaceHit'

/** A procedural mirror is an isometry: undo its world-plane reflection, not the source's affine transform. */
export function pickSceneSkinPaint(
  canvas: HTMLCanvasElement,
  camera: Camera,
  resource: SceneRenderResource,
  index: ReturnType<typeof indexSceneDocument>,
  target: SceneSkinWeightTarget,
  event: Pick<PointerEvent, 'clientX' | 'clientY'>,
): { sample: SceneSkinPaintSample; surface: SceneBrushSurface | null } | null {
  const hit = sceneSurfaceHit(canvas, camera, resource, event)
  if (!hit || hit.faceIndex == null || hit.object instanceof SkinnedMesh) return null
  const instance = resource.instanceFor(hit.object),
    skin = index.skinsByNode.get(target.nodeId)
  if (
    !instance ||
    instance.locked ||
    instance.sourceNodeId !== target.nodeId ||
    !skin?.joints.some((joint) => joint.nodeId === target.jointId)
  )
    return null
  const faceId = resource.faceFor(hit.object, hit.faceIndex)
  if (!faceId) return null
  const surfacePoint: Vec3 = [hit.point.x, hit.point.y, hit.point.z],
    point: Vec3 = [...surfacePoint],
    mirror = index.mirrors.get(instance.id)
  if (mirror) {
    const axis = mirror.axis === 'x' ? 0 : mirror.axis === 'y' ? 1 : 2
    point[axis] = 2 * mirror.offset - point[axis]
  }
  const normal = hit.face?.normal
    .clone()
    .applyNormalMatrix(new Matrix3().getNormalMatrix(hit.object.matrixWorld))
  return {
    sample: { faceId, point },
    surface: normal ? { point: surfacePoint, normal: [normal.x, normal.y, normal.z] } : null,
  }
}
