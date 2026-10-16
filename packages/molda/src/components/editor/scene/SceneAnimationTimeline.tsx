import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../../core/copy'
import { editSceneAnimationPoses } from '../../../scene/animationArrival'
import { configureSceneAnimation } from '../../../scene/animationCommands'
import { sceneAnimationKeySelection } from '../../../scene/animationKeySelection'
import { evaluateSceneNodeFlags } from '../../../scene/evaluate'
import { useMoldaToolAccess } from '../../toolAccess'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from '../../ui/icons'
import { SceneAnimationCurves } from './SceneAnimationCurves'
import { SceneAnimationKeyStrip } from './SceneAnimationKeyStrip'
import { SceneAnimationKeyTools } from './SceneAnimationKeyTools'
import { SceneAnimationPoseControls } from './SceneAnimationPoseControls'
import { SceneAnimationRuler } from './SceneAnimationRuler'
import type { useSceneWorkshop } from './useSceneWorkshop'
import { useTimelineHeight } from './useTimelineHeight'

export function SceneAnimationTimeline({
  workshop,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
}) {
  const { animation: player, selected, document, selectedPose } = workshop
  const revision = useStore(workshop.editor, (state) => state.contentRevision)
  const snapshot = useSyncExternalStore(player.subscribe, player.getSnapshot, player.getSnapshot)
  const editing = useSyncExternalStore(
    workshop.animationEdit.subscribe,
    workshop.animationEdit.getSnapshot,
    workshop.animationEdit.getSnapshot,
  )
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const layout = useTimelineHeight(),
    clip = snapshot.source?.clip,
    copy = COPY.scene,
    { can } = useMoldaToolAccess()
  const authoringClip = document.animations?.find((entry) => entry.id === clip?.id)
  const curves = workshop.area === 'curves' && can('animate.pro')
  const height = curves ? Math.max(layout.height, Math.min(layout.maximum, 440)) : layout.height
  const selection = useMemo(
    () => (authoringClip ? sceneAnimationKeySelection(authoringClip, selected) : null),
    [authoringClip, selected],
  )
  const rows = useMemo(() => {
    if (!clip) return []
    const flags = evaluateSceneNodeFlags(workshop.index.scene)
    return document.nodes
      .filter((node) => !flags.get(node.id)?.hidden)
      .map((node) => ({
        id: node.id,
        name: node.name,
        kind: node.kind,
        locked: flags.get(node.id)?.locked,
        keys: sceneAnimationKeySelection(clip, [node.id]),
      }))
  }, [clip, document, workshop.index])
  // Selection can change during pointer-down. Keep channel arrays stable so that
  // selecting a key does not invalidate the drag that selected it.
  const visibleRows = rows.filter(
    (row) => row.kind === 'mesh' || row.keys.times.length || selected.includes(row.id),
  )
  const copyingNode = workshop.poseCopy?.ref.nodeId
  useEffect(() => {
    if (copyingNode) setExpanded((before) => new Set([...before, copyingNode]))
  }, [copyingNode])
  const seek = (time: number) => {
    workshop.selectAnimationPose(null)
    player.seek(time)
  }
  const editable = can('animate.create') && !snapshot.playing && !snapshot.source?.preview
  const toggle = (id: string) =>
    setExpanded((before) => {
      const next = new Set(before)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const times = useMemo(
    () =>
      [...new Set(clip?.tracks.flatMap((track) => track.keys.map((key) => key.time)) ?? [])].sort(
        (a, b) => a - b,
      ),
    [clip],
  )
  return (
    <section
      ref={layout.element}
      aria-label={copy.animationTimeline}
      data-collapsed={(!curves && layout.collapsed) || !clip}
      style={{ height: clip ? height : 60 }}
      className="mld-timeline relative flex shrink-0 flex-col border-t border-mld-border bg-mld-surface"
    >
      {clip && (
        <hr
          tabIndex={0}
          aria-label="Altura da linha do tempo"
          aria-orientation="horizontal"
          aria-valuemin={60}
          aria-valuemax={layout.maximum}
          aria-valuenow={height}
          aria-valuetext={!curves && layout.collapsed ? 'Recolhida' : `${height} pixels`}
          className="mld-timeline-resizer"
          {...layout.separator}
        />
      )}
      {!clip ? (
        <p role="status" className="m-auto px-4 text-center text-sm text-mld-muted">
          {snapshot.error ?? 'Crie um movimento no painel à direita.'}
        </p>
      ) : (
        <>
          <div className="mld-timeline-transport mld-scroll-x flex shrink-0 items-center gap-1 overflow-x-auto px-3">
            <button
              type="button"
              className="mld-transport-btn"
              aria-label={copy.animationStart}
              disabled={snapshot.time === 0}
              onClick={() => seek(0)}
            >
              <SkipBack aria-hidden="true" />
            </button>
            {can('animate.batch') && (
              <button
                type="button"
                className="mld-transport-btn"
                aria-label={copy.animationPrevious}
                disabled={snapshot.time === 0}
                onClick={() => seek(times.filter((at) => at < snapshot.time).at(-1) ?? 0)}
              >
                <ChevronLeft aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              data-play=""
              className="mld-transport-btn"
              aria-label={snapshot.playing ? copy.animationPause : copy.animationPlay}
              aria-pressed={snapshot.playing}
              onClick={() => (snapshot.playing ? player.pause() : player.play())}
            >
              {snapshot.playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            </button>
            {can('animate.batch') && (
              <button
                type="button"
                className="mld-transport-btn"
                aria-label={copy.animationNext}
                disabled={snapshot.time === clip.duration}
                onClick={() => seek(times.find((at) => at > snapshot.time) ?? clip.duration)}
              >
                <ChevronRight aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              className="mld-transport-btn"
              aria-label={copy.animationEnd}
              disabled={snapshot.time === clip.duration}
              onClick={() => seek(clip.duration)}
            >
              <SkipForward aria-hidden="true" />
            </button>
            <label className="flex shrink-0 items-center gap-1 text-xs">
              <input
                type="checkbox"
                name="animationLoop"
                checked={clip.loop}
                disabled={!editable}
                onChange={(event) => {
                  const loop = event.target.checked
                  workshop.requestTransition(() =>
                    workshop.run((source) =>
                      configureSceneAnimation(source, clip.id, {
                        duration: clip.duration,
                        fps: clip.fps,
                        loop,
                      }),
                    ),
                  )
                }}
              />
              Repetir
            </label>
            <label className="flex shrink-0 items-center gap-1 px-1 text-xs tabular-nums">
              <span className="sr-only">{copy.animationTime}</span>
              <span className="mld-time-readout">
                <input
                  key={`${clip.id}:${snapshot.time}`}
                  name="animationSeconds"
                  aria-label={copy.animationSeconds}
                  type="number"
                  min={0}
                  max={clip.duration}
                  step="any"
                  defaultValue={snapshot.time}
                  className="mld-time-seconds"
                  onBlur={(event) => {
                    const raw = event.target.value,
                      at = Number(raw)
                    if (raw && Number.isFinite(at) && at >= 0 && at <= clip.duration) seek(at)
                    else event.target.value = String(snapshot.time)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur()
                  }}
                />
                <span aria-hidden="true">
                  {snapshot.time.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                </span>
              </span>
              <span className="text-xl font-black">s</span>
              <span className="text-xs text-mld-muted">
                de {clip.duration.toLocaleString('pt-BR')} s
              </span>
            </label>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <SceneAnimationPoseControls
                compact
                gesture={workshop.animationPose}
                enabled={editable}
                canMark={
                  selected.length === 1 && ['move', 'rotate', 'scale'].includes(workshop.tool)
                }
                onRecord={workshop.recordAnimationPose}
                onAutoKey={(enabled) =>
                  workshop.requestTransition(() => workshop.animationPose.setAutoKey(enabled))
                }
              />
            </div>
          </div>
          {curves ? (
            <SceneAnimationCurves key={`${clip.id}:${workshop.primary?.id}`} workshop={workshop} />
          ) : (
            !layout.collapsed && (
              <>
                <div className="contents">
                  <label className="mld-duration-label">
                    <span>Duração</span>
                    <select
                      aria-label="Duração do movimento"
                      name="animationDuration"
                      value={clip.duration}
                      disabled={!editable}
                      className="mld-duration-select"
                      onChange={(event) => {
                        const duration = Number(event.target.value)
                        workshop.requestTransition(() =>
                          workshop.run((source) =>
                            configureSceneAnimation(source, clip.id, {
                              duration,
                              fps: clip.fps,
                              loop: clip.loop,
                            }),
                          ),
                        )
                      }}
                    >
                      {[...new Set([1, 1.5, 2, 3, 5, clip.duration])]
                        .sort((a, b) => a - b)
                        .map((duration) => (
                          <option
                            key={duration}
                            value={duration}
                            disabled={duration < (times.at(-1) ?? 0)}
                          >
                            {duration.toLocaleString('pt-BR')} s
                            {duration < (times.at(-1) ?? 0) ? ' · há poses depois' : ''}
                          </option>
                        ))}
                    </select>
                  </label>
                  <SceneAnimationRuler
                    duration={clip.duration}
                    time={snapshot.time}
                    times={times}
                    onSeek={seek}
                  />
                </div>
                <div className="mld-scroll-y min-h-0 flex-1 overflow-y-auto">
                  {visibleRows.map((row) => (
                    <div key={row.id}>
                      <SceneAnimationKeyStrip
                        times={row.keys.times}
                        seekTimes={times}
                        duration={clip.duration}
                        time={snapshot.time}
                        label={row.name}
                        onSeek={seek}
                        onSelect={() => workshop.select(row.id, false)}
                        leading={
                          <button
                            type="button"
                            className="mld-timeline-leading grid shrink-0 place-items-center"
                            aria-label={`Canais de ${row.name}`}
                            aria-expanded={expanded.has(row.id)}
                            onClick={() => toggle(row.id)}
                          >
                            {expanded.has(row.id) ? (
                              <ChevronDown className="size-4" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )}
                          </button>
                        }
                        onKeySelect={(time) => {
                          const channels = row.keys.channels.filter((entry) =>
                            entry.times.includes(time),
                          )
                          if (channels.length === 1)
                            workshop.selectAnimationPose({
                              nodeId: row.id,
                              channel: channels[0]!.channel,
                              time,
                            })
                          else {
                            seek(time)
                            workshop.select(row.id, false)
                            setExpanded((before) => new Set([...before, row.id]))
                            workshop.setMessage(
                              'Há poses em mais de um canal nesse instante. Escolha a pose colorida abaixo.',
                            )
                          }
                        }}
                      />
                      {expanded.has(row.id) &&
                        row.keys.channels.map(({ channel, times: channelTimes }) => (
                          <SceneAnimationKeyStrip
                            key={channel}
                            times={channelTimes}
                            seekTimes={times}
                            duration={clip.duration}
                            time={snapshot.time}
                            label={copy.animationChannels[channel]}
                            channel={channel}
                            copyTime={
                              workshop.poseCopy?.ref.nodeId === row.id &&
                              workshop.poseCopy.ref.channel === channel
                                ? workshop.poseCopy.target
                                : undefined
                            }
                            onSeek={
                              workshop.poseCopy?.ref.nodeId === row.id &&
                              workshop.poseCopy.ref.channel === channel
                                ? workshop.setPoseCopyTime
                                : seek
                            }
                            selectedTime={
                              selectedPose?.nodeId === row.id && selectedPose.channel === channel
                                ? selectedPose.time
                                : undefined
                            }
                            onKeySelect={(time) =>
                              workshop.poseCopy?.ref.nodeId === row.id &&
                              workshop.poseCopy.ref.channel === channel
                                ? workshop.setPoseCopyTime(time)
                                : workshop.selectAnimationPose({ nodeId: row.id, channel, time })
                            }
                            onMove={
                              editable && !row.locked && !workshop.poseCopy
                                ? (from, to) =>
                                    workshop.requestTransition(() => {
                                      const next = workshop.run((source) =>
                                        editSceneAnimationPoses(
                                          source,
                                          clip.id,
                                          [{ nodeId: row.id, channel, time: from }],
                                          'move',
                                          to - from,
                                        ),
                                      )
                                      if (next)
                                        workshop.selectAnimationPose({
                                          nodeId: row.id,
                                          channel,
                                          time: to,
                                        })
                                    })
                                : undefined
                            }
                          />
                        ))}
                    </div>
                  ))}
                  {can('animate.batch') && (editable || editing.pending) && selection && (
                    <SceneAnimationKeyTools
                      key={JSON.stringify([revision, clip.id, selected])}
                      workshop={workshop}
                      selection={selection}
                    />
                  )}
                  {(snapshot.error || layout.unavailable) && (
                    <p role="status" className="px-3 text-xs text-mld-muted">
                      {snapshot.error ??
                        'A altura vale nesta sessão. O navegador não permitiu salvar a preferência.'}
                    </p>
                  )}
                </div>
              </>
            )
          )}
        </>
      )}
    </section>
  )
}
