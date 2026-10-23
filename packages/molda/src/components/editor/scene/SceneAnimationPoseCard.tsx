import { useSyncExternalStore } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneAnimationTrack } from '../../../scene/animation'
import {
  editSceneAnimationPoses,
  sceneKeyArrival,
  sceneRotationPaceNeedsChange,
  setScenePoseArrival,
  setSceneRotationPace,
} from '../../../scene/animationArrival'
import { fullLoopRotationKeys } from '../../../scene/animationLoop'
import { evaluateSceneNodeFlags } from '../../../scene/evaluate'
import { useMoldaToolAccess } from '../../toolAccess'
import { Copy, Move3d, Rotate3d, Scaling, Spline, Trash2, TrendingUp, Zap } from '../../ui/icons'
import type { useSceneWorkshop } from './useSceneWorkshop'

function distinctPoseTimeLabel(track: SceneAnimationTrack, time: number): string {
  const index = track.keys.findIndex((key) => key.time === time)
  const nearby = [track.keys[index - 1]?.time, track.keys[index + 1]?.time].filter(
    (value): value is number => value !== undefined,
  )
  for (let digits = 2; digits <= 20; digits++) {
    const label = time.toLocaleString('pt-BR', { maximumFractionDigits: digits })
    if (
      nearby.every(
        (other) => other.toLocaleString('pt-BR', { maximumFractionDigits: digits }) !== label,
      )
    )
      return label
  }
  return String(time).replace('.', ',')
}

