import { useMemo, useSyncExternalStore } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../../core/copy'
import { sceneAnimationKeySelection } from '../../../scene/animationKeySelection'
import { useMoldaToolAccess } from '../../toolAccess'
import { Button } from '../../ui/Button'
import { SceneAnimationKeyStrip } from './SceneAnimationKeyStrip'
import { SceneAnimationKeyTools } from './SceneAnimationKeyTools'
import { sceneAnimationFormNumber } from './sceneAnimationForm'
import { SCENE_APPEARANCE_FIELD as field } from './sceneAppearanceForm'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function SceneAnimationTimeline({
  workshop,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
}) {
  const { animation: player, selected } = workshop
  const revision = useStore(workshop.editor, (state) => state.contentRevision)
  const snapshot = useSyncExternalStore(player.subscribe, player.getSnapshot, player.getSnapshot)
  const clip = snapshot.source?.clip
  const copy = COPY.scene
  // A linha do tempo é leitura, sempre livre; ajustar várias chaves de uma vez é `animate.pro`.
  const pro = useMoldaToolAccess().can('animate.pro')
  const selection = useMemo(
    () => (clip ? sceneAnimationKeySelection(clip, selected) : null),
    [clip, selected],
  )
  if (!clip)
    return (
      <p role="status" className="border-t border-mld-border p-3 text-sm text-mld-muted">
        {snapshot.error ?? copy.animationEmpty}
      </p>
    )
  const times = selection!.times
  let low = 0,
    high = times.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if (times[middle]! < snapshot.time) low = middle + 1
    else high = middle
  }
  const previous = times[low - 1]
  const next = times[low] === snapshot.time ? times[low + 1] : times[low]
  return (
    <section
      aria-label={copy.animationTimeline}
      className="space-y-2 border-t border-mld-border bg-mld-surface p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          className="text-sm"
          aria-pressed={snapshot.playing}
          onClick={() => (snapshot.playing ? player.pause() : player.play())}
        >
          {snapshot.playing ? copy.animationPause : copy.animationPlay}
        </Button>
        <Button className="text-sm" disabled={snapshot.time === 0} onClick={() => player.seek(0)}>
          {copy.animationStart}
        </Button>
        <Button
          className="text-sm"
          disabled={previous === undefined}
          onClick={() => previous !== undefined && player.seek(previous)}
        >
          {copy.animationPrevious}
        </Button>
        <Button
          className="text-sm"
          disabled={next === undefined}
          onClick={() => next !== undefined && player.seek(next)}
        >
          {copy.animationNext}
        </Button>
        <Button
          className="text-sm"
          disabled={snapshot.time === clip.duration}
          onClick={() => player.seek(clip.duration)}
        >
          {copy.animationEnd}
        </Button>
        <span
          className="text-sm tabular-nums text-mld-muted"
          aria-live={snapshot.playing ? 'off' : 'polite'}
        >
          {copy.animationTimeValue(snapshot.time, clip.duration)}
        </span>
      </div>
      {selection!.channels.map(({ channel, times }) => (
        <SceneAnimationKeyStrip
          key={channel}
          times={times}
          duration={clip.duration}
          time={snapshot.time}
          label={copy.animationChannels[channel]}
          onSeek={player.seek}
        />
      ))}
      <input
        name="animationTime"
        type="range"
        min={0}
        max={clip.duration}
        step="any"
        value={snapshot.time}
        aria-label={copy.animationTime}
        aria-valuetext={copy.animationTimeValue(snapshot.time, clip.duration)}
        className="min-h-11 w-full accent-mld-accent"
        onChange={(event) => player.seek(Number(event.target.value))}
      />
      {!snapshot.playing && (
        <form
          key={JSON.stringify([
            snapshot.source?.document.id,
            clip.id,
            clip.duration,
            snapshot.time,
          ])}
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            try {
              player.seek(sceneAnimationFormNumber(new FormData(event.currentTarget), 'seconds'))
            } catch (error) {
              player.reportError(error)
            }
          }}
        >
          <label className="space-y-1 text-xs">
            <span>{copy.animationSeconds}</span>
            <input
              type="number"
              name="seconds"
              defaultValue={snapshot.time}
              min={0}
              max={clip.duration}
              step="any"
              required
              className={field}
            />
          </label>
          <Button type="submit" className="text-sm">
            {copy.animationSeek}
          </Button>
        </form>
      )}
      {snapshot.error && (
        <p role="alert" className="text-sm text-mld-danger">
          {snapshot.error}
        </p>
      )}
      {pro && !snapshot.playing && !snapshot.source?.preview && selection && (
        <SceneAnimationKeyTools
          key={JSON.stringify([revision, clip.id, selected])}
          workshop={workshop}
          selection={selection}
        />
      )}
    </section>
  )
}
