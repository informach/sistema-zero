import {
  Box3,
  type Camera,
  type Intersection,
  Matrix3,
  Mesh,
  Raycaster,
  Triangle,
  Vector3,
} from 'three'
import type { MoldaSceneDocument } from '../scene/document'
import type { indexSceneDocument } from '../scene/documentIndex'
import { sceneFlipbookRegion, sceneFlipbookTexel } from '../scene/imageFlipbook'
import type {
  ScenePaintContact,
  ScenePaintInputSample,
  ScenePaintSample,
  ScenePaintTarget,
} from '../scene/imagePaint'
import { SCENE_MATERIAL_IMAGE_FIELDS } from '../scene/materialImages'
import { scenePaintFaceBounds, scenePaintIslandKey } from '../scene/paintSurfaceBounds'
import { SceneValidationError } from '../scene/validation'
import { CapturedPaintInput } from './CapturedPaintInput'
import { type ScenePaintGuideSettings, ScenePaintGuides } from './ScenePaintGuides'
import type { SceneRenderResource } from './sceneRenderResource'
import { sceneSurfaceHit } from './sceneSurfaceHit'
import type { ScenePaintActions, ScenePaintSurfaceScope } from './sceneViewportTypes'

type SceneSource = ReturnType<typeof indexSceneDocument>

