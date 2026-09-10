import { useId, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { Vec3 } from '../../../core/model'
import type { MeshCutPlane } from '../../../scene/meshPlaneCut'
import { Button } from '../../ui/Button'

export function ScenePlaneCut({ onApply }: { onApply(plane: MeshCutPlane): void }) {
  const prefix = useId()
  const [axis, setAxis] = useState(0)
  const [position, setPosition] = useState('0')
  const amount = Number(position)
  const valid = position.trim() !== '' && Number.isFinite(amount)
  return (
    <details>
      <summary className="min-h-11 cursor-pointer py-3 text-sm">{COPY.scene.planeCut}</summary>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          if (!valid) return
          const normal: Vec3 = [0, 0, 0]
          const origin: Vec3 = [0, 0, 0]
          normal[axis] = 1
          origin[axis] = amount
          onApply({ normal, origin })
        }}
      >
        <p id={`${prefix}-hint`} className="text-xs text-mld-muted">
          {COPY.scene.planeCutHint}
        </p>
        <label className="block space-y-1 text-sm">
          <span>{COPY.scene.planeCutAxis}</span>
          <select
            name="planeAxis"
            value={axis}
            onChange={(event) => setAxis(Number(event.target.value))}
            className="min-h-11 w-full rounded-lg border border-mld-border bg-mld-bg px-3 text-mld-text focus-visible:outline-2 focus-visible:outline-mld-accent"
          >
            {['X', 'Y', 'Z'].map((name, i) => (
              <option key={name} value={i}>
                {COPY.scene.planeCutAxes[i]} ({name})
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>{COPY.scene.planeCutPosition}</span>
          <input
            name="planePosition"
            type="number"
            required
            step="any"
            value={position}
            aria-invalid={!valid}
            aria-describedby={`${prefix}-hint`}
            onChange={(event) => setPosition(event.target.value)}
            className="min-h-11 w-full rounded-lg border border-mld-border bg-mld-bg px-3 text-mld-text focus-visible:outline-2 focus-visible:outline-mld-accent"
          />
        </label>
        <Button type="submit" disabled={!valid} className="w-full text-sm">
          {COPY.scene.applyPlaneCut}
        </Button>
      </form>
    </details>
  )
}
