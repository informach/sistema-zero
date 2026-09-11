import type { MoldaSceneDocument, Vec2 } from '../scene/document'
import type { ScenePaintSample, ScenePaintTarget } from '../scene/imagePaint'
import type { AffineMatrix } from '../scene/matrix'
import type { SceneComponentSelection } from '../scene/meshComponents'
import type { SceneAnimationPose } from '../scene/sampleAnimation'
import type { SceneSkinPaintSample } from '../scene/skinPaint'
import type { SceneSkinPaintPreview } from '../state/sceneSkinPaintGesture'
import type { CapturedPaintActions } from './CapturedPaintInput'
import type { SceneAreaTool } from './SceneAreaSelection'
import type { SceneSkinWeightTarget } from './SceneSkinWeightOverlay'
import type { SceneDrawIssue } from './sceneRenderResource'
import type { CameraView } from './types'

/**
 * A aba Pintar no palco. `paint`: tocar na peça escolhida pinta, tocar em outra peça a escolhe e
 * arrastar fora dela gira a câmera. `look`: só olhar, a pintura desligada. `off`: fora da aba.
 */
export type ScenePaintMode = 'off' | 'look' | 'paint'

/** O que o toque escolheu além da peça: em Pintar, a face (a superfície da forma ou a da malha). */
export interface SceneSelectDetail {
  faceId?: string
}

export interface SceneViewportPort {
  setDocument(document: MoldaSceneDocument): SceneDrawIssue[]
  setSelection(ids: readonly string[]): void
  setIsolation(ids: readonly string[] | null): void
  setView(view: CameraView): void
  setGridVisible?(visible: boolean): void
  setMovementStep?(step: number | null): void
  frame(selectionOnly?: boolean): void
  setTransformTool(tool: SceneTransformTool): void
  setAreaTool(tool: SceneAreaTool, through: boolean): void
  setComponentSelection(selection: SceneComponentSelection | null): void
  setPaintTarget(target: ScenePaintTarget | null): void
  /** Opcional: sem ele, o palco deduz a pintura do alvo, como antes. */
  setPaintMode?(mode: ScenePaintMode): void
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
export type ScenePaintActions = CapturedPaintActions<ScenePaintSample>
export type SceneSkinPaintActions = CapturedPaintActions<SceneSkinPaintSample>
export interface SceneTransformActions {
  begin(): boolean
  preview(delta: AffineMatrix): boolean
  end(commit: boolean): void
}

export type SceneViewportFactory = (
  canvas: HTMLCanvasElement,
  callbacks: SceneViewportCallbacks,
  reducedMotion: boolean,
) => SceneViewportPort
