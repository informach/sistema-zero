import type { Camera } from 'three'
import type { indexSceneDocument } from '../scene/documentIndex'
import { sceneFlipbookRegion, sceneFlipbookTexel } from '../scene/imageFlipbook'
import type { ScenePaintSample, ScenePaintTarget } from '../scene/imagePaint'
import { SCENE_MATERIAL_IMAGE_FIELDS } from '../scene/materialImages'
import { scenePaintFaceBounds } from '../scene/paintSurfaceBounds'
import { CapturedPaintInput } from './CapturedPaintInput'
import type { SceneRenderResource } from './sceneRenderResource'
import { sceneSurfaceHit } from './sceneSurfaceHit'
import type { ScenePaintActions } from './sceneViewportTypes'

/** Captured paint input precedes orbit/selection. Geometry, raycasting and UVs remain real. */
export class ScenePaintInput {
  private target: ScenePaintTarget | null = null
  private enabled = true
  private disposed = false
  private readonly input: CapturedPaintInput<ScenePaintSample>
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: () => Camera,
    private readonly source: () => ReturnType<typeof indexSceneDocument> | null,
    private readonly resource: SceneRenderResource,
    actions: ScenePaintActions,
  ) {
    this.input = new CapturedPaintInput(canvas, (event) => this.pick(event), actions)
  }
  setTarget(target: ScenePaintTarget | null) {
    if (this.disposed) return
    if (target !== this.target) this.cancel()
    this.target = target
    this.input.setEnabled(this.enabled && !!target)
  }
  setEnabled(value: boolean) {
    this.enabled = value
    this.input.setEnabled(value && !!this.target)
  }
  /** `false` na aba Pintar: o toque que não acerta a peça fica com a câmera e com a escolha. */
  setClaimMisses(value: boolean) {
    this.input.setClaimMisses(value)
  }
  private pick(event: Pick<PointerEvent, 'clientX' | 'clientY'>): ScenePaintSample | null {
    const target = this.target
    const source = this.source()
    if (!target || !source) return null
    const hit = sceneSurfaceHit(this.canvas, this.camera(), this.resource, event)
    if (!hit || hit.faceIndex == null || !hit.uv) return null
    const instance = this.resource.instanceFor(hit.object)
    // The nearest visible piece occludes even when it is locked or uses another image.
    if (!instance || instance.locked || instance.sourceNodeId !== target.nodeId) return null
    const materialId = this.resource.materialFor(hit.object, hit.faceIndex)
    const material = materialId ? source.materials.get(materialId) : null
    const image = source.images.get(target.imageId)
    const faceId = this.resource.faceFor(hit.object, hit.faceIndex)
    if (
      !image ||
      !faceId ||
      material?.[SCENE_MATERIAL_IMAGE_FIELDS[target.imageKind ?? 'color']] !== image.id
    )
      return null
    const frame = this.resource.frameForImage(image.id)
    const point = sceneFlipbookTexel(image, [hit.uv.x, hit.uv.y], frame ?? 0)
    if (!point) return null
    // Pintura que se mexe: o quadro. Folha comum: a face tocada, para o carimbo largo e o balde
    // não vazarem para a face do lado quando várias dividem a folha.
    const node = source.scene.nodes.get(target.nodeId)
    const geometry = node?.kind === 'mesh' ? source.geometries.get(node.geometryId) : undefined
    const bounds =
      frame !== null
        ? sceneFlipbookRegion(image, frame)
        : geometry
          ? scenePaintFaceBounds(geometry, faceId, image)
          : null
    return {
      point,
      ...(bounds ? { bounds } : {}),
      region: JSON.stringify(frame === null ? [instance.id, faceId] : [instance.id, faceId, frame]),
    }
  }
  cancel() {
    this.input.cancel()
  }
  interrupt() {
    this.input.interrupt()
  }
  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.input.dispose()
    this.target = null
  }
}
