import { type JSX, useId } from 'react'
import { COPY } from '../../core/copy'
import type { TilemapObject } from '../../core/project'
import type { ObjectScatterSettings } from '../../tiles/objectScatter'
import { Panel } from '../ui/Panel'

export function MapObjectScatterPanel({
  source,
  settings,
  onChange,
  message,
}: {
  source: TilemapObject | null
  settings: ObjectScatterSettings
  onChange: (settings: ObjectScatterSettings) => void
  message: string
}): JSX.Element {
  const id = useId()
  const update = (patch: Partial<ObjectScatterSettings>) => onChange({ ...settings, ...patch })
  const field = 'min-h-11 w-full rounded-xl border-2 border-pin-border bg-pin-surface px-2 text-sm'
  return (
    <Panel title={COPY.scene.scatterObjects}>
      <p className="text-xs text-pin-muted">
        {source && (source.art || source.setId)
          ? COPY.scene.scatterWith(source.name)
          : COPY.scene.scatterChoose}
      </p>
      <label className="mt-2 block text-xs" htmlFor={`${id}-width`}>
        {COPY.scene.scatterWidth}
      </label>
      <select
        id={`${id}-width`}
        className={field}
        value={settings.width}
        onChange={(e) => update({ width: Number(e.target.value) })}
      >
        {[1, 3, 5, 7, 9].map((width) => (
          <option key={width} value={width}>
            {width}
          </option>
        ))}
      </select>
      <label className="mt-2 block text-xs" htmlFor={`${id}-density`}>
        {COPY.scene.densidadeDe(Math.round(settings.density * 100))}
      </label>
      <input
        id={`${id}-density`}
        className="pin-range"
        type="range"
        min="0"
        max="100"
        value={settings.density * 100}
        onChange={(e) => update({ density: Number(e.target.value) / 100 })}
      />
      <label className="mt-2 block text-xs" htmlFor={`${id}-spacing`}>
        {COPY.scene.scatterSpacing(settings.spacing)}
      </label>
      <input
        id={`${id}-spacing`}
        className="pin-range"
        type="range"
        min="0"
        max="8"
        step="0.5"
        value={settings.spacing}
        onChange={(e) => update({ spacing: Number(e.target.value) })}
      />
      <label className="mt-2 block text-xs" htmlFor={`${id}-seed`}>
        {COPY.scene.scatterSeed}
      </label>
      <input
        id={`${id}-seed`}
        className={field}
        type="number"
        min="0"
        max="2147483647"
        value={settings.seed}
        onChange={(e) =>
          update({
            seed: Math.max(0, Math.min(2147483647, Math.round(Number(e.target.value) || 0))),
          })
        }
      />
      <label className="mt-2 flex min-h-11 items-center gap-2 text-xs">
        <input
          type="checkbox"
          className="size-5 accent-pin-accent"
          checked={settings.rotate}
          onChange={(e) => update({ rotate: e.target.checked })}
        />
        {COPY.scene.scatterRotate}
      </label>
      <label className="flex min-h-11 items-center gap-2 text-xs">
        <input
          type="checkbox"
          className="size-5 accent-pin-accent"
          checked={settings.mirror}
          onChange={(e) => update({ mirror: e.target.checked })}
        />
        {COPY.scene.scatterMirror}
      </label>
      <p className="mt-2 text-xs text-pin-muted">{COPY.scene.scatterHelp}</p>
      <p role="status" className="mt-2 text-xs text-pin-muted">
        {message}
      </p>
    </Panel>
  )
}
