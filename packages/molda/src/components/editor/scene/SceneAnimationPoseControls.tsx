import { useSyncExternalStore } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneAnimationPoseGesture } from '../../../state/SceneAnimationPoseGesture'
import { useMoldaToolAccess } from '../../toolAccess'
import { DiamondPlus, X } from '../../ui/icons'

/** The transport and standalone canvas share the same pose owner and auto-key setting. */
export function SceneAnimationPoseControls({
  gesture,
  enabled,
  compact = false,
  onRecord,
  onAutoKey,
  canMark = false,
}: {
  gesture: SceneAnimationPoseGesture
  enabled: boolean
  compact?: boolean
  onRecord?(): void
  onAutoKey?(enabled: boolean): void
  canMark?: boolean
}) {
  const snapshot = useSyncExternalStore(gesture.subscribe, gesture.getSnapshot, gesture.getSnapshot)
  const copy = COPY.scene
  // Gravar pose é criar movimento (`animate.create`); sem ele, as alças de pose nem aparecem.
  if (!useMoldaToolAccess().can('animate.create')) return null
  return (
    <section
      aria-label={copy.animationPoseAdjust}
      className={compact ? 'contents' : 'mld-stage-card pointer-events-auto space-y-2 px-4 py-3'}
    >
      {
        <label className="mld-auto-key" data-enabled={snapshot.autoKey}>
          <span aria-hidden="true" className="mld-record-dot" />
          <span>{copy.animationPoseAutoKey}</span>
          <input
            name="animationPoseAutoKey"
            type="checkbox"
            className="sr-only"
            checked={snapshot.autoKey}
            disabled={!enabled || snapshot.dragging || (!onAutoKey && snapshot.pending)}
            onChange={(event) =>
              onAutoKey ? onAutoKey(event.target.checked) : gesture.setAutoKey(event.target.checked)
            }
          />
          <span aria-hidden="true" className="mld-auto-switch" />
        </label>
      }
      <div
        className={
          compact ? 'flex shrink-0 items-center gap-1' : 'flex flex-wrap items-center gap-2'
        }
      >
        {/* Na linha do tempo, Marcar pose é o amarelo dos prints: a ação que a aba existe para fazer. */}
        <button
          type="button"
          className={`sz-tool-pill ${compact ? 'mld-pill-sun' : 'sz-tool-pill--primary'} text-sm disabled:cursor-not-allowed disabled:opacity-50`}
          disabled={
            !enabled || (!snapshot.pending && !canMark) || snapshot.dragging || !!snapshot.error
          }
          onClick={onRecord ?? gesture.record}
        >
          <DiamondPlus aria-hidden="true" />
          {copy.animationPoseRecord}
        </button>
        {(!compact || snapshot.pending) && (
          <button
            type="button"
            className="sz-tool-pill sz-tool-pill--outline text-sm disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!snapshot.pose && !snapshot.error}
            onClick={gesture.cancel}
          >
            <X aria-hidden="true" />
            <span className={compact ? 'sr-only' : undefined}>{copy.animationPoseCancel}</span>
          </button>
        )}
      </div>
      {!compact && <p className="text-xs text-mld-muted">{copy.animationPoseAutoKeyHint}</p>}
      {!compact && snapshot.pending && (
        <p role="status" className="text-sm text-mld-warn">
          {copy.animationPosePending}
        </p>
      )}
      {(snapshot.error ?? snapshot.refusal) && (
        <p role="alert" className="text-sm text-mld-danger">
          {snapshot.error ?? snapshot.refusal}
        </p>
      )}
    </section>
  )
}
