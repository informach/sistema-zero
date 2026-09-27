import { useMemo, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneAnimationTrack } from '../../../scene/animation'
import { removeSceneAnimationKeys, shiftSceneAnimationKeys } from '../../../scene/animationCommands'
import {
  SCENE_ANIMATION_CHANNELS,
  type sceneAnimationKeySelection,
} from '../../../scene/animationKeySelection'
import { requireScene } from '../../../scene/validation'
import { Button } from '../../ui/Button'
import { sceneAnimationFormNumber } from './sceneAnimationForm'
import { SCENE_APPEARANCE_FIELD as field } from './sceneAppearanceForm'
import type { useSceneWorkshop } from './useSceneWorkshop'

/** Parent keys this draft by revision, clip, and node selection. No stale key refs survive an edit. */
export function SceneAnimationKeyTools({
  workshop,
  selection,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
  selection: ReturnType<typeof sceneAnimationKeySelection>
}) {
  const { animation, document, run } = workshop
  const clip = animation.getSnapshot().source?.clip
  const [start, setStart] = useState('0'),
    [end, setEnd] = useState(String(clip?.duration ?? 0))
  const [channel, setChannel] = useState<SceneAnimationTrack['channel'] | 'all'>('all')
  const [open, setOpen] = useState(false)
  const copy = COPY.scene
  const valid =
    start.trim() !== '' &&
    end.trim() !== '' &&
    Number.isFinite(Number(start)) &&
    Number.isFinite(Number(end)) &&
    Number(start) >= 0 &&
    Number(start) <= Number(end) &&
    Number(end) <= (clip?.duration ?? 0)
  const refs = useMemo(
    () => (open && valid ? selection.inRange(Number(start), Number(end), channel) : []),
    [open, valid, selection, start, end, channel],
  )
  if (!clip) return null
  return (
    <details
      className="rounded-lg border border-mld-border px-3"
      onToggle={(event) => {
        setOpen(event.currentTarget.open)
        if (event.currentTarget.open) animation.pause()
      }}
    >
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold">
        {copy.animationKeyTools}
      </summary>
      {open && (
        <form
          className="space-y-3 pb-3"
          onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            const operation = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value')
            run((source) => {
              requireScene(source === document, 'source', copy.animationChanged)
              requireScene(valid && refs.length > 0, 'keys', copy.animationRangeInvalid)
              if (operation === 'remove') return removeSceneAnimationKeys(source, clip.id, refs)
              requireScene(
                operation === 'move' || operation === 'copy',
                'operation',
                copy.animationRangeInvalid,
              )
              return shiftSceneAnimationKeys(
                source,
                clip.id,
                refs,
                sceneAnimationFormNumber(data, 'offset'),
                operation,
              )
            })
          }}
        >
          <p className="text-xs text-mld-muted">{copy.animationKeyToolsHint}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="space-y-1 text-xs">
              <span>{copy.animationRangeStart}</span>
              <input
                name="rangeStart"
                type="number"
                min={0}
                max={clip.duration}
                step="any"
                required
                value={start}
                onChange={(event) => setStart(event.target.value)}
                className={field}
              />
            </label>
            <label className="space-y-1 text-xs">
              <span>{copy.animationRangeEnd}</span>
              <input
                name="rangeEnd"
                type="number"
                min={0}
                max={clip.duration}
                step="any"
                required
                value={end}
                onChange={(event) => setEnd(event.target.value)}
                className={field}
              />
            </label>
            <label className="space-y-1 text-xs">
              <span>{copy.animationRangeChannel}</span>
              <select
                name="rangeChannel"
                value={channel}
                onChange={(event) => setChannel(event.target.value as typeof channel)}
                className={field}
              >
                <option value="all">{copy.animationAllChannels}</option>
                {SCENE_ANIMATION_CHANNELS.map((channel) => (
                  <option key={channel} value={channel}>
                    {copy.animationChannels[channel]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p role="status" className="text-xs text-mld-muted">
            {valid ? copy.animationRangeCount(refs.length) : copy.animationRangeInvalid}
          </p>
          <label className="block space-y-1 text-xs">
            <span>{copy.animationOffset}</span>
            <input name="offset" type="number" step="any" defaultValue="0.5" className={field} />
          </label>
          <p className="text-xs text-mld-muted">{copy.animationOffsetHint}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              name="operation"
              value="move"
              disabled={!refs.length}
              className="text-sm"
            >
              {copy.animationKeysMove}
            </Button>
            <Button
              type="submit"
              name="operation"
              value="copy"
              disabled={!refs.length}
              className="text-sm"
            >
              {copy.animationKeysCopy}
            </Button>
            <Button
              type="submit"
              name="operation"
              value="remove"
              disabled={!refs.length}
              className="text-sm"
            >
              {copy.animationKeysRemove}
            </Button>
          </div>
        </form>
      )}
    </details>
  )
}
