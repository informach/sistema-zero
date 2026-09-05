/**
 * O palco 3D (three.js cru, sem React dentro).
 *
 * - UM `MeshStandardMaterial` com o ATLAS como `map` e um `Mesh` por peça:
 *   128 peças = 128 draw calls, folga para 60 fps. A fusão em uma malha só
 *   acontece no export, onde valem os tetos do runtime do Estúdio.
 * - Render SOB DEMANDA: `requestFrame()` coalesce num rAF; o laço só continua
 *   enquanto o amortecimento da órbita assenta (desligado com
 *   `prefers-reduced-motion`).
 * - `setModel` é incremental por id: peça sem mudança de forma/tamanho/cor/
 *   layout mantém a geometria; só a transformação é reaplicada (barato). O
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
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  GridHelper,
  HemisphereLight,
  type Intersection,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { MOLDA_LIMITS } from '../core/limits'
import type { FaceId, MoldaModelAsset, MoldaPart, ShapeId, Vec3 } from '../core/model'
import { normalizeRotation, resolvePaletteColors } from '../core/sanitize'
import {
  type AtlasLayout,
  atlasKey,
  mapFaceUv,
  packAtlas,
  packAtlasFallback,
  packAtlasIncremental,
} from '../model/atlas'
import { rasterAtlas, rasterFaceRegion } from '../model/atlasRaster'
import { buildPartGeometry } from '../model/geometry'
import { updatePart } from '../model/partOps'
import {
  faceTexelAt,
  pickTexelAtPoint,
  resolveTexelHit,
  type TexelHit,
  worldToBox,
} from '../model/pick'
import { partSize } from '../model/shapes'
import { modelBounds, partPivot } from '../model/transform'
import {
  fillFace,
  finishStroke,
  type PaintSettings,
  paintSegment,
  sampleColor,
} from '../paint/stroke'
import type { EditorMode, TransformTool } from '../state/sessionStore'
import { AtlasTexture } from './atlasTexture'
import { perspectiveFitDistance } from './cameraFit'
import type { MoldaViewportLike, ViewName, ViewportCallbacks, ViewportOptions } from './types'

interface PartEntry {
  mesh: Mesh
  geometryHash: string
  outline: LineSegments | null
  faceOfTriangle: FaceId[]
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
const THUMB_SIZE = 96
const CLICK_TOLERANCE_PX = 6
const MIN_SCALE = 0.05

const VIEW_DIRECTIONS: Record<Exclude<ViewName, 'frame'>, Vec3> = {
  front: [0, 0.18, 1],
  back: [0, 0.18, -1],
  left: [-1, 0.18, 0],
  right: [1, 0.18, 0],
  // Um fio de +z: com o eixo "para cima" do three em Y, a vista de cima fica
  // alinhada com a grade (a frente embaixo) em vez de girada 45°.
  top: [0, 1, 0.001],
}

const GIZMO_MODE: Record<TransformTool, 'translate' | 'rotate' | 'scale'> = {
  move: 'translate',
  rotate: 'rotate',
  scale: 'scale',
}

function rad(deg: number): number {
  return (deg * Math.PI) / 180
}

function deg(radians: number): number {
  return (radians * 180) / Math.PI
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step
}

function geometryHash(part: MoldaPart, layoutVersion: number): string {
  const pivot = partPivot(part)
  const size = partSize(part)
  return [
    part.shape,
    size.join(','),
    [part.from[0] - pivot[0], part.from[1] - pivot[1], part.from[2] - pivot[2]].join(','),
    part.color,
    part.mirrorOf ?? '',
    layoutVersion,
  ].join('|')
}

export class MoldaViewport implements MoldaViewportLike {
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera: PerspectiveCamera
  private readonly orbit: OrbitControls
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
  private readonly resizeObserver: ResizeObserver | null
  private readonly thumbBackground: string
  private thumbTarget: WebGLRenderTarget | null = null
  private thumbCamera: PerspectiveCamera | null = null
  private model: MoldaModelAsset | null = null
  private layout: AtlasLayout | null = null
  private layoutVersion = 0
  private atlas: AtlasTexture | null = null
  private atlasFull = false
  private colorsSignature = ''
  private selectedId: string | null = null
  private mode: EditorMode = 'build'
  private tool: TransformTool = 'move'
  private placementShape: ShapeId | null = null
  private paint: PaintSettings = { tool: 'pencil', color: 1, size: 1, mirror: false }
  private snap = 1
  private frameHandle: number | null = null
  private disposed = false
  private dragging = false
  private dragPart: MoldaPart | null = null
  private dragStartPivot = new Vector3()
  private pointerDown: { x: number; y: number; onGizmo: boolean } | null = null
  private stroke: Stroke | null = null

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly callbacks: ViewportCallbacks,
    options: ViewportOptions = {},
  ) {
    this.thumbBackground = options.thumbBackground ?? DEFAULT_THUMB_BACKGROUND
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setClearColor(0x000000, 0)

    this.camera = new PerspectiveCamera(45, 1, 0.1, 500)
    this.camera.position.set(16, 12, 20)

    const hemisphere = new HemisphereLight(0xffffff, 0x7f8fa8, 1.4)
    const sun = new DirectionalLight(0xffffff, 2.2)
    sun.position.set(12, 24, 10)
    const fill = new DirectionalLight(0xffffff, 0.5)
    fill.position.set(-14, 8, -12)
    this.scene.add(hemisphere, sun, fill)

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

    this.orbit = new OrbitControls(this.camera, canvas)
    this.orbit.enableDamping = !options.reducedMotion
    this.orbit.dampingFactor = 0.08
    this.orbit.maxPolarAngle = Math.PI / 2 - 0.04
    this.orbit.minDistance = 3
    this.orbit.maxDistance = 140
    this.orbit.target.set(0, 2, 0)
    this.orbit.update()
    this.orbit.addEventListener('change', this.onOrbitChange)

    this.gizmo = new TransformControls(this.camera, canvas)
    this.gizmo.setSize(1.5)
    this.gizmo.setRotationSnap(rad(15))
    this.gizmoHelper = this.gizmo.getHelper()
    this.scene.add(this.gizmoHelper)
    this.gizmo.addEventListener('dragging-changed', this.onDraggingChanged)
    this.gizmo.addEventListener('mouseDown', this.onGizmoMouseDown)
    this.gizmo.addEventListener('objectChange', this.onGizmoObjectChange)
    this.gizmo.addEventListener('mouseUp', this.onGizmoMouseUp)

    // Captura: roda ANTES do OrbitControls, que escuta o mesmo canvas.
    canvas.addEventListener('pointerdown', this.onPointerDownCapture, { capture: true })
    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('pointerup', this.onPointerUp)
    canvas.addEventListener('pointercancel', this.onPointerUp)
    canvas.addEventListener('contextmenu', this.onContextMenu)
    canvas.addEventListener('webglcontextlost', this.onContextLost)
    canvas.addEventListener('webglcontextrestored', this.onContextRestored)

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize())
      this.resizeObserver.observe(canvas.parentElement ?? canvas)
    } else {
      this.resizeObserver = null
    }
    this.resize()
  }

  // ── Modelo ────────────────────────────────────────────────────────────────

  setModel(model: MoldaModelAsset): void {
    if (this.disposed) return
    // Durante um gesto de pintura o modelo de trabalho manda; o editor recebe
    // o resultado no soltar e volta a chamar aqui.
    if (this.stroke) return
    this.applyModel(model)
  }

  private applyModel(model: MoldaModelAsset): void {
    const previous = this.model
    const colors = resolvePaletteColors(model)
    const colorsSignature = colors.join(',')
    const paletteChanged = colorsSignature !== this.colorsSignature

    // 1. Atlas: reempacota só quando a lista de faces pintadas muda.
    const key = atlasKey(model)
    let relayout = false
    if (!this.layout || this.layout.key !== key) {
      const packed = this.layout ? packAtlasIncremental(model, this.layout) : packAtlas(model)
      if (packed.ok) {
        this.layout = packed.layout
        this.atlasFull = false
        relayout = true
      } else {
        this.layout = packAtlasFallback(model)
        this.atlasFull = true
        relayout = true
      }
      this.callbacks.onAtlas({ size: this.layout.size, full: this.atlasFull })
    }
    const layout = this.layout
    if (!layout) return

    if (relayout || paletteChanged || !this.atlas) {
      this.atlas?.dispose()
      this.atlas = new AtlasTexture(rasterAtlas(model, layout), layout.size)
      this.material.map = this.atlas.texture
      this.material.needsUpdate = true
      this.layoutVersion += 1
      this.colorsSignature = colorsSignature
    } else if (previous) {
      // 2. Re-raster só das peles que mudaram (a pincelada) e das faces de uma
      //    peça que trocou de cor base (o índice 0 é a cor base).
      const before = new Map(previous.parts.map((part) => [part.id, part]))
      for (const part of model.parts) {
        if (part.mirrorOf) continue
        const old = before.get(part.id)
        const colorChanged = old !== undefined && old.color !== part.color
        for (const face of Object.keys(part.faces) as FaceId[]) {
          const skin = part.faces[face]
          if (!skin) continue
          if (!colorChanged && old?.faces[face] === skin) continue
          const rows = rasterFaceRegion(this.atlas.pixels, layout, colors, part, face)
          if (rows) this.atlas.markRows(rows)
        }
      }
    }

    // 3. Meshes.
    const seen = new Set<string>()
    let selectionDirty = false
    for (const part of model.parts) {
      seen.add(part.id)
      const source =
        (part.mirrorOf ? model.parts.find((p) => p.id === part.mirrorOf) : undefined) ?? part
      const hash = geometryHash(part, this.layoutVersion)
      let entry = this.entries.get(part.id)
      if (entry && entry.geometryHash !== hash) {
        this.disposeEntry(entry)
        entry = undefined
      }
      if (!entry) {
        entry = this.createEntry(part, source, layout, hash)
        this.entries.set(part.id, entry)
        if (part.id === this.selectedId || part.mirrorOf === this.selectedId) selectionDirty = true
      }
      this.syncTransform(entry, part)
    }
    for (const [id, entry] of this.entries) {
      if (seen.has(id)) continue
      this.disposeEntry(entry)
      this.entries.delete(id)
      if (id === this.selectedId) selectionDirty = true
    }
    this.model = model
    if (selectionDirty) this.applySelection()
    this.requestFrame()
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
    this.gizmo.setMode(GIZMO_MODE[tool])
    this.requestFrame()
  }

  setPlacementShape(shape: ShapeId | null): void {
    this.placementShape = shape
    this.canvas.style.cursor = shape ? 'crosshair' : ''
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

  setView(view: ViewName): void {
    const bounds = this.model ? modelBounds(this.model) : null
    const min = bounds?.min ?? [-2, 0, -2]
    const max = bounds?.max ?? [2, 2, 2]
    const center = new Vector3((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2)
    const radius = Math.max(
      new Vector3(max[0] - min[0], max[1] - min[1], max[2] - min[2]).length() / 2,
      1.5,
    )
    const distance = Math.max(
      perspectiveFitDistance(radius, this.camera.fov, this.camera.aspect) * 1.15,
      4,
    )
    const direction =
      view === 'frame'
        ? this.camera.position.clone().sub(this.orbit.target).normalize()
        : new Vector3(...VIEW_DIRECTIONS[view]).normalize()
    if (direction.lengthSq() === 0) direction.set(0, 0.18, 1).normalize()
    this.camera.position.copy(center).addScaledVector(direction, distance)
    this.orbit.target.copy(center)
    this.orbit.update()
    this.requestFrame()
  }

  // ── Miniatura ─────────────────────────────────────────────────────────────

  renderThumb(): string | null {
    if (this.disposed || !this.model || this.model.parts.length === 0) return null
    if (typeof document === 'undefined') return null
    const bounds = modelBounds(this.model)
    if (!bounds) return null
    const { min, max } = bounds
    const center = new Vector3((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2)
    const radius = Math.max(
      new Vector3(max[0] - min[0], max[1] - min[1], max[2] - min[2]).length() / 2,
      1,
    )
    const camera = this.thumbCamera ?? new PerspectiveCamera(40, 1, 0.1, 500)
    this.thumbCamera = camera
    const distance = (radius / Math.sin(rad(camera.fov) / 2)) * 1.1
    camera.position.copy(center).addScaledVector(new Vector3(1, 0.75, 1.35).normalize(), distance)
    camera.lookAt(center)
    camera.updateProjectionMatrix()

    const target =
      this.thumbTarget ??
      new WebGLRenderTarget(THUMB_SIZE, THUMB_SIZE, { colorSpace: SRGBColorSpace })
    this.thumbTarget = target

    const gridWasVisible = this.grid.visible
    const helperWasVisible = this.gizmoHelper.visible
    this.grid.visible = false
    this.gizmoHelper.visible = false
    for (const entry of this.entries.values()) if (entry.outline) entry.outline.visible = false

    const previousTarget = this.renderer.getRenderTarget()
    const previousClear = new Color()
    this.renderer.getClearColor(previousClear)
    const previousAlpha = this.renderer.getClearAlpha()
    let url: string | null = null
    try {
      this.renderer.setRenderTarget(target)
      this.renderer.setClearColor(new Color(this.thumbBackground), 1)
      this.renderer.clear()
      this.renderer.render(this.scene, camera)
      const pixels = new Uint8Array(THUMB_SIZE * THUMB_SIZE * 4)
      this.renderer.readRenderTargetPixels(target, 0, 0, THUMB_SIZE, THUMB_SIZE, pixels)
      url = encodeThumb(pixels, THUMB_SIZE)
    } catch {
      url = null
    } finally {
      this.renderer.setRenderTarget(previousTarget)
      this.renderer.setClearColor(previousClear, previousAlpha)
      this.grid.visible = gridWasVisible
      this.gizmoHelper.visible = helperWasVisible
      for (const entry of this.entries.values()) if (entry.outline) entry.outline.visible = true
      this.requestFrame()
    }
    return url
  }

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    if (this.frameHandle !== null) cancelAnimationFrame(this.frameHandle)
    this.resizeObserver?.disconnect()
    this.canvas.removeEventListener('pointerdown', this.onPointerDownCapture, { capture: true })
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.canvas.removeEventListener('pointerup', this.onPointerUp)
    this.canvas.removeEventListener('pointercancel', this.onPointerUp)
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
    for (const entry of this.entries.values()) this.disposeEntry(entry)
    this.entries.clear()
    this.grid.geometry.dispose()
    ;(this.grid.material as LineBasicMaterial).dispose()
    this.floor.geometry.dispose()
    this.floor.material.dispose()
    this.atlas?.dispose()
    this.material.dispose()
    this.outlineMaterial.dispose()
    this.twinOutlineMaterial.dispose()
    this.thumbTarget?.dispose()
    this.renderer.dispose()
  }

  requestFrame(): void {
    if (this.disposed || this.frameHandle !== null) return
    this.frameHandle = requestAnimationFrame(() => {
      this.frameHandle = null
      this.renderOnce()
    })
  }

  private renderOnce(): void {
    if (this.disposed) return
    const moving = this.orbit.update()
    this.renderer.render(this.scene, this.camera)
    if (moving) this.requestFrame()
  }

  private resize(): void {
    const parent = this.canvas.parentElement ?? this.canvas
    const width = parent.clientWidth
    const height = parent.clientHeight
    if (width === 0 || height === 0) return
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.requestFrame()
  }

  // ── Peças ─────────────────────────────────────────────────────────────────

  private createEntry(
    part: MoldaPart,
    source: MoldaPart,
    layout: AtlasLayout,
    hash: string,
  ): PartEntry {
    const built = buildPartGeometry(part)
    const pivot = partPivot(part)
    const positions = new Float32Array(built.positions.length)
    for (let i = 0; i < built.positions.length; i += 3) {
      positions[i] = (built.positions[i] as number) - pivot[0]
      positions[i + 1] = (built.positions[i + 1] as number) - pivot[1]
      positions[i + 2] = (built.positions[i + 2] as number) - pivot[2]
    }
    const uvs = new Float32Array(built.uvs.length)
    for (let t = 0; t < built.triangleCount; t += 1) {
      const face = built.faceOfTriangle[t]
      if (!face) continue
      for (let v = 0; v < 3; v += 1) {
        const i = t * 6 + v * 2
        const [u, w] = mapFaceUv(
          layout,
          part,
          source,
          face,
          built.uvs[i] as number,
          built.uvs[i + 1] as number,
        )
        uvs[i] = u
        uvs[i + 1] = w
      }
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    geometry.setAttribute('normal', new Float32BufferAttribute(built.normals, 3))
    geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
    const mesh = new Mesh(geometry, this.material)
    mesh.userData.partId = part.id
    this.scene.add(mesh)
    return { mesh, geometryHash: hash, outline: null, faceOfTriangle: built.faceOfTriangle }
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
    if (this.gizmo.object === entry.mesh) this.gizmo.detach()
    this.scene.remove(entry.mesh)
    entry.mesh.geometry.dispose()
  }

  private removeOutline(entry: PartEntry): void {
    if (!entry.outline) return
    entry.mesh.remove(entry.outline)
    entry.outline.geometry.dispose()
    entry.outline = null
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
    if (!selected) {
      this.gizmo.detach()
      return
    }
    this.addOutline(selected, this.outlineMaterial)
    if (this.model) {
      for (const part of this.model.parts) {
        if (part.mirrorOf !== this.selectedId) continue
        const twin = this.entries.get(part.id)
        if (twin) this.addOutline(twin, this.twinOutlineMaterial)
      }
    }
    // No Pintar as alças saem do caminho.
    if (this.mode === 'paint' || this.placementShape) {
      this.gizmo.detach()
      return
    }
    this.gizmo.attach(selected.mesh)
    this.gizmo.setMode(GIZMO_MODE[this.tool])
  }

  // ── Alças ─────────────────────────────────────────────────────────────────

  private readonly onDraggingChanged = (event: { value: unknown }): void => {
    this.orbit.enabled = !event.value
  }

  private readonly onGizmoMouseDown = (): void => {
    const part = this.selectedPart()
    const entry = this.selectedId ? this.entries.get(this.selectedId) : undefined
    if (!part || !entry) return
    this.dragging = true
    this.dragPart = part
    this.dragStartPivot.copy(entry.mesh.position)
    this.callbacks.onDragStart(part.id)
  }

  private readonly onGizmoObjectChange = (): void => {
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
    } else {
      mesh.scale.set(
        Math.max(mesh.scale.x, MIN_SCALE),
        Math.max(mesh.scale.y, MIN_SCALE),
        Math.max(mesh.scale.z, MIN_SCALE),
      )
    }
    this.requestFrame()
  }

  private readonly onGizmoMouseUp = (): void => {
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
    const meshes = [...this.entries.values()].map((entry) => entry.mesh)
    return this.raycaster.intersectObjects(meshes, false)[0] ?? null
  }

  private intersectSurface(event: PointerEvent): Intersection | null {
    const ndc = this.ndcOf(event)
    if (!ndc) return null
    this.raycaster.setFromCamera(ndc, this.camera)
    const surfaces = [...this.entries.values()].map((entry) => entry.mesh)
    surfaces.push(this.floor)
    return this.raycaster.intersectObjects(surfaces, false)[0] ?? null
  }

  /** Toque na malha → texel da peça FONTE (gêmeo já resolvido). */
  private texelOf(model: MoldaModelAsset, hit: Intersection): TexelHit | null {
    const partId = hit.object.userData.partId as string | undefined
    const entry = partId ? this.entries.get(partId) : undefined
    const part = partId ? model.parts.find((item) => item.id === partId) : undefined
    if (!entry || !part || hit.faceIndex === undefined || hit.faceIndex === null) return null
    const face = entry.faceOfTriangle[hit.faceIndex]
    if (!face) return null
    const local = worldToBox(part, [hit.point.x, hit.point.y, hit.point.z])
    const texel = faceTexelAt(part, face, local, model.texelsPerUnit)
    if (!texel) return null
    return resolveTexelHit(model, part, face, texel.x, texel.y)
  }

  private mirrorTexelOf(model: MoldaModelAsset, hit: Intersection): TexelHit | null {
    if (!this.paint.mirror) return null
    return pickTexelAtPoint(model, [-hit.point.x, hit.point.y, hit.point.z])
  }

  private readonly onPointerDownCapture = (event: PointerEvent): void => {
    if (this.mode !== 'paint' || event.button !== 0 || !this.model || this.stroke) return
    const hit = this.intersect(event)
    if (!hit) return
    const model = this.model
    const texel = this.texelOf(model, hit)
    if (!texel) return
    // O gesto é nosso: a órbita não vê este toque.
    event.stopImmediatePropagation()
    event.preventDefault()
    this.callbacks.onSelect(texel.partId)
    const mirror = this.mirrorTexelOf(model, hit)
    switch (this.paint.tool) {
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
    this.pointerDown = { x: event.clientX, y: event.clientY, onGizmo: this.gizmo.axis !== null }
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
    if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > CLICK_TOLERANCE_PX) return
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
      this.callbacks.onSelect(null)
      return
    }
    const partId = hit.object.userData.partId as string | undefined
    if (!partId) return
    const part = this.model?.parts.find((item) => item.id === partId)
    this.callbacks.onSelect(part?.mirrorOf ?? partId)
  }

  private readonly onContextMenu = (event: Event): void => {
    event.preventDefault()
  }

  private readonly onOrbitChange = (): void => {
    this.requestFrame()
  }

  private readonly onContextLost = (event: Event): void => {
    event.preventDefault()
  }

  private readonly onContextRestored = (): void => {
    this.atlas?.markAll()
    this.requestFrame()
  }

  private selectedPart(): MoldaPart | null {
    if (!this.model || !this.selectedId) return null
    return this.model.parts.find((part) => part.id === this.selectedId) ?? null
  }
}

/** RGBA de baixo para cima (GL) → JPEG data URL dentro do teto do `thumb`. */
function encodeThumb(pixels: Uint8Array, size: number): string | null {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) return null
  const image = context.createImageData(size, size)
  const row = size * 4
  for (let y = 0; y < size; y += 1) {
    const source = (size - 1 - y) * row
    image.data.set(pixels.subarray(source, source + row), y * row)
  }
  context.putImageData(image, 0, 0)
  for (const quality of [0.72, 0.5, 0.35]) {
    const url = canvas.toDataURL('image/jpeg', quality)
    if (url.length <= MOLDA_LIMITS.maxThumbChars) return url
  }
  return null
}
