import { useState } from 'react'
import type { Vec3 } from '../../../core/model'
import type { MeshCutPlane } from '../../../scene/meshPlaneCut'
import { sceneLocalBounds } from '../../../scene/pivot'
import type { useSceneSolidCut } from './useSceneSolidCut'

export function SceneCutPrecision({ cut }: { cut: ReturnType<typeof useSceneSolidCut> }) {
  const owner = cut.owner
  if (!owner) return null
  const initial = cut.plane ?? {
    origin: sceneLocalBounds(owner.source, owner.nodeId)?.center ?? [0, 0, 0],
    normal: [0, 0, 1],
  }
  return (
    <details className="mld-cut-precision">
      <summary>Precisão do corte</summary>
      <div className="mld-cut-precision-panel">
        <p>Coordenadas locais da peça, antes da escala e da rotação.</p>
        {owner.points.map((point, i) => (
          <label key={`${point.edgeId}:${point.t}`}>
            Ponto {i + 1} · posição na aresta (%)
            <input
              name={`cutPoint-${i}`}
              type="number"
              min={0}
              max={100}
              step="any"
              defaultValue={point.t * 100}
              disabled={cut.busy}
              onBlur={(event) => {
                const input = event.currentTarget
                if (input.value.trim() && input.validity.valid)
                  cut.setPointPosition(i, input.valueAsNumber / 100)
                else input.value = String(point.t * 100)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  event.stopPropagation()
                  event.currentTarget.blur()
                }
              }}
            />
          </label>
        ))}
        <PlaneForm
          key={`${owner.nodeId}:${owner.revision}:${initial.origin}:${initial.normal}`}
          initial={initial as MeshCutPlane}
          disabled={cut.busy}
          change={cut.setNumericPlane}
        />
      </div>
    </details>
  )
}

function PlaneForm({
  initial,
  disabled,
  change,
}: {
  initial: MeshCutPlane
  disabled: boolean
  change(plane: MeshCutPlane): void
}) {
  const [values, setValues] = useState({
    origin: initial.origin.map(String),
    normal: initial.normal.map(String),
  })
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        change({
          origin: values.origin.map(Number) as Vec3,
          normal: values.normal.map(Number) as Vec3,
        })
      }}
    >
      {(['origin', 'normal'] as const).map((field) => (
        <fieldset key={field} disabled={disabled}>
          <legend>
            {field === 'origin' ? 'Ponto do plano' : 'Direção perpendicular ao plano'}
          </legend>
          <div className="mld-axis-fields">
            {[0, 1, 2].map((axis) => (
              <label key={axis} data-axis={axis}>
                <span>{'XYZ'[axis]}</span>
                <input
                  type="number"
                  name={`cutPlane-${field}-${axis}`}
                  aria-label={`${field === 'origin' ? 'Ponto do plano' : 'Direção do plano'} ${'XYZ'[axis]}`}
                  required
                  step="any"
                  value={values[field][axis]}
                  onChange={(event) =>
                    setValues((before) => ({
                      ...before,
                      [field]: before[field].map((n, i) => (i === axis ? event.target.value : n)),
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <p>Conferir substitui os pontos pela prévia deste plano. Separar confirma as duas peças.</p>
      <button type="submit" disabled={disabled}>
        Conferir plano
      </button>
    </form>
  )
}
