import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { COPY } from '../../../core/copy'
import {
  captureSceneAnimationPoseSet,
  type SceneAnimationPoseSet,
} from '../../../scene/animationPoseSet'
import { requireScene } from '../../../scene/validation'
import { Button } from '../../ui/Button'
import { SCENE_APPEARANCE_FIELD as field } from './sceneAppearanceForm'
import { useScenePoseSetPreview } from './useScenePoseSetPreview'
import type { useSceneWorkshop } from './useSceneWorkshop'

type Workshop = ReturnType<typeof useSceneWorkshop>

export function SceneAnimationPoseSetTools({
  workshop,
  clipId,
  time,
}: {
  workshop: Workshop
  clipId: string
  time: number
}) {
  const { document, editor, animation, animationPose, selected } = workshop
  const [clipboard, setClipboard] = useState<{
    documentId: string
    version: number
    poses: SceneAnimationPoseSet
  } | null>(null)
  const [open, setOpen] = useState(false)
  const preview = useScenePoseSetPreview(workshop, clipId, time, open)
  const kind = useSyncExternalStore(
    animationPose.subscribe,
    () => animationPose.getSnapshot().kind,
    () => null,
  )
  const pending = useSyncExternalStore(
    animationPose.subscribe,
    () => animationPose.getSnapshot().pending,
    () => false,
  )
  const copy = COPY.scene.poseSet
  const copied = clipboard?.documentId === document.id ? clipboard : null
  const blocked = animation.getSnapshot().playing || (kind !== null && kind !== 'pose-set')
  useEffect(() => {
    if (clipboard && clipboard.documentId !== document.id) setClipboard(null)
  }, [clipboard, document.id])
  return (
    <details
      className="rounded-lg border border-mld-border px-2"
      onToggle={(event) => {
        setOpen(event.currentTarget.open)
        if (!event.currentTarget.open) preview.cancel()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && event.currentTarget.open) {
          event.preventDefault()
          preview.cancel()
          event.currentTarget.open = false
          event.currentTarget.querySelector('summary')?.focus()
        }
      }}
    >
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold">
        {copy.title}
      </summary>
      {open && (
        <div className="space-y-3 pb-3">
          <p className="text-xs text-mld-muted">{copy.hint}</p>
          <Button
            className="w-full text-sm"
            disabled={blocked || !selected.length}
            onClick={() => {
              preview.cancel()
              if (animationPose.getSnapshot().kind !== null) return
              try {
                const state = animation.getSnapshot()
                requireScene(
                  editor.getState().asset === document &&
                    state.source?.document === document &&
                    state.source.clip.id === clipId &&
                    !state.source.preview &&
                    !state.playing &&
                    !state.error &&
                    state.time === time,
                  'source',
                  COPY.scene.animationChanged,
                )
                const poses = captureSceneAnimationPoseSet(document, clipId, selected, time)
                setClipboard((before) => ({
                  documentId: document.id,
                  version: (before?.version ?? 0) + 1,
                  poses,
                }))
                workshop.setMessage(null)
              } catch (error) {
                if (animationPose.getSnapshot().kind === null) animationPose.reportError(error)
              }
            }}
          >
            {copy.copy}
          </Button>
          <p role="status" className="text-xs text-mld-muted">
            {copied ? copy.count(copied.poses.entries.length) : copy.empty}
          </p>
          {copied && (
            <ScenePoseSetMapping
              key={copied.version}
              poses={copied.poses}
              workshop={workshop}
              preview={preview}
              blocked={blocked}
            />
          )}
          {kind === 'pose-set' && (
            <p className="text-xs text-mld-muted">{pending ? copy.review : copy.same}</p>
          )}
        </div>
      )}
    </details>
  )
}

