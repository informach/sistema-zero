import { useEffect, useMemo, useRef } from 'react'
import type { SceneAnimationPosePair, SceneAnimationPoseSet } from '../../../scene/animationPoseSet'
import type { SceneAnimationPoseGesture } from '../../../state/SceneAnimationPoseGesture'
import type { useSceneWorkshop } from './useSceneWorkshop'

type Input = ReturnType<SceneAnimationPoseGesture['beginPoseSet']>

/** A form owns only its captured input. Cleanup cannot cancel a replacement pose. */
export function useScenePoseSetPreview(
  workshop: ReturnType<typeof useSceneWorkshop>,
  clipId: string,
  time: number,
  open: boolean,
) {
  const { editor, document, animation, animationPose, selected } = workshop
  const selectionKey = JSON.stringify(selected)
  const liveContext = useRef({ selectionKey, open })
  liveContext.current = { selectionKey, open }
  const scope = useMemo(() => {
    let active = false,
      input: Input = null,
      generation = 0
    const current = () => {
      const snapshot = animation.getSnapshot()
      return (
        active &&
        open &&
        liveContext.current.open &&
        liveContext.current.selectionKey === selectionKey &&
        editor.getState().asset === document &&
        snapshot.source?.document === document &&
        snapshot.source.clip.id === clipId &&
        !snapshot.source.preview &&
        !snapshot.playing &&
        !snapshot.error &&
        snapshot.time === time
      )
    }
    const cancel = () => {
      generation++
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
      preview(
        poses: SceneAnimationPoseSet,
        pairs: readonly SceneAnimationPosePair[],
        mirror?: 'x' | 'y' | 'z',
      ) {
        if (!current() || (animationPose.getSnapshot().kind !== null && !input?.isCurrent()))
          return false
        cancel()
        const ticket = generation
        if (!current() || animationPose.getSnapshot().kind !== null) return false
        const next = animationPose.beginPoseSet(poses, pairs, mirror)
        if (!current() || generation !== ticket) {
          next?.cancel()
          return false
        }
        input = next
        return next?.isCurrent() ?? false
      },
    }
  }, [editor, document, animation, animationPose, clipId, time, selectionKey, open])
  useEffect(() => scope.connect(), [scope])
  return scope
}
