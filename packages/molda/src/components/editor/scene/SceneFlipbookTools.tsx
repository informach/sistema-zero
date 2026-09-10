import { useId } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneRgba } from '../../../scene/composite'
import type { SceneImage } from '../../../scene/document'
import { SCENE_FLIPBOOK_LIMITS } from '../../../scene/imageFlipbook'
import { setSceneImageFlipbook } from '../../../scene/imageFlipbookCommands'
import type { SceneFlipbookPlayer } from '../../../state/SceneFlipbookPlayer'
import { Button } from '../../ui/Button'
import { SceneFlipbookPreview } from './SceneFlipbookPreview'
import { SCENE_APPEARANCE_FIELD as field, type SceneAppearanceApply } from './sceneAppearanceForm'
import { readSceneFlipbookForm } from './sceneFlipbookForm'

export function SceneFlipbookTools({
  image,
  palette,
  base,
  player,
  locked,
  busy,
  apply,
  beforeChange,
}: {
  image: SceneImage
  palette: readonly SceneRgba[]
  base: SceneRgba
  player: SceneFlipbookPlayer
  locked: boolean
  busy: boolean
  apply: SceneAppearanceApply
  beforeChange(): void
}) {
  const copy = COPY.scene
  const hint = useId()
  return (
    <section className="space-y-3 border-t border-mld-border pt-3" aria-label={copy.flipbookTitle}>
      <h4 className="text-sm font-bold">{copy.flipbookTitle}</h4>
      <p className="text-xs text-mld-muted">{copy.flipbookHint}</p>
      <SceneFlipbookPreview
        image={image}
        palette={palette}
        base={base}
        player={player}
        disabled={busy}
        beforeChange={beforeChange}
      />
      <details
        className="rounded-lg border border-mld-border px-2"
        onToggle={(event) => {
          if (!event.currentTarget.open) player.pause()
        }}
      >
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold">
          {copy.flipbookSettings}
        </summary>
        <fieldset disabled={locked || busy} className="space-y-3 pb-3">
          <legend className="sr-only">{copy.flipbookSettings}</legend>
          <form
            key={JSON.stringify([image.id, image.width, image.height, image.flipbook])}
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              const data = new FormData(event.currentTarget)
              apply((source) =>
                setSceneImageFlipbook(source, image.id, readSceneFlipbookForm(data, image)),
              )
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              {(['frameWidth', 'frameHeight'] as const).map((name) => (
                <label key={name} className="space-y-1 text-sm">
                  <span>{name === 'frameWidth' ? copy.flipbookWidth : copy.flipbookHeight}</span>
                  <input
                    name={name}
                    type="number"
                    min={1}
                    max={name === 'frameWidth' ? image.width : image.height}
                    step={1}
                    required
                    className={field}
                    defaultValue={
                      image.flipbook?.[name] ?? (name === 'frameWidth' ? image.width : image.height)
                    }
                  />
                </label>
              ))}
            </div>
            <label className="block space-y-1 text-sm">
              <span>{copy.flipbookSequence}</span>
              <input
                name="frameSequence"
                className={field}
                maxLength={2048}
                defaultValue={image.flipbook?.frames.map((frame) => frame + 1).join(', ') ?? ''}
                aria-describedby={hint}
              />
            </label>
            <p id={hint} className="text-xs text-mld-muted">
              {copy.flipbookSequenceHint}
            </p>
            <label className="block space-y-1 text-sm">
              <span>{copy.flipbookFps}</span>
              <input
                name="frameFps"
                type="number"
                min={SCENE_FLIPBOOK_LIMITS.minFps}
                max={SCENE_FLIPBOOK_LIMITS.maxFps}
                step="any"
                required
                className={field}
                defaultValue={image.flipbook?.fps ?? 8}
              />
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                name="frameLoop"
                type="checkbox"
                className="size-5 accent-mld-accent"
                defaultChecked={image.flipbook?.loop ?? true}
              />
              {copy.flipbookLoop}
            </label>
            <Button type="submit" className="w-full text-sm">
              {copy.flipbookApply}
            </Button>
          </form>
          {image.flipbook && (
            <>
              <p className="text-xs text-mld-muted">{copy.flipbookRemoveHint}</p>
              <Button
                className="w-full text-sm"
                onClick={() => apply((source) => setSceneImageFlipbook(source, image.id, null))}
              >
                {copy.flipbookRemove}
              </Button>
            </>
          )}
        </fieldset>
      </details>
    </section>
  )
}