/** One destination select serves the whole list: O(entries + nodes), not a selector per pair. */
function ScenePoseSetMapping({
  poses,
  workshop,
  preview,
  blocked,
}: {
  poses: SceneAnimationPoseSet
  workshop: Workshop
  preview: ReturnType<typeof useScenePoseSetPreview>
  blocked: boolean
}) {
  const { index, animation } = workshop
  const [active, setActive] = useState(0)
  const [targets, setTargets] = useState(() =>
    poses.entries.map((entry) => (index.scene.nodes.has(entry.nodeId) ? entry.nodeId : '')),
  )
  const [mirror, setMirror] = useState<'' | 'x' | 'y' | 'z'>('')
  const copy = COPY.scene.poseSet
  const entry = poses.entries[active]!
  const names = useMemo(() => {
    const idsByName = new Map<string, Set<string>>()
    for (const node of [...index.scene.nodes.values(), ...poses.entries]) {
      const ids = idsByName.get(node.name) ?? new Set<string>()
      ids.add('nodeId' in node ? node.nodeId : node.id)
      idsByName.set(node.name, ids)
    }
    return idsByName
  }, [index, poses])
  const label = (name: string, id: string) => copy.label(name, id, (names.get(name)?.size ?? 0) > 1)
  const compatible = poses.entries[0]!.pose.space === animation.getSnapshot().source?.clip.space
  const missing = targets.some((id) => !index.scene.nodes.has(id))
  const duplicated = new Set(targets).size !== targets.length
  return (
    <fieldset className="space-y-3" disabled={blocked}>
      <legend className="sr-only">{copy.mapping}</legend>
      <p className="text-xs text-mld-muted">{copy.mapping}</p>
      <ul className="max-h-56 space-y-1 overflow-y-auto">
        {poses.entries.map((entry, i) => {
          const target = index.scene.nodes.get(targets[i]!)
          return (
            <li key={entry.nodeId}>
              <Button
                className="w-full justify-start break-all text-left text-xs"
                variant={i === active ? 'primary' : 'outline'}
                aria-pressed={i === active}
                onClick={() => setActive(i)}
              >
                {copy.pair(
                  label(entry.name, entry.nodeId),
                  target ? label(target.name, target.id) : copy.missing,
                )}
              </Button>
            </li>
          )
        })}
      </ul>
      <label className="block space-y-1 text-xs">
        <span>{copy.target(label(entry.name, entry.nodeId))}</span>
        <select
          className={field}
          name="poseSetTarget"
          value={index.scene.nodes.has(targets[active]!) ? targets[active] : ''}
          onChange={(event) => {
            preview.cancel()
            const value = event.target.value
            setTargets((before) => before.map((id, i) => (i === active ? value : id)))
          }}
        >
          <option value="">{copy.missing}</option>
          {index.scene.order.map((id) => (
            <option key={id} value={id}>
              {label(index.scene.nodes.get(id)!.name, id)}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-xs">
        <span>{copy.axis}</span>
        <select
          className={field}
          name="poseSetMirror"
          value={mirror}
          onChange={(event) => {
            preview.cancel()
            setMirror(event.target.value as typeof mirror)
          }}
        >
          <option value="">{copy.unchanged}</option>
          {(['x', 'y', 'z'] as const).map((axis) => (
            <option key={axis} value={axis}>
              {copy.mirror(axis.toUpperCase())}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-mld-muted">{COPY.scene.animationPoseMirrorHint}</p>
      {!compatible && (
        <p className="text-xs text-mld-warn">{COPY.scene.animationPoseIncompatible}</p>
      )}
      {(missing || duplicated) && (
        <p role="status" className="text-xs text-mld-warn">
          {missing ? copy.chooseAll : copy.duplicate}
        </p>
      )}
      <Button
        className="w-full text-sm"
        disabled={!compatible || missing || duplicated}
        onClick={() =>
          preview.preview(
            poses,
            poses.entries.map((entry, i) => ({ sourceId: entry.nodeId, targetId: targets[i]! })),
            mirror || undefined,
          )
        }
      >
        {copy.preview}
      </Button>
    </fieldset>
  )
}
