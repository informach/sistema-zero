import type { MoldaSceneDocument } from '../scene/document'
import type { SceneViewportCallbacks, SceneViewportFactory } from '../viewport/sceneViewportTypes'

/** Complete non-GPU port. Integration tests observe document/lifecycle output, not pixels. */
export function sceneViewportProbe() {
  const ports: Array<{
    callbacks: SceneViewportCallbacks
    document: MoldaSceneDocument | null
    disposed: number
  }> = []
  const factory: SceneViewportFactory = (_canvas, callbacks) => {
    const state: (typeof ports)[number] = { callbacks, document: null, disposed: 0 }
    ports.push(state)
    return {
      setDocument: (document) => {
        state.document = document
        return []
      },
      setSelection: () => {},
      setIsolation: () => {},
      setView: () => {},
      frame: () => {},
      setTransformTool: () => {},
      setAreaTool: () => {},
      setComponentSelection: () => {},
      setPaintTarget: () => {},
      setImageFrame: () => {},
      setPose: () => {},
      setAnimationEditing: () => {},
      setSupportGuides: () => {},
      setSkinWeightTarget: () => {},
      setSkinPaintEnabled: () => {},
      setSkinPaintPreview: () => {},
      cancelGesture: () => {},
      dispose: () => {
        state.disposed++
      },
    }
  }
  return { factory, ports }
}