export function SceneAnimationPoseCard({
  workshop,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
}) {
  const { animation, selectedPose: pose } = workshop
  const snapshot = useSyncExternalStore(
    animation.subscribe,
    animation.getSnapshot,
    animation.getSnapshot,
  )
  const canEdit = useMoldaToolAccess().can('animate.create')
  const clip = snapshot.source?.clip
  const track =
    pose &&
    clip?.tracks.find((entry) => entry.nodeId === pose.nodeId && entry.channel === pose.channel)
  if (!pose || !clip || !track) return null
  const node = workshop.index.scene.nodes.get(pose.nodeId),
    arrival = sceneKeyArrival(track, pose.time),
    copying = workshop.poseCopy
  const ChannelIcon =
    pose.channel === 'translation' ? Move3d : pose.channel === 'rotation' ? Rotate3d : Scaling
  const free =
    copying &&
    Number.isFinite(copying.target) &&
    copying.target >= 0 &&
    copying.target <= clip.duration &&
    !track.keys.some((key) => key.time === copying.target)
  const disabled =
    !canEdit ||
    snapshot.playing ||
    !!snapshot.source?.preview ||
    evaluateSceneNodeFlags(workshop.index.scene).get(pose.nodeId)?.locked
  const completesTurn = track.channel === 'rotation' && !!fullLoopRotationKeys(clip, track)
  const edit = (operation: 'move' | 'copy' | 'remove', time = pose.time) =>
    workshop.requestTransition(() => {
      const next = workshop.run((source) =>
        editSceneAnimationPoses(source, clip.id, [pose], operation, time - pose.time),
      )
      if (next) workshop.selectAnimationPose(operation === 'remove' ? null : { ...pose, time })
    })
  return (
    <section className="mld-pose-card" aria-label="Pose escolhida" data-channel={pose.channel}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[15px] font-extrabold">
          Pose em {distinctPoseTimeLabel(track, pose.time)} s
        </h3>
        <p className="mld-pose-channel">
          <ChannelIcon aria-hidden="true" className="size-3" />
          {COPY.scene.animationChannels[pose.channel]} · {node?.name}
        </p>
      </div>
      {arrival === null ? (
        <p className="text-xs text-mld-muted">A primeira pose não tem uma chegada anterior.</p>
      ) : (
        <fieldset disabled={disabled || !!copying} className="space-y-1">
          <legend className="text-xs font-bold">Como a peça chega nessa pose?</legend>
          <div className="mld-arrival-options">
            {(
              [
                ['smooth', pose.channel === 'rotation' ? 'Suave (freia)' : 'Suave', Spline],
                ['linear', 'Ritmo constante', TrendingUp],
                ['step', 'De uma vez', Zap],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                aria-pressed={arrival === value}
                className="mld-arrival-option"
                onClick={() =>
                  workshop.requestTransition(() =>
                    workshop.run((source) => setScenePoseArrival(source, clip.id, pose, value)),
                  )
                }
              >
                <Icon aria-hidden="true" className="size-5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {pose.channel === 'rotation' &&
        track.keys.length > 1 &&
        sceneRotationPaceNeedsChange(clip, track) && (
          <div className="space-y-2 rounded-lg border border-mld-border p-3">
            <p className="text-xs text-mld-muted">
              {completesTurn
                ? 'Este giro termina antes de completar uma volta e salta ao recomeçar. Vamos completar a volta em ritmo constante.'
                : 'Suave faz o giro frear em cada pose. Para hélices e rodas, use ritmo constante.'}
              {clip.loop && !completesTurn
                ? ' O fim da volta também será alinhado ao começo, se estiver perto.'
                : ''}
            </p>
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--quiet w-full text-xs"
              disabled={disabled || !!copying}
              onClick={() =>
                workshop.requestTransition(() =>
                  workshop.run((source) => setSceneRotationPace(source, clip.id, pose.nodeId)),
                )
              }
            >
              Girar sem frear
            </button>
          </div>
        )}
      <details className="mld-disclosure">
        <summary>Mudar tempo da pose</summary>
        <div className="pt-2">
          <label className="flex items-center justify-between gap-2 text-sm">
            Tempo da pose
            <input
              key={`${clip.id}:${pose.nodeId}:${pose.channel}:${pose.time}`}
              name="selectedPoseTime"
              type="number"
              min={0}
              max={clip.duration}
              step="any"
              defaultValue={pose.time}
              disabled={disabled}
              aria-label="Tempo da pose escolhida"
              className="w-20 rounded-lg border border-mld-border bg-mld-surface px-2 py-2 tabular-nums"
              onBlur={(event) => {
                const time = Number(event.target.value)
                if (event.target.value.trim() && Number.isFinite(time) && time !== pose.time)
                  edit('move', time)
                event.target.value = String(pose.time)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur()
                if (event.key === 'Escape') {
                  event.stopPropagation()
                  event.currentTarget.value = String(pose.time)
                  event.currentTarget.blur()
                }
              }}
            />
          </label>
        </div>
      </details>
      {copying ? (
        <div className="space-y-2">
          <label className="flex items-center justify-between text-xs">
            Tempo da cópia
            <input
              type="number"
              name="copiedPoseTime"
              min={0}
              max={clip.duration}
              step="any"
              value={Number.isFinite(copying.target) ? copying.target : ''}
              onChange={(event) =>
                workshop.setPoseCopyTime(
                  event.target.value === '' ? NaN : Number(event.target.value),
                )
              }
              className="w-20 rounded border border-mld-border px-2 py-2"
            />
          </label>
          <p role="status" className="text-xs text-mld-muted">
            {free
              ? 'Confira o losango de prévia e confirme a cópia.'
              : 'Escolha um tempo livre no mesmo canal.'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--primary px-2 text-xs"
              disabled={!free || disabled}
              onClick={workshop.confirmPoseCopy}
            >
              Confirmar cópia
            </button>
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--quiet px-2 text-xs"
              onClick={workshop.cancelPoseCopy}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="sz-tool-pill sz-tool-pill--quiet px-2 text-xs"
            disabled={disabled}
            onClick={workshop.beginPoseCopy}
          >
            <Copy aria-hidden="true" className="size-4" />
            Copiar pose
          </button>
          <button
            type="button"
            className="sz-tool-pill sz-tool-pill--quiet px-2 text-xs text-mld-danger"
            disabled={disabled}
            onClick={() => edit('remove')}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Apagar pose
          </button>
        </div>
      )}
    </section>
  )
}
