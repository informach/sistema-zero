/**
 * O palco 3D (three.js cru, sem React dentro).
 *
 * - UM `MeshStandardMaterial` com o ATLAS como `map` e um `Mesh` por peça:
 *   Uma chamada por peça; FPS depende do hardware e exige medição. A fusão em uma malha só
 *   acontece no export, onde valem os tetos do runtime do Estúdio.
 * - Render SOB DEMANDA: `requestFrame()` coalesce num rAF; o laço só continua
 *   enquanto o amortecimento da órbita assenta (desligado com
 *   `prefers-reduced-motion`).
 * - `setModel` é incremental por id: cor/layout atualizam UV separadamente de
 *   posições/normais. `PartGeometryResource` mantém buffers e spans por face. O
 *   atlas só é reempacotado quando a LISTA de faces pintadas muda (face nova,
 *   tamanho de pele, número de cores); uma pincelada numa pele existente vira
 *   um re-raster da região + upload parcial da textura.
 * - Alças (`TransformControls`) mexem só na peça FONTE; o gêmeo acompanha pelo
 *   modelo. Mover: o DELTA é arredondado ao encaixe (não a posição, porque o
 *   pivô de uma peça de lado ímpar cai no meio de uma célula). Girar: passos
 *   de 15°. Tamanho: nada é aplicado ao vivo (o mesh fica escalado); no
 *   soltar, a caixa nova nasce arredondada ao encaixe e o editor faz UM commit.
 * - PINTAR: o `pointerdown` em CAPTURA roda antes do OrbitControls; acertou
 *   peça → o gesto é nosso (`stopImmediatePropagation` + pointer capture),
 *   errou → a órbita segue. O gesto pinta um MODELO de trabalho (funções
 *   puras de `paint/stroke.ts`) e o entrega inteiro no soltar (UM commit). O
 *   espelho de pintura espelha o PONTO (x → -x) e resolve o texel de lá.
 * - Ajudas (grade, contorno, alças) somem só na foto da miniatura.
 * - Perda de contexto WebGL: `preventDefault` no lost, redesenha no restored.
 */
