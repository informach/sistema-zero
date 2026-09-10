import { useEffect, useState } from 'react'
import { COPY } from '../../../core/copy'
import {
  captureSceneAnimationLocalPose,
  mirrorSceneAnimationLocalPose,
  pasteSceneAnimationLocalPose,
  type SceneAnimationLocalPose,
} from '../../../scene/animationPose'
import { requireScene } from '../../../scene/validation'
import { Button } from '../../ui/Button'
import { SCENE_APPEARANCE_FIELD as field } from './sceneAppearanceForm'
import type { useSceneWorkshop } from './useSceneWorkshop'

/** The clipboard owns only numbers/name; it never retains a source document or its images. */
export function SceneAnimationPoseTools({
  workshop,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
}) {
  const { animation, document, editor, primary, selected, run } = workshop
  const [clipboard, setClipboard] = useState<{
    documentId: string
    name: string
    pose: SceneAnimationLocalPose
  } | null>(null)
  const [axis, setAxis] = useState<'x' | 'y' | 'z'>('x')
  const copy = COPY.scene
  const copied = clipboard?.documentId === document.id ? clipboard : null
  useEffect(() => {
    if (clipboard && clipboard.documentId !== document.id) setClipboard(null)
  }, [clipboard, document.id])
  const snapshot = animation.getSnapshot(),
    clip = snapshot.source?.clip
  if (snapshot.playing || !clip) return null
  const compatible = copied?.pose.space === clip.space
  function paste(mirror: boolean) {
    if (!copied) return
    run((source) => {
      requireScene(source === document, 'source', copy.animationChanged)
      return pasteSceneAnimationLocalPose(
        source,
        clip!.id,
        selected,
        snapshot.time,
        mirror ? mirrorSceneAnimationLocalPose(copied!.pose, axis) : copied!.pose,
      )
    })
  }
  return (
    <details className="rounded-lg border border-mld-border px-2">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold">
        {copy.animationPoseTitle}
      </summary>
      <div className="space-y-3 pb-3">
        <Button
          className="w-full text-sm"
          disabled={!primary}
          onClick={() => {
            if (!primary) return
            try {
              requireScene(editor.getState().asset === document, 'source', copy.animationChanged)
              setClipboard({
                documentId: document.id,
                name: primary.name,
                pose: captureSceneAnimationLocalPose(document, clip.id, primary.id, snapshot.time),
              })
              workshop.setMessage(null)
            } catch (error) {
              animation.reportError(error)
            }
          }}
        >
          {copy.animationPoseCopy}
        </Button>
        <p role="status" className="text-xs text-mld-muted">
          {copied ? copy.animationPoseCopied(copied.name) : copy.animationPoseClipboardEmpty}
        </p>
        <p className="text-xs text-mld-muted">{copy.animationPosePasteHint}</p>
        {copied && !compatible && (
          <p className="text-xs text-mld-warn">{copy.animationPoseIncompatible}</p>
        )}
        <Button
          className="w-full text-sm"
          disabled={!compatible || !selected.length}
          onClick={() => paste(false)}
        >
          {copy.animationPosePaste}
        </Button>
        <label className="block space-y-1 text-xs">
          <span>{copy.animationPoseAxis}</span>
          <select
            name="poseMirrorAxis"
            value={axis}
            onChange={(event) => setAxis(event.target.value as typeof axis)}
            className={field}
          >
            {(['x', 'y', 'z'] as const).map((axis) => (
              <option key={axis} value={axis}>
                {copy.animationPoseAxes[axis]}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-mld-muted">{copy.animationPoseMirrorHint}</p>
        <Button
          className="w-full text-sm"
          disabled={!compatible || !selected.length}
          onClick={() => paste(true)}
        >
          {copy.animationPoseMirror}
        </Button>
      </div>
    </details>
  )
}
