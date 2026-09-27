import {
  AxesHelper,
  Box3,
  Box3Helper,
  GridHelper,
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

import type { MoldaSceneDocument } from '../scene/document'
import { sameSceneContent } from '../scene/documentContent'
import { indexSceneDocument } from '../scene/documentIndex'
import { evaluateSceneNodeFlags } from '../scene/evaluate'
import { selectSceneSubtrees } from '../scene/graph'
import type { ScenePaintTarget } from '../scene/imagePaint'
import { transformPoint } from '../scene/matrix'
import {
  meshComponentIds,
  meshComponentVertices,
  type SceneComponentSelection,
} from '../scene/meshComponents'
import { meshVertexCenter } from '../scene/meshVertices'
import type { SceneAnimationPose } from '../scene/sampleAnimation'
import type { SceneSkinPaintSample } from '../scene/skinPaint'
import { requireScene } from '../scene/validation'
import type { SceneSkinPaintPreview } from '../state/sceneSkinPaintGesture'
import { CapturedPaintInput } from './CapturedPaintInput'
import { DemandRenderLoop } from './demandRenderLoop'
import { paintPointerPath } from './paintPointerPath'
import { SceneAreaSelection, type SceneAreaTool } from './SceneAreaSelection'
import { SceneBrushCursor } from './SceneBrushCursor'
import { SceneComponentOverlay } from './SceneComponentOverlay'
import { ScenePaintInput } from './ScenePaintInput'
import { SceneSkinWeightOverlay, type SceneSkinWeightTarget } from './SceneSkinWeightOverlay'
import { SceneSupportOverlay } from './SceneSupportOverlay'
import { SceneTransformGizmo } from './SceneTransformGizmo'
import { SceneComponentPicker } from './sceneComponentPicking'
import { pickSceneRegion } from './sceneRegionPicking'
import { SceneRenderResource } from './sceneRenderResource'
import { pickSceneSkinPaint } from './sceneSkinPaintPick'
import { sceneSkinPaintSpacing } from './sceneSkinPaintSpacing'
import { prepareSceneSupports, type SceneSupportPoint } from './sceneSupports'
import { prepareSceneTwoBoneGuide } from './sceneTwoBoneGuide'
import type {
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
  Partial<Pick<WebGLRenderer, 'forceContextLoss'>>

/** Browser owner only: navigation, picking, context lifecycle and demand scheduling. */
export class SceneViewport implements SceneViewportPort {
  private readonly renderer: SceneRenderer
  private readonly scene = new Scene()
  private readonly rig = new ViewportCamera()
  private readonly resource = new SceneRenderResource()
  private readonly grid = new GridHelper(32, 32, 0x9fb4d0, 0xd2deee)
  private readonly outline = new Box3Helper(new Box3(), 0x1d6fd6)
  private readonly pivot = new AxesHelper(0.75)
  private readonly faces = new SceneComponentOverlay()
  private readonly supports = new SceneSupportOverlay()
  private readonly poseGuide = new SceneSupportOverlay(4)
  private readonly weightPoints = new SceneSkinWeightOverlay()
  private readonly brushCursor = new SceneBrushCursor()
  private weightTarget: SceneSkinWeightTarget | null = null
  private supportGuides = false
  private displayedSupports: readonly SceneSupportPoint[] = []
  private readonly componentPicker = new SceneComponentPicker()
  private componentSelection: SceneComponentSelection | null = null
  private areaTool: SceneAreaTool = 'point'
  private orbit: OrbitControls | null = null
  private loop: DemandRenderLoop | null = null
  private gizmo: SceneTransformGizmo | null = null
  private area: SceneAreaSelection | null = null
  private paint: ScenePaintInput | null = null
  private paintTarget: ScenePaintTarget | null = null
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
      // A miniatura reusa o mesmo alvo do editor antigo: um render próprio de 96 px,
      // sem tocar no palco que a criança está vendo.
      if (this.renderer instanceof WebGLRenderer)
        this.thumbnail = new ViewportThumbnail(this.renderer, SCENE_THUMB_BACKGROUND)
      this.renderer.setPixelRatio(
        Math.min(canvas.ownerDocument.defaultView?.devicePixelRatio ?? 1, 2),
      )
      this.renderer.setClearColor(0, 0)
      this.outline.visible = false
      this.pivot.visible = false
      this.pivot.matrixAutoUpdate = false
      this.poseGuide.root.name = 'molda-two-bone-guide'
      this.scene.add(
        this.resource.root,
        this.faces.root,
        this.supports.root,
        this.poseGuide.root,
        this.weightPoints.root,
        this.brushCursor.root,
        this.grid,
        this.outline,
        this.pivot,
        ...workshopLights(),
      )
      this.orbit = this.makeOrbit()
      this.area = new SceneAreaSelection(
        canvas,
        (points) => callbacks.areaChanged?.(points),
        (region, additive) => {
          if (!this.index) return
          if (this.componentSelection) {
            const node = this.index.scene.nodes.get(this.componentSelection.nodeId)
            const mesh = node?.kind === 'mesh' ? this.index.geometries.get(node.geometryId) : null
            if (mesh?.kind === 'mesh')
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
            if (this.orbit) this.orbit.enabled = !dragging && !this.contextLost
          },
          this.request,
        )
        this.scene.add(this.gizmo.root)
      }
      this.loop = new DemandRenderLoop(canvas, this.renderer, this.rig, () => {
        const moving = this.orbit?.update() ?? false
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
        )
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
      canvas.addEventListener('pointerdown', this.onDown)
      canvas.addEventListener('pointermove', this.onMove)
      canvas.addEventListener('pointermove', this.onSkinPaintHover)
      canvas.addEventListener('pointerleave', this.clearBrushCursor)
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
    }
    this.index = index
    this.baseIndex = index
    this.boundsCache = boundsCache
    this.document = document
    this.pose = null
    this.updateEditingEnabled()
    this.updateVisibility(supports, weights)
    if (first) this.frame()
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
        geometry?.kind !== 'mesh' ||
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
    this.outline.visible = bounds !== null
    if (bounds) this.outline.box.set(new Vector3(...bounds.min), new Vector3(...bounds.max))
    const world =
      this.selected.length === 1
        ? this.index?.scene.worldMatrices.get(this.selected[0] ?? '')
        : undefined
    this.pivot.visible = Boolean(world && bounds)
    if (world) this.pivot.matrix.fromArray(world)
    const faceNode = this.componentSelection
      ? this.index?.scene.nodes.get(this.componentSelection.nodeId)
      : null
    const faceMesh =
      faceNode?.kind === 'mesh' ? this.index?.geometries.get(faceNode.geometryId) : null
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
    const aliveComponents =
      this.componentSelection && faceMesh?.kind === 'mesh'
        ? new Set(meshComponentIds(faceMesh, this.componentSelection.mode))
        : null
    const faceCenter =
      this.componentSelection && faceMesh?.kind === 'mesh' && world
        ? meshVertexCenter(
            faceMesh,
            meshComponentVertices(faceMesh, {
              ...this.componentSelection,
              ids: this.componentSelection.ids.filter((id) => aliveComponents?.has(id)),
            }),
            world,
          )
        : null
    this.gizmo?.setTarget(
      this.pose?.twoBoneGuide && this.animationEditing
        ? this.poseDestination()
        : editable && bounds
          ? this.componentSelection
            ? faceCenter
            : world
              ? transformPoint(world, [0, 0, 0])
              : [
                  bounds.min[0] / 2 + bounds.max[0] / 2,
                  bounds.min[1] / 2 + bounds.max[1] / 2,
                  bounds.min[2] / 2 + bounds.max[2] / 2,
                ]
          : null,
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
        this.grid,
        this.outline,
        this.pivot,
        this.faces.root,
        this.supports.root,
        this.poseGuide.root,
        this.weightPoints.root,
        this.brushCursor.root,
        ...(this.gizmo ? [this.gizmo.root] : []),
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

  setGridVisible(visible: boolean): void {
    if (this.disposed || visible === this.grid.visible) return
    this.grid.visible = visible
    this.request()
  }

  setMovementStep(step: number | null): void {
    if (!this.disposed) this.gizmo?.setMovementStep(step)
  }

  private readonly request = () => {
    if (!this.disposed) this.loop?.request()
  }
  setTransformTool(tool: SceneTransformTool): void {
    if (this.disposed) return
    if (tool !== 'select') this.setSkinPaintEnabled(false)
    this.gizmo?.setTool(tool)
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
    if (
      selection?.nodeId !== this.componentSelection?.nodeId ||
      selection?.mode !== this.componentSelection?.mode ||
      selection?.ids.length !== this.componentSelection?.ids.length ||
      selection?.ids.some((id, i) => id !== this.componentSelection?.ids[i])
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
    this.updateEditingEnabled()
    if (this.updatePoseGuide()) this.request()
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
    const modeChanged = Boolean(pose) !== Boolean(this.pose)
    const guideModeChanged = Boolean(pose?.twoBoneGuide) !== Boolean(this.pose?.twoBoneGuide)
    this.index = next
    this.pose = pose
    if (modeChanged) {
      this.cancelGesture()
      if (pose) this.componentSelection = null
      this.updateEditingEnabled()
    }
    if (changed || worldChanged || modeChanged || guideModeChanged) this.updateVisibility(supports)
    else if (this.updatePoseGuide()) this.request()
  }
  setImageFrame(imageId: string, frame: number | null): void {
    if (this.disposed || this.contextLost) return
    if (frame === this.resource.frameForImage(imageId)) return
    this.paint?.cancel()
    if (this.resource.setImageFrame(imageId, frame)) this.request()
  }
  cancelGesture(): void {
    if (this.disposed) return
    this.gizmo?.cancel()
    this.area?.cancel()
    this.paint?.cancel()
    this.skinPaint?.cancel()
    this.clearBrushCursor()
    if (this.weightPoints.preview(null)) this.request()
    this.pointer = null
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
      onGizmo: this.gizmo?.hit ?? false,
    }
  }
  private readonly onMove = (event: PointerEvent) => {
    if (
      this.pointer?.id === event.pointerId &&
      Math.hypot(event.clientX - this.pointer.x, event.clientY - this.pointer.y) > 6
    )
      this.pointer.moved = true
  }
  private readonly onCancel = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId)
    this.pointer = null
  }
  private readonly onUp = (event: PointerEvent) => {
    const pointer = this.pointer
    this.pointers.delete(event.pointerId)
    this.pointer = null
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
      const node = this.index?.scene.nodes.get(this.componentSelection.nodeId)
      const mesh = node?.kind === 'mesh' ? this.index?.geometries.get(node.geometryId) : null
      this.callbacks.selectComponent?.(
        this.componentSelection.mode === 'face'
          ? this.faces.pick(ray, this.resource, this.componentSelection.nodeId, this.selectThrough)
          : mesh?.kind === 'mesh'
            ? this.componentPicker.pick(
                this.resource,
                mesh,
                this.componentSelection,
                this.rig.camera,
                {
                  x: event.clientX - rect.left,
                  y: event.clientY - rect.top,
                  width: rect.width,
                  height: rect.height,
                  radius: event.pointerType === 'touch' ? 14 : 8,
                },
                this.selectThrough,
              )
            : null,
        event.shiftKey || event.ctrlKey || event.metaKey,
      )
      return
    }
    if (this.paintMode === 'paint' || this.paintMode === 'look') {
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
    if (this.poseGuide.hide()) this.request()
    this.cancelGesture()
    this.paint?.forget()
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
    this.area?.dispose()
    this.paint?.dispose()
    this.skinPaint?.dispose()
    this.orbit?.dispose()
    this.canvas.removeEventListener('pointerdown', this.onDown)
    this.canvas.removeEventListener('pointermove', this.onMove)
    this.canvas.removeEventListener('pointermove', this.onSkinPaintHover)
    this.canvas.removeEventListener('pointerleave', this.clearBrushCursor)
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
    this.weightPoints.dispose()
    this.brushCursor.dispose()
    this.weightTarget = null
    this.displayedSupports = []
    this.componentPicker.dispose()
    this.grid.dispose()
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
