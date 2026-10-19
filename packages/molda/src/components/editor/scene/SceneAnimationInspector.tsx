import { useMemo, useState, useSyncExternalStore } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../../core/copy'
import type { SceneAnimationTrack } from '../../../scene/animation'
import {
  editSceneAnimationPoses,
  recordSceneAnimationChannelValue,
  sceneKeyArrival,
  setScenePoseArrival,
} from '../../../scene/animationArrival'
import {
  configureSceneAnimation,
  retimeSceneAnimation,
  reverseSceneAnimation,
} from '../../../scene/animationCommands'
import { sameSceneContent } from '../../../scene/documentContent'
import { evaluateSceneNodeFlags } from '../../../scene/evaluate'
import { requireScene } from '../../../scene/validation'
import { useMoldaToolAccess } from '../../toolAccess'
import { Button } from '../../ui/Button'
import { SceneAnimationPoseCard } from './SceneAnimationPoseCard'
import { SceneAnimationPoseSetTools } from './SceneAnimationPoseSetTools'
import { SceneAnimationPoseTools } from './SceneAnimationPoseTools'
import { ScenePivotChoices } from './SceneModelGuideControls'
import { SceneTransformSteps } from './SceneTransformSteps'
import { SceneTwoBoneControls } from './SceneTwoBoneControls'
import {
  sceneAnimationFormKey,
  sceneAnimationFormNumber,
  sceneAnimationFormValue,
} from './sceneAnimationForm'
import { SCENE_APPEARANCE_FIELD as field } from './sceneAppearanceForm'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function SceneAnimationInspector({
  workshop,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
}) {
  const { animation, primary: node, document, run, index, covered } = workshop
  const snapshot = useSyncExternalStore(
    animation.subscribe,
    animation.getSnapshot,
    animation.getSnapshot,
  )
  const editSnapshot = useSyncExternalStore(
    workshop.animationEdit.subscribe,
    workshop.animationEdit.getSnapshot,
    workshop.animationEdit.getSnapshot,
  )
  const revision = useStore(workshop.editor, (state) => state.contentRevision)
  const adjusting = useSyncExternalStore(
    workshop.animationPose.subscribe,
    () => {
      const { pending, dragging } = workshop.animationPose.getSnapshot()
      return pending || dragging
    },
    () => false,
  )
  const [channel, setChannel] = useState<SceneAnimationTrack['channel']>('translation')
  const assisting = useSyncExternalStore(
    workshop.animationPose.subscribe,
    () => workshop.animationPose.getSnapshot().reach !== null,
    () => false,
  )
  const flags = useMemo(() => evaluateSceneNodeFlags(index.scene), [index])
  // Poses individuais são básicas; conjuntos e ritmo são intermediários; articulações são avançadas.
  const { can } = useMoldaToolAccess()
  const create = can('animate.create')
  const pro = can('animate.pro')
  const copy = COPY.scene
  if (workshop.tool === 'pivot' && can('model.pivot'))
    return (
      <div className="border-t border-mld-border pt-3">
        <ScenePivotChoices workshop={workshop} />
      </div>
    )
  const clip = snapshot.source?.document === document ? snapshot.source.clip : null
  if (!clip) return <p className="text-sm text-mld-muted">{copy.animationEmpty}</p>
  if (snapshot.source?.preview)
    return (
      <section className="space-y-2" aria-label="Prévia dos ajustes do movimento">
        <p role="status" className="text-sm text-mld-muted">
          {copy.animationPresetEditingHint}
        </p>
        {editSnapshot.origin === 'settings' && editSnapshot.pending && (
          <>
            <Button onClick={workshop.animationEdit.confirm}>{copy.animationApply}</Button>
            <Button onClick={workshop.animationEdit.cancel}>Cancelar ajustes</Button>
          </>
        )}
      </section>
    )
  const locked = [...covered].some((id) => flags.get(id)?.locked)
  const compatible = clip.space !== 'local' || node?.transform.kind === 'trs'
  const initial =
    node && compatible && !snapshot.playing
      ? sceneAnimationFormValue(node, clip, channel, snapshot.time)
      : null
  const ownTrack = clip.tracks.find(
    (track) => track.nodeId === node?.id && track.channel === channel,
  )
  const arrival = ownTrack && initial?.exact ? sceneKeyArrival(ownTrack, snapshot.time) : 'smooth'
  return (
    <section className="space-y-3 border-t border-mld-border pt-3" aria-label={copy.animationMode}>
      <SceneAnimationPoseCard workshop={workshop} />
      {create && (
        <Button
          className="w-full text-sm"
          disabled={clip.duration > 598}
          onClick={() =>
            workshop.requestTransition(() => {
              const latest = workshop.editor
                .getState()
                .content.animations?.find((entry) => entry.id === clip.id)
              if (!latest) return
              const duration = latest.duration + 2
              const next = run((source) =>
                configureSceneAnimation(source, clip.id, {
                  duration,
                  fps: latest.fps,
                  loop: latest.loop,
                }),
              )
              if (next) animation.seek(duration)
            })
          }
        >
          Mais tempo · +2 s
        </Button>
      )}
      <details className="mld-disclosure">
        <summary>Valores e organização do movimento</summary>
        <div className="space-y-3">
          {create && !snapshot.playing && <SceneTransformSteps workshop={workshop} />}
          {workshop.showPreviousPose && !workshop.previousPose && (
            <p role="status" className="text-xs text-mld-muted">
              Ainda não há uma pose anterior marcada para esta seleção.
            </p>
          )}
          {pro && !snapshot.playing && (!adjusting || assisting) && (
            <SceneTwoBoneControls
              key={JSON.stringify([revision, clip.id, node?.id, snapshot.time])}
              workshop={workshop}
              clipId={clip.id}
              time={snapshot.time}
            />
          )}
          {create && !adjusting && <SceneAnimationPoseTools workshop={workshop} />}
          {can('animate.batch') && (
            <SceneAnimationPoseSetTools workshop={workshop} clipId={clip.id} time={snapshot.time} />
          )}
          {!create ? null : adjusting ? (
            <p className="text-sm text-mld-muted">{copy.animationPoseFieldsHint}</p>
          ) : snapshot.playing ? (
            <p role="status" className="text-sm">
              {copy.animationPauseHint}
            </p>
          ) : !node ? (
            <p className="text-sm text-mld-muted">{copy.animationPickHint}</p>
          ) : !compatible ? (
            <p className="text-sm text-mld-warn">{copy.animationAffineHint}</p>
          ) : (
            initial && (
              <>
                <h4 className="text-sm font-bold">{node.name}</h4>
                {locked && <p className="text-sm text-mld-warn">{copy.animationLocked}</p>}
                {clip.space === 'local' && (
                  <p className="text-xs text-mld-muted">{copy.animationLocalHint}</p>
                )}
                <label className="block space-y-1 text-sm">
                  <span>{copy.animationChannel}</span>
                  <select
                    name="animationChannel"
                    className={field}
                    value={channel}
                    onChange={(event) =>
                      setChannel(event.target.value as SceneAnimationTrack['channel'])
                    }
                  >
                    {(['translation', 'rotation', 'scale'] as const).map((channel) => (
                      <option key={channel} value={channel}>
                        {copy.animationChannels[channel]}
                      </option>
                    ))}
                  </select>
                </label>
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault()
                    const data = new FormData(event.currentTarget)
                    run((source) => {
                      requireScene(
                        sameSceneContent(source, document),
                        'source',
                        copy.animationChanged,
                      )
                      const input = sceneAnimationFormKey(
                        node.id,
                        channel,
                        snapshot.time,
                        initial,
                        data,
                      )
                      const next = recordSceneAnimationChannelValue(source, clip.id, input)
                      return setScenePoseArrival(
                        next,
                        clip.id,
                        { nodeId: node.id, channel, time: snapshot.time },
                        input.key.interpolation,
                      )
                    })
                  }}
                >
                  <fieldset disabled={locked} className="space-y-3">
                    <legend className="sr-only">{copy.animationChannels[channel]}</legend>
                    <div
                      key={JSON.stringify([revision, clip.id, node.id, channel, snapshot.time])}
                      className="space-y-3"
                    >
                      <div className="grid grid-cols-3 gap-2">
                        {copy.animationAxes[channel].map((label, i) => (
                          <label key={label} className="space-y-1 text-xs">
                            <span>{label}</span>
                            <input
                              name={`axis${i}`}
                              type="number"
                              step="any"
                              required
                              className={field}
                              defaultValue={initial.display[i]}
                            />
                          </label>
                        ))}
                      </div>
                      {channel !== 'translation' && (
                        <p className="text-xs text-mld-muted">
                          {channel === 'rotation'
                            ? copy.animationRotationHint
                            : copy.animationScaleHint}
                        </p>
                      )}
                      {pro ? (
                        <label className="block space-y-1 text-sm">
                          <span>{copy.animationCurve}</span>
                          <select
                            name="interpolation"
                            className={field}
                            defaultValue={arrival ?? 'smooth'}
                          >
                            {(['step', 'linear', 'smooth'] as const).map((value) => (
                              <option key={value} value={value}>
                                {copy.animationCurves[value]}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        // The same arrival contract applies to fields and direct manipulation.
                        <input type="hidden" name="interpolation" value={arrival ?? 'smooth'} />
                      )}
                      <p className="text-xs text-mld-muted">
                        {initial.exact ? copy.animationKeyPresent : copy.animationKeyNew}
                      </p>
                    </div>
                    <Button type="submit" variant="primary" className="w-full text-sm">
                      {copy.animationRecord}
                    </Button>
                    <Button
                      className="w-full text-sm"
                      disabled={!initial.exact}
                      onClick={() =>
                        run((source) => {
                          requireScene(
                            sameSceneContent(source, document),
                            'source',
                            copy.animationChanged,
                          )
                          return editSceneAnimationPoses(
                            source,
                            clip.id,
                            [{ nodeId: node.id, channel, time: snapshot.time }],
                            'remove',
                          )
                        })
                      }
                    >
                      {copy.animationRemoveKey}
                    </Button>
                  </fieldset>
                </form>
              </>
            )
          )}
          {can('animate.batch') && (
            <details
              className="rounded-lg border border-mld-border px-2"
              onToggle={(event) => {
                if (event.currentTarget.open) animation.pause()
              }}
            >
              <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold">
                {copy.animationSettings}
              </summary>
              <form
                className="space-y-3 pb-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  const data = new FormData(event.currentTarget)
                  workshop.animationEdit.prepare(
                    clip.id,
                    (source) => {
                      requireScene(
                        sameSceneContent(source, document),
                        'source',
                        copy.animationChanged,
                      )
                      const duration = sceneAnimationFormNumber(data, 'duration')
                      const base = data.has('retime')
                        ? retimeSceneAnimation(source, clip.id, duration)
                        : source
                      return configureSceneAnimation(base, clip.id, {
                        duration,
                        fps: sceneAnimationFormNumber(data, 'fps'),
                        loop: data.has('loop'),
                      })
                    },
                    'settings',
                  )
                }}
              >
                <div key={JSON.stringify([revision, clip.id])} className="space-y-3">
                  <label className="block space-y-1 text-sm">
                    <span>{copy.animationDuration}</span>
                    <input
                      name="duration"
                      type="number"
                      min={Number.MIN_VALUE}
                      max={600}
                      step="any"
                      defaultValue={clip.duration}
                      required
                      className={field}
                    />
                  </label>
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input name="retime" type="checkbox" className="size-5 accent-mld-accent" />
                    {copy.animationRetime}
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span>{copy.animationFps}</span>
                    <input
                      name="fps"
                      type="number"
                      min={1}
                      max={120}
                      step={1}
                      defaultValue={clip.fps}
                      required
                      className={field}
                    />
                  </label>
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      name="loop"
                      type="checkbox"
                      className="size-5 accent-mld-accent"
                      defaultChecked={clip.loop}
                    />
                    {copy.animationLoop}
                  </label>
                </div>
                <Button type="submit" className="w-full text-sm">
                  Conferir ajustes
                </Button>
              </form>
              <Button
                className="w-full text-sm"
                onClick={() => {
                  workshop.animationEdit.prepare(
                    clip.id,
                    (source) => reverseSceneAnimation(source, clip.id),
                    'settings',
                  )
                }}
              >
                {copy.animationReverse}
              </Button>
              <p className="py-2 text-xs text-mld-muted">{copy.animationReverseHint}</p>
              {editSnapshot.origin === 'settings' && editSnapshot.error && (
                <p role="alert" className="text-sm text-mld-danger">
                  {editSnapshot.error}
                </p>
              )}
            </details>
          )}
        </div>
      </details>
    </section>
  )
}
