import type { ScenePaintRgba } from '../../../scene/imagePaint'
import { SCENE_APPEARANCE_FIELD as field } from './sceneAppearanceForm'

export function SceneRgbaColorInput({
  value,
  onChange,
  colorLabel,
  alphaLabel,
  colorName,
  alphaName,
}: {
  value: ScenePaintRgba
  onChange(value: ScenePaintRgba): void
  colorLabel: string
  alphaLabel: string
  colorName: string
  alphaName: string
}) {
  const hex = `#${value
    .slice(0, 3)
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')}`
  return (
    <>
      <label className="block space-y-1 text-sm">
        <span>{colorLabel}</span>
        <input
          name={colorName}
          type="color"
          value={hex}
          className={field}
          onChange={(event) => {
            const hex = event.target.value
            if (/^#[0-9a-f]{6}$/i.test(hex))
              onChange([
                Number.parseInt(hex.slice(1, 3), 16),
                Number.parseInt(hex.slice(3, 5), 16),
                Number.parseInt(hex.slice(5, 7), 16),
                value[3],
              ])
          }}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>
          {alphaLabel}: {value[3]}
        </span>
        <input
          name={alphaName}
          aria-label={alphaLabel}
          type="range"
          min={0}
          max={255}
          step={1}
          value={value[3]}
          className="min-h-11 w-full accent-mld-accent"
          onChange={(event) => {
            const alpha = Number(event.target.value)
            if (Number.isInteger(alpha) && alpha >= 0 && alpha <= 255)
              onChange([value[0], value[1], value[2], alpha])
          }}
        />
      </label>
    </>
  )
}
