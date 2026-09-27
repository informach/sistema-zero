import { COPY } from '../../../core/copy'
import { patchSceneMaterial } from '../../../scene/appearanceCommands'
import type { SceneMaterial } from '../../../scene/document'
import { Button } from '../../ui/Button'
import { SCENE_APPEARANCE_FIELD as field, type SceneAppearanceApply } from './sceneAppearanceForm'

/** Optional detail, using the same explicit apply/undo boundary as material finish. */
export function SceneMaterialMaskSettings({
  material,
  apply,
}: {
  material: SceneMaterial
  apply: SceneAppearanceApply
}) {
  const copy = COPY.scene
  const mask = material.alphaMask
  return (
    <details open={mask !== undefined} className="rounded-lg border border-mld-border p-3">
      <summary
        className={[
          'min-h-11 cursor-pointer py-2 text-sm font-bold',
          'focus-visible:outline-2 focus-visible:outline-mld-accent',
        ].join(' ')}
      >
        {copy.materialMask}
      </summary>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          apply((source) =>
            patchSceneMaterial(source, material.id, {
              alphaMask: {
                cutoff: Number(data.get('cutoff')),
                opacity: Number(data.get('opacity')),
              },
            }),
          )
        }}
      >
        <p className="text-xs text-mld-muted">{copy.materialMaskHint}</p>
        <label className="block space-y-1 text-sm">
          <span>{copy.materialMaskCutoff}</span>
          <input
            key={`${material.id}-${mask?.cutoff}`}
            name="cutoff"
            type="number"
            min={0}
            step="any"
            required
            defaultValue={mask?.cutoff ?? 0.5}
            className={field}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>{copy.materialMaskOpacity}</span>
          <input
            key={`${material.id}-${mask?.opacity}`}
            name="opacity"
            type="number"
            min={0}
            max={1}
            step="any"
            required
            defaultValue={mask?.opacity ?? 1}
            className={field}
          />
        </label>
        <p className="text-xs text-mld-muted">{copy.materialMaskRangeHint}</p>
        <Button type="submit" className="w-full text-sm">
          {copy.materialMaskApply}
        </Button>
        {mask && (
          <Button
            className="w-full text-sm"
            onClick={(event) => {
              const summary = event.currentTarget.closest('details')?.querySelector('summary')
              apply((source) => patchSceneMaterial(source, material.id, { alphaMask: null }))
              summary?.focus()
            }}
          >
            {copy.materialMaskRemove}
          </Button>
        )}
      </form>
    </details>
  )
}
