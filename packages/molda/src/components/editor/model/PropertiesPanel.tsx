/**
 * As propriedades da peça selecionada: nome, forma, posição (o canto `from`),
 * tamanho e giro, em steppers que commitam (e desfazem) um passo por vez.
 */
import type { FormEvent, JSX } from 'react'
import { useEffect, useState } from 'react'
import { COPY } from '../../../core/copy'
import { MOLDA_LIMITS } from '../../../core/limits'
import type { MoldaModelAsset, MoldaPart, Vec3 } from '../../../core/model'
import { partTriangleCount } from '../../../model/geometry'
import { partSize } from '../../../model/shapes'
import { partPivot } from '../../../model/transform'
import { Button } from '../../ui/Button'
import { Panel } from '../../ui/Panel'
import { Stepper } from '../../ui/Stepper'

export interface PropertiesPanelProps {
  model: MoldaModelAsset
  part: MoldaPart | null
  onRename: (name: string) => void
  onMoveTo: (from: Vec3) => void
  onResize: (size: Vec3) => void
  onRotate: (rotation: Vec3) => void
  /** O pivô da peça (`null` = volta ao centro). */
  onPivot: (origin: Vec3 | null) => void
  /** Quantas peças estão SOMADAS à principal (seleção múltipla). */
  extraCount?: number
  className?: string
}

const AXES = ['x', 'y', 'z'] as const
const DIMS = ['w', 'h', 'd'] as const

export function PropertiesPanel({
  model,
  part,
  onRename,
  onMoveTo,
  onResize,
  onRotate,
  onPivot,
  extraCount = 0,
  className,
}: PropertiesPanelProps): JSX.Element {
  const [name, setName] = useState(part?.name ?? '')
  useEffect(() => {
    setName(part?.name ?? '')
  }, [part])

  function submitName(event: FormEvent): void {
    event.preventDefault()
    if (part && name.trim() && name.trim() !== part.name) onRename(name.trim())
  }

  if (!part) {
    return (
      <Panel title={COPY.editor.model.properties} className={className}>
        <p className="p-2 text-sm text-mld-text-soft">{COPY.editor.model.noSelection}</p>
      </Panel>
    )
  }

  const size = partSize(part)
  const pivot = partPivot(part)
  const snap = model.snap
  const half = MOLDA_LIMITS.gridHalf
  const copy = COPY.editor.model
  return (
    <Panel title={copy.properties} className={className} bodyClassName="flex flex-col gap-3 p-2">
      <form onSubmit={submitName} className="flex flex-col gap-1">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-mld-muted">{copy.name}</span>
          <input
            name="molda-part-name"
            autoComplete="off"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={submitName}
            maxLength={MOLDA_LIMITS.maxPartNameChars}
            className="min-h-11 rounded-lg border-2 border-mld-border bg-mld-bg px-2 text-sm font-bold text-mld-text focus-visible:border-mld-accent focus-visible:outline-none"
          />
        </label>
        <p className="text-xs text-mld-muted">
          {copy.shape}: <span className="font-bold text-mld-text">{COPY.shapes[part.shape]}</span>
        </p>
        {extraCount > 0 ? (
          <p className="text-xs font-bold text-mld-accent">{copy.selectedParts(extraCount + 1)}</p>
        ) : null}
        {part.mesh ? (
          <p className="text-xs text-mld-muted">
            {copy.mesh.counts(
              Object.keys(part.mesh.vertices).length,
              Object.keys(part.mesh.faces).length,
              partTriangleCount(part),
              part.mesh.looseEdges?.length ?? 0,
            )}
          </p>
        ) : null}
      </form>
      <fieldset className="flex flex-col gap-1">
        <legend className="text-xs font-bold text-mld-muted">{copy.position}</legend>
        {AXES.map((axis, i) => (
          <Stepper
            key={axis}
            label={`${copy.position} ${copy.axis[axis]}`}
            short={copy.axis[axis]}
            value={part.from[i] as number}
            step={snap}
            min={i === 1 ? 0 : -half}
            max={(i === 1 ? MOLDA_LIMITS.gridHeight : half) - (size[i] as number)}
            onChange={(value) => {
              const from: Vec3 = [...part.from]
              from[i] = value
              onMoveTo(from)
            }}
          />
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-1">
        <legend className="text-xs font-bold text-mld-muted">{copy.size}</legend>
        {DIMS.map((dim, i) => (
          <Stepper
            key={dim}
            label={copy.dims[dim]}
            short={copy.axis[AXES[i] as 'x' | 'y' | 'z']}
            value={size[i] as number}
            step={snap}
            min={snap}
            max={MOLDA_LIMITS.maxPartSize}
            onChange={(value) => {
              const next: Vec3 = [...size]
              next[i] = value
              onResize(next)
            }}
          />
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-1">
        <legend className="text-xs font-bold text-mld-muted">{copy.pivot}</legend>
        {AXES.map((axis, i) => (
          <Stepper
            key={axis}
            label={`${copy.pivot} ${copy.axis[axis]}`}
            short={copy.axis[axis]}
            value={pivot[i] as number}
            step={snap}
            min={part.from[i] as number}
            max={part.to[i] as number}
            onChange={(value) => {
              const origin: Vec3 = [pivot[0], pivot[1], pivot[2]]
              origin[i] = value
              onPivot(origin)
            }}
          />
        ))}
        <Button
          variant="ghost"
          className="min-h-11 text-sm"
          disabled={!part.origin}
          onClick={() => onPivot(null)}
        >
          {copy.pivotCenter}
        </Button>
      </fieldset>
      <fieldset className="flex flex-col gap-1">
        <legend className="text-xs font-bold text-mld-muted">{copy.rotation}</legend>
        {AXES.map((axis, i) => (
          <Stepper
            key={axis}
            label={`${copy.rotation} ${copy.axis[axis]}`}
            short={copy.axis[axis]}
            value={part.rotation[i] as number}
            step={15}
            min={0}
            max={360}
            wrap
            onChange={(value) => {
              const rotation: Vec3 = [...part.rotation]
              rotation[i] = value
              onRotate(rotation)
            }}
          />
        ))}
      </fieldset>
    </Panel>
  )
}
