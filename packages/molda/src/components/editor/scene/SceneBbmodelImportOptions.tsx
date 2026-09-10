import { BBMODEL_IMPORT_COPY as copy } from '../../../core/bbmodelImportCopy'
import { hexToRgb, rgbToHex } from '../../../core/color'
import { linearUnitToSrgb, srgbUnitToLinear } from '../../../core/colorTransfer'
import {
  BBMODEL_APPEARANCE_FIELDS,
  BBMODEL_GEOMETRY_FIELDS,
  BBMODEL_OMISSION_FIELDS,
} from './bbmodelImportFields'
import { SceneBbmodelAnimationOptions } from './SceneBbmodelAnimationOptions'
import {
  SceneBbmodelImportFields as Fields,
  type BbmodelImportOptionsProps as Props,
} from './SceneBbmodelImportFields'
import { SceneImportSelect } from './SceneImportSelect'
import { importChoice, importDisclosure, importField } from './sceneImportStyles'

export function SceneBbmodelImportOptions({ options, change }: Props) {
  const color = options.nodeMaterials.color,
    rgb = color.slice(0, 3).map((value) => linearUnitToSrgb(value) * 255),
    updateColor = (value: typeof color) =>
      change({ ...options, nodeMaterials: { ...options.nodeMaterials, color: value } })
  return (
    <>
      <SceneBbmodelAnimationOptions options={options} change={change} />
      <section
        aria-label={copy.appearance}
        className="space-y-3 rounded-xl border border-mld-border bg-mld-bg p-3"
      >
        <h3 className="font-bold">{copy.appearance}</h3>
        <p className="text-sm leading-relaxed text-mld-muted">{copy.appearanceHint}</p>
        <SceneImportSelect
          name="bbmodelSourcePreference"
          label={copy.sourcePreference}
          value={options.sourcePreference}
          choices={[
            ['prefer-embedded', copy.embedded],
            ['prefer-files', copy.files],
          ]}
          change={(sourcePreference) => change({ ...options, sourcePreference })}
        />
        <Fields fields={BBMODEL_APPEARANCE_FIELDS} options={options} change={change} />
        {options.nodeMaterials.untextured === 'uniform' && (
          <div className="space-y-3 rounded-lg border border-mld-border p-3">
            <label className="block text-sm font-bold">
              {copy.color}
              <input
                name="bbmodelColor"
                type="color"
                className={importField}
                value={rgbToHex(rgb[0]!, rgb[1]!, rgb[2]!)}
                onChange={(event) => {
                  const hex = event.target.value
                  if (!/^#[0-9a-f]{6}$/i.test(hex)) return
                  const [r, g, b] = hexToRgb(hex)
                  updateColor([
                    srgbUnitToLinear(r / 255),
                    srgbUnitToLinear(g / 255),
                    srgbUnitToLinear(b / 255),
                    color[3],
                  ])
                }}
              />
            </label>
            <label className="block text-sm font-bold">
              {copy.alpha}: {Math.round(color[3] * 100)}%
              <input
                name="bbmodelAlpha"
                type="range"
                aria-label={copy.alpha}
                min={0}
                max={100}
                step={1}
                value={color[3] * 100}
                className="min-h-11 w-full accent-mld-accent"
                onChange={(event) => {
                  const alpha = Number(event.target.value)
                  if (Number.isFinite(alpha) && alpha >= 0 && alpha <= 100)
                    updateColor([color[0], color[1], color[2], alpha / 100])
                }}
              />
            </label>
            <label className={importChoice}>
              <input
                type="checkbox"
                name="bbmodelDoubleSided"
                className="mt-0.5 size-5 shrink-0 accent-mld-accent"
                checked={options.nodeMaterials.doubleSided}
                onChange={(event) =>
                  change({
                    ...options,
                    nodeMaterials: { ...options.nodeMaterials, doubleSided: event.target.checked },
                  })
                }
              />
              {copy.doubleSided}
            </label>
          </div>
        )}
        <details>
          <summary className={importDisclosure}>{copy.geometry}</summary>
          <div className="space-y-3 py-2">
            <Fields fields={BBMODEL_GEOMETRY_FIELDS} options={options} change={change} />
          </div>
        </details>
        <details>
          <summary className={importDisclosure}>{copy.omitted}</summary>
          <p className="py-2 text-sm leading-relaxed text-mld-muted">{copy.omittedHint}</p>
          <div className="space-y-3 py-2">
            <Fields fields={BBMODEL_OMISSION_FIELDS} options={options} change={change} />
          </div>
        </details>
      </section>
    </>
  )
}
