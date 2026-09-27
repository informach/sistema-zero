import { useId, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { ScenePathSettings } from '../../../scene/pathCommands'
import { PATH_LIMITS, pathTriangleCount } from '../../../scene/pathParameters'
import { Button } from '../../ui/Button'

export function ScenePathForm({
  settings,
  points,
  action,
  onApply,
}: {
  settings: ScenePathSettings
  points: number
  action: string
  onApply(settings: ScenePathSettings): void
}) {
  const prefix = useId()
  const [radius, setRadius] = useState(String(settings.radius))
  const [around, setAround] = useState(String(settings.around))
  const [endCaps, setEndCaps] = useState(settings.endCaps)
  const [closed, setClosed] = useState(settings.closed ?? false)
  const validRadius = radius.trim() !== '' && Number.isFinite(Number(radius)) && Number(radius) > 0
  const validAround =
    around.trim() !== '' &&
    Number.isInteger(Number(around)) &&
    Number(around) >= PATH_LIMITS.around.min &&
    Number(around) <= PATH_LIMITS.around.max
  const valid =
    validRadius && validAround && points >= (closed ? 3 : 2) && points <= PATH_LIMITS.points
  const next = {
    radius: Number(radius),
    around: Number(around),
    endCaps: !closed && endCaps,
    closed,
  }
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (valid) onApply(next)
      }}
    >
      <p id={`${prefix}-hint`} className="text-xs text-mld-muted">
        {COPY.scene.pathSettingsHint}
      </p>
      {(
        [
          {
            name: 'pathRadius',
            label: COPY.scene.pathRadius,
            value: radius,
            set: setRadius,
            valid: validRadius,
            min: Number.MIN_VALUE,
            max: undefined,
            step: 'any',
          },
          {
            name: 'pathAround',
            label: COPY.scene.pathAround,
            value: around,
            set: setAround,
            valid: validAround,
            min: PATH_LIMITS.around.min,
            max: PATH_LIMITS.around.max,
            step: '1',
          },
        ] as const
      ).map((field) => (
        <label key={field.name} className="block space-y-1 text-sm">
          <span>{field.label}</span>
          <input
            name={field.name}
            type="number"
            required
            min={field.min}
            max={field.max}
            step={field.step}
            value={field.value}
            aria-invalid={!field.valid}
            aria-describedby={`${prefix}-hint`}
            onChange={(event) => field.set(event.target.value)}
            className="min-h-11 w-full rounded-lg border border-mld-border bg-mld-bg px-3 text-mld-text focus-visible:outline-2 focus-visible:outline-mld-accent"
          />
        </label>
      ))}
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          name="pathClosed"
          type="checkbox"
          checked={closed}
          onChange={(event) => setClosed(event.target.checked)}
          className="size-5 accent-mld-accent"
        />
        {COPY.scene.pathClosed}
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          name="pathEndCaps"
          type="checkbox"
          checked={!closed && endCaps}
          disabled={closed}
          onChange={(event) => setEndCaps(event.target.checked)}
          className="size-5 accent-mld-accent"
        />
        {COPY.scene.pathCaps}
      </label>
      {valid && (
        <p aria-live="polite" className="text-xs text-mld-muted">
          {COPY.scene.curveDetailCost(pathTriangleCount(points, next))}
        </p>
      )}
      <Button type="submit" disabled={!valid} className="w-full text-sm">
        {action}
      </Button>
    </form>
  )
}
