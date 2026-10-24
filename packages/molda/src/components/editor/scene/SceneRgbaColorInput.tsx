import type { ScenePaintRgba } from '../../../scene/imagePaint'

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
  const opacity = Math.round((value[3] / 255) * 100)
  return (
    <fieldset className="min-w-0 rounded-lg border border-mld-border px-2 pb-2">
      <legend className="px-1 text-sm font-bold">{colorLabel}</legend>
      <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-3">
        <input
          name={colorName}
          aria-label={colorLabel}
          type="color"
          value={hex}
          className="h-11 w-14 cursor-pointer rounded-md border border-mld-border bg-mld-surface p-1"
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
        <label className="min-w-0 text-xs text-mld-text-soft">
          <span className="flex justify-between gap-2">
            <span>{alphaLabel}</span>
            <output>{opacity}%</output>
          </span>
          <input
            name={alphaName}
            aria-label={alphaLabel}
            type="range"
            min={0}
            max={100}
            step={1}
            value={opacity}
            className="h-8 w-full accent-mld-accent"
            onChange={(event) => {
              const percent = Number(event.target.value)
              if (Number.isInteger(percent) && percent >= 0 && percent <= 100)
                onChange([value[0], value[1], value[2], Math.round((percent / 100) * 255)])
            }}
          />
        </label>
      </div>
    </fieldset>
  )
}
