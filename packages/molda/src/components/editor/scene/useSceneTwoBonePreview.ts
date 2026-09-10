import { useEffect, useMemo } from 'react'
import type { Vec3 } from '../../../core/model'
import type { SceneAnimationPoseGesture } from '../../../state/SceneAnimationPoseGesture'
import type { useSceneWorkshop } from './useSceneWorkshop'

type Input = ReturnType<SceneAnimationPoseGesture['beginTwoBone']>

/** Owns one form's revocable input; stale forms cannot restart a pose on another context. */
export function useSceneTwoBonePreview(
  workshop: ReturnType<typeof useSceneWorkshop>,
  chain: readonly [string, string, string],
  clipId: string,
  time: number,
) {
  const { editor, document, animation, animationPose } = workshop,
    [root, middle, tip] = chain
  const scope = useMemo(() => {
    let active = false,
      input: Input = null
    const current = () => {
      const state = animation.getSnapshot()
      return (
        active &&
        editor.getState().asset === document &&
        state.source?.document === document &&
        state.source.clip.id === clipId &&
        !state.source.preview &&
        !state.playing &&
        !state.error &&
        state.time === time
      )
    }
    const cancel = () => {
      const previous = input
      input = null
      previous?.cancel()
    }
    return {
      connect() {
        active = true
        return () => {
          active = false
          cancel()
        }
      },
      cancel,
      invalidate() {
        input?.reset()
      },
      preview(target: Vec3, hint?: Vec3) {
        if (!current()) return false
        if (!input?.isCurrent()) input = animationPose.beginTwoBone([root, middle, tip])
        return current() && (input?.sample(target, hint) ?? false)
      },
    }
  }, [editor, document, animation, animationPose, root, middle, tip, clipId, time])
  useEffect(() => scope.connect(), [scope])
  return scope
}
