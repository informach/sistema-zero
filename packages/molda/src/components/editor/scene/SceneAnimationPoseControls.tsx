import { useSyncExternalStore } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneAnimationPoseGesture } from '../../../state/SceneAnimationPoseGesture'
import { useMoldaToolAccess } from '../../toolAccess'
import { CircleDot, X } from '../../ui/icons'

/**
 * O cartão da POSE, no pé do palco do Animar (a tela-modelo, 11/09/2026): gravar ao soltar as
 * alças, "Gravar pose ajustada" em pílula azul e "Cancelar ajuste da pose" em contorno.
 */
export function SceneAnimationPoseControls({
  gesture,
  enabled,
}: {
  gesture: SceneAnimationPoseGesture
  enabled: boolean
}) {
  const snapshot = useSyncExternalStore(gesture.subscribe, gesture.getSnapshot, gesture.getSnapshot)
  const copy = COPY.scene
  // Gravar pose é criar movimento (`animate.create`); sem ele, as alças de pose nem aparecem.
  if (!useMoldaToolAccess().can('animate.create')) return null
  return (
    <section
      aria-label={copy.animationPoseAdjust}
      className="mld-stage-card pointer-events-auto space-y-2 px-4 py-3"
    >
      <label className="flex min-h-11 items-center gap-2 text-sm font-bold text-mld-text">
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
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="sz-tool-pill sz-tool-pill--primary text-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!enabled || !snapshot.pending || snapshot.dragging || !!snapshot.error}
          onClick={gesture.record}
        >
          <CircleDot aria-hidden="true" />
          {copy.animationPoseRecord}
        </button>
        <button
          type="button"
          className="sz-tool-pill sz-tool-pill--outline text-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!snapshot.pose && !snapshot.error}
          onClick={gesture.cancel}
        >
          <X aria-hidden="true" />
          {copy.animationPoseCancel}
        </button>
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
