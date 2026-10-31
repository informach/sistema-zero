import type { Vec3 } from '../core/model'
import type { MoldaSceneDocument, Vec2 } from '../scene/document'
import type { ScenePaintInputSample, ScenePaintRgba, ScenePaintTarget } from '../scene/imagePaint'
import type { AffineMatrix } from '../scene/matrix'
import type { SceneComponentSelection } from '../scene/meshComponents'
import type { MeshKnifePoint } from '../scene/meshKnife'
import type { MeshCutPlane } from '../scene/meshPlaneCut'
import type { SceneAnimationPose } from '../scene/sampleAnimation'
import type { SceneSkinPaintSample } from '../scene/skinPaint'
import type { SceneCutPoint } from '../scene/solidCutPoints'
import type { SceneSkinPaintPreview } from '../state/sceneSkinPaintGesture'
import type { CapturedPaintActions } from './CapturedPaintInput'
import type { SceneAreaTool } from './SceneAreaSelection'
import type { ScenePreviewGuideState } from './ScenePreviewGuide'
import type { SceneSkinWeightTarget } from './SceneSkinWeightOverlay'
import type { SceneDrawIssue } from './sceneRenderResource'
import type { CameraView } from './types'

export interface SceneGuideInput {
  rig?: {
    nodeId: string
    enabled: boolean
    plane: MeshCutPlane
    mark(point: Vec3): void
    /** Dica do palco no lugar da dica da montagem de uma peça. */
    hint?: string
  }
  knife?: {
    nodeId: string
    midpoint: boolean
    edgesOnly?: boolean
    closePoint?: { point: MeshKnifePoint; position: Vec3 } | null
    mark(point: MeshKnifePoint): void
    hover(point: MeshKnifePoint | null): void
  }
  pivot?: {
    nodeId: string
    vertical?: boolean
    snapVertex?: boolean
    markVertex?(vertexId: string, point: Vec3): void
    begin(world: Readonly<AffineMatrix>): boolean
    preview(delta: Vec3): boolean
    end(commit: boolean): void
  }
  cut?: {
    nodeId: string
    midpoint: boolean
    mark(point: SceneCutPoint): void
    hover(point: SceneCutPoint | null): void
  }
  plane?: MeshCutPlane
  corners?: readonly Vec3[]
}

/**
 * A aba Pintar no palco. `paint`: tocar na peça escolhida pinta, tocar em outra peça a escolhe e
 * arrastar fora dela gira a câmera. `look`: só olhar, a pintura desligada. `off`: fora da aba.
 */
export type ScenePaintMode = 'off' | 'look' | 'paint'
export type SceneTransformSpace = 'world' | 'local' | 'pivot'
export interface ScenePaintSurfaceScope {
  mode: 'all' | 'selected'
  nodeId: string | null
}

/** O que o toque escolheu além da peça: em Pintar, a face (a superfície da forma ou a da malha). */
export interface SceneSelectDetail {
  faceId?: string
}

export interface SceneViewportPort {
  setPreviewGuide?(guide: ScenePreviewGuideState | null): void
  refreshGuideInput?(input: SceneGuideInput | null): void
  setDocument(document: MoldaSceneDocument): SceneDrawIssue[]
  setSelection(ids: readonly string[]): void
  setIsolation(ids: readonly string[] | null): void
  setView(view: CameraView): void
  setGridVisible?(visible: boolean): void
  /** Raio-X: peças semitransparentes só na oficina; o material guardado não muda. */
  setXray?(on: boolean): void
  setMovementStep?(step: number | null): void
  setTransformSpace?(space: SceneTransformSpace): void
  /** Durante Puxar faces, a alça Y acompanha a direção real da face escolhida. */
  setFaceExtrusion?(active: boolean): void
  /** Arrastar a face ou linha escolhida ajusta a prévia do Puxar. */
  setDirectPull?(active: boolean): void
  /** Ferramenta Puxar: as alças de mover puxam e se chamam pelo rótulo dado; `null` desliga. */
  setPullTool?(label: string | null): void
  frame(selectionOnly?: boolean): void
  zoom?(factor: number): void
  ensureVisible?(ids: readonly string[]): void
  setTransformTool(tool: SceneTransformTool): void
  setAreaTool(tool: SceneAreaTool, through: boolean): void
  setComponentSelection(selection: SceneComponentSelection | null): void
  setPaintTarget(target: ScenePaintTarget | null): void
  setPaintScope?(scope: ScenePaintSurfaceScope | null): void
  setPaintGuides?(settings: import('./ScenePaintGuides').ScenePaintGuideSettings | null): void
  /** Opcional: sem ele, o palco deduz a pintura do alvo, como antes. */
  setPaintMode?(mode: ScenePaintMode): void
  /** Espelho de pintura: cada toque pinta também o ponto refletido no meio, na mesma peça. */
  setPaintMirror?(enabled: boolean): void
  setImageFrame(imageId: string, frame: number | null): void
  setPose(pose: SceneAnimationPose | null): void
  setAnimationEditing(enabled: boolean): void
  setSupportGuides(enabled: boolean): void
  setSkinWeightTarget(target: SceneSkinWeightTarget | null): void
  setSkinPaintEnabled(enabled: boolean, radius?: number): void
  setSkinPaintPreview(preview: SceneSkinPaintPreview | null): void
  cancelGesture(): void
  /** Foto da criação guardada; `null` quando não há o que fotografar ou o palco não pode. */
  renderThumb(): string | null
  /** Clean photograph of the saved geometry. Session-only PNG; never a gallery stamp. */
  captureImage?(size: number, angle: number): string | null
  dispose(): void
}

export interface SceneViewportCallbacks {
  guideInput?(): SceneGuideInput | null
  guidePoint?(point: Vec3): void
  sampleInk?(color: ScenePaintRgba): void
  samplingInk?(): boolean
  hover?(id: string | null): void
  hoverEnabled?(): boolean
  select(id: string | null, additive: boolean, detail?: SceneSelectDetail): void
  contextLost(lost: boolean): void
  transform?: SceneTransformActions
  paint?: ScenePaintActions
  skinPaint?: SceneSkinPaintActions
  selectMany?(ids: readonly string[], additive: boolean): void
  areaChanged?(points: readonly Vec2[]): void
  selectComponent?(id: string | null, additive: boolean): void
  selectComponents?(ids: readonly string[], additive: boolean): void
}

export type SceneTransformTool = 'select' | 'move' | 'rotate' | 'scale'
export type ScenePaintActions = CapturedPaintActions<ScenePaintInputSample>
export type SceneSkinPaintActions = CapturedPaintActions<SceneSkinPaintSample>
/** `pull`: the drag started on the chosen face or line, so it extrudes instead of moving. */
export type SceneTransformIntent = 'pull'

export interface SceneTransformActions {
  begin(intent?: SceneTransformIntent): boolean
  preview(delta: AffineMatrix): boolean
  end(commit: boolean): void
}

export type SceneViewportFactory = (
  canvas: HTMLCanvasElement,
  callbacks: SceneViewportCallbacks,
  reducedMotion: boolean,
) => SceneViewportPort
