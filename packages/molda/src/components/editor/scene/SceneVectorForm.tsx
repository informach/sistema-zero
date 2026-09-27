import { useId } from 'react'
import { COPY } from '../../../core/copy'
import type { Vec3 } from '../../../core/model'
import { Button } from '../../ui/Button'

/** A labelled native three-axis form; callers own units and command semantics. */
export function SceneVectorForm({
  label,
  hint,
  values,
  disabled = false,
  min,
  onApply,
}: {
  label: string
  hint: string
  values: Vec3
  disabled?: boolean
  min?: number
  onApply(values: Vec3): void
}) {
  const prefix = useId()
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const read = (axis: string) => {
          const value = data.get(axis)
          return typeof value === 'string' && value.trim() ? Number(value) : NaN
        }
        onApply([read('x'), read('y'), read('z')])
      }}
    >
      <p id={`${prefix}-hint`} className="text-xs text-mld-muted">
        {hint}
      </p>
      {/* X, Y e Z lado a lado, cada um numa caixa com a letra dentro (a tela-modelo). */}
      <div className="grid grid-cols-3 gap-1.5">
        {(['x', 'y', 'z'] as const).map((axis, i) => (
          <label
            key={axis}
            className="flex min-h-11 min-w-0 items-center gap-1 rounded-lg border border-mld-border bg-mld-surface pl-2 text-xs font-bold text-mld-muted focus-within:outline-2 focus-within:outline-mld-accent"
          >
            <span>{axis.toUpperCase()}</span>
            <input
              name={axis}
              aria-label={`${label} ${axis.toUpperCase()}`}
              aria-describedby={`${prefix}-hint`}
              type="number"
              step="any"
              required
              disabled={disabled}
              min={min}
              defaultValue={values[i]}
              className="min-h-10 w-full min-w-0 bg-transparent pr-2 text-right font-mono text-sm text-mld-text tabular-nums outline-none disabled:opacity-50"
            />
          </label>
        ))}
      </div>
      <Button type="submit" disabled={disabled} className="w-full text-sm">
        {COPY.scene.apply}
      </Button>
    </form>
  )
}
