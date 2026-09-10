import { useSyncExternalStore } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneAnimationPoseGesture } from '../../../state/SceneAnimationPoseGesture'
import { Button } from '../../ui/Button'

export function SceneAnimationPoseControls({
  gesture,
  enabled,
}: {
  gesture: SceneAnimationPoseGesture
  enabled: boolean
}) {
  const snapshot = useSyncExternalStore(gesture.subscribe, gesture.getSnapshot, gesture.getSnapshot)
  const copy = COPY.scene
  return (
    <section
      aria-label={copy.animationPoseAdjust}
      className="space-y-1 border-b border-mld-border bg-mld-surface px-3 py-2"
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            name="animationPoseAutoKey"
            type="checkbox"
            className="size-5 accent-mld-accent"
            checked={snapshot.autoKey}
            disabled={!enabled || snapshot.pending || snapshot.dragging}
            onChange={(event) => gesture.setAutoKey(event.target.checked)}
          />
          {copy.animationPoseAutoKey}
        </label>
        <Button
          className="text-sm"
          variant="primary"
          disabled={!enabled || !snapshot.pending || snapshot.dragging || !!snapshot.error}
          onClick={gesture.record}
        >
          {copy.animationPoseRecord}
        </Button>
        <Button
          className="text-sm"
          disabled={!snapshot.pose && !snapshot.error}
          onClick={gesture.cancel}
        >
          {copy.animationPoseCancel}
        </Button>
      </div>
      <p className="text-xs text-mld-muted">{copy.animationPoseAutoKeyHint}</p>
      {snapshot.pending && (
        <p role="status" className="text-sm text-mld-warn">
          {copy.animationPosePending}
        </p>
      )}
      {snapshot.error && (
        <p role="alert" className="text-sm text-mld-danger">
          {snapshot.error}
        </p>
      )}
    </section>
  )
}
