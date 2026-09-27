import { useMemo, useState, useSyncExternalStore } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../../core/copy'
import type { SceneAnimationTrack } from '../../../scene/animation'
import {
  configureSceneAnimation,
  removeSceneAnimationKeys,
  retimeSceneAnimation,
  reverseSceneAnimation,
  setSceneAnimationKey,
} from '../../../scene/animationCommands'
import { evaluateSceneNodeFlags } from '../../../scene/evaluate'
import { requireScene } from '../../../scene/validation'
import { useMoldaToolAccess } from '../../toolAccess'
import { Button } from '../../ui/Button'
import { SceneAnimationPoseSetTools } from './SceneAnimationPoseSetTools'
import { SceneAnimationPoseTools } from './SceneAnimationPoseTools'
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
  // O portão: gravar e apagar chave, ajustar o movimento e reutilizar uma pose são
  // `animate.create`; a curva da chave, dobrar pela ponta e várias poses juntas, `animate.pro`.
  const { can } = useMoldaToolAccess()
  const create = can('animate.create')
  const pro = can('animate.pro')
  const copy = COPY.scene
  const clip = snapshot.source?.document === document ? snapshot.source.clip : null
  if (!clip) return <p className="text-sm text-mld-muted">{copy.animationEmpty}</p>
  if (snapshot.source?.preview)
    return (
      <p role="status" className="text-sm text-mld-muted">
        {copy.animationPresetEditingHint}
      </p>
    )
  const locked = [...covered].some((id) => flags.get(id)?.locked)
  const compatible = clip.space !== 'local' || node?.transform.kind === 'trs'
  const initial =
    node && compatible && !snapshot.playing
      ? sceneAnimationFormValue(node, clip, channel, snapshot.time)
      : null
  return (
    <section className="space-y-3 border-t border-mld-border pt-3" aria-label={copy.animationMode}>
      <p className="text-sm text-mld-muted">{copy.animationHint}</p>
      {pro && !snapshot.playing && (!adjusting || assisting) && (
        <SceneTwoBoneControls
          key={JSON.stringify([revision, clip.id, node?.id, snapshot.time])}
          workshop={workshop}
          clipId={clip.id}
          time={snapshot.time}
        />
      )}
      {create && !adjusting && <SceneAnimationPoseTools workshop={workshop} />}
      {pro && (
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
                  requireScene(source === document, 'source', copy.animationChanged)
                  return setSceneAnimationKey(
                    source,
                    clip.id,
                    sceneAnimationFormKey(node.id, channel, snapshot.time, initial, data),
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
                        defaultValue={initial.exact?.interpolation ?? 'linear'}
                      >
                        {(['step', 'linear', 'smooth'] as const).map((value) => (
                          <option key={value} value={value}>
                            {copy.animationCurves[value]}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    // Sem escolher a curva: a chave mantém a que já tinha, e a nova vai reta.
                    <input
                      type="hidden"
                      name="interpolation"
                      value={initial.exact?.interpolation ?? 'linear'}
                    />
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
                      requireScene(source === document, 'source', copy.animationChanged)
                      return removeSceneAnimationKeys(source, clip.id, [
                        { nodeId: node.id, channel, time: snapshot.time },
                      ])
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
      {create && (
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
              run((source) => {
                requireScene(source === document, 'source', copy.animationChanged)
                const duration = sceneAnimationFormNumber(data, 'duration')
                const base = data.has('retime')
                  ? retimeSceneAnimation(source, clip.id, duration)
                  : source
                return configureSceneAnimation(base, clip.id, {
                  duration,
                  fps: sceneAnimationFormNumber(data, 'fps'),
                  loop: data.has('loop'),
                })
              })
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
              {copy.animationApply}
            </Button>
          </form>
          <Button
            className="w-full text-sm"
            onClick={() => run((source) => reverseSceneAnimation(source, clip.id))}
          >
            {copy.animationReverse}
          </Button>
          <p className="py-2 text-xs text-mld-muted">{copy.animationReverseHint}</p>
        </details>
      )}
    </section>
  )
}
