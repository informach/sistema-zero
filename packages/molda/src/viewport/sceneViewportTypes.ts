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

export interface SceneViewportPort {
  setDocument(document: MoldaSceneDocument): SceneDrawIssue[]
  setSelection(ids: readonly string[]): void
  setIsolation(ids: readonly string[] | null): void
  setView(view: CameraView): void
  frame(selectionOnly?: boolean): void
  setTransformTool(tool: SceneTransformTool): void
  setAreaTool(tool: SceneAreaTool, through: boolean): void
  setComponentSelection(selection: SceneComponentSelection | null): void
  setPaintTarget(target: ScenePaintTarget | null): void
  setImageFrame(imageId: string, frame: number | null): void
  setPose(pose: SceneAnimationPose | null): void
  setAnimationEditing(enabled: boolean): void
  setSupportGuides(enabled: boolean): void
  setSkinWeightTarget(target: SceneSkinWeightTarget | null): void
  setSkinPaintEnabled(enabled: boolean, radius?: number): void
  setSkinPaintPreview(preview: SceneSkinPaintPreview | null): void
  cancelGesture(): void
  dispose(): void
}

export interface SceneViewportCallbacks {
  select(id: string | null, additive: boolean): void
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
