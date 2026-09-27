import { type ComponentProps, useId, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneCurvedPrimitive } from '../../../scene/document'
import {
  PRIMITIVE_DETAIL_LIMITS,
  primitiveDetail,
  primitiveTriangleCount,
} from '../../../scene/primitiveDetail'
import { Button } from '../../ui/Button'

export interface SceneCurveDetailsProps
  extends Omit<ComponentProps<'form'>, 'onSubmit' | 'children'> {
  geometry: SceneCurvedPrimitive
  onApply(detail: { around: number; down?: number }): void
}

/** Draft fields do not tessellate or write history; only Apply changes the document. */
export function SceneCurveDetails({ geometry, onApply, ...props }: SceneCurveDetailsProps) {
  const prefix = useId()
  const initial = primitiveDetail(geometry)
  const [draft, setDraft] = useState({ around: String(initial.around), down: String(initial.down) })
  const fields = geometry.kind === 'sphere' ? (['around', 'down'] as const) : (['around'] as const)
  const validField = (field: 'around' | 'down') => {
    const value = Number(draft[field])
    const { min, max } = PRIMITIVE_DETAIL_LIMITS[field]
    return draft[field].trim() !== '' && Number.isInteger(value) && value >= min && value <= max
  }
  const valid = fields.every(validField)
  const detail =
    geometry.kind === 'sphere'
      ? { around: Number(draft.around), down: Number(draft.down) }
      : { around: Number(draft.around) }
  const count = valid
    ? primitiveTriangleCount(
        geometry.kind === 'sphere'
          ? {
              ...geometry,
              tessellation: { around: Number(draft.around), down: Number(draft.down) },
            }
          : { ...geometry, tessellation: { around: Number(draft.around) } },
      )
    : null
  return (
    <form
      {...props}
      className={props.className ?? 'space-y-3'}
      onSubmit={(event) => {
        event.preventDefault()
        if (valid) onApply(detail)
      }}
    >
      <p id={`${prefix}-hint`} className="text-sm text-mld-muted">
        {COPY.scene.curveDetailHint}
      </p>
      {fields.map((field) => (
        <label key={field} className="block space-y-1 text-sm font-bold text-mld-text">
          <span>{COPY.scene.curveDetailFields[field]}</span>
          <input
            name={field}
            type="number"
            required
            step={1}
            min={PRIMITIVE_DETAIL_LIMITS[field].min}
            max={PRIMITIVE_DETAIL_LIMITS[field].max}
            value={draft[field]}
            aria-invalid={!validField(field)}
            aria-describedby={`${prefix}-hint ${prefix}-cost`}
            onChange={(event) => setDraft({ ...draft, [field]: event.target.value })}
            className="min-h-11 w-full rounded-lg border border-mld-border bg-mld-bg px-3 font-mono tabular-nums focus-visible:outline-2 focus-visible:outline-mld-accent"
          />
        </label>
      ))}
      <p id={`${prefix}-cost`} aria-live="polite" className="text-sm text-mld-muted">
        {count === null ? COPY.scene.curveDetailInvalid : COPY.scene.curveDetailCost(count)}
      </p>
      <Button type="submit" disabled={!valid} className="w-full text-sm">
        {COPY.scene.applyCurveDetail}
      </Button>
    </form>
  )
}
