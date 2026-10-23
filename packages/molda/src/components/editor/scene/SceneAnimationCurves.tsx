import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { COPY } from '../../../core/copy'
import type { Vec3 } from '../../../core/model'
import type { SceneAnimationTrack } from '../../../scene/animation'
import {
  editSceneAnimationPoses,
  recordSceneAnimationChannelValue,
  sceneKeyArrival,
  setScenePoseArrival,
} from '../../../scene/animationArrival'
import { nearestSceneAnimationKey } from '../../../scene/animationKeySelection'
import { evaluateSceneNodeFlags } from '../../../scene/evaluate'
import { quaternionFromEulerXYZ } from '../../../scene/matrix'
import { requireScene } from '../../../scene/validation'
import { Button } from '../../ui/Button'
import { curveVertical, sceneAnimationCurvePlot, sceneCurveValue } from './animationCurvePlot'
import { SceneAnimationCurveHandle } from './SceneAnimationCurveHandle'
import { SceneAnimationKeyStrip } from './SceneAnimationKeyStrip'
import type { useSceneWorkshop } from './useSceneWorkshop'

/** Graph and numeric controls edit the same native channels, through the shared reversible preview. */
export function SceneAnimationCurves({
  workshop,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
}) {
  const { animation, animationEdit, primary: node, document: source } = workshop
  const playback = useSyncExternalStore(
    animation.subscribe,
    animation.getSnapshot,
    animation.getSnapshot,
  )
  const editing = useSyncExternalStore(
    animationEdit.subscribe,
    animationEdit.getSnapshot,
    animationEdit.getSnapshot,
  )
  const clip = source.animations?.find((entry) => entry.id === playback.source?.clip.id)
  const [channel, setChannel] = useState<SceneAnimationTrack['channel']>('translation')
  const [axis, setAxis] = useState(0)
  const [focus, setFocus] = useState(0)
  const [zoom, setZoom] = useState(false)
  const owner = useMemo(
    () => ({ source, nodeId: node?.id, clipId: clip?.id, channel, axis }),
    [source, node?.id, clip?.id, channel, axis],
  )
  const [savedDraft, setDraft] = useState<{ owner: object; time: number; value: number } | null>(
    null,
  )
  const draft = savedDraft?.owner === owner ? savedDraft : null
  const destination = useRef<{ owner: object; time: number } | null>(null)
  const track = clip?.tracks.find((track) => track.nodeId === node?.id && track.channel === channel)
  const times = useMemo(() => track?.keys.map((key) => key.time) ?? [], [track])
  const time = nearestSceneAnimationKey(times, focus)
  const keyIndex = time === undefined ? -1 : times.indexOf(time)
  const shownClip = playback.source?.clip ?? clip
  const span =
    clip && time !== undefined && zoom
      ? [times[Math.max(0, keyIndex - 1)]!, times[Math.min(times.length - 1, keyIndex + 1)]!]
      : [0, clip?.duration ?? 1]
  const start = span[0]!,
    end = span[1]! > start ? span[1]! : (clip?.duration ?? 1)
  const plot = useMemo(
    () =>
      node && shownClip ? sceneAnimationCurvePlot(node, shownClip, channel, start, end) : null,
    [node, shownClip, channel, start, end],
  )
  const flags = useMemo(() => evaluateSceneNodeFlags(workshop.index.scene), [workshop.index])
  useEffect(() => {
    const selected = workshop.selectedPose
    if (selected && selected.nodeId === node?.id) {
      setFocus(selected.time)
      setChannel(selected.channel)
    }
  }, [workshop.selectedPose, node?.id])
  useEffect(() => {
    if (!editing.pending) setDraft(null)
  }, [editing.pending])
  if (!node || !clip || !plot)
    return (
      <p className="p-4 text-sm text-mld-muted">
        Escolha uma peça e um movimento para editar suas curvas.
      </p>
    )
  const value = time === undefined ? null : sceneCurveValue(node, clip, channel, time)
  const blocked =
    !!flags.get(node.id)?.locked ||
    playback.playing ||
    (clip.space === 'local' && node.transform.kind !== 'trs') ||
    !!workshop.poseCopy ||
    (!!playback.source?.preview && editing.origin !== 'curves')
  const range = plot.ranges[axis]!
  const rangeSpan = (range.high - range.low) * range.magnitude
  const points = plot.points.map((point) => [
    ((point.time - start) / (end - start)) * 1000,
    curveVertical(point.values[axis]!, range) * 200,
  ])
  const path = points
    .map((point, i) => {
      const discontinuity =
        channel === 'rotation' &&
        i > 0 &&
        Math.abs(plot.points[i]!.values[axis]! - plot.points[i - 1]!.values[axis]!) > 180
      return `${i === 0 || discontinuity ? 'M' : 'L'}${point[0]},${point[1]}`
    })
    .join(' ')
  const choose = (at: number) =>
    workshop.requestTransition(() => {
      setFocus(at)
      workshop.selectAnimationPose({ nodeId: node.id, channel, time: at })
    })
  const preview = (nextTime: number, nextValue: number) => {
    if (
      time === undefined ||
      !value ||
      !track ||
      blocked ||
      workshop.editor.getState().content !== source
    )
      return
    destination.current = null
    const ok = animationEdit.prepare(
      clip.id,
      (document) => {
        requireScene(Number.isFinite(nextValue), 'value', 'Digite um valor finito para a curva.')
        const ref = { nodeId: node.id, channel, time }
        const moved = editSceneAnimationPoses(document, clip.id, [ref], 'move', nextTime - time)
        if (nextValue === value[axis]) return moved
        const movedClip = moved.animations!.find((entry) => entry.id === clip.id)!
        const values = sceneCurveValue(node, movedClip, channel, nextTime)
        values[axis] = nextValue
        const interpolation = track.keys[keyIndex]!.interpolation
        return recordSceneAnimationChannelValue(
          moved,
          clip.id,
          channel === 'rotation'
            ? {
                nodeId: node.id,
                channel,
                key: { time: nextTime, value: quaternionFromEulerXYZ(values), interpolation },
              }
            : {
                nodeId: node.id,
                channel,
                key: { time: nextTime, value: values as Vec3, interpolation },
              },
        )
      },
      'curves',
    )
    if (ok) {
      destination.current = { owner, time: nextTime }
      setDraft({ owner, time: nextTime, value: nextValue })
      animation.seek(nextTime)
    }
  }
  const finish = (commit: boolean) => {
    const nextTime = destination.current?.owner === owner ? destination.current.time : null
    destination.current = null
    if (commit && nextTime !== null && animationEdit.confirm()) {
      setFocus(nextTime)
      workshop.selectAnimationPose({ nodeId: node.id, channel, time: nextTime })
    } else animationEdit.cancel()
    setDraft(null)
  }
  const arrival = track && time !== undefined ? sceneKeyArrival(track, time) : null
  return (
    <section
      aria-label="Editor de curvas"
      className="mld-curves mld-scroll-y"
      data-axis={['x', 'y', 'z'][axis]}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <strong>{node.name}</strong>
        <label>
          Canal{' '}
          <select
            name="curveChannel"
            value={channel}
            disabled={editing.pending}
            onChange={(event) => {
              setChannel(event.target.value as SceneAnimationTrack['channel'])
              setDraft(null)
            }}
          >
            {(['translation', 'rotation', 'scale'] as const).map((name) => (
              <option key={name} value={name}>
                {COPY.scene.animationChannels[name]}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="flex gap-1">
          <legend className="sr-only">Eixo da curva</legend>
          {['X', 'Y', 'Z'].map((name, i) => (
            <Button
              key={name}
              className="px-3 text-xs"
              aria-pressed={axis === i}
              disabled={editing.pending}
              onClick={() => setAxis(i)}
            >
              {name}
            </Button>
          ))}
        </fieldset>
        <label className="flex min-h-11 items-center gap-2">
          <input
            name="curveZoom"
            type="checkbox"
            checked={zoom}
            disabled={editing.pending || times.length < 2}
            onChange={(event) => setZoom(event.target.checked)}
          />
          Ampliar intervalo da pose
        </label>
        <span>
          {channel === 'rotation'
            ? 'Graus XYZ'
            : channel === 'scale'
              ? 'Escala local'
              : 'Posição local'}
        </span>
      </div>
      <div className="mld-curve-plot">
        <svg
          role="img"
          aria-label={`Curva de ${COPY.scene.animationChannels[channel]}, eixo ${['X', 'Y', 'Z'][axis]}`}
          viewBox="0 0 1000 200"
          preserveAspectRatio="none"
        >
          <title>Valores do canal ao longo do movimento</title>
          {[0, 50, 100, 150, 200].map((y) => (
            <path key={y} d={`M0,${y}L1000,${y}`} className="mld-curve-grid" />
          ))}
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={`M${((playback.time - start) / (end - start)) * 1000},0v200`}
            className="mld-curve-time"
          />
        </svg>
        <span className="mld-curve-high">
          {(range.high * range.magnitude).toLocaleString('pt-BR', { maximumSignificantDigits: 5 })}
        </span>
        <span className="mld-curve-low">
          {(range.low * range.magnitude).toLocaleString('pt-BR', { maximumSignificantDigits: 5 })}
        </span>
        {value && time !== undefined && (
          <SceneAnimationCurveHandle
            x={((draft?.time ?? time) - start) / (end - start)}
            y={curveVertical(draft?.value ?? value[axis]!, range)}
            value={value[axis]!}
            time={time}
            duration={end - start}
            valueSpan={rangeSpan}
            owner={owner}
            disabled={blocked || !Number.isFinite(rangeSpan)}
            onPreview={preview}
            onEnd={finish}
          />
        )}
      </div>
      <div className="flex justify-between text-xs text-mld-muted">
        <span>{start.toLocaleString('pt-BR')} s</span>
        <span>{end.toLocaleString('pt-BR')} s</span>
      </div>
      <SceneAnimationKeyStrip
        times={times}
        duration={clip.duration}
        time={playback.time}
        selectedTime={time}
        label={`${COPY.scene.animationChannels[channel]} · ${node.name}`}
        channel={channel}
        onSeek={(at) => {
          const nearest = nearestSceneAnimationKey(times, at)
          if (nearest !== undefined) choose(nearest)
        }}
        onKeySelect={choose}
      />
      {time !== undefined && value ? (
        <form
          key={`${node.id}:${channel}:${axis}:${time}:${source.updatedAt}`}
          className="flex flex-wrap items-end gap-2 text-xs"
          onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            const at = data.get('curveTime'),
              amount = data.get('curveValue')
            preview(
              typeof at === 'string' && at.trim() ? Number(at) : NaN,
              typeof amount === 'string' && amount.trim() ? Number(amount) : NaN,
            )
          }}
        >
          <label>
            Tempo (s)
            <input
              name="curveTime"
              type="number"
              step="any"
              min={0}
              max={clip.duration}
              defaultValue={time}
              disabled={blocked || editing.pending}
            />
          </label>
          <label>
            Valor {['X', 'Y', 'Z'][axis]}
            <input
              name="curveValue"
              type="number"
              step="any"
              defaultValue={value[axis]}
              disabled={blocked || editing.pending}
            />
          </label>
          <Button type="submit" className="text-xs" disabled={blocked || editing.pending}>
            Conferir curva
          </Button>
          <label>
            Chegada
            <select
              name="curveArrival"
              value={arrival ?? 'smooth'}
              disabled={blocked || editing.pending || arrival === null}
              onChange={(event) => {
                const arrival = event.target.value as 'smooth' | 'linear' | 'step'
                destination.current = { owner, time }
                animationEdit.prepare(
                  clip.id,
                  (document) =>
                    setScenePoseArrival(
                      document,
                      clip.id,
                      { nodeId: node.id, channel, time },
                      arrival,
                    ),
                  'curves',
                )
              }}
            >
              <option value="smooth">{channel === 'rotation' ? 'Suave (freia)' : 'Suave'}</option>
              <option value="linear">Ritmo constante</option>
              <option value="step">De uma vez</option>
            </select>
          </label>
        </form>
      ) : (
        <p className="text-sm text-mld-muted">
          Este canal ainda não tem poses. Marque uma pose para começar.
        </p>
      )}
      {editing.pending && editing.origin === 'curves' && (
        <div className="mt-2 flex gap-2">
          <Button variant="primary" onClick={() => finish(true)}>
            Aplicar curva
          </Button>
          <Button onClick={() => finish(false)}>Cancelar curva</Button>
        </div>
      )}
      {editing.origin === 'curves' && editing.error && (
        <p role="alert" className="text-sm text-mld-danger">
          {editing.error}
        </p>
      )}
      {blocked && (
        <p className="text-xs text-mld-muted">
          Pause o movimento e escolha uma peça destravada com canais editáveis.
        </p>
      )}
      {plot.sampled && (
        <p className="text-xs text-mld-muted">
          Vista geral amostrada. Amplie o intervalo para ver os detalhes; todas as poses continuam
          acessíveis pela faixa e pelo teclado.
        </p>
      )}
    </section>
  )
}
