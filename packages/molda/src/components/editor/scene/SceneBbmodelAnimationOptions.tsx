import { BBMODEL_ANIMATION_IMPORT_COPY as copy } from '../../../core/bbmodelAnimationImportCopy'
import { BBMODEL_IMPORT_COPY } from '../../../core/bbmodelImportCopy'
import { BBMODEL_CLIP_FIELDS, BBMODEL_MOVEMENT_FIELDS } from './bbmodelImportFields'
import {
  type BbmodelImportOptionsProps,
  SceneBbmodelImportFields as Fields,
} from './SceneBbmodelImportFields'
import { importDisclosure } from './sceneImportStyles'

/** Controlled choices remain in the import session; changing any of them revokes its candidate. */
export function SceneBbmodelAnimationOptions({ options, change }: BbmodelImportOptionsProps) {
  return (
    <section
      aria-label={BBMODEL_IMPORT_COPY.movements}
      className="space-y-3 rounded-xl border border-mld-border bg-mld-bg p-3"
    >
      <h3 className="font-bold">{BBMODEL_IMPORT_COPY.movements}</h3>
      <p className="text-sm leading-relaxed text-mld-muted">{copy.hint}</p>
      <Fields fields={BBMODEL_MOVEMENT_FIELDS} options={options} change={change} />
      {options.remainder.animations === 'convert' && (
        <>
          <p className="text-sm leading-relaxed">{copy.adaptationHint}</p>
          <details>
            <summary className={importDisclosure}>{copy.settings}</summary>
            <div className="space-y-3 py-2">
              <Fields fields={BBMODEL_CLIP_FIELDS} options={options} change={change} />
              <label className="block text-sm font-bold">
                {copy.fps}: {options.clips.fps}
                <input
                  name="bbmodel-clips-fps"
                  type="range"
                  aria-label={copy.fps}
                  min={1}
                  max={120}
                  step={1}
                  value={options.clips.fps}
                  className="min-h-11 w-full accent-mld-accent focus-visible:outline-2 focus-visible:outline-mld-accent"
                  onChange={(event) => {
                    const fps = Number(event.target.value)
                    if (Number.isInteger(fps) && fps >= 1 && fps <= 120)
                      change({ ...options, clips: { ...options.clips, fps } })
                  }}
                />
              </label>
              <p className="text-sm leading-relaxed text-mld-muted">{copy.fpsHint}</p>
            </div>
          </details>
        </>
      )}
    </section>
  )
}
