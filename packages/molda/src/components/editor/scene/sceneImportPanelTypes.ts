import type { MoldaSceneDocument } from '../../../scene/document'
import type { EditorStore } from '../../../state/editorStore'
import type { SceneViewportFactory } from '../../../viewport/sceneViewportTypes'

export interface SceneImportPanelProps {
  editor: EditorStore<MoldaSceneDocument>
  onClose(): void
  onImported(): void
  viewportFactory?: SceneViewportFactory
  canAdopt?: () => boolean
  blocked?: boolean
}
