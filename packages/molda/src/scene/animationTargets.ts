import type { MoldaSceneDocument } from './document'
import { SCENE_LIMITS } from './limits'
import { requireScene } from './validation'

/** Used by duplicate pieces and paths copied from their geometry. Unaffected clips stay shared. */
export function duplicateSceneAnimationTargets(
  document: MoldaSceneDocument,
  nodeIds: ReadonlyMap<string, string>,
): Pick<MoldaSceneDocument, 'animations'> {
  if (document.animations === undefined) return {}
  let tracks = 0
  let keys = 0
  for (const clip of document.animations)
    for (const track of clip.tracks) {
      const copies = nodeIds.has(track.nodeId) ? 2 : 1
      tracks += copies
      keys += track.keys.length * copies
    }
  requireScene(
    tracks <= SCENE_LIMITS.animationTracks && keys <= SCENE_LIMITS.animationKeys,
    'animations',
    'Essa cópia ultrapassa o orçamento de movimentos da criação.',
  )
  return {
    animations: document.animations.map((clip) => {
      const copies = clip.tracks.flatMap((track) => {
        const nodeId = nodeIds.get(track.nodeId)
        return nodeId ? [{ ...structuredClone(track), nodeId }] : []
      })
      return copies.length ? { ...clip, tracks: [...clip.tracks, ...copies] } : clip
    }),
  }
}
