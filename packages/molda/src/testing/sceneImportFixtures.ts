import { structuredBytes } from '../core/structuredBytes'
import type { MoldaSceneDocument } from '../scene/document'
import type { SceneAnimationPose } from '../scene/sampleAnimation'
import { createDocumentEditorStore } from '../state/editorStore'
import type {
  SceneViewportCallbacks,
  SceneViewportFactory,
  SceneViewportPort,
} from '../viewport/sceneViewportTypes'
import { animatedScene } from './sceneAnimation'

/** Only the GPU boundary is substituted; documents, workers, player, history and UI are real. */
export function sceneImportRenderer() {
  const ports: Array<{
    callbacks: SceneViewportCallbacks
    documents: MoldaSceneDocument[]
    poses: Array<SceneAnimationPose | null>
    frames: number
    disposed: number
    editing: boolean[]
  }> = []
  const factory: SceneViewportFactory = (_canvas, callbacks) => {
    const state = {
      callbacks,
      documents: [] as MoldaSceneDocument[],
      poses: [] as Array<SceneAnimationPose | null>,
      frames: 0,
      disposed: 0,
      editing: [] as boolean[],
    }
    ports.push(state)
    const port: SceneViewportPort = {
      setDocument: (model) => {
        state.documents.push(model)
        return []
      },
      setPose: (pose) => {
        state.poses.push(pose)
      },
      setAnimationEditing: (editing) => {
        state.editing.push(editing)
      },
      frame: () => {
        state.frames++
      },
      dispose: () => {
        state.disposed++
      },
      setSelection: () => {},
      setIsolation: () => {},
      setView: () => {},
      setTransformTool: () => {},
      setAreaTool: () => {},
      setComponentSelection: () => {},
      setPaintTarget: () => {},
      setImageFrame: () => {},
      setSupportGuides: () => {},
      setSkinWeightTarget: () => {},
      setSkinPaintEnabled: () => {},
      setSkinPaintPreview: () => {},
      cancelGesture: () => {},
      renderThumb: () => null,
    }
    return port
  }
  return { factory, ports }
}
export function sceneImportEditor() {
  return createDocumentEditorStore({
    asset: animatedScene(),
    sizeOf: structuredBytes,
    autosaveMs: 60_000,
    persistence: { save: async () => {} },
  })
}
export function sceneImportFile(
  path: string,
  content: Uint8Array | Record<string, unknown>,
  directory = false,
) {
  const bytes =
      content instanceof Uint8Array ? content : new TextEncoder().encode(JSON.stringify(content)),
    file = new File([new Uint8Array(bytes)], path.split('/').at(-1)!)
  if (directory) Object.defineProperty(file, 'webkitRelativePath', { value: path })
  return file
}
