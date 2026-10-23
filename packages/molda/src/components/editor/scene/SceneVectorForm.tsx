import { useId } from 'react'
import { COPY } from '../../../core/copy'
import type { Vec3 } from '../../../core/model'
import {
  formatSceneCoordinate,
  type SceneMeasurementStep,
  snapSceneMeasurement,
} from '../../../scene/measurementStep'
import { Button } from '../../ui/Button'

/** A labelled native three-axis form; callers own units and command semantics. */
export function SceneVectorForm({
  label,
  hint,
  values,
  disabled = false,
  min,
  step,
  twoDecimals = false,
  onApply,
}: {
  label: string
  hint: string
  values: Vec3
  disabled?: boolean
  min?: number
  step?: SceneMeasurementStep
  twoDecimals?: boolean
  onApply(values: Vec3): void
}) {
  const prefix = useId()
  const display = (value: number) => (twoDecimals ? formatSceneCoordinate(value) : String(value))
  return (
    <form
      className="space-y-3"
      noValidate={step !== undefined}
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const read = (axis: string, index: number) => {
          const value = data.get(axis)
          const raw = typeof value === 'string' && value.trim() ? Number(value) : NaN
          if (raw === Number(display(values[index]!))) return values[index]!
          if (step !== undefined && min !== undefined && raw <= 0) return NaN
          return step !== undefined && raw !== values[index] && Number.isFinite(raw)
            ? snapSceneMeasurement(raw, step, min)
            : raw
        }
        const next: Vec3 = [read('x', 0), read('y', 1), read('z', 2)]
        if (next.some((value) => !Number.isFinite(value))) {
          event.currentTarget.reportValidity()
          return
        }
        onApply(next)
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
              step={step ?? 'any'}
              required
              disabled={disabled}
              min={min}
              defaultValue={display(values[i]!)}
              onBlur={(event) => {
                const input = event.currentTarget
                const raw = Number(input.value)
                if (raw === Number(display(values[i]!))) {
                  input.value = display(values[i]!)
                  return
                }
                if (
                  step === undefined ||
                  !input.value.trim() ||
                  !Number.isFinite(raw) ||
                  (min !== undefined && raw <= 0)
                )
                  return
                input.value = display(snapSceneMeasurement(raw, step, min))
              }}
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
