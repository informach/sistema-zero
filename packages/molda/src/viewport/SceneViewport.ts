import {
  AxesHelper,
  type Intersection,
  Mesh,
  PCFShadowMap,
  Plane,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { prepareSceneBounds, sceneBounds } from '../scene/bounds'
import { ViewportThumbnail } from './viewportThumbnail'

/** Mesmo papel claro do editor antigo: a galeria mostra as duas gerações lado a lado. */
const SCENE_THUMB_BACKGROUND = '#e6f1ff'

interface BodySample {
  x: number
  y: number
  id?: string
  hit?: Intersection
  locked?: boolean
  additive?: boolean
  guide?: boolean
  point?: [number, number, number]
  pull?: { point: Vec3; axis: Vec3 | null }
  touch?: boolean
}

import type { Vec3 } from '../core/model'
import { cross, normalize } from '../model/vec'
import type { MoldaSceneDocument } from '../scene/document'
import { sameSceneContent } from '../scene/documentContent'
import { indexSceneDocument } from '../scene/documentIndex'
import { evaluateSceneNodeFlags } from '../scene/evaluate'
import { selectSceneSubtrees } from '../scene/graph'
import { sceneFlipbookTexel } from '../scene/imageFlipbook'
import type { ScenePaintTarget } from '../scene/imagePaint'
import {
  affineInverse,
  affineMultiply,
  composeTransform,
  identityMatrix,
  transformDirection,
  transformPoint,
} from '../scene/matrix'
import { sceneMeasurementReference } from '../scene/measurementReference'
import {
  meshComponentEdges,
  meshComponentIds,
  meshComponentVertices,
  type SceneComponentSelection,
} from '../scene/meshComponents'
import { meshFaceFrame } from '../scene/meshFaceFrame'
import { meshVertexCenter } from '../scene/meshVertices'
import { sampleSceneInk } from '../scene/paintInk'
import { sceneGeometryMesh } from '../scene/parametricGeometry'
import { sceneLocalBounds, sceneNodePivot, scenePivotAxisFrame } from '../scene/pivot'
import type { SceneAnimationPose } from '../scene/sampleAnimation'
import type { SceneSkinPaintSample } from '../scene/skinPaint'
import { sceneTransformFrame } from '../scene/transformFrame'
import { requireScene } from '../scene/validation'
import { sceneVisibleMesh } from '../scene/visibleMesh'
import type { SceneSkinPaintPreview } from '../state/sceneSkinPaintGesture'
import { CapturedPaintInput } from './CapturedPaintInput'
import { DemandRenderLoop } from './demandRenderLoop'
import { paintPointerPath } from './paintPointerPath'
import { SceneAreaSelection, type SceneAreaTool } from './SceneAreaSelection'
import { SceneAxisHandles } from './SceneAxisHandles'
import { SceneBodyMove } from './SceneBodyMove'
import { SceneBrushCursor } from './SceneBrushCursor'
import { SceneComponentOverlay } from './SceneComponentOverlay'
import { SceneGround } from './SceneGround'
import { SceneGuideAnnotation } from './SceneGuideAnnotation'
import { ScenePaintInput } from './ScenePaintInput'
import { ScenePreviewGuide, type ScenePreviewGuideState } from './ScenePreviewGuide'
import { SceneSelectionOutline } from './SceneSelectionOutline'
import { SceneSkinWeightOverlay, type SceneSkinWeightTarget } from './SceneSkinWeightOverlay'
import { SceneSupportOverlay } from './SceneSupportOverlay'
import { SceneTransformGizmo } from './SceneTransformGizmo'
import { SceneComponentPicker } from './sceneComponentPicking'
import { SceneCutPicker } from './sceneCutPicking'
import { pickSceneKnifePoint } from './sceneKnifePicking'
import { SceneOcclusionQuery } from './sceneOcclusionQuery'
import { pickSceneRegion } from './sceneRegionPicking'
import { SceneRenderResource } from './sceneRenderResource'
import { pickSceneSkinPaint } from './sceneSkinPaintPick'
import { sceneSkinPaintSpacing } from './sceneSkinPaintSpacing'
import { prepareSceneSupports, type SceneSupportPoint } from './sceneSupports'
import { sceneSurfaceHit } from './sceneSurfaceHit'
import { prepareSceneTwoBoneGuide } from './sceneTwoBoneGuide'
import type {
  SceneGuideInput,
  ScenePaintMode,
  SceneTransformTool,
  SceneViewportCallbacks,
  SceneViewportPort,
} from './sceneViewportTypes'
import type { CameraView } from './types'
import { ViewportCamera } from './viewportCamera'
import { createViewportOrbit } from './viewportNavigation'
import { workshopLights } from './workshopLights'

/** Browser renderer boundary; the domain, resources, camera and picking remain real Three objects. */
export type SceneRenderer = Pick<
  WebGLRenderer,
  'setPixelRatio' | 'setClearColor' | 'setSize' | 'render' | 'dispose'
> &
  Partial<Pick<WebGLRenderer, 'forceContextLoss' | 'shadowMap'>>

/** Browser owner only: navigation, picking, context lifecycle and demand scheduling. */
export class SceneViewport implements SceneViewportPort {
  private readonly renderer: SceneRenderer
  private readonly scene = new Scene()
  private readonly rig = new ViewportCamera('orthographic')
  private readonly resource = new SceneRenderResource()
  private readonly lights = workshopLights()
  private readonly ground: SceneGround
  // O contorno da escolhida é ÂMBAR (o ouro da casa): o azul de antes sumia sobre a peça
  // nova, que nasce azul.
  private readonly outline = new SceneSelectionOutline()
  private readonly pivot = new AxesHelper(0.75)
  private readonly faces = new SceneComponentOverlay()
  private readonly supports = new SceneSupportOverlay()
  private readonly poseGuide = new SceneSupportOverlay(4)
  private readonly previewGuide = new ScenePreviewGuide()
  private guideAnnotation: SceneGuideAnnotation | null = null
  private readonly weightPoints = new SceneSkinWeightOverlay()
  private readonly brushCursor = new SceneBrushCursor()
  private weightTarget: SceneSkinWeightTarget | null = null
  private supportGuides = false
  private displayedSupports: readonly SceneSupportPoint[] = []
  private readonly componentPicker = new SceneComponentPicker()
  private readonly cutPicker = new SceneCutPicker()
  private cutHoverFrame: number | null = null
  private cutHoverPointer: { clientX: number; clientY: number; shiftKey?: boolean } | null = null
  private componentSelection: SceneComponentSelection | null = null
  private areaTool: SceneAreaTool = 'point'
  private orbit: OrbitControls | null = null
  private loop: DemandRenderLoop | null = null
  private gizmo: SceneTransformGizmo | null = null
  private pivotHandles: SceneAxisHandles | null = null
  private pivotOwner: NonNullable<SceneGuideInput['pivot']> | null = null
  private area: SceneAreaSelection | null = null
  private paint: ScenePaintInput | null = null
  private paintTarget: ScenePaintTarget | null = null
  private body: CapturedPaintInput<BodySample> | null = null
  private bodyMove: SceneBodyMove | null = null
  private bodyMoving = false
  private bodySelection: { id: string; additive: boolean; faceId?: string } | null = null
  private transformTool: SceneTransformTool = 'select'
  private transformSpace: 'world' | 'local' | 'pivot' = 'world'
  private faceExtrusion = false
  private directPull = false
  // A drag on the chosen face or line opens Puxar by itself; the panel reacting to it
  // must not cancel the very gesture that opened it.
  private pulling = false
  // A press on the chosen face or line that never travels is a click: it still chooses.
  private pullClick: BodySample | null = null
  private handleDragging = false
  private movementStep: number | null = null
  private measurementOrigin: Vec3 | null = null
  /** `null` = quem chama não conhece a aba Pintar: a pintura é deduzida do alvo, como antes. */
  private paintMode: ScenePaintMode | null = null
  private skinPaint: CapturedPaintInput<SceneSkinPaintSample> | null = null
  private skinPaintEnabled = false
  private skinPaintRadius: number | null = null
  private skinPaintSpacing = 1
  private selectThrough = false
  private index: ReturnType<typeof indexSceneDocument> | null = null
  private baseIndex: ReturnType<typeof indexSceneDocument> | null = null
  private boundsCache: ReturnType<typeof prepareSceneBounds> | null = null
  private document: MoldaSceneDocument | null = null
  private pose: SceneAnimationPose | null = null
  private animationEditing = false
  private selected: readonly string[] = []
  private isolated: readonly string[] | null = null
  private readonly pointers = new Set<number>()
  private pointer: { id: number; x: number; y: number; moved: boolean; onGizmo: boolean } | null =
    null
  private disposed = false
  private contextLost = false
  private poseMode = false
  private thumbnail: ViewportThumbnail | null = null

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly callbacks: SceneViewportCallbacks,
    private readonly reducedMotion = false,
    createRenderer: (canvas: HTMLCanvasElement) => SceneRenderer = (canvas) =>
      new WebGLRenderer({ canvas, antialias: true, alpha: true }),
  ) {
    this.renderer = createRenderer(canvas)
    try {
      this.ground = new SceneGround(canvas, this.lights[1], this.request)
      // A miniatura reusa o mesmo alvo do editor antigo: um render próprio de 96 px,
      // sem tocar no palco que a criança está vendo.
      if (this.renderer instanceof WebGLRenderer)
        this.thumbnail = new ViewportThumbnail(this.renderer, SCENE_THUMB_BACKGROUND)
      this.renderer.setPixelRatio(
        Math.min(canvas.ownerDocument.defaultView?.devicePixelRatio ?? 1, 2),
      )
      this.renderer.setClearColor(0, 0)
      if (this.renderer.shadowMap) {
        this.renderer.shadowMap.enabled = true
        this.renderer.shadowMap.type = PCFShadowMap
      }
      this.pivot.visible = false
      this.pivot.matrixAutoUpdate = false
      this.poseGuide.root.name = 'molda-two-bone-guide'
      this.scene.add(
        this.resource.root,
        this.faces.root,
        this.supports.root,
        this.poseGuide.root,
        this.previewGuide.root,
        this.weightPoints.root,
        this.brushCursor.root,
        this.ground.root,
        this.outline.root,
        this.pivot,
        ...this.lights,
        this.lights[1].target,
      )
      this.orbit = this.makeOrbit()
      this.area = new SceneAreaSelection(
        canvas,
        (points) => callbacks.areaChanged?.(points),
        (region, additive) => {
          if (!this.index) return
          if (this.componentSelection) {
            const node = this.index.scene.nodes.get(this.componentSelection.nodeId)
            const geometry =
              node?.kind === 'mesh' ? this.index.geometries.get(node.geometryId) : null
            const mesh = geometry ? sceneGeometryMesh(geometry) : null
            if (mesh)
              callbacks.selectComponents?.(
                this.componentPicker.region(
                  this.resource,
                  mesh,
                  this.componentSelection,
                  this.rig.camera,
                  region,
                  this.selectThrough,
                ),
                additive,
              )
            return
          }
          callbacks.selectMany?.(
            pickSceneRegion(
              this.index,
              this.resource,
              this.rig.camera,
              region,
              this.selectThrough,
              this.isolated ? this.covered(this.isolated) : undefined,
            ),
            additive,
          )
        },
        (active) => {
          if (this.orbit) this.orbit.enabled = !active && !this.contextLost
        },
      )
      if (callbacks.transform) {
        this.gizmo = new SceneTransformGizmo(
          canvas,
          this.rig.camera,
          callbacks.transform,
          (dragging) => {
            this.handleDragging = dragging
            if (this.orbit) this.orbit.enabled = !dragging && !this.contextLost
          },
          this.request,
        )
      }
      this.guideAnnotation = new SceneGuideAnnotation(canvas)
      this.pivotHandles = new SceneAxisHandles(
        canvas,
        () => this.rig.camera,
        'pivot',
        {
          begin: () => {
            const input = this.callbacks.guideInput?.()?.pivot,
              world = input && this.index?.scene.worldMatrices.get(input.nodeId)
            if (!input || !world || !input.begin(world)) return false
            this.pivotOwner = input
            return true
          },
          preview: (delta) => this.pivotOwner?.preview(delta) ?? false,
          end: (commit) => {
            const owner = this.pivotOwner
            this.pivotOwner = null
            owner?.end(commit)
          },
        },
        this.request,
        (dragging) => {
          if (this.orbit) this.orbit.enabled = !dragging && !this.contextLost
        },
      )
      this.loop = new DemandRenderLoop(canvas, this.renderer, this.rig, () => {
        const moving = this.orbit?.update() ?? false
        this.updatePivotHandles()
        this.gizmo?.draw()
        const guideInput = this.callbacks.guideInput?.()
        if (guideInput?.pivot?.snapVertex) {
          this.rig.camera.updateMatrixWorld(true)
          const visibility = new SceneOcclusionQuery(
            this.resource.root.children
              .filter((object) => object.visible)
              .filter((object) => object instanceof Mesh),
            this.rig.camera,
          )
          try {
            this.previewGuide.updateSnapVisibility((point) =>
              visibility.visible(new Vector3(...point)),
            )
          } finally {
            visibility.dispose()
          }
        }
        const cut = guideInput?.cut ?? guideInput?.knife
        const node = cut && this.index?.scene.nodes.get(cut.nodeId)
        const geometry = node?.kind === 'mesh' && this.index?.geometries.get(node.geometryId)
        if (cut && geometry) {
          const mesh = sceneGeometryMesh(geometry)
          this.rig.camera.updateMatrixWorld(true)
          this.previewGuide.updateCutVisibility(
            (point) =>
              this.cutPicker.visible(
                this.resource,
                mesh,
                cut.nodeId,
                this.rig.camera,
                new Vector3(...point),
              ),
            (segments) =>
              this.cutPicker.visibleSegments(
                this.resource,
                mesh,
                cut.nodeId,
                this.rig.camera,
                segments,
              ),
          )
        }
        this.guideAnnotation?.draw(this.rig.camera, this.previewGuide.ghostLabelPoints)
        this.paint?.draw()
        this.renderer.render(this.scene, this.rig.camera)
        return moving
      })
      if (callbacks.paint)
        this.paint = new ScenePaintInput(
          canvas,
          () => this.rig.camera,
          () => this.index,
          this.resource,
          callbacks.paint,
          () => this.document,
          this.request,
        )
      if (this.paint) this.scene.add(this.paint.guides.root)
      if (callbacks.skinPaint)
        this.skinPaint = new CapturedPaintInput(
          canvas,
          this.pickSkinPaint,
          {
            begin: (sample) => {
              const accepted = callbacks.skinPaint!.begin(sample)
              if (!accepted) this.clearBrushCursor()
              return accepted
            },
            move: (sample) => callbacks.skinPaint!.move(sample),
            end: (commit) => {
              this.clearBrushCursor()
              callbacks.skinPaint!.end(commit)
            },
          },
          (from, to) =>
            paintPointerPath(from, to, canvas.getBoundingClientRect(), this.skinPaintSpacing),
        )
      if (callbacks.transform)
        this.bodyMove = new SceneBodyMove(canvas, () => this.rig.camera, callbacks.transform)
      this.body = new CapturedPaintInput<BodySample>(
        canvas,
        (event) => {
          const pointer = { x: event.clientX, y: event.clientY }
          if (this.bodyMoving || this.bodySelection) return { ...pointer }
          const guide = this.callbacks.guideInput?.()
          if (guide?.cut || guide?.knife || guide?.pivot || guide?.rig) return null
          if (guide && !this.contextLost && this.paintMode !== 'look') {
            const rect = canvas.getBoundingClientRect()
            let point: [number, number, number] | undefined
            if (guide.corners) {
              let closest = 24
              for (const corner of guide.corners) {
                const screen = new Vector3(...corner).project(this.rig.camera)
                const distance = Math.hypot(
                  rect.left + ((screen.x + 1) * rect.width) / 2 - event.clientX,
                  rect.top + ((1 - screen.y) * rect.height) / 2 - event.clientY,
                )
                if (screen.z >= -1 && screen.z <= 1 && distance < closest) {
                  closest = distance
                  point = [...corner]
                }
              }
            } else if (guide.plane) {
              const ray = new Raycaster()
              ray.setFromCamera(
                new Vector2(
                  ((event.clientX - rect.left) / rect.width) * 2 - 1,
                  1 - ((event.clientY - rect.top) / rect.height) * 2,
                ),
                this.rig.camera,
              )
              const plane = new Plane().setFromNormalAndCoplanarPoint(
                new Vector3(...guide.plane.normal).normalize(),
                new Vector3(...guide.plane.origin),
              )
              if (Math.abs(ray.ray.direction.dot(plane.normal)) > 0.05) {
                const hit = ray.ray.intersectPlane(plane, new Vector3())
                if (hit) point = hit.toArray()
              }
            }
            return { ...pointer, guide: true, point }
          }
          if (this.componentSelection) {
            const selection = this.componentSelection
            const press = event as PointerEvent
            const pullPress = {
              touch: press.pointerType === 'touch',
              additive: !!(press.shiftKey || press.ctrlKey || press.metaKey),
            }
            if (
              this.contextLost ||
              !this.bodyMove ||
              (this.transformTool !== 'move' && this.transformTool !== 'select') ||
              this.paintMode === 'paint' ||
              this.paintMode === 'look' ||
              this.areaTool !== 'point' ||
              (selection.mode !== 'face' && selection.mode !== 'edge') ||
              !selection.ids.length
            )
              return null
            const node = this.index?.scene.nodes.get(selection.nodeId)
            const geometry =
              node?.kind === 'mesh' ? this.index?.geometries.get(node.geometryId) : null
            const mesh = geometry ? sceneGeometryMesh(geometry) : null
            const world = this.index?.scene.worldMatrices.get(selection.nodeId)
            if (!mesh || !world) return null
            const rect = canvas.getBoundingClientRect()
            if (selection.mode === 'face') {
              if (selection.ids.length !== 1) return null
              const hit = sceneSurfaceHit(canvas, this.rig.camera, this.resource, event)
              const instance = hit && this.resource.instanceFor(hit.object)
              const faceId =
                hit?.faceIndex == null ? null : this.resource.faceFor(hit.object, hit.faceIndex)
              if (
                !hit ||
                instance?.sourceNodeId !== selection.nodeId ||
                !faceId ||
                !selection.ids.includes(faceId)
              )
                return null
              const normal = transformDirection(world, meshFaceFrame(mesh, faceId).normal)
              return {
                ...pointer,
                ...pullPress,
                pull: { point: hit.point.toArray() as Vec3, axis: normal },
              }
            }
            const edgeId = this.componentPicker.pick(
              this.resource,
              mesh,
              selection,
              this.rig.camera,
              {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
                width: rect.width,
                height: rect.height,
                radius: 12,
              },
              this.selectThrough,
              false,
              new Set(selection.ids),
            )
            if (!edgeId || !selection.ids.includes(edgeId)) return null
            const ends = meshComponentEdges(mesh).get(edgeId)
            const point = ends ? meshVertexCenter(mesh, ends, world) : null
            return point ? { ...pointer, ...pullPress, pull: { point, axis: null } } : null
          }
          if (
            this.contextLost ||
            (this.pose && !this.animationEditing) ||
            this.paintMode === 'look' ||
            this.areaTool !== 'point' ||
            this.skinPaintEnabled
          )
            return null
          if (
            !this.callbacks.samplingInk?.() &&
            (this.transformTool !== 'move' || this.paintMode === 'paint')
          )
            return null
          const hit = sceneSurfaceHit(canvas, this.rig.camera, this.resource, event)
          const instance = hit && this.resource.instanceFor(hit.object)
          if (!hit || !instance) return null
          // Peça travada não é alvo de Mover (como em Escolher e Pintar): o toque segue o
          // caminho de sempre, que gira a câmera ou escolhe a peça de trás. Ler a cor dela vale.
          if (instance.locked && !this.callbacks.samplingInk?.()) return null
          return {
            ...pointer,
            hit,
            id: instance.sourceNodeId,
            locked: instance.locked,
            additive: !!(
              (event as PointerEvent).shiftKey ||
              (event as PointerEvent).ctrlKey ||
              (event as PointerEvent).metaKey
            ),
          }
        },
        {
          begin: (sample) => {
            if (sample.guide) {
              if (sample.point) this.callbacks.guidePoint?.(sample.point)
              return false
            }
            if (sample.pull) {
              this.bodyMoving =
                this.bodyMove?.begin(
                  new Vector3(...sample.pull.point),
                  sample.x,
                  sample.y,
                  this.rig.view,
                  null,
                  sample.pull.axis,
                  'pull',
                ) ?? false
              this.pulling = this.bodyMoving
              this.pullClick = this.pulling ? sample : null
              return this.bodyMoving
            }
            if (!sample.id || !sample.hit) return false
            const { hit, id } = sample
            if (this.callbacks.samplingInk?.() && this.document && this.index) {
              const materialId =
                hit.faceIndex == null ? null : this.resource.materialFor(hit.object, hit.faceIndex)
              const node = this.index.scene.nodes.get(id)
              const material = this.index.materials.get(
                materialId ?? (node?.kind === 'mesh' ? node.materialId : ''),
              )
              if (material) {
                const image = material.colorImageId
                  ? this.index.images.get(material.colorImageId)
                  : undefined
                const point =
                  image && hit.uv
                    ? sceneFlipbookTexel(
                        image,
                        [hit.uv.x, hit.uv.y],
                        this.resource.frameForImage(image.id) ?? 0,
                      )
                    : null
                this.callbacks.sampleInk?.(
                  sampleSceneInk(
                    this.document,
                    material,
                    point ? image : undefined,
                    point ?? [0, 0],
                  ),
                )
              }
              return false
            }
            if (sample.additive || !this.covered(this.selected).has(id)) {
              const faceId =
                hit.faceIndex == null ? null : this.resource.faceFor(hit.object, hit.faceIndex)
              this.bodySelection = {
                id,
                additive: !!sample.additive,
                ...(faceId ? { faceId } : {}),
              }
              return true
            }
            if (sample.locked || this.paintMode === 'paint' || this.transformTool !== 'move')
              return false
            this.bodyMoving =
              this.bodyMove?.begin(
                hit.point,
                sample.x,
                sample.y,
                this.rig.view,
                this.measurementOrigin,
              ) ?? false
            return this.bodyMoving
          },
          move: (sample) => {
            if (sample && this.bodyMoving)
              this.bodyMove?.move(sample.x, sample.y, this.movementStep)
          },
          end: (commit) => {
            const selection = this.bodySelection
            const pullClick = this.pullClick
            this.bodySelection = null
            this.pullClick = null
            this.bodyMoving = false
            this.pulling = false
            const travelled = this.bodyMove?.end(commit) ?? false
            if (commit && pullClick && !travelled)
              this.selectComponentAt(
                pullClick.x,
                pullClick.y,
                !!pullClick.touch,
                !!pullClick.additive,
              )
            if (commit && selection)
              this.callbacks.select(
                selection.id,
                selection.additive,
                selection.faceId ? { faceId: selection.faceId } : undefined,
              )
          },
        },
        undefined,
        { claimMisses: false },
      )
      this.body.setEnabled(true)
      canvas.addEventListener('pointerdown', this.onDown)
      canvas.addEventListener('pointermove', this.onMove)
      canvas.addEventListener('pointermove', this.onSkinPaintHover)
      canvas.addEventListener('pointerleave', this.clearBrushCursor)
      canvas.addEventListener('pointerleave', this.clearCutHover)
      canvas.addEventListener('wheel', this.clearBrushCursor, { passive: true })
      canvas.addEventListener('pointerup', this.onUp)
      canvas.addEventListener('pointercancel', this.onCancel)
      canvas.addEventListener('lostpointercapture', this.onCancel)
      canvas.addEventListener('webglcontextlost', this.onLost)
      canvas.addEventListener('webglcontextrestored', this.onRestored)
      canvas.ownerDocument.addEventListener('visibilitychange', this.onVisibility)
      canvas.ownerDocument.defaultView?.addEventListener('blur', this.onBlur)
    } catch (error) {
      this.dispose()
      throw error
    }
  }

  setDocument(document: MoldaSceneDocument) {
    if (this.disposed) return []
    // Só PEÇAS novas pedem enquadramento: o conjunto temporário da prévia de um movimento
    // pronto ("Modelo inteiro") é um grupo novo a cada prévia e fazia a câmera pular.
    const added =
      this.document && document.id === this.document.id
        ? document.nodes
            .filter((node) => node.kind === 'mesh' && !this.index?.scene.nodes.has(node.id))
            .map((node) => node.id)
        : []
    const index = indexSceneDocument(document)
    const boundsCache = prepareSceneBounds(index)
    const supports = this.supportGuides ? this.prepareSupports(index) : undefined
    const sameDocument = !this.document || this.document.id === document.id
    const weights = sameDocument ? this.prepareWeightPoints(index) : null
    const issues = this.resource.update(document)
    if (this.document && !sameSceneContent(this.document, document)) {
      this.skinPaint?.cancel()
      this.clearBrushCursor()
      this.weightPoints.preview(null)
    }
    const first = this.index === null
    if (!sameDocument) {
      this.componentSelection = null
      this.weightTarget = null
      this.poseMode = false
    }
    this.index = index
    this.baseIndex = index
    this.boundsCache = boundsCache
    this.document = document
    this.pose = null
    this.updateEditingEnabled()
    this.updateVisibility(supports, weights)
    if (first) this.frame()
    else if (added.length) this.ensureVisible(added)
    this.request()
    return issues
  }

  setSelection(ids: readonly string[]): void {
    if (this.disposed) return
    if (ids.length !== this.selected.length || ids.some((id, i) => id !== this.selected[i]))
      this.cancelGesture()
    this.selected = [...ids]
    this.updateVisibility()
  }
  setIsolation(ids: readonly string[] | null): void {
    if (this.disposed) return
    if (ids?.length !== this.isolated?.length || ids?.some((id, i) => id !== this.isolated?.[i]))
      this.cancelGesture()
    this.isolated = ids ? [...ids] : null
    this.updateVisibility()
  }

  private covered(ids: readonly string[]) {
    return this.index
      ? selectSceneSubtrees(
          this.index.scene,
          ids.filter((id) => this.index?.scene.nodes.has(id)),
        ).covered
      : new Set<string>()
  }

  private bounds(selectionOnly: boolean) {
    if (!this.index) return null
    let ids = selectionOnly ? this.covered(this.selected) : undefined
    if (this.isolated) {
      const isolated = this.covered(this.isolated)
      // Associated bones stay manipulable without making unrelated isolated-out meshes visible.
      for (const support of this.displayedSupports) isolated.add(support.id)
      ids = ids ? new Set([...ids].filter((id) => isolated.has(id))) : isolated
    }
    return sceneBounds(
      this.index,
      {
        nodeIds: ids,
        includeHidden: false,
        includeLocators: true,
        includeGroupOrigins: this.displayedSupports.length > 0,
        nodeLocalBounds: this.resource.skinLocalBounds(this.document),
      },
      this.boundsCache ?? undefined,
    )
  }

  private prepareSupports(index: ReturnType<typeof indexSceneDocument>) {
    const isolated = this.isolated
      ? selectSceneSubtrees(
          index.scene,
          this.isolated.filter((id) => index.scene.nodes.has(id)),
        ).covered
      : null
    return prepareSceneSupports(index, new Set(this.selected), isolated)
  }

  setSupportGuides(enabled: boolean): void {
    if (this.disposed || enabled === this.supportGuides) return
    const prepared = enabled && this.index ? this.prepareSupports(this.index) : undefined
    this.cancelGesture()
    this.supportGuides = enabled
    this.updateVisibility(prepared)
  }

  private prepareWeightPoints(
    index: ReturnType<typeof indexSceneDocument>,
    target = this.weightTarget,
  ) {
    if (!target || this.componentSelection?.nodeId !== target.nodeId || this.painting || this.pose)
      return null
    const flags = evaluateSceneNodeFlags(index.scene).get(target.nodeId)
    return flags && !flags.hidden && !flags.locked ? this.weightPoints.prepare(index, target) : null
  }

  setSkinWeightTarget(target: SceneSkinWeightTarget | null): void {
    if (
      this.disposed ||
      (target?.nodeId === this.weightTarget?.nodeId &&
        target?.jointId === this.weightTarget?.jointId)
    )
      return
    const prepared = this.index ? this.prepareWeightPoints(this.index, target) : null
    this.cancelGesture()
    this.weightTarget = prepared ? { ...prepared.target } : null
    this.updateVisibility(undefined, prepared)
  }

  setSkinPaintEnabled(enabled: boolean, radius?: number): void {
    if (this.disposed) return
    const nextRadius = enabled ? (radius ?? null) : null
    requireScene(
      nextRadius === null || (Number.isFinite(nextRadius) && nextRadius > 0),
      'skinPaint.radius',
      'Use um alcance maior que zero.',
    )
    if (enabled === this.skinPaintEnabled && nextRadius === this.skinPaintRadius) return
    this.cancelGesture()
    this.skinPaintEnabled = enabled && !!this.weightTarget && !!this.componentSelection
    this.skinPaintRadius = nextRadius
    this.updateEditingEnabled()
  }

  private readonly clearBrushCursor = () => {
    this.skinPaintSpacing = 1
    if (this.brushCursor.clear()) this.request()
  }

  private readonly pickSkinPaint = (event: Pick<PointerEvent, 'clientX' | 'clientY'>) => {
    const hit =
      !this.disposed &&
      !this.contextLost &&
      !this.canvas.ownerDocument.hidden &&
      !this.pose &&
      this.skinPaint &&
      this.skinPaintEnabled &&
      !this.painting &&
      this.index &&
      this.weightTarget
        ? pickSceneSkinPaint(
            this.canvas,
            this.rig.camera,
            this.resource,
            this.index,
            this.weightTarget,
            event,
          )
        : null
    this.skinPaintSpacing = hit?.surface
      ? sceneSkinPaintSpacing(
          this.rig.camera,
          hit.surface.point,
          this.skinPaintRadius,
          this.canvas.getBoundingClientRect(),
        )
      : 1
    if (this.brushCursor.show(hit?.surface ?? null, this.skinPaintRadius)) this.request()
    return hit?.sample ?? null
  }

  private readonly onSkinPaintHover = (event: PointerEvent) => {
    // Captured movement has already been consumed and sampled exactly once by paint input.
    if (event.buttons || this.pointers.size || event.pointerType === 'touch') {
      this.clearBrushCursor()
      return
    }
    this.pickSkinPaint(event)
  }

  /** Pintando, ou olhando na aba Pintar: a caixa de ferramentas de modelagem sai do palco. */
  private get painting() {
    return (this.paintMode ?? (this.paintTarget ? 'paint' : 'off')) !== 'off'
  }

  /**
   * ⚠️ Na aba Pintar a órbita não tem amortecimento: cada quadro do amortecimento avisa que a
   * câmera mudou, e isso interrompe a pintura. O traço começado logo depois de girar seria
   * cancelado pela câmera que ainda estava parando.
   */
  private makeOrbit() {
    const orbit = createViewportOrbit(
      this.canvas,
      this.rig,
      this.reducedMotion,
      this.onCameraChange,
    )
    orbit.enableDamping = !this.reducedMotion && this.paintMode !== 'paint'
    return orbit
  }

  private readonly onCameraChange = () => {
    this.paint?.interrupt()
    this.skinPaint?.interrupt()
    this.clearBrushCursor()
    this.request()
  }

  setSkinPaintPreview(preview: SceneSkinPaintPreview | null): void {
    if (this.disposed) return
    if (!preview) this.clearBrushCursor()
    if (
      preview &&
      (!this.skinPaintEnabled ||
        this.contextLost ||
        this.pose ||
        !this.document ||
        !sameSceneContent(preview.source, this.document))
    )
      return
    if (this.weightPoints.preview(preview)) this.request()
  }

  private updateVisibility(
    preparedSupports?: SceneSupportPoint[],
    preparedWeights?: ReturnType<SceneSkinWeightOverlay['prepare']>,
  ): void {
    this.cutPicker.dispose()
    const flags = this.index ? evaluateSceneNodeFlags(this.index.scene) : null
    if (this.componentSelection) {
      const node = this.index?.scene.nodes.get(this.componentSelection.nodeId)
      const state = node ? flags?.get(node.id) : null
      const geometry = node?.kind === 'mesh' ? this.index?.geometries.get(node.geometryId) : null
      if (
        this.pose ||
        !state ||
        state.hidden ||
        state.locked ||
        !geometry ||
        this.selected.length !== 1 ||
        this.selected[0] !== node?.id
      )
        this.componentSelection = null
    }
    this.resource.setFormBase(this.componentSelection?.nodeId ?? null)
    if (this.supportGuides && this.index && !this.componentSelection && !this.painting) {
      this.displayedSupports = preparedSupports ?? this.prepareSupports(this.index)
      this.supports.update(this.displayedSupports)
    } else {
      this.displayedSupports = []
      this.supports.hide()
    }
    this.updatePoseGuide(flags)
    const isolated = this.isolated ? this.covered(this.isolated) : null
    for (const mesh of this.resource.root.children) {
      const instance = this.resource.instanceFor(mesh)
      mesh.visible = Boolean(
        instance && !instance.hidden && (!isolated || isolated.has(instance.sourceNodeId)),
      )
    }
    const bounds = this.bounds(true)
    this.ground.update(this.bounds(false))
    this.outline.update(
      this.resource,
      this.componentSelection?.mode === 'edge' ? new Set() : this.covered(this.selected),
      this.pose,
    )
    const world =
      this.selected.length === 1
        ? this.index?.scene.worldMatrices.get(this.selected[0] ?? '')
        : undefined
    this.pivot.visible = Boolean(world && bounds)
    const selectedNode =
      this.selected.length === 1 ? this.index?.scene.nodes.get(this.selected[0]!) : null
    const localBounds =
      selectedNode && this.document ? sceneLocalBounds(this.document, selectedNode.id) : null
    const authoringPivot = selectedNode
      ? sceneNodePivot(selectedNode)
      : ([0, 0, 0] as [number, number, number])
    if (world) {
      this.pivot.matrix.fromArray(
        selectedNode?.pivotAxis ? scenePivotAxisFrame(world, selectedNode.pivotAxis) : world,
      )
      this.pivot.matrix.setPosition(new Vector3(...transformPoint(world, authoringPivot)))
    }
    const faceNode = this.componentSelection
      ? this.index?.scene.nodes.get(this.componentSelection.nodeId)
      : null
    const faceGeometry =
      faceNode?.kind === 'mesh' ? this.index?.geometries.get(faceNode.geometryId) : null
    const faceMesh = faceGeometry ? sceneGeometryMesh(faceGeometry) : null
    if (this.componentSelection && faceMesh) {
      // Geometry updates can arrive before the editor's updated component selection.
      // Keep the editing mode, but remove deleted targets before any overlay or measurement.
      const alive = new Set(meshComponentIds(faceMesh, this.componentSelection.mode))
      const ids = this.componentSelection.ids.filter((id) => alive.has(id))
      if (ids.length !== this.componentSelection.ids.length)
        this.componentSelection = { ...this.componentSelection, ids }
    }
    this.faces.update(
      this.resource,
      faceMesh?.kind === 'mesh' ? faceMesh : null,
      this.componentSelection,
    )
    if (!this.componentSelection) this.weightTarget = null
    if (!this.weightTarget) this.skinPaintEnabled = false
    this.weightPoints.show(
      this.componentSelection && !this.painting && this.index
        ? preparedWeights === undefined
          ? this.prepareWeightPoints(this.index)
          : preparedWeights
        : null,
      this.resource,
      this.selectThrough,
    )
    this.area?.setTool(this.areaTool)
    const editable =
      this.selected.length > 0 &&
      ![...this.covered(this.selected)].some((id) => flags?.get(id)?.locked !== false)
    const faceCenter =
      this.componentSelection && faceMesh?.kind === 'mesh' && world
        ? meshVertexCenter(
            faceMesh,
            meshComponentVertices(faceMesh, this.componentSelection),
            world,
          )
        : null
    let extrusionFrame = null
    if (
      this.faceExtrusion &&
      this.componentSelection?.mode === 'face' &&
      this.componentSelection.ids.length === 1 &&
      faceMesh?.kind === 'mesh' &&
      selectedNode?.id === this.componentSelection.nodeId &&
      world
    ) {
      try {
        // Puxar desloca a malha pela normal LOCAL da face. A alça segue esse mesmo vetor
        // depois da transformação da peça, inclusive com escala não uniforme.
        const localNormal = meshFaceFrame(faceMesh, this.componentSelection.ids[0]!).normal
        const travel = transformDirection(world, localNormal)
        const magnitude = Math.hypot(...travel)
        if (Number.isFinite(magnitude) && magnitude > 1e-12) {
          const up = normalize(travel)
          const reference: Vec3 = Math.abs(up[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]
          const right = normalize(cross(up, reference))
          const forward = cross(right, up)
          extrusionFrame = identityMatrix()
          for (const axis of [0, 1, 2] as const) {
            extrusionFrame[axis] = right[axis]
            extrusionFrame[4 + axis] = up[axis]
            extrusionFrame[8 + axis] = forward[axis]
          }
        }
      } catch {
        // A seleção pode mudar antes da geometria do quadro seguinte; usa os eixos comuns.
      }
    }
    let dimensions: Vec3 | null = null
    this.measurementOrigin = null
    if (selectedNode && localBounds && world) {
      let size = localBounds.size
      if (this.componentSelection && faceMesh) {
        const points = meshComponentVertices(faceMesh, this.componentSelection).map(
          (id) => faceMesh.vertices[id]!,
        )
        if (points.length) {
          const min: Vec3 = [Infinity, Infinity, Infinity]
          const max: Vec3 = [-Infinity, -Infinity, -Infinity]
          for (const point of points)
            for (const axis of [0, 1, 2] as const) {
              min[axis] = Math.min(min[axis], point[axis])
              max[axis] = Math.max(max[axis], point[axis])
            }
          size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]]
        }
      }
      const parentWorld = selectedNode.parentId
        ? this.index?.scene.worldMatrices.get(selectedNode.parentId)
        : null
      const parentInverse = parentWorld ? affineInverse(parentWorld) : null
      requireScene(
        !parentWorld || parentInverse,
        'measurement',
        'A peça precisa ter tamanho nos três eixos.',
      )
      const local = parentInverse ? affineMultiply(parentInverse, world) : world
      dimensions = size.map(
        (length, axis) =>
          length * Math.hypot(local[axis * 4]!, local[axis * 4 + 1]!, local[axis * 4 + 2]!),
      ) as Vec3
      const { origin } = sceneMeasurementReference(
        local,
        selectedNode.transform,
        authoringPivot,
        localBounds,
      )
      this.measurementOrigin = parentWorld ? transformPoint(parentWorld, origin) : origin
    } else if (bounds)
      dimensions = [0, 1, 2].map((axis) => bounds.max[axis]! - bounds.min[axis]!) as Vec3
    if (!this.measurementOrigin && bounds) this.measurementOrigin = [...bounds.min]
    const frameParent = selectedNode?.parentId
      ? this.index?.scene.worldMatrices.get(selectedNode.parentId)
      : undefined
    // Relative animation is authored after the entire rest transform, including its scale.
    // Remove only the animated scale when forming local handles; removing the rest scale
    // would conjugate a valid local rotation into shear in the animation's coordinates.
    const frameCoordinates =
      selectedNode &&
      this.animationEditing &&
      this.pose &&
      this.index?.animations.get(this.pose.clipId)?.space === 'local-delta'
        ? affineMultiply(frameParent ?? identityMatrix(), composeTransform(selectedNode.transform))
        : frameParent
    this.gizmo?.setTarget(
      this.pose?.twoBoneGuide && this.animationEditing
        ? this.poseDestination()
        : editable && bounds
          ? this.componentSelection
            ? faceCenter
            : world
              ? transformPoint(
                  world,
                  this.transformTool === 'move' && localBounds
                    ? [localBounds.center[0], localBounds.max[1], localBounds.center[2]]
                    : authoringPivot,
                )
              : [
                  bounds.min[0] / 2 + bounds.max[0] / 2,
                  this.transformTool === 'move'
                    ? bounds.max[1]
                    : bounds.min[1] / 2 + bounds.max[1] / 2,
                  bounds.min[2] / 2 + bounds.max[2] / 2,
                ]
          : null,
      extrusionFrame ??
        (world
          ? this.transformSpace === 'pivot' && selectedNode?.pivotAxis
            ? scenePivotAxisFrame(world, selectedNode.pivotAxis)
            : sceneTransformFrame(world, frameCoordinates)
          : undefined),
      dimensions,
      this.componentSelection ? null : this.measurementOrigin,
    )
    this.updateEditingEnabled()
    this.request()
  }

  setView(view: CameraView): void {
    if (this.disposed) return
    this.cancelGesture()
    this.orbit?.dispose()
    this.rig.setView(view, this.bounds(false))
    this.gizmo?.setCamera(this.rig.camera)
    this.orbit = this.makeOrbit()
    this.orbit.enabled = !this.contextLost
    this.request()
  }

  /**
   * Foto da criação GUARDADA, não da sessão: grade, contorno, pivô, alças e apoios
   * ficam fora do quadro. Enquanto o isolamento esconde peças, a foto anterior continua
   * valendo, em vez de gravar um retrato pela metade da criação.
   */
  renderThumb(): string | null {
    return this.photograph()
  }

  captureImage(size: number, angle: number): string | null {
    return this.photograph({ size, angle })
  }

  private photograph(capture?: { size: number; angle: number }): string | null {
    if (this.disposed || this.contextLost || this.isolated || this.pose || !this.thumbnail)
      return null
    if (typeof document === 'undefined' || !this.index) return null
    const bounds = sceneBounds(
      this.index,
      { includeHidden: false, nodeLocalBounds: this.resource.skinLocalBounds(this.document) },
      this.boundsCache ?? undefined,
    )
    if (!bounds) return null
    return this.thumbnail.render(
      this.scene,
      bounds,
      [
        this.ground.root,
        this.outline.root,
        this.pivot,
        this.faces.root,
        this.supports.root,
        this.poseGuide.root,
        this.weightPoints.root,
        this.brushCursor.root,
        this.previewGuide.root,
        ...(this.paint ? [this.paint.guides.root] : []),
        ...this.resource.backSides(),
      ],
      capture,
    )
  }

  frame(selectionOnly = false): void {
    if (this.disposed) return
    this.cancelGesture()
    this.rig.frame(this.bounds(selectionOnly) ?? this.bounds(false))
    this.orbit?.update()
    this.request()
  }

  setPreviewGuide(guide: ScenePreviewGuideState | null): void {
    if (this.disposed) return
    this.canvas.classList.toggle('mld-cut-canvas', !!guide?.cut)
    this.previewGuide.update(guide)
    this.guideAnnotation?.update(guide)
    this.request()
  }
  private updatePivotHandles(input = this.callbacks.guideInput?.()?.pivot) {
    const node = input && this.index?.scene.nodes.get(input.nodeId),
      world = input && this.index?.scene.worldMatrices.get(input.nodeId)
    let editable =
      !!node &&
      !!world &&
      !this.contextLost &&
      !this.painting &&
      (!this.pose || this.animationEditing)
    let current = node
    while (current) {
      if (current.locked || current.hidden) editable = false
      current = current.parentId ? this.index?.scene.nodes.get(current.parentId) : undefined
    }
    const pivotFrame = node?.pivotAxis && world ? scenePivotAxisFrame(world, node.pivotAxis) : null
    const basis = pivotFrame ?? world
    this.pivotHandles?.setTarget(
      node && world ? transformPoint(world, sceneNodePivot(node)) : null,
      basis
        ? [
            [basis[0], basis[1], basis[2]],
            [basis[4], basis[5], basis[6]],
            [basis[8], basis[9], basis[10]],
          ]
        : undefined,
    )
    this.pivotHandles?.setEnabled(editable && !input?.snapVertex)
    this.pivotHandles?.setVerticalVisible(input?.vertical === true)
    this.pivotHandles?.draw()
  }

  private guideInputKey = ''
  refreshGuideInput(input: SceneGuideInput | null): void {
    const key = JSON.stringify([
      input?.pivot?.nodeId,
      input?.pivot?.vertical,
      input?.pivot?.snapVertex,
      input?.rig?.nodeId,
      input?.rig?.enabled,
      input?.rig?.plane,
      input?.cut?.nodeId,
      input?.cut?.midpoint,
      input?.knife?.nodeId,
      input?.knife?.midpoint,
      input?.knife?.edgesOnly,
    ])
    if (this.disposed || key === this.guideInputKey) return
    this.guideInputKey = key
    // React may deliver options before the staged document and its pose. Draw only
    // in the shared frame, after that revision has reached the viewport.
    this.request()
  }

  ensureVisible(ids: readonly string[]): void {
    if (!this.index || !ids.length) return
    const bounds = sceneBounds(
      this.index,
      { nodeIds: this.covered(ids), includeHidden: false },
      this.boundsCache ?? undefined,
    )
    if (!bounds) return
    this.rig.camera.updateWorldMatrix(true, false)
    for (const x of [bounds.min[0], bounds.max[0]])
      for (const y of [bounds.min[1], bounds.max[1]])
        for (const z of [bounds.min[2], bounds.max[2]]) {
          const point = new Vector3(x, y, z).project(this.rig.camera)
          if (Math.abs(point.x) > 0.9 || Math.abs(point.y) > 0.9 || Math.abs(point.z) > 1) {
            this.frame()
            return
          }
        }
  }

  zoom(factor: number): void {
    if (this.disposed || this.contextLost || !Number.isFinite(factor) || factor <= 0) return
    this.cancelGesture()
    const camera = this.rig.camera
    camera.zoom = Math.max(0.1, Math.min(30, camera.zoom * factor))
    camera.updateProjectionMatrix()
    this.orbit?.update()
    this.request()
  }

  setGridVisible(visible: boolean): void {
    if (this.disposed || visible === this.ground.grid.visible) return
    this.ground.grid.visible = visible
    this.request()
  }

  setXray(on: boolean): void {
    if (this.disposed) return
    this.resource.setXray(on)
    this.request()
  }

  setMovementStep(step: number | null): void {
    if (step === this.movementStep || this.disposed) return
    this.bodyMove?.end(false)
    this.movementStep = step
    if (!this.disposed) this.gizmo?.setMovementStep(step)
  }

  private readonly request = () => {
    if (!this.disposed) this.loop?.request()
  }
  setTransformSpace(space: 'world' | 'local' | 'pivot'): void {
    if (this.disposed) return
    this.transformSpace = space
    this.cancelGesture()
    this.gizmo?.setSpace(this.faceExtrusion || space !== 'world' ? 'local' : 'world')
    this.updateVisibility()
  }
  setFaceExtrusion(active: boolean): void {
    if (this.disposed || this.faceExtrusion === active) return
    if (!this.pulling) this.cancelGesture()
    this.faceExtrusion = active
    this.gizmo?.setSpace(active || this.transformSpace !== 'world' ? 'local' : 'world')
    this.updateVisibility()
  }
  setDirectPull(active: boolean): void {
    if (this.disposed || this.directPull === active) return
    if (!this.pulling) this.body?.cancel()
    this.directPull = active
    this.gizmo?.setPlanePointerEnabled(!active)
  }
  setPullTool(label: string | null): void {
    if (this.disposed) return
    this.gizmo?.setPulling(label)
  }
  setTransformTool(tool: SceneTransformTool): void {
    if (this.disposed) return
    if (tool !== 'select') this.setSkinPaintEnabled(false)
    if (this.transformTool !== tool) this.body?.cancel()
    this.transformTool = tool
    this.gizmo?.setTool(tool)
    this.updateVisibility()
  }
  setAreaTool(tool: SceneAreaTool, through: boolean): void {
    if (this.disposed) return
    if (this.selectThrough !== through) this.area?.cancel()
    this.selectThrough = through
    this.areaTool = tool
    if (tool !== 'point') this.setSkinPaintEnabled(false)
    this.faces.setThrough(through)
    if (this.index)
      this.weightPoints.show(this.prepareWeightPoints(this.index), this.resource, through)
    this.area?.setTool(tool)
    this.request()
  }
  setComponentSelection(selection: SceneComponentSelection | null): void {
    if (this.disposed) return
    // Puxar troca a linha de origem pela nova linha assim que a distância sai de zero.
    // Essa troca faz parte da prévia e não deve soltar o arraste ainda capturado.
    const continuingPull =
      ((this.pulling && this.bodyMoving) || (this.directPull && this.handleDragging)) &&
      selection?.nodeId === this.componentSelection?.nodeId &&
      selection?.mode === this.componentSelection?.mode
    if (
      !continuingPull &&
      (selection?.nodeId !== this.componentSelection?.nodeId ||
        selection?.mode !== this.componentSelection?.mode ||
        selection?.ids.length !== this.componentSelection?.ids.length ||
        selection?.ids.some((id, i) => id !== this.componentSelection?.ids[i]))
    )
      this.cancelGesture()
    this.componentSelection = selection ? { ...selection, ids: [...selection.ids] } : null
    this.updateVisibility()
  }
  setPaintTarget(target: ScenePaintTarget | null): void {
    if (this.disposed || target === this.paintTarget) return
    this.cancelGesture()
    this.paintTarget = target
    this.updateEditingEnabled()
    this.paint?.setTarget(target)
    this.updateVisibility()
  }
  setPaintScope(scope: import('./sceneViewportTypes').ScenePaintSurfaceScope | null): void {
    if (!this.disposed) this.paint?.setScope(scope)
  }
  setPaintGuides(settings: import('./ScenePaintGuides').ScenePaintGuideSettings | null): void {
    if (!this.disposed) this.paint?.setGuideSettings(settings)
  }
  /**
   * A aba Pintar. Com o modo dito, o toque que não acerta a peça escolhida fica com a câmera, e
   * o toque em outra peça a escolhe (com a face). Sem ele, o palco deduz a pintura do alvo.
   */
  setPaintMode(mode: ScenePaintMode): void {
    if (this.disposed || mode === this.paintMode) return
    this.cancelGesture()
    this.paintMode = mode
    this.paint?.setClaimMisses(false)
    if (this.orbit) this.orbit.enableDamping = !this.reducedMotion && mode !== 'paint'
    this.updateEditingEnabled()
    this.updateVisibility()
  }
  setPaintMirror(enabled: boolean): void {
    if (this.disposed) return
    this.paint?.setMirror(enabled)
  }
  private updateEditingEnabled() {
    const enabled = !this.contextLost && !this.pose
    this.body?.setEnabled(!this.contextLost && (!this.pose || this.animationEditing))
    this.gizmo?.setEnabled(
      !this.contextLost &&
        (!this.pose || this.animationEditing) &&
        !this.painting &&
        !this.skinPaintEnabled,
    )
    this.area?.setEnabled(enabled && !this.painting && !this.skinPaintEnabled)
    this.paint?.setEnabled(enabled && this.paintMode !== 'look' && this.paintMode !== 'off')
    this.skinPaint?.setEnabled(enabled && !this.painting && this.skinPaintEnabled)
    if (!enabled || this.painting || !this.skinPaintEnabled) this.clearBrushCursor()
  }
  setAnimationEditing(enabled: boolean): void {
    if (this.disposed || enabled === this.animationEditing) return
    this.animationEditing = enabled
    this.updateVisibility()
  }
  private updatePoseGuide(flags?: ReturnType<typeof evaluateSceneNodeFlags> | null) {
    const guide = this.pose?.twoBoneGuide
    if (
      !this.animationEditing ||
      !this.pose ||
      !guide ||
      !this.index ||
      this.contextLost ||
      this.painting ||
      this.componentSelection ||
      this.selected.length !== 1 ||
      this.selected[0] !== guide.chain[2]
    )
      return this.poseGuide.hide()
    const states = flags ?? evaluateSceneNodeFlags(this.index.scene)
    const changed = this.poseGuide.update(
      prepareSceneTwoBoneGuide(
        this.pose,
        (id) =>
          states.get(id)?.hidden === false && this.index?.scene.nodes.get(id)?.kind !== 'mesh',
      ),
    )
    this.gizmo?.setTarget(this.poseDestination())
    return changed
  }
  private poseDestination() {
    const target = this.pose?.twoBoneGuide?.target
    return this.poseGuide.root.visible &&
      target?.every((value) => Number.isFinite(Math.fround(value)))
      ? ([...target] as [number, number, number])
      : null
  }
  setPose(pose: SceneAnimationPose | null): void {
    if (
      this.disposed ||
      this.contextLost ||
      !this.baseIndex ||
      this.pose === pose ||
      (pose && pose.source !== this.document)
    )
      return
    const next = pose
      ? { ...this.baseIndex, scene: { ...this.baseIndex.scene, worldMatrices: pose.worldMatrices } }
      : this.baseIndex
    // Pivots/locators are helpers, not mesh instances, but also require drawable transforms.
    for (const [id, matrix] of next.scene.worldMatrices)
      requireScene(
        matrix.every((value) => Number.isFinite(Math.fround(value))),
        `nodes.${id}`,
        'A pose excede a precisão de desenho.',
      )
    const worldChanged = [...next.scene.worldMatrices].some(([id, matrix]) => {
      const previous = this.index?.scene.worldMatrices.get(id)
      return !previous || matrix.some((value, i) => value !== previous[i])
    })
    const supports = this.supportGuides ? this.prepareSupports(next) : undefined
    const changed = this.resource.setPose(pose)
    const modeChanged = Boolean(pose) !== this.poseMode
    const clipChanged = pose?.clipId !== this.pose?.clipId
    const guideModeChanged = Boolean(pose?.twoBoneGuide) !== Boolean(this.pose?.twoBoneGuide)
    this.index = next
    this.pose = pose
    this.poseMode = Boolean(pose)
    if (modeChanged) {
      this.cancelGesture()
      if (pose) this.componentSelection = null
      this.updateEditingEnabled()
    }
    if (changed || worldChanged || modeChanged || clipChanged || guideModeChanged)
      this.updateVisibility(supports)
    else if (this.updatePoseGuide()) this.request()
  }
  setImageFrame(imageId: string, frame: number | null): void {
    if (this.disposed || this.contextLost) return
    if (frame === this.resource.frameForImage(imageId)) return
    this.paint?.cancel()
    if (this.resource.setImageFrame(imageId, frame)) {
      this.updateVisibility()
      this.request()
    }
  }
  cancelGesture(): void {
    this.pivotHandles?.cancel()
    this.body?.cancel()
    if (this.disposed) return
    this.gizmo?.cancel()
    this.area?.cancel()
    this.paint?.cancel()
    this.skinPaint?.cancel()
    this.clearBrushCursor()
    if (this.weightPoints.preview(null)) this.request()
    this.pointer = null
  }
  private selectComponentAt(clientX: number, clientY: number, touch: boolean, additive: boolean) {
    const selection = this.componentSelection
    if (!selection) return
    const rect = this.canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    this.rig.camera.updateWorldMatrix(true, false)
    const ray = new Raycaster()
    ray.setFromCamera(
      new Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        (-(clientY - rect.top) / rect.height) * 2 + 1,
      ),
      this.rig.camera,
    )
    const node = this.index?.scene.nodes.get(selection.nodeId)
    const geometry = node?.kind === 'mesh' ? this.index?.geometries.get(node.geometryId) : null
    const mesh = geometry ? sceneGeometryMesh(geometry) : null
    this.callbacks.selectComponent?.(
      selection.mode === 'face'
        ? this.faces.pick(ray, this.resource, selection.nodeId, this.selectThrough)
        : mesh?.kind === 'mesh'
          ? this.componentPicker.pick(
              this.resource,
              mesh,
              selection,
              this.rig.camera,
              {
                x: clientX - rect.left,
                y: clientY - rect.top,
                width: rect.width,
                height: rect.height,
                radius: touch ? 14 : 8,
              },
              this.selectThrough,
            )
          : null,
      additive,
    )
  }
  private readonly onDown = (event: PointerEvent) => {
    if (this.contextLost || this.disposed) return
    this.clearBrushCursor()
    this.pointers.add(event.pointerId)
    if (event.button !== 0 || this.pointers.size !== 1) {
      this.pointer = null
      return
    }
    this.pointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      onGizmo: false,
    }
  }
  private cutPoint(
    event: { clientX: number; clientY: number },
    cut: { nodeId: string; midpoint: boolean },
  ) {
    const node = this.index?.scene.nodes.get(cut.nodeId)
    const geometry = node?.kind === 'mesh' ? this.index?.geometries.get(node.geometryId) : null
    if (!geometry) return null
    const rect = this.canvas.getBoundingClientRect()
    return this.cutPicker.pick(
      this.resource,
      sceneGeometryMesh(geometry),
      cut.nodeId,
      this.rig.camera,
      {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        width: rect.width,
        height: rect.height,
      },
      cut.midpoint,
    )
  }
  private knifePoint(
    event: { clientX: number; clientY: number; shiftKey?: boolean },
    knife: NonNullable<SceneGuideInput['knife']>,
  ) {
    const node = this.index?.scene.nodes.get(knife.nodeId)
    const geometry = node?.kind === 'mesh' ? this.index?.geometries.get(node.geometryId) : null
    if (!geometry) return null
    return pickSceneKnifePoint({
      canvas: this.canvas,
      camera: this.rig.camera,
      resource: this.resource,
      mesh: sceneGeometryMesh(geometry),
      nodeId: knife.nodeId,
      pointer: event,
      midpoint: knife.midpoint || event.shiftKey === true,
      edgesOnly: knife.edgesOnly,
      closePoint: knife.closePoint,
      edges: this.cutPicker,
      vertices: this.componentPicker,
    })
  }
  private readonly onMove = (event: PointerEvent) => {
    const input = this.callbacks.guideInput?.()
    const cut = input?.cut ?? input?.knife
    if (cut && !this.contextLost && !this.disposed) {
      const rect = this.canvas.getBoundingClientRect()
      this.guideAnnotation?.setPointer(
        event.pointerType !== 'touch' && !event.buttons
          ? { x: event.clientX - rect.left, y: event.clientY - rect.top }
          : null,
      )
      this.request()
      this.cutHoverPointer = event.buttons
        ? null
        : { clientX: event.clientX, clientY: event.clientY, shiftKey: event.shiftKey }
      if (event.buttons) cut.hover(null)
      else if (this.cutHoverFrame === null)
        this.cutHoverFrame = requestAnimationFrame(() => {
          this.cutHoverFrame = null
          const current = this.callbacks.guideInput?.()
          if (!this.contextLost && !this.disposed) {
            if (current?.knife)
              current.knife.hover(
                this.cutHoverPointer ? this.knifePoint(this.cutHoverPointer, current.knife) : null,
              )
            else if (current?.cut)
              current.cut.hover(
                this.cutHoverPointer ? this.cutPoint(this.cutHoverPointer, current.cut) : null,
              )
          }
        })
    }
    if (
      !event.buttons &&
      this.callbacks.hover &&
      (this.callbacks.hoverEnabled?.() ?? true) &&
      !this.contextLost &&
      !this.disposed
    ) {
      const rect = this.canvas.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        this.rig.camera.updateWorldMatrix(true, false)
        const ray = new Raycaster()
        ray.setFromCamera(
          new Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            1 - ((event.clientY - rect.top) / rect.height) * 2,
          ),
          this.rig.camera,
        )
        const covered = this.covered(this.selected)
        const hit = ray.intersectObjects(this.resource.root.children, false).find((hit) => {
          const instance = this.resource.instanceFor(hit.object)
          return hit.object.visible && instance && !covered.has(instance.sourceNodeId)
        })
        this.callbacks.hover(
          hit ? (this.resource.instanceFor(hit.object)?.sourceNodeId ?? null) : null,
        )
      }
    }
    if (
      this.pointer?.id === event.pointerId &&
      Math.hypot(event.clientX - this.pointer.x, event.clientY - this.pointer.y) > 6
    )
      this.pointer.moved = true
  }
  private readonly clearCutHover = () => {
    if (this.cutHoverFrame !== null) cancelAnimationFrame(this.cutHoverFrame)
    this.cutHoverFrame = null
    this.cutHoverPointer = null
    this.guideAnnotation?.setPointer(null)
    this.callbacks.guideInput?.()?.cut?.hover(null)
    this.callbacks.guideInput?.()?.knife?.hover(null)
  }
  private readonly onCancel = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId)
    this.pointer = null
  }
  private readonly onUp = (event: PointerEvent) => {
    const pointer = this.pointer
    this.pointers.delete(event.pointerId)
    this.pointer = null
    if (this.paintMode === 'look') return
    if (
      !pointer ||
      pointer.id !== event.pointerId ||
      pointer.moved ||
      pointer.onGizmo ||
      this.pointers.size ||
      Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 6
    )
      return
    const rect = this.canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    const rig = this.callbacks.guideInput?.()?.rig
    if (rig) {
      if (!rig.enabled) return
      this.rig.camera.updateWorldMatrix(true, false)
      const ray = new Raycaster()
      ray.setFromCamera(
        new Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          1 - ((event.clientY - rect.top) / rect.height) * 2,
        ),
        this.rig.camera,
      )
      const plane = new Plane().setFromNormalAndCoplanarPoint(
        new Vector3(...rig.plane.normal).normalize(),
        new Vector3(...rig.plane.origin),
      )
      if (Math.abs(ray.ray.direction.dot(plane.normal)) > 0.05) {
        const point = ray.ray.intersectPlane(plane, new Vector3())
        if (point) rig.mark(point.toArray())
      }
      return
    }
    const knife = this.callbacks.guideInput?.()?.knife
    if (knife) {
      const point = this.knifePoint(event, knife)
      if (point) knife.mark(point)
      return
    }
    const cut = this.callbacks.guideInput?.()?.cut
    if (cut) {
      const point = this.cutPoint(event, cut)
      if (point) cut.mark(point)
      return
    }
    const pivot = this.callbacks.guideInput?.()?.pivot
    if (pivot?.snapVertex) {
      const mesh = this.index ? sceneVisibleMesh(this.index, pivot.nodeId) : null
      if (mesh?.kind === 'mesh') {
        const vertex = this.componentPicker.pick(
          this.resource,
          mesh,
          { nodeId: pivot.nodeId, mode: 'vertex', ids: [] },
          this.rig.camera,
          {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            width: rect.width,
            height: rect.height,
            radius: event.pointerType === 'touch' ? 18 : 12,
          },
        )
        if (vertex) pivot.markVertex?.(vertex, mesh.vertices[vertex]!)
      }
      return
    }
    // Um toque curto com tremida já girou a câmera antes do próximo quadro: a escolha usa a
    // câmera de AGORA, como o `sceneSurfaceHit` (em Pintar, o toque é o que troca de peça).
    this.rig.camera.updateWorldMatrix(true, false)
    const ray = new Raycaster()
    ray.setFromCamera(
      new Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      this.rig.camera,
    )
    if (this.componentSelection) {
      this.selectComponentAt(
        event.clientX,
        event.clientY,
        event.pointerType === 'touch',
        event.shiftKey || event.ctrlKey || event.metaKey,
      )
      return
    }
    if (this.paintMode === 'paint') {
      // Na aba Pintar, tocar numa peça a escolhe, com a face; tocar no vazio ou numa peça
      // travada não muda nada (quem arrastou girou a câmera). A peça travada à frente encobre.
      const hit = ray
        .intersectObjects(this.resource.root.children, false)
        .find((h) => h.object.visible)
      const instance = hit ? this.resource.instanceFor(hit.object) : null
      if (!hit || !instance || instance.locked) return
      const faceId = hit.faceIndex == null ? null : this.resource.faceFor(hit.object, hit.faceIndex)
      this.callbacks.select(instance.sourceNodeId, false, faceId ? { faceId } : undefined)
      return
    }
    const support =
      this.areaTool === 'point' && !this.painting
        ? this.supports.pick(this.rig.camera, {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            width: rect.width,
            height: rect.height,
          })
        : null
    if (support !== null) {
      this.callbacks.select(support, event.shiftKey || event.ctrlKey || event.metaKey)
      return
    }
    const hit = ray
      .intersectObjects(this.resource.root.children, false)
      .find((hit) => hit.object.visible && !this.resource.instanceFor(hit.object)?.locked)
    const instance = hit ? this.resource.instanceFor(hit.object) : null
    this.callbacks.select(
      instance?.sourceNodeId ?? null,
      event.shiftKey || event.ctrlKey || event.metaKey,
    )
  }
  private readonly onLost = (event: Event) => {
    event.preventDefault()
    this.contextLost = true
    this.poseGuide.hide()
    this.gizmo?.setEnabled(false)
    this.area?.setEnabled(false)
    this.paint?.setEnabled(false)
    this.skinPaint?.setEnabled(false)
    this.body?.setEnabled(false)
    this.clearBrushCursor()
    this.weightPoints.preview(null)
    this.orbit?.dispose()
    this.orbit = null
    this.pointer = null
    this.pointers.clear()
    this.callbacks.contextLost(true)
  }
  private readonly onRestored = () => {
    this.contextLost = false
    this.ground.invalidateShadow()
    this.updateEditingEnabled()
    this.orbit?.dispose()
    this.orbit = this.makeOrbit()
    this.callbacks.contextLost(false)
    this.request()
  }
  private readonly onVisibility = () => {
    if (this.canvas.ownerDocument.hidden) this.onBlur()
  }
  private readonly onBlur = () => {
    this.clearCutHover()
    if (this.poseGuide.hide()) this.request()
    this.cancelGesture()
    this.paint?.forget()
    this.body?.forget()
    this.skinPaint?.forget()
    this.gizmo?.setEnabled(false)
    this.area?.setEnabled(false)
    this.pointers.clear()
    this.orbit?.dispose()
    this.orbit = this.contextLost ? null : this.makeOrbit()
    if (!this.contextLost) {
      this.updateEditingEnabled()
    }
  }

  dispose(): void {
    this.thumbnail?.dispose()
    this.thumbnail = null
    if (this.disposed) return
    this.disposed = true
    this.loop?.dispose()
    this.gizmo?.dispose()
    this.guideAnnotation?.dispose()
    this.area?.dispose()
    this.paint?.dispose()
    this.body?.dispose()
    this.skinPaint?.dispose()
    this.orbit?.dispose()
    this.canvas.removeEventListener('pointerdown', this.onDown)
    this.canvas.removeEventListener('pointermove', this.onMove)
    this.canvas.removeEventListener('pointermove', this.onSkinPaintHover)
    this.canvas.removeEventListener('pointerleave', this.clearBrushCursor)
    this.canvas.removeEventListener('pointerleave', this.clearCutHover)
    this.canvas.removeEventListener('wheel', this.clearBrushCursor)
    this.canvas.removeEventListener('pointerup', this.onUp)
    this.canvas.removeEventListener('pointercancel', this.onCancel)
    this.canvas.removeEventListener('lostpointercapture', this.onCancel)
    this.canvas.removeEventListener('webglcontextlost', this.onLost)
    this.canvas.removeEventListener('webglcontextrestored', this.onRestored)
    this.canvas.ownerDocument.removeEventListener('visibilitychange', this.onVisibility)
    this.canvas.ownerDocument.defaultView?.removeEventListener('blur', this.onBlur)
    this.resource.dispose()
    this.faces.dispose()
    this.supports.dispose()
    this.poseGuide.dispose()
    this.previewGuide.dispose()
    this.pivotHandles?.dispose()
    this.weightPoints.dispose()
    this.brushCursor.dispose()
    this.weightTarget = null
    this.displayedSupports = []
    this.componentPicker.dispose()
    this.cutPicker.dispose()
    if (this.cutHoverFrame !== null) cancelAnimationFrame(this.cutHoverFrame)
    this.cutHoverFrame = null
    this.cutHoverPointer = null
    this.ground?.dispose()
    this.outline.dispose()
    this.pivot.dispose()
    this.renderer.dispose()
    // This viewport owns its canvas and renderer. Retire the GPU context as well as
    // its resources; otherwise reopening retains browser context slots until GC.
    this.renderer.forceContextLoss?.()
    this.scene.clear()
    this.index = null
    this.baseIndex = null
    this.boundsCache = null
    this.document = null
    this.pose = null
    this.pointer = null
    this.pointers.clear()
  }
}
