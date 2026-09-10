import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneRgba } from '../../../scene/composite'
import type { SceneImage } from '../../../scene/document'
import type { SceneFlipbookPlayer } from '../../../state/SceneFlipbookPlayer'
import { Button } from '../../ui/Button'
import { SceneImagePreview } from './SceneImagePreview'
import { SCENE_APPEARANCE_FIELD as field } from './sceneAppearanceForm'

export function SceneFlipbookPreview({
  image,
  palette,
  base,
  player,
  disabled = false,
  allowPlay = true,
  beforeChange,
}: {
  image: SceneImage
  palette: readonly SceneRgba[]
  base: SceneRgba
  player: SceneFlipbookPlayer
  disabled?: boolean
  allowPlay?: boolean
  beforeChange(): void
}) {
  const snapshot = useSyncExternalStore(player.subscribe, player.getSnapshot, player.getSnapshot)
  const flipbook = image.flipbook
  const active = snapshot.source?.imageId === image.id && snapshot.source.flipbook === flipbook
  const step = active ? snapshot.step : 0
  const playing = active && snapshot.playing
  const copy = COPY.scene
  const options = useMemo(
    () =>
      flipbook?.frames.map((frame, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: sequence slots are positional; repeated cell IDs are intentionally not unique.
        <option key={i} value={i}>
          {copy.flipbookOption(i + 1, frame + 1)}
        </option>
      )),
    [flipbook],
  )
  useEffect(() => {
    player.setImage(image)
    return player.pause
  }, [player, image])
  useEffect(() => {
    if (disabled || !allowPlay) player.pause()
  }, [player, disabled, allowPlay])
  if (!flipbook) return null
  function seek(next: number) {
    beforeChange()
    player.setImage(image)
    player.seek(next)
  }
  return (
    <section
      aria-label={copy.flipbookPreview}
      className="space-y-2 rounded-lg border border-mld-border p-3"
    >
      <SceneImagePreview
        image={image}
        palette={palette}
        base={base}
        frame={flipbook.frames[step]!}
        maxHeight={160}
      />
      <p aria-live={playing ? 'off' : 'polite'} className="text-xs text-mld-muted">
        {copy.flipbookStep(step + 1, flipbook.frames.length, flipbook.frames[step]! + 1)}
      </p>
      <fieldset disabled={disabled} className="space-y-2">
        <legend className="sr-only">{copy.flipbookChoose}</legend>
        <label className="block space-y-1 text-sm">
          <span>{copy.flipbookChoose}</span>
          <select
            name="flipbookStep"
            className={field}
            value={step}
            onChange={(event) => seek(Number(event.target.value))}
          >
            {options}
          </select>
        </label>
        <div className="flex gap-2">
          <Button
            className="flex-1 px-2 text-sm"
            disabled={step === 0}
            onClick={() => seek(step - 1)}
          >
            {copy.flipbookPrevious}
          </Button>
          <Button
            className="flex-1 px-2 text-sm"
            disabled={step === flipbook.frames.length - 1}
            onClick={() => seek(step + 1)}
          >
            {copy.flipbookNext}
          </Button>
        </div>
        {allowPlay && (
          <Button
            className="w-full text-sm"
            aria-pressed={playing}
            onClick={() => {
              if (playing) player.pause()
              else {
                beforeChange()
                player.setImage(image)
                player.play()
              }
            }}
          >
            {playing ? copy.flipbookPause : copy.flipbookPlay}
          </Button>
        )}
      </fieldset>
      <p className="text-xs text-mld-muted">
        {allowPlay ? copy.flipbookMotionHint : copy.flipbookPaintHint}
      </p>
    </section>
  )
}
