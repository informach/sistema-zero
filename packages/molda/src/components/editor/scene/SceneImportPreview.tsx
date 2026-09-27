import { useEffect, useState, useSyncExternalStore } from 'react'
import { NATIVE_IMPORT_COPY as copy } from '../../../core/nativeImportCopy'
import type { MoldaSceneDocument } from '../../../scene/document'
import { SceneAnimationPlayer } from '../../../state/SceneAnimationPlayer'
import { SceneFlipbookPlayer } from '../../../state/SceneFlipbookPlayer'
import type { SceneViewportFactory } from '../../../viewport/sceneViewportTypes'
import { Button } from '../../ui/Button'
import { useSceneViewport } from './useSceneViewport'

const noSelection: readonly string[] = []
const select = () => {}

/** A separate renderer/player, never an editor store or editable preview on the live creation. */
export function SceneImportPreview({
  document: model,
  factory,
}: {
  document: MoldaSceneDocument
  factory?: SceneViewportFactory
}) {
  const [players] = useState(() => {
      const clock = {
        now: () => performance.now(),
        request: (callback: FrameRequestCallback) => requestAnimationFrame(callback),
        cancel: (id: number) => cancelAnimationFrame(id),
      }
      return {
        animation: new SceneAnimationPlayer(clock),
        flipbook: new SceneFlipbookPlayer(clock),
      }
    }),
    player = players.animation,
    view = useSceneViewport({
      document: model,
      selection: noSelection,
      isolation: null,
      select,
      factory,
      tool: 'select',
      areaTool: 'point',
      through: false,
      componentSelection: null,
      paintTarget: null,
      flipbook: players.flipbook,
      animation: player,
    }),
    playback = useSyncExternalStore(player.subscribe, player.getSnapshot, player.getSnapshot)
  useEffect(() => {
    if (!view.viewport || view.lost || view.error) return
    try {
      view.viewport.frame()
    } catch (error) {
      player.reportError(error)
    }
  }, [view.viewport, view.lost, view.error, player])
  useEffect(() => {
    player.setClip(model, null)
  }, [player, model])
  useEffect(() => {
    const hidden = () => {
        if (document.hidden) player.pause()
      },
      motion = window.matchMedia?.('(prefers-reduced-motion: reduce)'),
      reduced = () => {
        if (motion?.matches) player.pause()
      }
    window.addEventListener('blur', player.pause)
    document.addEventListener('visibilitychange', hidden)
    motion?.addEventListener('change', reduced)
    return () => {
      window.removeEventListener('blur', player.pause)
      document.removeEventListener('visibilitychange', hidden)
      motion?.removeEventListener('change', reduced)
      player.setClip(null, null)
      players.flipbook.setImage(null)
    }
  }, [player, players.flipbook])
  const unavailable = !view.viewport || !!view.error || view.lost
  return (
    <section
      aria-label={copy.preview}
      className="space-y-2 rounded-xl border border-mld-border bg-mld-bg p-3"
    >
      <p className="text-sm text-mld-muted">{copy.previewHint}</p>
      <canvas
        ref={view.canvas}
        aria-label={copy.preview}
        tabIndex={0}
        className="h-64 w-full touch-none rounded-lg focus-visible:outline-2 focus-visible:outline-mld-accent"
      />
      {(view.error || view.lost) && (
        <p role="status" className="text-sm text-mld-danger">
          {copy.previewUnavailable}
        </p>
      )}
      {playback.error && (
        <p role="alert" className="text-sm text-mld-danger">
          {playback.error}
        </p>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <Button
          disabled={unavailable}
          onClick={() => {
            try {
              view.viewport?.frame()
            } catch (error) {
              player.reportError(error)
            }
          }}
        >
          {copy.frame}
        </Button>
        {!!model.animations?.length && (
          <label className="min-w-0 flex-1 text-sm font-bold">
            {copy.clip}
            <select
              name="gltfPreviewClip"
              className="mt-1 min-h-11 w-full rounded-lg border border-mld-border bg-mld-surface px-3"
              value={playback.source?.clip.id ?? ''}
              disabled={unavailable}
              onChange={(event) => {
                const id = event.target.value
                try {
                  player.setClip(id ? model : null, id || null)
                } catch (error) {
                  player.reportError(error)
                }
              }}
            >
              <option value="">{copy.basePose}</option>
              {model.animations.map((clip) => (
                <option key={clip.id} value={clip.id}>
                  {clip.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {playback.source && (
          <Button
            disabled={unavailable || !!playback.error}
            onClick={() => (playback.playing ? player.pause() : player.play())}
          >
            {playback.playing ? copy.pause : copy.play}
          </Button>
        )}
      </div>
      {playback.source && (
        <label className="block text-sm">
          {copy.time}: {playback.time.toFixed(2)} s
          <input
            name="gltfPreviewTime"
            className="min-h-11 w-full accent-mld-accent"
            type="range"
            min={0}
            max={playback.source.clip.duration}
            step="any"
            value={playback.time}
            disabled={unavailable}
            onChange={(event) => {
              try {
                player.seek(Number(event.target.value))
              } catch (error) {
                player.reportError(error)
              }
            }}
          />
        </label>
      )}
    </section>
  )
}
