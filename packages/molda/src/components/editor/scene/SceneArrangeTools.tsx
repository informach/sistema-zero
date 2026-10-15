import { useState } from 'react'
import { arrangeSceneNodes } from '../../../scene/arrange'
import { Button } from '../../ui/Button'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function SceneArrangeTools({ workshop }: { workshop: ReturnType<typeof useSceneWorkshop> }) {
  const [axis, setAxis] = useState<'x' | 'y' | 'z'>('x')
  return (
    <details className="mld-disclosure">
      <summary>Alinhar e distribuir</summary>
      <div className="space-y-3 pb-2">
        <p className="text-xs text-mld-muted">
          Organize as peças e grupos escolhidos pelos eixos da cena. Grupos se movem inteiros;
          espelhos acompanham a peça de origem.
        </p>
        <fieldset className="mld-seg flex" aria-label="Eixo do alinhamento">
          {(['x', 'y', 'z'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={axis === value}
              onClick={() => setAxis(value)}
              className="min-h-11 flex-1"
            >
              {value.toUpperCase()}
            </button>
          ))}
        </fieldset>
        <div className="grid grid-cols-3 gap-1">
          {(
            [
              ['minimum', 'Início'],
              ['center', 'Centro'],
              ['maximum', 'Fim'],
            ] as const
          ).map(([operation, label]) => (
            <Button
              key={operation}
              className="text-xs"
              onClick={() =>
                workshop.run((source) =>
                  arrangeSceneNodes(source, workshop.selected, axis, operation),
                )
              }
            >
              {' '}
              {label}{' '}
            </Button>
          ))}
        </div>
        <div className="grid gap-1">
          <Button
            className="text-xs"
            disabled={workshop.selected.length < 3}
            onClick={() =>
              workshop.run((source) =>
                arrangeSceneNodes(source, workshop.selected, axis, 'centers'),
              )
            }
          >
            Distribuir centros igualmente
          </Button>
          <Button
            className="text-xs"
            disabled={workshop.selected.length < 3}
            onClick={() =>
              workshop.run((source) => arrangeSceneNodes(source, workshop.selected, axis, 'gaps'))
            }
          >
            Deixar espaços iguais
          </Button>
        </div>
      </div>
    </details>
  )
}
