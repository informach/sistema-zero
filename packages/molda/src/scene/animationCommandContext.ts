import type { SceneAnimationClip } from './animation'
import { finishSceneCommand, requireEditableScene, sceneCommandSelection } from './commandContext'
import type { MoldaSceneDocument } from './document'
import { selectSceneSubtrees } from './graph'
import { requireScene } from './validation'

export function sceneAnimationContext(document: MoldaSceneDocument, clipId: string) {
  const selected = sceneCommandSelection(document, [])
  const clip = selected.index.animations.get(clipId)
  requireScene(clip, 'clipId', 'O movimento escolhido não existe.')
  return {
    clip,
    index: selected.index,
    editable(ids: readonly string[]) {
      requireEditableScene({ ...selected, ...selectSceneSubtrees(selected.index.scene, ids) })
    },
  }
}

export function replaceSceneAnimation(document: MoldaSceneDocument, clip: SceneAnimationClip) {
  return finishSceneCommand({
    ...document,
    animations: document.animations!.map((entry) => (entry.id === clip.id ? clip : entry)),
  })
}
