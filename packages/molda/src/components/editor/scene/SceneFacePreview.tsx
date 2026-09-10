import { useEffect, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { Button } from '../../ui/Button'
import type { SceneFacePreviewTool } from './useSceneFacePreview'

export interface SceneFacePreviewProps {
  tool: SceneFacePreviewTool
  busy: boolean
  update(amount: number): boolean
  confirm(): void
  cancel(): void
}

export function SceneFacePreview({ tool, busy, update, confirm, cancel }: SceneFacePreviewProps) {
  const [raw, setRaw] = useState('0')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    input.current?.focus()
  }, [])
  const copy = COPY.scene
  const inset = tool === 'inset'
  const subdivide = tool === 'subdivide'
  const thickness = tool === 'thickness'
  const amount = Number(raw)
  const min = inset || subdivide || thickness ? 0 : undefined
  const max = inset ? 95 : subdivide ? 3 : undefined
  const validAmount = (value: number) =>
    Number.isFinite(value) &&
    (min === undefined || value >= min) &&
    (max === undefined || value <= max) &&
    (!subdivide || Number.isInteger(value))
  const valid = raw.trim() !== '' && validAmount(amount)
  return (
    <form
      className="space-y-3 rounded-xl border border-mld-accent bg-mld-surface p-3"
      aria-label={copy.facePreview[tool]}
      onSubmit={(event) => {
        event.preventDefault()
        if (valid && !busy) confirm()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          cancel()
        }
      }}
    >
      <p className="mld-display text-lg">{copy.facePreview[tool]}</p>
      <p className="text-sm text-mld-muted">{copy.facePreviewHints[tool]}</p>
      <label className="flex flex-col gap-1 text-sm font-bold">
        {subdivide
          ? copy.subdivideAmount
          : inset
            ? copy.insetAmount
            : thickness
              ? copy.thicknessAmount
              : copy.extrudeAmount}
        <input
          ref={input}
          type="number"
          name={
            subdivide
              ? 'subdivideLevels'
              : inset
                ? 'insetRatio'
                : thickness
                  ? 'thicknessDistance'
                  : 'extrudeDistance'
          }
          step={inset || subdivide ? 1 : 'any'}
          min={min}
          max={max}
          value={raw}
          aria-invalid={!valid}
          className="min-h-11 w-full rounded-lg border border-mld-border bg-mld-bg px-3 text-mld-text focus-visible:outline-2 focus-visible:outline-mld-accent"
          onChange={(event) => {
            const value = event.target.value
            setRaw(value)
            const number = value === '' ? 0 : Number(value)
            if (validAmount(number)) update(inset ? number / 100 : number)
          }}
        />
      </label>
      <p className="text-xs text-mld-muted">{copy.previewHint}</p>
      {busy && (
        <p role="status" className="text-sm text-mld-muted">
          {copy.surfaceWorking}
        </p>
      )}
      <Button type="submit" className="w-full text-sm" disabled={!valid || busy}>
        {copy.previewConfirm}
      </Button>
      <Button className="w-full text-sm" onClick={cancel}>
        {copy.previewCancel}
      </Button>
    </form>
  )
}
