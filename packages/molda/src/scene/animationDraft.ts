import { recordSceneAnimationInputs } from './animationArrival'
import type { SceneAnimationKeyInput } from './animationCommands'
import { captureSceneAnimationLocalPoses } from './animationPose'
import type { MoldaSceneDocument } from './document'

/** Merge one gesture into an instant shared by all pieces, always compared with the saved source. */
export function mergeSceneAnimationDraft(
  source: MoldaSceneDocument,
  clipId: string,
  time: number,
  draft: MoldaSceneDocument,
  edits: readonly SceneAnimationKeyInput[],
): MoldaSceneDocument {
  const staged = draft.animations!.find((entry) => entry.id === clipId)!
  const candidates = new Map<string, SceneAnimationKeyInput>()
  const identity = (entry: Pick<SceneAnimationKeyInput, 'nodeId' | 'channel'>) =>
    JSON.stringify([entry.nodeId, entry.channel])
  for (const track of staged.tracks) {
    const key = track.keys.find((key) => key.time === time)
    if (key)
      candidates.set(identity(track), {
        nodeId: track.nodeId,
        channel: track.channel,
        key,
      } as SceneAnimationKeyInput)
  }
  for (const edit of edits) candidates.set(identity(edit), edit)
  if (!candidates.size) return source
  const ids = [...new Set([...candidates.values()].map((entry) => entry.nodeId))]
  const original = captureSceneAnimationLocalPoses(source, clipId, ids, time)
  const keys: SceneAnimationKeyInput[] = []
  for (const input of candidates.values()) {
    const before = original.get(input.nodeId)![input.channel]
    if (input.key.value.every((value, i) => value === before[i])) continue
    keys.push(input)
  }
  return recordSceneAnimationInputs(source, clipId, keys)
}
