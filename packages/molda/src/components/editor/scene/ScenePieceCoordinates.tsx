import { useId, useMemo } from 'react'
import type { Vec3 } from '../../../core/model'
import { evaluateSceneNodeFlags } from '../../../scene/evaluate'
import {
  type SceneCoordinateField,
  scenePieceCoordinates,
  setScenePieceCoordinates,
} from '../../../scene/pieceCoordinates'
import type { useSceneWorkshop } from './useSceneWorkshop'

const FIELDS: ReadonlyArray<{ field: SceneCoordinateField; label: string }> = [
  { field: 'position', label: 'Posição' },
  { field: 'dimensions', label: 'Tamanho' },
  { field: 'pivot', label: 'Pivô · o ponto onde a peça gira' },
  { field: 'rotation', label: 'Giro' },
]

/** Compact, parent-relative values. Blur/Enter commits one validated document command. */
export function ScenePieceCoordinates({
  workshop,
  onlyPivot = false,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
  onlyPivot?: boolean
}) {
  const { document, primary, run, index } = workshop
  const hint = useId()
  const result = useMemo(() => {
    if (!primary) return null
    try {
      return { values: scenePieceCoordinates(document, primary.id), error: null }
    } catch (error) {
      return {
        values: null,
        error:
          error instanceof Error
            ? error.message
            : 'Esta transformação precisa dos ajustes especializados.',
      }
    }
  }, [document, primary])
  if (!primary || !result) return null
  if (!result.values)
    return (
      <p role="status" className="text-xs text-mld-muted">
        {result.error}
      </p>
    )
  const coordinates = result.values
  const parent = primary.parentId ? index.scene.nodes.get(primary.parentId) : null
  const locked = evaluateSceneNodeFlags(index.scene).get(primary.id)?.locked
  return (
    <div className="mld-piece-coordinates" aria-describedby={hint}>
      <p id={hint} className="sr-only">
        Referência: {parent?.name ?? 'mundo'}. Tamanho em unidades da peça; giro em graus. Enter ou
        sair do campo confirma. Escape cancela.
      </p>
      {FIELDS.filter(({ field }) => !onlyPivot || field === 'pivot').map(({ field, label }) => (
        <fieldset
          key={field}
          className="min-w-0"
          disabled={locked}
          data-pivot-active={field === 'pivot' && workshop.tool === 'pivot'}
        >
          <legend>{label}</legend>
          <div className="mld-axis-fields">
            {([0, 1, 2] as const).map((axis) => (
              <label
                key={`${primary.id}:${field}:${axis}:${coordinates[field][axis]}`}
                data-axis={axis}
              >
                <span aria-hidden="true">{['X', 'Y', 'Z'][axis]}</span>
                <input
                  type="number"
                  name={`${field}-${axis}`}
                  step="any"
                  min={field === 'dimensions' ? Number.MIN_VALUE : undefined}
                  aria-label={`${label} ${['X', 'Y', 'Z'][axis]}`}
                  aria-describedby={hint}
                  defaultValue={Number(coordinates[field][axis].toPrecision(12))}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault()
                      event.stopPropagation()
                      event.currentTarget.value = String(
                        Number(coordinates[field][axis].toPrecision(12)),
                      )
                      event.currentTarget.blur()
                    } else if (event.key === 'Enter') {
                      event.preventDefault()
                      event.currentTarget.blur()
                    }
                  }}
                  onBlur={(event) => {
                    const fieldInput = event.currentTarget
                    const displayValue = Number(coordinates[field][axis].toPrecision(12))
                    if (!fieldInput.value.trim() || !fieldInput.validity.valid) {
                      fieldInput.value = String(displayValue)
                      return
                    }
                    const value = Number(fieldInput.value)
                    if (value === displayValue) return
                    const next: Vec3 = [...coordinates[field]]
                    next[axis] = value
                    if (!run((source) => setScenePieceCoordinates(source, primary.id, field, next)))
                      fieldInput.value = String(displayValue)
                  }}
                />
                {field === 'rotation' && <small aria-hidden="true">°</small>}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  )
}
