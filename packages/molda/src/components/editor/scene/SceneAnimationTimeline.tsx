import { useMemo, useState, useSyncExternalStore } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../../core/copy'
import { sceneAnimationKeySelection } from '../../../scene/animationKeySelection'
import { useMoldaToolAccess } from '../../toolAccess'
import { Button } from '../../ui/Button'
import { SceneAnimationKeyStrip } from './SceneAnimationKeyStrip'
import { SceneAnimationKeyTools } from './SceneAnimationKeyTools'
import { SceneAnimationPoseControls } from './SceneAnimationPoseControls'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function SceneAnimationTimeline({
  workshop,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
}) {
  const { animation: player, selected, document } = workshop
  const revision = useStore(workshop.editor, (state) => state.contentRevision)
  const snapshot = useSyncExternalStore(player.subscribe, player.getSnapshot, player.getSnapshot)
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const [roomy, setRoomy] = useState(false)
  const clip = snapshot.source?.clip
  const copy = COPY.scene
  const { can } = useMoldaToolAccess()
  const pro = can('animate.pro')
  const selection = useMemo(
    () => (clip ? sceneAnimationKeySelection(clip, selected) : null),
    [clip, selected],
  )
  const rows = useMemo(
    () =>
      !clip
        ? []
        : [...new Set([...clip.tracks.map((track) => track.nodeId), ...selected])].map((id) => ({
            id,
            name:
              (workshop.animationPreviewDocument ?? document).nodes.find((node) => node.id === id)
                ?.name ?? id,
            keys: sceneAnimationKeySelection(clip, [id]),
          })),
    [clip, selected, document, workshop.animationPreviewDocument],
  )
  if (!clip)
    return (
      <p role="status" className="shrink-0 border-t border-mld-border p-3 text-sm text-mld-muted">
        {snapshot.error ?? 'Crie um movimento ou experimente um movimento pronto.'}
      </p>
    )
  const times = [
    ...new Set(clip.tracks.flatMap((track) => track.keys.map((key) => key.time))),
  ].sort((a, b) => a - b)
  const previous = times.filter((time) => time < snapshot.time).at(-1) ?? 0
  const next = times.find((time) => time > snapshot.time) ?? clip.duration
  return (
    <section
      aria-label={copy.animationTimeline}
      data-roomy={roomy}
      className="mld-timeline flex shrink-0 flex-col overflow-hidden border-t border-mld-border bg-mld-surface"
    >
      <div className="mld-scroll-x flex h-12 shrink-0 items-center gap-1 overflow-x-auto px-2">
        <Button
          className="shrink-0 px-3 text-sm"
          aria-label={snapshot.playing ? copy.animationPause : copy.animationPlay}
          aria-pressed={snapshot.playing}
          onClick={() => (snapshot.playing ? player.pause() : player.play())}
        >
          {snapshot.playing ? 'Ⅱ' : '▶'}
        </Button>
        <Button
          className="shrink-0 px-3 text-sm"
          aria-label={copy.animationStart}
          disabled={snapshot.time === 0}
          onClick={() => player.seek(0)}
        >
          ↤
        </Button>
        <Button
          className="shrink-0 px-3 text-sm"
          aria-label={copy.animationPrevious}
          disabled={snapshot.time === 0}
          onClick={() => player.seek(previous)}
        >
          ‹
        </Button>
        <SceneAnimationPoseControls
          compact
          gesture={workshop.animationPose}
          enabled={can('animate.create') && !snapshot.playing && !snapshot.source?.preview}
        />
        <Button
          className="shrink-0 px-3 text-sm"
          disabled={snapshot.time === clip.duration}
          onClick={() => player.seek(next)}
        >
          Próxima pose →
        </Button>
        <span className="ml-auto whitespace-nowrap px-2 text-xs tabular-nums text-mld-muted">
          {snapshot.time.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} /{' '}
          {clip.duration.toLocaleString('pt-BR')} s
        </span>
      </div>
      <div className="relative mr-2 ml-[140px] h-7 shrink-0">
        <div
          aria-hidden="true"
          className="absolute inset-x-1 top-0 flex justify-between text-[10px] tabular-nums text-mld-muted"
        >
          {[0, 1, 2, 3, 4].map((tick) => (
            <span key={tick}>
              {((clip.duration * tick) / 4).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} s
            </span>
          ))}
        </div>
        <input
          name="animationTime"
          type="range"
          min={0}
          max={clip.duration}
          step="any"
          value={snapshot.time}
          aria-label={copy.animationTime}
          aria-valuetext={copy.animationTimeValue(snapshot.time, clip.duration)}
          className="h-7 w-full pt-3 accent-mld-accent"
          onChange={(event) => player.seek(Number(event.target.value))}
        />
      </div>
      <div className="mld-scroll-y min-h-0 flex-1 overflow-y-auto px-2">
        {rows.map((row) => (
          <div key={row.id}>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="min-h-11 w-6 shrink-0"
                aria-label={`Canais de ${row.name}`}
                aria-expanded={expanded.has(row.id)}
                onClick={() =>
                  setExpanded((before) => {
                    const next = new Set(before)
                    if (next.has(row.id)) next.delete(row.id)
                    else next.add(row.id)
                    return next
                  })
                }
              >
                {expanded.has(row.id) ? '▾' : '▸'}
              </button>
              <div className="min-w-0 flex-1">
                <SceneAnimationKeyStrip
                  times={row.keys.times}
                  duration={clip.duration}
                  time={snapshot.time}
                  label={row.name}
                  onSeek={player.seek}
                  onSelect={() => workshop.select(row.id, false)}
                />
              </div>
            </div>
            {expanded.has(row.id) && (
              <div className="pl-7">
                {row.keys.channels.map(({ channel, times }) => (
                  <SceneAnimationKeyStrip
                    key={channel}
                    times={times}
                    duration={clip.duration}
                    time={snapshot.time}
                    label={copy.animationChannels[channel]}
                    onSeek={player.seek}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
        <details className="p-1">
          <summary className="min-h-11 cursor-pointer py-3 text-xs font-bold">
            Mais ajustes da linha do tempo
          </summary>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            Altura da linha do tempo
            <select
              name="timeline-height"
              value={roomy ? 'roomy' : 'compact'}
              onChange={(event) => setRoomy(event.target.value === 'roomy')}
              className="min-h-11 rounded-lg border border-mld-border px-2"
            >
              <option value="compact">Compacta</option>
              <option value="roomy">Ampla</option>
            </select>
          </label>
          <form
            key={`${clip.id}:${snapshot.time}`}
            className="flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              const raw = new FormData(event.currentTarget).get('seconds')
              const value = Number(raw)
              if (
                typeof raw === 'string' &&
                raw.trim() &&
                Number.isFinite(value) &&
                value >= 0 &&
                value <= clip.duration
              )
                player.seek(value)
            }}
          >
            <label className="flex min-h-11 items-center gap-2 text-sm">
              Ir para o tempo
              <input
                name="seconds"
                aria-label={copy.animationSeconds}
                type="number"
                min={0}
                max={clip.duration}
                step="any"
                required
                defaultValue={snapshot.time}
                className="min-h-11 w-24 rounded-lg border border-mld-border px-2"
              />
            </label>
            <Button type="submit" className="text-sm">
              {copy.animationSeek}
            </Button>
          </form>
          <Button
            className="text-sm"
            disabled={snapshot.time === clip.duration}
            onClick={() => player.seek(clip.duration)}
          >
            {copy.animationEnd}
          </Button>
          {pro && !snapshot.playing && !snapshot.source?.preview && selection && (
            <SceneAnimationKeyTools
              key={JSON.stringify([revision, clip.id, selected])}
              workshop={workshop}
              selection={selection}
            />
          )}
        </details>
        {snapshot.error && (
          <p role="alert" className="text-sm text-mld-danger">
            {snapshot.error}
          </p>
        )}
      </div>
    </section>
  )
}
