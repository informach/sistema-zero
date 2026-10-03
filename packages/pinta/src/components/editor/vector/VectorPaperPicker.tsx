import { COPY } from '../../../core/copy'

export type VectorPaper = 'transparent' | 'white' | 'dark'
export const vectorPaperClass: Record<VectorPaper, string> = {
  transparent: 'pin-checkerboard',
  white: 'bg-white',
  dark: 'bg-slate-900',
}

/** Viewing preference only: never inserts a background shape into the asset. */
export function VectorPaperPicker({
  value,
  onChange,
}: {
  value: VectorPaper
  onChange(value: VectorPaper): void
}) {
  return (
    <label
      className="flex shrink-0 items-center justify-end gap-2 px-3 py-1 text-xs text-pin-muted"
      title={COPY.vector.paperHint}
    >
      {COPY.vector.paperLabel}
      <select
        value={value}
        onChange={(event) => {
          const next = event.target.value
          if (next === 'transparent' || next === 'white' || next === 'dark') onChange(next)
        }}
        className="min-h-8 rounded-md border border-pin-border bg-pin-bg px-2 text-pin-text focus-visible:outline-2 focus-visible:outline-pin-accent"
      >
        <option value="transparent">{COPY.vector.paperTransparent}</option>
        <option value="white">{COPY.vector.paperWhite}</option>
        <option value="dark">{COPY.vector.paperDark}</option>
      </select>
    </label>
  )
}