/** Captured paint input precedes orbit/selection. Geometry, raycasting and UVs remain real. */
export class ScenePaintInput {
  readonly guides = new ScenePaintGuides()
  private settings: ScenePaintGuideSettings | null = null
  private hover: { clientX: number; clientY: number } | null = null
  private target: ScenePaintTarget | null = null
  private enabled = true
  private disposed = false
  private mirror = false
  private scope: ScenePaintSurfaceScope | null = null
  private readonly input: CapturedPaintInput<ScenePaintInputSample>
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: () => Camera,
    private readonly source: () => SceneSource | null,
    private readonly resource: SceneRenderResource,
    actions: ScenePaintActions,
    private readonly document: () => MoldaSceneDocument | null = () => null,
    private readonly redraw: () => void = () => {},
  ) {
    canvas.addEventListener('pointermove', this.onHover, true)
    canvas.addEventListener('pointerdown', this.onHover, true)
    canvas.addEventListener('pointerleave', this.clearHover)
    canvas.ownerDocument.defaultView?.addEventListener('blur', this.clearHover)
    this.input = new CapturedPaintInput(canvas, (event) => this.pick(event), actions)
  }
  private readonly onHover = (event: PointerEvent) => {
    if (!this.enabled || !this.settings) return
    this.hover = { clientX: event.clientX, clientY: event.clientY }
    this.redraw()
  }
  private readonly clearHover = () => {
    if (this.hover) {
      this.hover = null
      this.redraw()
    }
  }
  setGuideSettings(settings: ScenePaintGuideSettings | null) {
    this.settings = settings
    this.redraw()
  }
  draw() {
    const document = this.document()
    let hover: { document: MoldaSceneDocument; sample: ScenePaintSample } | null = null
    if (this.enabled && document && this.hover && this.settings?.cursor) {
      const sample = this.pick(this.hover)
      if (sample) {
        try {
          hover = 'kind' in sample ? this.guides.contact(document, sample) : { document, sample }
        } catch (error) {
          if (!(error instanceof SceneValidationError)) throw error
        }
      }
    }
    this.guides.update(
      document,
      this.resource,
      this.enabled ? this.settings : null,
      this.scope,
      this.target,
      hover,
    )
  }
  setTarget(target: ScenePaintTarget | null) {
    if (this.disposed) return
    if (target !== this.target) this.cancel()
    this.target = target
    this.input.setEnabled(this.enabled && (!!target || !!this.scope))
  }
  setEnabled(value: boolean) {
    this.enabled = value
    if (!value) this.clearHover()
    this.input.setEnabled(value && (!!this.target || !!this.scope))
  }
  setScope(scope: ScenePaintSurfaceScope | null) {
    if (this.scope?.mode === scope?.mode && this.scope?.nodeId === scope?.nodeId) return
    this.cancel()
    this.scope = scope
    this.input.setEnabled(this.enabled && (!!this.target || !!scope))
  }
  /** `false` na aba Pintar: o toque que não acerta a peça fica com a câmera e com a escolha. */
  setClaimMisses(value: boolean) {
    this.input.setClaimMisses(value)
  }
  /** Espelho de pintura: cada amostra leva também o ponto refletido em x = 0, na mesma peça. */
  setMirror(value: boolean) {
    if (value !== this.mirror) this.cancel()
    this.mirror = value
  }
  private pick(event: Pick<PointerEvent, 'clientX' | 'clientY'>): ScenePaintInputSample | null {
    const target = this.target
    const source = this.source()
    if ((!target && !this.scope) || !source) return null
    const hit = sceneSurfaceHit(this.canvas, this.camera(), this.resource, event)
    if (!hit) return null
    const instance = this.resource.instanceFor(hit.object)
    if (this.scope) {
      if (
        !instance ||
        instance.locked ||
        (this.scope.mode === 'selected' && instance.sourceNodeId !== this.scope.nodeId)
      )
        return null
      const sample = this.contactOf(hit, instance.sourceNodeId, source)
      if (!sample || !this.mirror) return sample
      const other = this.reflectedHit(hit)
      const reflected = other ? this.contactOf(other, instance.sourceNodeId, source) : null
      return reflected ? { ...sample, mirror: reflected } : sample
    }
    // The nearest visible piece occludes even when it is locked or uses another image.
    if (!target || !instance || instance.locked || instance.sourceNodeId !== target.nodeId)
      return null
    const sample = this.sampleOf(hit, instance.id, target, source)
    if (!sample || !this.mirror) return sample
    const mirrored = this.mirrorOf(hit, instance.id, target, source)
    return mirrored ? { ...sample, mirror: mirrored } : sample
  }
  private contactOf(
    hit: Intersection,
    nodeId: string,
    source: SceneSource,
  ): ScenePaintContact | null {
    if (!(hit.object instanceof Mesh) || hit.faceIndex == null || !hit.face) return null
    const faceId = this.resource.faceFor(hit.object, hit.faceIndex)
    if (!faceId) return null
    const point = hit.object.worldToLocal(hit.point.clone())
    const a = hit.object.getVertexPosition(hit.face.a, new Vector3())
    const b = hit.object.getVertexPosition(hit.face.b, new Vector3())
    const c = hit.object.getVertexPosition(hit.face.c, new Vector3())
    const weights = Triangle.getBarycoord(point, a, b, c, new Vector3())
    if (!weights) return null
    const materialId = this.resource.materialFor(hit.object, hit.faceIndex)
    const imageId = materialId ? source.materials.get(materialId)?.colorImageId : undefined
    return {
      kind: 'surface',
      nodeId,
      faceId,
      triangle: hit.faceIndex,
      barycentric: [weights.x, weights.y, weights.z],
      frame: imageId ? (this.resource.frameForImage(imageId) ?? 0) : 0,
    }
  }
  /** Reflect in the piece's local mid-plane, independently of its pivot and parent transform. */
  private reflectedHit(hit: Intersection) {
    if (!(hit.object instanceof Mesh) || !hit.face) return null
    const object = hit.object
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox()
    const bounds = object.geometry.boundingBox ?? new Box3()
    const center = bounds.getCenter(new Vector3())
    const local = object.worldToLocal(hit.point.clone())
    local.x = 2 * center.x - local.x
    const localNormal = hit.face.normal.clone()
    localNormal.x = -localNormal.x
    const normal = localNormal
      .applyMatrix3(new Matrix3().getNormalMatrix(object.matrixWorld))
      .normalize()
    const point = object.localToWorld(local)
    const reach = Math.max(
      bounds.getSize(new Vector3()).length() * object.matrixWorld.getMaxScaleOnAxis() * 0.002,
      Number.EPSILON,
    )
    const ray = new Raycaster(point.addScaledVector(normal, reach), normal.negate(), 0, reach * 2)
    return (
      this.resource
        .surfaceIntersections(ray)
        .find((entry) => entry.object === object && entry.faceIndex != null && entry.uv) ?? null
    )
  }
  /** O texel, a região e o limite de uma batida na peça alvo; `null` fora da folha alvo. */
  private sampleOf(
    hit: Intersection,
    instanceId: string,
    target: ScenePaintTarget,
    source: SceneSource,
  ): ScenePaintSample | null {
    if (hit.faceIndex == null || !hit.uv) return null
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
    // O limite é a face tocada, para o carimbo largo e o balde não vazarem para a face do lado
    // quando várias dividem a folha; na pintura que se mexe, a face DENTRO do quadro.
    const node = source.scene.nodes.get(target.nodeId)
    const geometry = node?.kind === 'mesh' ? source.geometries.get(node.geometryId) : undefined
    const cell = frame !== null ? sceneFlipbookRegion(image, frame) : undefined
    const bounds = (geometry && scenePaintFaceBounds(geometry, faceId, image, cell)) || cell
    // O traço liga as amostras da mesma ILHA de UV: numa malha com a UV contínua ele não quebra
    // em cada polígono (a emenda do cilindro e da bola continua cortando, pelo `crossesSeam`).
    const island = geometry ? scenePaintIslandKey(geometry, faceId) : faceId
    return {
      point,
      faceId,
      ...(bounds ? { bounds } : {}),
      region: JSON.stringify(frame === null ? [instanceId, island] : [instanceId, island, frame]),
    }
  }
  /**
   * O ponto refletido no plano do meio (x = 0), procurado na MESMA peça, pertinho da superfície.
   * Duas peças soltas, uma de cada lado, não se espelham (a Simetria já espelha a pintura).
   */
  private mirrorOf(
    hit: Intersection,
    instanceId: string,
    target: ScenePaintTarget,
    source: SceneSource,
  ): Omit<ScenePaintSample, 'mirror'> | null {
    const other = this.reflectedHit(hit)
    if (!other) return null
    const sample = this.sampleOf(other, instanceId, target, source)
    return sample ? { ...sample, region: `${sample.region}:espelho` } : null
  }
  cancel() {
    this.input.cancel()
  }
  interrupt() {
    this.input.interrupt()
  }
  /** A janela perdeu o foco: os dedos no vidro deixam de valer (o `pointerup` pode não vir). */
  forget() {
    this.input.forget()
  }
  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.canvas.removeEventListener('pointermove', this.onHover, true)
    this.canvas.removeEventListener('pointerdown', this.onHover, true)
    this.canvas.removeEventListener('pointerleave', this.clearHover)
    this.canvas.ownerDocument.defaultView?.removeEventListener('blur', this.clearHover)
    this.guides.dispose()
    this.input.dispose()
    this.target = null
  }
}
