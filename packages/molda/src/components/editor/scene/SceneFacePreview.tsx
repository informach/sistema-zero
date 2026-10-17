import { useEffect, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { Button } from '../../ui/Button'
import { ComponentButton } from './SceneComponentPanel'
import type { SceneFacePreviewTool } from './useSceneFacePreview'

export interface SceneFacePreviewProps {
  tool: SceneFacePreviewTool
  busy: boolean
  update(amount: number): boolean
  confirm(): void
  cancel(): void
  compact?: boolean
}

export function SceneFacePreview({
  tool,
  busy,
  update,
  confirm,
  cancel,
  compact = false,
}: SceneFacePreviewProps) {
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
  const canConfirm = valid && (!compact || amount !== 0) && !busy
  return (
    <form
      className={
        compact
          ? 'mld-component-preview'
          : 'space-y-3 rounded-xl border border-mld-accent bg-mld-surface p-3'
      }
      aria-label={copy.facePreview[tool]}
      onSubmit={(event) => {
        event.preventDefault()
        if (canConfirm) confirm()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          cancel()
        }
      }}
    >
      {!compact && <p className="mld-display text-lg">{copy.facePreview[tool]}</p>}
      <p className="text-sm text-mld-muted">
        {compact
          ? {
              extrude: 'Puxe para criar uma parte nova.',
              inset: 'Crie uma borda dentro da face.',
              thickness: 'Dê volume às faces.',
              subdivide: 'Crie partes menores para modelar.',
            }[tool]
          : copy.facePreviewHints[tool]}
      </p>
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
      {compact && (
        <details>
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold">
            Sobre este ajuste
          </summary>
          <p className="mld-component-description">{copy.facePreviewHints[tool]}</p>
        </details>
      )}
      {busy && (
        <p role="status" className="text-sm text-mld-muted">
          {copy.surfaceWorking}
        </p>
      )}
      {compact ? (
        <div className="mld-component-footer mld-component-grid">
          <ComponentButton aria-label={copy.previewCancel} onClick={cancel}>
            Cancelar
          </ComponentButton>
          <ComponentButton
            type="submit"
            tone="primary"
            aria-label={copy.previewConfirm}
            disabled={!canConfirm}
          >
            Aplicar
          </ComponentButton>
        </div>
      ) : (
        <>
          <Button type="submit" className="w-full text-sm" disabled={!valid || busy}>
            {copy.previewConfirm}
          </Button>
          <Button className="w-full text-sm" onClick={cancel}>
            {copy.previewCancel}
          </Button>
        </>
      )}
    </form>
  )
}