import {
  BackSide,
  DoubleSide,
  EdgesGeometry,
  GridHelper,
  type Intersection,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { MOLDA_LIMITS } from '../core/limits'
import type { MoldaModelAsset, MoldaPart, ShapeId, Vec3 } from '../core/model'
import { normalizeRotation } from '../core/sanitize'
import type { AtlasLayout } from '../model/atlas'
import { verticesCenter } from '../model/meshSelection'
import { updatePart } from '../model/partOps'
import {
  faceTexelAt,
  pickTexelAtPoint,
  resolveTexelHit,
  type TexelHit,
  worldToBox,
} from '../model/pick'
import { partSize } from '../model/shapes'
import type { SnapAnchor } from '../model/snap'
import { modelBounds, partPivot } from '../model/transform'
import type { FacePaintTarget } from '../paint/facePaint'
import {
  fillFace,
  finishStroke,
  type PaintSettings,
  paintSegment,
  rotateFaceSkin,
  sampleColor,
} from '../paint/stroke'
import type { EditorMode, TransformTool } from '../state/sessionStore'
import { DemandRenderLoop } from './demandRenderLoop'
import {
  MESH_PICK_TOLERANCE_MOUSE_PX,
  MESH_PICK_TOLERANCE_TOUCH_PX,
  MeshEditOverlay,
} from './meshEditOverlay'
import { ModelAtlasResource } from './modelAtlasResource'
import { PartGeometryResource } from './partGeometryResource'
import { SnapOverlay } from './SnapOverlay'
import { raycastSnapTarget } from './snapPicking'
import type {
  MeshEditState,
  MoldaViewportLike,
  ViewName,
  ViewportCallbacks,
  ViewportOptions,
  ViewportSnapState,
} from './types'
import { framingBounds, ViewportCamera } from './viewportCamera'
import { deg, rad, roundTo } from './viewportMath'
import { createViewportOrbit } from './viewportNavigation'
import { ViewportThumbnail } from './viewportThumbnail'
import { isPartVisible } from './viewVisibility'
import { workshopLights } from './workshopLights'

interface PartEntry {
  mesh: Mesh
  resource: PartGeometryResource
  outline: LineSegments | null
  /** "Ver arestas": o contorno da peça (arestas com dobra ≥ 30°). */
  edges: LineSegments | null
}

interface Stroke {
  pointerId: number
  model: MoldaModelAsset
  last: TexelHit | null
  lastMirror: TexelHit | null
}

const OUTLINE_COLOR = 0x1d6fd6
const TWIN_OUTLINE_COLOR = 0x8db8ff
const GRID_CENTER_COLOR = 0x9fb4d0
const GRID_COLOR = 0xd2deee
const DEFAULT_THUMB_BACKGROUND = '#e6f1ff'
const CLICK_TOLERANCE_PX = 6
const MIN_SCALE = 0.05

const GIZMO_MODE: Record<Exclude<TransformTool, 'snap'>, 'translate' | 'rotate' | 'scale'> = {
  move: 'translate',
  rotate: 'rotate',
  scale: 'scale',
}

export class MoldaViewport implements MoldaViewportLike {
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly cameraRig = new ViewportCamera()
  private readonly reducedMotion: boolean
  private orbit: OrbitControls
  private get camera() {
    return this.cameraRig.camera
  }
  private readonly gizmo: TransformControls
  private readonly gizmoHelper: ReturnType<TransformControls['getHelper']>
  private readonly grid: GridHelper
  private readonly floor: Mesh<PlaneGeometry, MeshBasicMaterial>
  private readonly raycaster = new Raycaster()
  private readonly material = new MeshStandardMaterial({ roughness: 0.92, metalness: 0 })
  private readonly outlineMaterial = new LineBasicMaterial({
    color: OUTLINE_COLOR,
    depthTest: false,
    transparent: true,
    opacity: 0.95,
  })
  private readonly twinOutlineMaterial = new LineBasicMaterial({
    color: TWIN_OUTLINE_COLOR,
    depthTest: false,
    transparent: true,
    opacity: 0.8,
  })
  private readonly entries = new Map<string, PartEntry>()
  private readonly renderLoop: DemandRenderLoop
  private readonly thumbnail: ViewportThumbnail
  private model: MoldaModelAsset | null = null
  private readonly atlasResource = new ModelAtlasResource()
  private selectedId: string | null = null
  private mode: EditorMode = 'build'
  private tool: TransformTool = 'move'
  private placementShape: ShapeId | null = null
  private paint: PaintSettings = { tool: 'pencil', color: 1, size: 1, mirror: false }
  private snap = 1
  private disposed = false
  private dragging = false
  private dragPart: MoldaPart | null = null
  private dragStartPivot = new Vector3()
  private pointerDown: { x: number; y: number; pointerId: number; onGizmo: boolean } | null = null
  private stroke: Stroke | null = null
  // "Editar malha": o overlay é filho do mesh da peça; a alça de mover pega uma
  // ÂNCORA no centro da seleção (a `TransformControls` só sabe mover um Object3D).
  private meshEdit: MeshEditState | null = null
  private readonly meshOverlay = new MeshEditOverlay()
  private readonly meshAnchor = new Object3D()
  private readonly meshDragStart = new Vector3()
  private meshDragging = false
  /** Seleção múltipla: as peças SOMADAS à principal; a alça vai para a âncora do grupo. */
  private extraIds: string[] = []
  private readonly groupAnchor = new Object3D()
  private readonly snapOverlay = new SnapOverlay()
  private snapState: ViewportSnapState = { phase: 'inactive' }
  private groupDragging = false
  private readonly groupDragStart = new Vector3()
  private groupStart = new Map<string, { from: Vec3; to: Vec3 }>()
  /** "Ver arestas" em todas as peças. */
  private edgesVisible = false
  private isolatedIds: ReadonlySet<string> | null = null
  private readonly edgesMaterial = new LineBasicMaterial({
    color: 0x1b2a41,
    transparent: true,
    opacity: 0.55,
  })
  /**
   * O VERSO da peça em edição de malha, escuro: uma face virada aparece (e aparece
   * errada, em vez de sumir) e um buraco não vira janela para dentro.
   */
  private readonly backMaterial = new MeshBasicMaterial({ color: 0x2f2f2f, side: BackSide })
  private backMesh: Mesh | null = null

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly callbacks: ViewportCallbacks,
    options: ViewportOptions = {},
  ) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setClearColor(0x000000, 0)
    this.thumbnail = new ViewportThumbnail(
      this.renderer,
      options.thumbBackground ?? DEFAULT_THUMB_BACKGROUND,
    )

    this.reducedMotion = options.reducedMotion ?? false

    this.scene.add(...workshopLights())

    this.grid = new GridHelper(
      MOLDA_LIMITS.gridHalf * 2,
      MOLDA_LIMITS.gridHalf * 2,
      GRID_CENTER_COLOR,
      GRID_COLOR,
    )
    this.scene.add(this.grid)
    this.floor = new Mesh(
      new PlaneGeometry(MOLDA_LIMITS.gridHalf * 2, MOLDA_LIMITS.gridHalf * 2),
      new MeshBasicMaterial({ side: DoubleSide, visible: false }),
    )
    this.floor.rotation.x = -Math.PI / 2
    this.floor.updateMatrixWorld(true)
    this.scene.add(this.floor)

    this.orbit = createViewportOrbit(
      this.canvas,
      this.cameraRig,
      this.reducedMotion,
      this.onOrbitChange,
    )

    this.gizmo = new TransformControls(this.camera, canvas)
    this.gizmo.setSize(1.5)
    this.gizmo.setRotationSnap(rad(15))
    this.gizmoHelper = this.gizmo.getHelper()
    this.scene.add(this.gizmoHelper)
    this.scene.add(this.meshAnchor)
    this.scene.add(this.groupAnchor)
    this.scene.add(this.snapOverlay.group)
    this.gizmo.addEventListener('dragging-changed', this.onDraggingChanged)
    this.gizmo.addEventListener('mouseDown', this.onGizmoMouseDown)
    this.gizmo.addEventListener('objectChange', this.onGizmoObjectChange)
    this.gizmo.addEventListener('mouseUp', this.onGizmoMouseUp)

    // Captura: roda ANTES do OrbitControls, que escuta o mesmo canvas.
    canvas.addEventListener('pointerdown', this.onPointerDownCapture, { capture: true })
    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('pointerup', this.onPointerUp)
    canvas.addEventListener('pointercancel', this.onPointerCancel, { capture: true })
    canvas.addEventListener('lostpointercapture', this.onLostPointerCapture)
    canvas.addEventListener('contextmenu', this.onContextMenu)
    canvas.addEventListener('webglcontextlost', this.onContextLost)
    canvas.addEventListener('webglcontextrestored', this.onContextRestored)

    this.renderLoop = new DemandRenderLoop(canvas, this.renderer, this.cameraRig, () => {
      const moving = this.orbit.update()
      this.renderer.render(this.scene, this.camera)
      return moving
    })
  }

  // ── Modelo ────────────────────────────────────────────────────────────────

  cancelGesture(): void {
    const pointerId = this.stroke?.pointerId ?? this.pointerDown?.pointerId
    this.stroke = null
    this.pointerDown = null
    this.dragging = false
    this.meshDragging = false
    this.groupDragging = false
    this.dragPart = null
    this.groupStart.clear()
    // Reset may dispatch objectChange: clear our ownership before that callback.
    if (this.gizmo.object) this.gizmo.reset()
    this.gizmo.dragging = false
    this.gizmo.axis = null
    this.orbit.enabled = true
    if (pointerId !== undefined && this.canvas.hasPointerCapture(pointerId)) {
      this.canvas.releasePointerCapture(pointerId)
    }
    this.requestFrame()
  }

  setModel(model: MoldaModelAsset): void {
    if (this.disposed) return
    // Durante um gesto de pintura o modelo de trabalho manda; o editor recebe
    // o resultado no soltar e volta a chamar aqui.
    if (this.stroke) return
    this.applyModel(model)
  }

  private applyModel(model: MoldaModelAsset): void {
    const { layout, atlas, full, layoutChanged, textureChanged } = this.atlasResource.update(model)
    if (layoutChanged) this.callbacks.onAtlas({ size: layout.size, full })
    if (textureChanged) {
      this.material.map = atlas.texture
      this.material.needsUpdate = true
    }

    // Spatial and UV buffers have their own lifetime, independent of atlas pixels.
    const seen = new Set<string>()
    let selectionDirty = false
    const previousById = new Map((this.model?.parts ?? []).map((part) => [part.id, part]))
    const groupIds = new Set([this.selectedId, ...this.extraIds])
    for (const part of model.parts) {
      seen.add(part.id)
      // Trancar/esconder não muda geometria, mas muda a alça: a seleção é refeita.
      const previous = previousById.get(part.id)
      if (
        previous &&
        (groupIds.has(part.id) || (part.mirrorOf !== undefined && groupIds.has(part.mirrorOf))) &&
        (Boolean(previous.locked) !== Boolean(part.locked) ||
          Boolean(previous.hidden) !== Boolean(part.hidden))
      ) {
        selectionDirty = true
      }
      const source =
        (part.mirrorOf ? model.parts.find((p) => p.id === part.mirrorOf) : undefined) ?? part
      let entry = this.entries.get(part.id)
      if (entry?.resource.update(part, source, layout)) {
        this.removeOutline(entry)
        this.removeEdges(entry)
        entry.mesh.geometry = entry.resource.geometry
        if (this.edgesVisible) this.addEdges(entry)
        if (groupIds.has(part.id) || (part.mirrorOf !== undefined && groupIds.has(part.mirrorOf)))
          selectionDirty = true
      }
      if (!entry) {
        entry = this.createEntry(part, source, layout)
        this.entries.set(part.id, entry)
        if (this.edgesVisible) this.addEdges(entry)
        if (part.id === this.selectedId || part.mirrorOf === this.selectedId) selectionDirty = true
      }
      this.syncTransform(entry, part)
      entry.mesh.visible = isPartVisible(part, this.isolatedIds)
    }
    for (const [id, entry] of this.entries) {
      if (seen.has(id)) continue
      this.disposeEntry(entry)
      this.entries.delete(id)
      if (id === this.selectedId) selectionDirty = true
    }
    this.model = model
    this.snapOverlay.setState(this.displayModel(model), this.snapState)
    if (selectionDirty) this.applySelection()
    // O mesh da peça em edição pode ter sido recriado (malha nova): o overlay segue.
    this.syncMeshEdit()
    this.requestFrame()
  }

  setMeshEdit(state: MeshEditState | null): void {
    this.meshEdit = state
    this.applySelection()
    this.syncMeshEdit()
    this.requestFrame()
  }

  /** Overlay preso ao mesh da peça em edição e a âncora da alça no centro da seleção. */
  private syncMeshEdit(): void {
    const state = this.meshEdit
    const part = state ? this.model?.parts.find((item) => item.id === state.partId) : undefined
    const entry = state ? this.entries.get(state.partId) : undefined
    if (!state || !part?.mesh || !entry) {
      this.meshOverlay.group.removeFromParent()
      this.backMesh?.removeFromParent()
      if (this.gizmo.object === this.meshAnchor) this.gizmo.detach()
      return
    }
    if (this.meshOverlay.group.parent !== entry.mesh) entry.mesh.add(this.meshOverlay.group)
    if (!this.backMesh) this.backMesh = new Mesh(entry.mesh.geometry, this.backMaterial)
    this.backMesh.geometry = entry.mesh.geometry
    if (this.backMesh.parent !== entry.mesh) entry.mesh.add(this.backMesh)
    const pivot = partPivot(part)
    this.meshOverlay.setMesh(part.mesh, pivot, state.vertices, state.selection)
    const center = verticesCenter(part.mesh, state.vertices)
    if (!center || this.mode !== 'build' || this.tool === 'snap' || this.meshDragging) {
      if (!center && this.gizmo.object === this.meshAnchor) this.gizmo.detach()
      return
    }
    entry.mesh.updateMatrixWorld(true)
    const world = entry.mesh.localToWorld(
      new Vector3(center[0] - pivot[0], center[1] - pivot[1], center[2] - pivot[2]),
    )
    this.meshAnchor.position.copy(world)
    this.meshAnchor.quaternion.copy(entry.mesh.quaternion)
    this.meshAnchor.updateMatrixWorld(true)
    if (this.gizmo.object !== this.meshAnchor) this.gizmo.attach(this.meshAnchor)
    // Na malha a alça é SÓ de mover (girar/escalar uma seleção fica para depois) e anda
    // nos eixos da PEÇA (o delta encaixa por eixo da caixa; em espaço de mundo, numa
    // peça girada, a seta X andava na diagonal da malha, em escada).
    this.gizmo.setMode('translate')
    this.gizmo.setSpace('local')
  }

  setExtraSelected(ids: readonly string[]): void {
    const next = ids.filter((id) => id !== this.selectedId)
    if (next.length === this.extraIds.length && next.every((id, i) => id === this.extraIds[i])) {
      return
    }
    this.extraIds = next
    this.applySelection()
    this.requestFrame()
  }

  setEdgesVisible(visible: boolean): void {
    if (this.edgesVisible === visible) return
    this.edgesVisible = visible
    for (const entry of this.entries.values()) {
      if (visible) this.addEdges(entry)
      else this.removeEdges(entry)
    }
    this.requestFrame()
  }

  setIsolation(ids: readonly string[] | null): void {
    if ((!ids || ids.length === 0) && this.isolatedIds === null) return
    if (
      ids &&
      this.isolatedIds?.size === ids.length &&
      ids.every((id) => this.isolatedIds?.has(id))
    )
      return
    this.isolatedIds = ids && ids.length > 0 ? new Set(ids) : null
    if (!this.model) return
    for (const part of this.model.parts) {
      const entry = this.entries.get(part.id)
      if (entry) entry.mesh.visible = isPartVisible(part, this.isolatedIds)
    }
    this.snapOverlay.setState(this.displayModel(this.model), this.snapState)
    this.applySelection()
    this.requestFrame()
  }

  private displayModel(model: MoldaModelAsset): MoldaModelAsset {
    return this.isolatedIds
      ? { ...model, parts: model.parts.filter((part) => isPartVisible(part, this.isolatedIds)) }
      : model
  }

  setSelected(partId: string | null): void {
    if (this.selectedId === partId) return
    this.selectedId = partId
    this.applySelection()
    this.requestFrame()
  }

  setMode(mode: EditorMode): void {
    if (this.mode === mode) return
    this.mode = mode
    this.applySelection()
    this.requestFrame()
  }

  setTool(tool: TransformTool): void {
    this.tool = tool
    if (tool === 'snap') this.gizmo.detach()
    else this.gizmo.setMode(GIZMO_MODE[tool])
    this.canvas.style.cursor = tool === 'snap' || this.placementShape ? 'crosshair' : ''
    this.applySelection()
    this.requestFrame()
  }

  setPlacementShape(shape: ShapeId | null): void {
    this.placementShape = shape
    this.canvas.style.cursor = shape || this.tool === 'snap' ? 'crosshair' : ''
    this.applySelection()
    this.requestFrame()
  }

  setPaint(settings: PaintSettings): void {
    this.paint = settings
  }

  setSnap(snap: number): void {
    this.snap = snap > 0 ? snap : 1
  }

  setGridVisible(visible: boolean): void {
    this.grid.visible = visible
    this.requestFrame()
  }

  setSnapState(state: ViewportSnapState): void {
    this.snapState = state
    if (this.model) this.snapOverlay.setState(this.displayModel(this.model), state)
    this.requestFrame()
  }

  setView(view: ViewName): void {
    if (this.disposed) return
    if (this.stroke || this.dragging || this.meshDragging || this.groupDragging) {
      this.cancelGesture()
      this.callbacks.onGestureCancel()
    }
    const selection =
      view === 'selection' && this.selectedId ? [this.selectedId, ...this.extraIds] : undefined
    const bounds = this.model ? framingBounds(this.displayModel(this.model), selection) : null
    // New controls discard old damping/pan deltas and recompute their up-axis
    // quaternion. Mutating camera.up on the existing controls cannot do this.
    this.orbit.removeEventListener('change', this.onOrbitChange)
    this.orbit.dispose()
    if (view === 'frame' || view === 'selection') this.cameraRig.frame(bounds)
    else this.cameraRig.setView(view, bounds)
    this.orbit = createViewportOrbit(
      this.canvas,
      this.cameraRig,
      this.reducedMotion,
      this.onOrbitChange,
    )
    this.gizmo.camera = this.camera
    this.requestFrame()
  }

  // ── Miniatura ─────────────────────────────────────────────────────────────

  renderThumb(): string | null {
    if (this.disposed || !this.model || this.model.parts.length === 0) return null
    if (typeof document === 'undefined') return null
    // Enquadra pelo que a foto MOSTRA (peça escondida fica fora do quadro e da foto).
    const visibleParts = this.model.parts.filter((part) => !part.hidden)
    const bounds =
      visibleParts.length > 0 ? modelBounds({ ...this.model, parts: visibleParts }) : null
    if (!bounds) return null
    // A thumbnail represents the saved creation, not the current solo session.
    const visibility = new Map(
      [...this.entries.values()].map((entry) => [entry, entry.mesh.visible]),
    )
    for (const part of this.model.parts) {
      const entry = this.entries.get(part.id)
      if (entry) entry.mesh.visible = !part.hidden
    }
    try {
      return this.thumbnail.render(this.scene, bounds, [
        this.grid,
        this.gizmoHelper,
        this.meshOverlay.group,
        this.snapOverlay.group,
        ...(this.backMesh ? [this.backMesh] : []),
        ...[...this.entries.values()].flatMap((entry) => [
          ...(entry.outline ? [entry.outline] : []),
          ...(entry.edges ? [entry.edges] : []),
        ]),
      ])
    } finally {
      for (const [entry, visible] of visibility) entry.mesh.visible = visible
      this.requestFrame()
    }
  }

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.renderLoop.dispose()
    this.canvas.removeEventListener('pointerdown', this.onPointerDownCapture, { capture: true })
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.canvas.removeEventListener('pointerup', this.onPointerUp)
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel, { capture: true })
    this.canvas.removeEventListener('lostpointercapture', this.onLostPointerCapture)
    this.canvas.removeEventListener('contextmenu', this.onContextMenu)
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost)
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored)
    this.orbit.removeEventListener('change', this.onOrbitChange)
    this.gizmo.removeEventListener('dragging-changed', this.onDraggingChanged)
    this.gizmo.removeEventListener('mouseDown', this.onGizmoMouseDown)
    this.gizmo.removeEventListener('objectChange', this.onGizmoObjectChange)
    this.gizmo.removeEventListener('mouseUp', this.onGizmoMouseUp)
    this.gizmo.detach()
    this.gizmo.dispose()
    this.orbit.dispose()
    this.meshOverlay.dispose()
    this.snapOverlay.dispose()
    for (const entry of this.entries.values()) this.disposeEntry(entry)
    this.entries.clear()
    this.grid.geometry.dispose()
    ;(this.grid.material as LineBasicMaterial).dispose()
    this.floor.geometry.dispose()
    this.floor.material.dispose()
    this.atlasResource.dispose()
    this.material.dispose()
    this.outlineMaterial.dispose()
    this.twinOutlineMaterial.dispose()
    this.edgesMaterial.dispose()
    this.backMaterial.dispose()
    this.thumbnail.dispose()
    this.renderer.dispose()
  }

  requestFrame(): void {
    this.renderLoop.request()
  }

  // ── Peças ─────────────────────────────────────────────────────────────────

  private createEntry(part: MoldaPart, source: MoldaPart, layout: AtlasLayout): PartEntry {
    const resource = new PartGeometryResource(part, source, layout)
    const mesh = new Mesh(resource.geometry, this.material)
    mesh.userData.partId = part.id
    this.scene.add(mesh)
    return {
      mesh,
      resource,
      outline: null,
      edges: null,
    }
  }

  private syncTransform(entry: PartEntry, part: MoldaPart): void {
    const pivot = partPivot(part)
    entry.mesh.position.set(pivot[0], pivot[1], pivot[2])
    entry.mesh.rotation.set(
      rad(part.rotation[0]),
      rad(part.rotation[1]),
      rad(part.rotation[2]),
      'XYZ',
    )
    // Durante um arrasto de TAMANHO o mesh fica escalado de propósito.
    if (!(this.dragging && this.tool === 'scale' && this.dragPart?.id === part.id)) {
      entry.mesh.scale.set(1, 1, 1)
    }
  }

  private disposeEntry(entry: PartEntry): void {
    this.removeOutline(entry)
    this.removeEdges(entry)
    if (this.backMesh?.parent === entry.mesh) this.backMesh.removeFromParent()
    if (this.gizmo.object === entry.mesh) this.gizmo.detach()
    this.scene.remove(entry.mesh)
    entry.resource.dispose()
  }

  private removeOutline(entry: PartEntry): void {
    if (!entry.outline) return
    entry.mesh.remove(entry.outline)
    entry.outline.geometry.dispose()
    entry.outline = null
  }

  private addEdges(entry: PartEntry): void {
    this.removeEdges(entry)
    const edges = new LineSegments(new EdgesGeometry(entry.mesh.geometry, 30), this.edgesMaterial)
    edges.renderOrder = 1
    entry.mesh.add(edges)
    entry.edges = edges
  }

  private removeEdges(entry: PartEntry): void {
    if (!entry.edges) return
    entry.mesh.remove(entry.edges)
    entry.edges.geometry.dispose()
    entry.edges = null
  }

  private isLocked(id: string | null): boolean {
    return Boolean(id) && Boolean(this.model?.parts.find((part) => part.id === id)?.locked)
  }

  private isHidden(id: string | null): boolean {
    return id !== null && !this.entries.get(id)?.mesh.visible
  }

  private addOutline(entry: PartEntry, material: LineBasicMaterial): void {
    this.removeOutline(entry)
    const outline = new LineSegments(new EdgesGeometry(entry.mesh.geometry, 15), material)
    outline.renderOrder = 2
    entry.mesh.add(outline)
    entry.outline = outline
  }

  private applySelection(): void {
    for (const entry of this.entries.values()) this.removeOutline(entry)
    const selected = this.selectedId ? this.entries.get(this.selectedId) : undefined
    if (!selected || !this.selectedId) {
      this.gizmo.detach()
      return
    }
    const group = [this.selectedId, ...this.extraIds]
    for (const id of group) {
      const entry = this.entries.get(id)
      if (entry) this.addOutline(entry, this.outlineMaterial)
    }
    if (this.model) {
      for (const part of this.model.parts) {
        if (!part.mirrorOf || !group.includes(part.mirrorOf)) continue
        const twin = this.entries.get(part.id)
        if (twin) this.addOutline(twin, this.twinOutlineMaterial)
      }
    }
    // No Pintar as alças saem do caminho.
    if (this.mode === 'paint' || this.tool === 'snap' || this.placementShape) {
      this.gizmo.detach()
      return
    }
    // Editando a malha desta peça: a alça é da SELEÇÃO (âncora), não da peça.
    if (this.meshEdit?.partId === this.selectedId) {
      if (this.gizmo.object === selected.mesh) this.gizmo.detach()
      return
    }
    // Grupo: a peça principal pode estar trancada; a alça continua disponível para
    // as demais. Só um grupo inteiramente trancado fica sem transformação.
    if (this.extraIds.length > 0) {
      if (group.every((id) => this.isLocked(id))) {
        this.gizmo.detach()
        return
      }
      const center = new Vector3()
      let count = 0
      for (const id of group) {
        const entry = this.entries.get(id)
        if (!entry) continue
        center.add(entry.mesh.position)
        count += 1
      }
      if (count > 0) center.divideScalar(count)
      this.groupAnchor.position.copy(center)
      this.groupAnchor.quaternion.identity()
      this.groupAnchor.updateMatrixWorld(true)
      if (this.gizmo.object !== this.groupAnchor) this.gizmo.attach(this.groupAnchor)
      this.gizmo.setMode('translate')
      this.gizmo.setSpace('world')
      return
    }
    // Peça trancada ou escondida: sem alça (a lista destranca/mostra).
    if (this.isLocked(this.selectedId) || this.isHidden(this.selectedId)) {
      this.gizmo.detach()
      return
    }
    if (this.gizmo.object === this.groupAnchor) this.gizmo.detach()
    this.gizmo.attach(selected.mesh)
    this.gizmo.setMode(GIZMO_MODE[this.tool])
    this.gizmo.setSpace('world')
  }

  // ── Alças ─────────────────────────────────────────────────────────────────

  private readonly onDraggingChanged = (event: { value: unknown }): void => {
    this.orbit.enabled = !event.value
  }

  private readonly onGizmoMouseDown = (): void => {
    if (this.meshEdit && this.gizmo.object === this.meshAnchor) {
      this.meshDragging = true
      this.meshDragStart.copy(this.meshAnchor.position)
      this.callbacks.onMeshDragStart()
      return
    }
    if (this.gizmo.object === this.groupAnchor && this.model && this.selectedId) {
      this.groupDragging = true
      this.groupDragStart.copy(this.groupAnchor.position)
      this.groupStart = new Map()
      for (const id of [this.selectedId, ...this.extraIds]) {
        const item = this.model.parts.find((candidate) => candidate.id === id)
        if (item && !item.locked) this.groupStart.set(id, { from: item.from, to: item.to })
      }
      this.callbacks.onDragStart(this.selectedId)
      return
    }
    const part = this.selectedPart()
    const entry = this.selectedId ? this.entries.get(this.selectedId) : undefined
    if (!part || !entry || part.locked || part.hidden) return
    this.dragging = true
    this.dragPart = part
    this.dragStartPivot.copy(entry.mesh.position)
    this.callbacks.onDragStart(part.id)
  }

  private readonly onGizmoObjectChange = (): void => {
    if (this.meshDragging && this.meshEdit) {
      const entry = this.entries.get(this.meshEdit.partId)
      if (!entry) return
      // Delta em coordenadas da CAIXA: o espaço local do mesh é a caixa menos o
      // pivô (só translação), então desfazer o giro da peça basta.
      const start = entry.mesh.worldToLocal(this.meshDragStart.clone())
      const now = entry.mesh.worldToLocal(this.meshAnchor.position.clone())
      this.callbacks.onMeshDragMove([now.x - start.x, now.y - start.y, now.z - start.z])
      this.requestFrame()
      return
    }
    if (this.groupDragging) {
      // O delta é UM só, encaixado e preso à grade pelo grupo inteiro; cada peça
      // recebe a caixa ABSOLUTA de destino (o editor não acumula nada).
      const delta = this.groupAnchor.position.clone().sub(this.groupDragStart)
      const snapped: Vec3 = [
        roundTo(delta.x, this.snap),
        roundTo(delta.y, this.snap),
        roundTo(delta.z, this.snap),
      ]
      const gridMin: Vec3 = [-MOLDA_LIMITS.gridHalf, 0, -MOLDA_LIMITS.gridHalf]
      const gridMax: Vec3 = [MOLDA_LIMITS.gridHalf, MOLDA_LIMITS.gridHeight, MOLDA_LIMITS.gridHalf]
      for (const box of this.groupStart.values()) {
        for (let i = 0; i < 3; i += 1) {
          const lo = (gridMin[i] as number) - (box.from[i] as number)
          const hi = (gridMax[i] as number) - (box.to[i] as number)
          snapped[i] = Math.min(Math.max(snapped[i] as number, lo), hi)
        }
      }
      this.groupAnchor.position.set(
        this.groupDragStart.x + snapped[0],
        this.groupDragStart.y + snapped[1],
        this.groupDragStart.z + snapped[2],
      )
      const parts = [...this.groupStart.entries()].map(([id, box]) => ({
        id,
        from: [
          box.from[0] + snapped[0],
          box.from[1] + snapped[1],
          box.from[2] + snapped[2],
        ] as Vec3,
        to: [box.to[0] + snapped[0], box.to[1] + snapped[1], box.to[2] + snapped[2]] as Vec3,
      }))
      this.callbacks.onDragMove({ id: this.selectedId ?? '', parts })
      this.requestFrame()
      return
    }
    const part = this.dragPart
    const entry = part ? this.entries.get(part.id) : undefined
    if (!part || !entry || !this.dragging) return
    const mesh = entry.mesh
    if (this.tool === 'move') {
      const delta = mesh.position.clone().sub(this.dragStartPivot)
      const snapped: Vec3 = [
        roundTo(delta.x, this.snap),
        roundTo(delta.y, this.snap),
        roundTo(delta.z, this.snap),
      ]
      const gridMin: Vec3 = [-MOLDA_LIMITS.gridHalf, 0, -MOLDA_LIMITS.gridHalf]
      const gridMax: Vec3 = [MOLDA_LIMITS.gridHalf, MOLDA_LIMITS.gridHeight, MOLDA_LIMITS.gridHalf]
      for (let i = 0; i < 3; i += 1) {
        const lo = (gridMin[i] as number) - (part.from[i] as number)
        const hi = (gridMax[i] as number) - (part.to[i] as number)
        snapped[i] = Math.min(Math.max(snapped[i] as number, lo), hi)
      }
      mesh.position.set(
        this.dragStartPivot.x + snapped[0],
        this.dragStartPivot.y + snapped[1],
        this.dragStartPivot.z + snapped[2],
      )
      this.callbacks.onDragMove({
        id: part.id,
        from: [part.from[0] + snapped[0], part.from[1] + snapped[1], part.from[2] + snapped[2]],
        to: [part.to[0] + snapped[0], part.to[1] + snapped[1], part.to[2] + snapped[2]],
      })
    } else if (this.tool === 'rotate') {
      const rotation = normalizeRotation([
        deg(mesh.rotation.x),
        deg(mesh.rotation.y),
        deg(mesh.rotation.z),
      ])
      mesh.rotation.set(rad(rotation[0]), rad(rotation[1]), rad(rotation[2]), 'XYZ')
      this.callbacks.onDragMove({ id: part.id, rotation })
    } else if (this.tool === 'scale') {
      mesh.scale.set(
        Math.max(mesh.scale.x, MIN_SCALE),
        Math.max(mesh.scale.y, MIN_SCALE),
        Math.max(mesh.scale.z, MIN_SCALE),
      )
    }
    this.requestFrame()
  }

  private readonly onGizmoMouseUp = (): void => {
    if (this.meshDragging) {
      this.meshDragging = false
      this.callbacks.onMeshDragEnd()
      // A âncora volta ao centro da seleção (os vértices encaixaram na grade).
      this.syncMeshEdit()
      this.requestFrame()
      return
    }
    if (this.groupDragging) {
      this.groupDragging = false
      this.groupStart = new Map()
      this.callbacks.onDragEnd(null)
      // A âncora volta ao centro do grupo (as peças encaixaram na grade).
      this.applySelection()
      this.requestFrame()
      return
    }
    const part = this.dragPart
    const entry = part ? this.entries.get(part.id) : undefined
    this.dragging = false
    this.dragPart = null
    if (!part || !entry) {
      this.callbacks.onDragEnd(null)
      return
    }
    if (this.tool !== 'scale') {
      this.callbacks.onDragEnd(null)
      return
    }
    const mesh = entry.mesh
    const size = partSize(part)
    const pivot = partPivot(part)
    const scale: Vec3 = [mesh.scale.x, mesh.scale.y, mesh.scale.z]
    mesh.scale.set(1, 1, 1)
    const from: Vec3 = [0, 0, 0]
    const to: Vec3 = [0, 0, 0]
    for (let i = 0; i < 3; i += 1) {
      const current = size[i] as number
      const next = Math.min(
        Math.max(roundTo(current * (scale[i] as number), this.snap), this.snap),
        MOLDA_LIMITS.maxPartSize,
      )
      const fraction =
        current > 0 ? ((pivot[i] as number) - (part.from[i] as number)) / current : 0.5
      from[i] = roundTo((pivot[i] as number) - fraction * next, this.snap)
      to[i] = (from[i] as number) + next
    }
    this.callbacks.onDragEnd({ id: part.id, from, to })
    this.requestFrame()
  }

  // ── Toque / seleção / pintura ─────────────────────────────────────────────

  private ndcOf(event: PointerEvent): Vector2 | null {
    const rect = this.canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    return new Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
  }

  private intersect(event: PointerEvent): Intersection | null {
    const ndc = this.ndcOf(event)
    if (!ndc) return null
    this.raycaster.setFromCamera(ndc, this.camera)
    // Escondida não existe para o toque; trancada deixa o toque passar (escolhe o que há atrás).
    const meshes = [...this.entries.entries()]
      .filter(([id, entry]) => entry.mesh.visible && !this.isLocked(id))
      .map(([, entry]) => entry.mesh)
    return this.raycaster.intersectObjects(meshes, false)[0] ?? null
  }

  private intersectSurface(event: PointerEvent): Intersection | null {
    const ndc = this.ndcOf(event)
    if (!ndc) return null
    this.raycaster.setFromCamera(ndc, this.camera)
    const surfaces = [...this.entries.values()]
      .filter((entry) => entry.mesh.visible)
      .map((entry) => entry.mesh)
    surfaces.push(this.floor)
    return this.raycaster.intersectObjects(surfaces, false)[0] ?? null
  }

  /** Alvo do Grudar: visível, pode estar trancado, mas não pode viajar com a origem. */
  private intersectSnapTarget(event: PointerEvent): Intersection | null {
    if (this.snapState.phase !== 'target' || !this.model) return null
    const ndc = this.ndcOf(event)
    if (!ndc) return null
    this.raycaster.setFromCamera(ndc, this.camera)
    return raycastSnapTarget(
      this.raycaster,
      this.displayModel(this.model),
      this.snapState.movingIds,
      (partId) => this.entries.get(partId)?.mesh,
    )
  }

  private snapHitRadius(event: PointerEvent): number {
    return event.pointerType === 'touch' ? 22 : 10
  }

  /** Atualiza os diamantes só para a peça sob o ponteiro e devolve o mais próximo. */
  private updateSnapTarget(event: PointerEvent): SnapAnchor | null {
    const ndc = this.ndcOf(event)
    if (!ndc) return null
    const hit = this.intersectSnapTarget(event)
    const partId = hit?.object.userData.partId as string | undefined
    this.snapOverlay.setTargetPart(partId ?? null)
    const rect = this.canvas.getBoundingClientRect()
    const anchor = this.snapOverlay.pickTarget(
      ndc,
      this.camera,
      rect.width,
      rect.height,
      this.snapHitRadius(event),
    )
    this.snapOverlay.setHoveredTarget(anchor)
    this.requestFrame()
    return anchor
  }

  /** Toque na malha → texel da peça FONTE (gêmeo já resolvido). */
  private texelOf(model: MoldaModelAsset, hit: Intersection): TexelHit | null {
    const partId = hit.object.userData.partId as string | undefined
    const entry = partId ? this.entries.get(partId) : undefined
    const part = partId ? model.parts.find((item) => item.id === partId) : undefined
    if (!entry || !part || hit.faceIndex === undefined || hit.faceIndex === null) return null
    const face = entry.resource.faceOfTriangle[hit.faceIndex]
    if (!face) return null
    const local = worldToBox(part, [hit.point.x, hit.point.y, hit.point.z])
    const texel = faceTexelAt(part, face, local, model.texelsPerUnit)
    if (!texel) return null
    return resolveTexelHit(model, part, face, texel.x, texel.y)
  }

  private mirrorTexelOf(model: MoldaModelAsset, hit: Intersection): TexelHit | null {
    if (!this.paint.mirror) return null
    // O toque direto passa pelo `intersect` (que pula escondida e trancada); o ponto
    // espelhado tem de respeitar a mesma régua.
    const reachable = {
      ...model,
      parts: model.parts.filter((part) => !part.hidden && !part.locked),
    }
    return pickTexelAtPoint(reachable, [-hit.point.x, hit.point.y, hit.point.z])
  }

  private faceTargetOf(
    model: MoldaModelAsset,
    hit: Intersection,
    texel: TexelHit,
  ): FacePaintTarget {
    const partId = hit.object.userData.partId as string | undefined
    const touched = partId ? model.parts.find((part) => part.id === partId) : undefined
    return { partId: texel.partId, face: texel.face, flipX: Boolean(touched?.mirrorOf) }
  }

  private readonly onPointerDownCapture = (event: PointerEvent): void => {
    if (this.mode === 'build' && this.tool === 'snap' && event.button === 0) {
      // O toque é da ferramenta, não da órbita. O pointerup conclui somente se
      // continuar sendo um toque curto.
      event.stopImmediatePropagation()
      event.preventDefault()
      this.pointerDown = {
        x: event.clientX,
        y: event.clientY,
        pointerId: event.pointerId,
        onGizmo: false,
      }
      if (this.snapState.phase === 'target') this.updateSnapTarget(event)
      return
    }
    if (this.mode !== 'paint' || event.button !== 0 || !this.model || this.stroke) return
    const hit = this.intersect(event)
    if (!hit) return
    const model = this.model
    const texel = this.texelOf(model, hit)
    if (!texel) return
    // O gesto é nosso: a órbita não vê este toque.
    event.stopImmediatePropagation()
    event.preventDefault()
    this.callbacks.onSelect(texel.partId, false)
    const mirror = this.mirrorTexelOf(model, hit)
    switch (this.paint.tool) {
      case 'faceEditor':
        this.callbacks.onOpenFace(this.faceTargetOf(model, hit, texel))
        return
      case 'picker':
        this.callbacks.onPickColor(sampleColor(model, texel))
        return
      case 'fillPart': {
        this.callbacks.onPaintStart()
        let next = updatePart(model, texel.partId, { color: this.paint.color })
        if (mirror && mirror.partId !== texel.partId) {
          next = updatePart(next, mirror.partId, { color: this.paint.color })
        }
        this.applyModel(next)
        this.callbacks.onPaintEnd(next)
        return
      }
      case 'rotateSkin': {
        let next = rotateFaceSkin(model, texel.partId, texel.face)
        // Espelho de pintura: a face espelhada gira no sentido oposto (3 × 90°), como o
        // lápis e o balde fazem do outro lado.
        if (mirror && (mirror.partId !== texel.partId || mirror.face !== texel.face)) {
          for (let turn = 0; turn < 3; turn += 1) {
            next = rotateFaceSkin(next, mirror.partId, mirror.face)
          }
        }
        if (next === model) return
        this.callbacks.onPaintStart()
        this.applyModel(next)
        this.callbacks.onPaintEnd(next)
        return
      }
      case 'fillFace': {
        this.callbacks.onPaintStart()
        let next = fillFace(model, texel, this.paint.color)
        if (mirror) next = fillFace(next, mirror, this.paint.color)
        next = finishStroke(next)
        this.applyModel(next)
        this.callbacks.onPaintEnd(next)
        return
      }
      default: {
        this.callbacks.onPaintStart()
        this.stroke = { pointerId: event.pointerId, model, last: null, lastMirror: null }
        try {
          this.canvas.setPointerCapture(event.pointerId)
        } catch {
          // Sem pointer capture (testes): o gesto segue pelos eventos do canvas.
        }
        this.paintAt(texel, mirror)
      }
    }
  }

  private paintAt(texel: TexelHit, mirror: TexelHit | null): void {
    const stroke = this.stroke
    if (!stroke) return
    const color = this.paint.tool === 'eraser' ? 0 : this.paint.color
    let next = paintSegment(stroke.model, stroke.last, texel, color, this.paint.size)
    if (mirror) next = paintSegment(next, stroke.lastMirror, mirror, color, this.paint.size)
    stroke.last = texel
    stroke.lastMirror = mirror
    if (next !== stroke.model) {
      stroke.model = next
      this.applyModel(next)
    }
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.mode === 'build' && this.tool === 'snap' && this.snapState.phase === 'target') {
      this.updateSnapTarget(event)
      return
    }
    const stroke = this.stroke
    if (!stroke || event.pointerId !== stroke.pointerId) return
    const hit = this.intersect(event)
    if (!hit) {
      // Saiu da malha: o próximo toque começa um segmento novo.
      stroke.last = null
      stroke.lastMirror = null
      return
    }
    const texel = this.texelOf(stroke.model, hit)
    if (!texel) return
    this.paintAt(texel, this.mirrorTexelOf(stroke.model, hit))
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (
      (this.dragging || this.meshDragging || this.groupDragging) &&
      this.pointerDown &&
      this.pointerDown.pointerId !== event.pointerId
    )
      return
    this.pointerDown = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
      onGizmo: this.gizmo.axis !== null,
    }
  }

  private readonly onPointerCancel = (event: PointerEvent): void => {
    const active = this.stroke !== null || this.dragging || this.meshDragging || this.groupDragging
    if (event.pointerId !== (this.stroke?.pointerId ?? this.pointerDown?.pointerId)) return
    this.cancelGesture()
    if (active) this.callbacks.onGestureCancel()
  }

  private readonly onLostPointerCapture = (event: PointerEvent): void => {
    // TransformControls releases capture before announcing mouseUp. A normal
    // release must still commit; cancellation has its own pointercancel event.
    if (event.buttons !== 0) this.onPointerCancel(event)
  }

  private readonly onPointerUp = (event: PointerEvent): void => {
    const stroke = this.stroke
    if (stroke && event.pointerId === stroke.pointerId) {
      this.stroke = null
      try {
        this.canvas.releasePointerCapture(event.pointerId)
      } catch {
        // Já solto.
      }
      const after = finishStroke(stroke.model)
      this.applyModel(after)
      this.callbacks.onPaintEnd(after)
      return
    }
    const down = this.pointerDown
    this.pointerDown = null
    if (!down || down.onGizmo || event.button !== 0 || this.mode === 'paint') return
    const clickTolerance =
      this.tool === 'snap' && event.pointerType === 'touch'
        ? this.snapHitRadius(event)
        : CLICK_TOLERANCE_PX
    if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > clickTolerance) return
    if (this.tool === 'snap') {
      const ndc = this.ndcOf(event)
      if (!ndc) return
      const rect = this.canvas.getBoundingClientRect()
      if (this.snapState.phase === 'source') {
        const anchor = this.snapOverlay.pickSource(
          ndc,
          this.camera,
          rect.width,
          rect.height,
          this.snapHitRadius(event),
        )
        if (anchor) this.callbacks.onSnapSource(anchor)
      } else if (this.snapState.phase === 'target') {
        const anchor = this.updateSnapTarget(event)
        if (anchor) this.callbacks.onSnapTarget(anchor)
      }
      return
    }
    if (this.meshEdit && !this.placementShape) {
      // Editando a malha: o toque escolhe ponto/aresta/face DESTA peça; fora dela limpa.
      const hit = this.intersect(event)
      const partId = hit?.object.userData.partId as string | undefined
      const onPart = hit !== null && partId === this.meshEdit.partId
      const entry = this.entries.get(this.meshEdit.partId)
      const face =
        onPart && hit.faceIndex !== undefined && hit.faceIndex !== null
          ? (entry?.resource.faceOfTriangle[hit.faceIndex] ?? null)
          : null
      const tolerance =
        event.pointerType === 'touch' ? MESH_PICK_TOLERANCE_TOUCH_PX : MESH_PICK_TOLERANCE_MOUSE_PX
      // Sem superfície da peça sob o toque (a silhueta, um ponto puxado para fora) a folga
      // em pixels ainda vale: só o que estiver mais perto que a superfície tocada conta.
      const pick = this.meshOverlay.pick(
        this.raycaster.ray,
        this.camera,
        tolerance,
        this.canvas.clientHeight,
        hit ? hit.distance : Number.POSITIVE_INFINITY,
        face,
        this.meshEdit.mode,
      )
      this.callbacks.onMeshPick(pick, event.shiftKey)
      return
    }
    if (this.placementShape) {
      const hit = this.intersectSurface(event)
      if (!hit) return
      const rawPartId = hit.object.userData.partId as string | undefined
      const part = rawPartId ? this.model?.parts.find((item) => item.id === rawPartId) : undefined
      const normal =
        hit.object === this.floor
          ? new Vector3(0, 1, 0)
          : (hit.face?.normal.clone().transformDirection(hit.object.matrixWorld) ??
            new Vector3(0, 1, 0))
      this.callbacks.onPlace(
        this.placementShape,
        [hit.point.x, hit.point.y, hit.point.z],
        [normal.x, normal.y, normal.z],
        part?.mirrorOf ?? rawPartId ?? null,
      )
      return
    }
    const hit = this.intersect(event)
    if (!hit) {
      this.callbacks.onSelect(null, event.shiftKey)
      return
    }
    const partId = hit.object.userData.partId as string | undefined
    if (!partId) return
    const part = this.model?.parts.find((item) => item.id === partId)
    this.callbacks.onSelect(part?.mirrorOf ?? partId, event.shiftKey)
  }

  private readonly onContextMenu = (event: Event): void => {
    event.preventDefault()
  }

  private readonly onOrbitChange = (): void => {
    this.requestFrame()
  }

  private readonly onContextLost = (event: Event): void => {
    event.preventDefault()
    const active = this.stroke !== null || this.dragging || this.meshDragging || this.groupDragging
    this.cancelGesture()
    if (active) this.callbacks.onGestureCancel()
  }

  private readonly onContextRestored = (): void => {
    this.atlasResource.restore()
    this.requestFrame()
  }

  private selectedPart(): MoldaPart | null {
    if (!this.model || !this.selectedId) return null
    return this.model.parts.find((part) => part.id === this.selectedId) ?? null
  }
}
