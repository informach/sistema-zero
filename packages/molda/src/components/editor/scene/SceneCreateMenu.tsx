import { useId, useState } from 'react'
import { COPY } from '../../../core/copy'
import { addSceneLocator, type SceneShapeKind } from '../../../scene/commands'
import { addScenePrimitiveNear, sceneInsertionParent } from '../../../scene/placement'
import { useMoldaToolAccess } from '../../toolAccess'
import {
  Box,
  Circle,
  Crosshair,
  Cylinder,
  type LucideIcon,
  Square,
  TriangleRight,
} from '../../ui/icons'
import { SCENE_TILE_GRID, SceneTile } from './SceneTile'
import type { useSceneWorkshop } from './useSceneWorkshop'

const SHAPES: ReadonlyArray<[SceneShapeKind, LucideIcon]> = [
  ['box', Box],
  ['wedge', TriangleRight],
  ['cylinder', Cylinder],
  ['sphere', Circle],
  ['plane', Square],
]

/**
 * As formas (`model.pieces`) e o ponto de apoio (`model.locator`), À VISTA em ladrilhos
 * com a cor de cada forma, como as "peças prontas" da tela-modelo (11/09/2026). Antes moravam
 * atrás de um `<details>`; o que pagou a conta dos ladrilhos à vista foi "Mais ferramentas", que
 * recolheu a caixa, o laço, os grupos e a malha (a catraca dos controles encarados não sobe).
 * Sem nenhuma das duas famílias, a seção some.
 */
export function SceneCreateMenu({
  run,
  document,
  selected,
}: Pick<ReturnType<typeof useSceneWorkshop>, 'run' | 'document' | 'selected'>) {
  const { can } = useMoldaToolAccess()
  const headingId = useId()
  const [destination, setDestination] = useState('auto')
  const shapes = can('model.pieces')
  const locator = can('model.locator')
  const explicitDestination =
    destination === 'auto'
      ? undefined
      : destination === 'root'
        ? null
        : document.nodes.some((node) => node.id === destination && node.kind === 'group')
          ? destination
          : undefined
  const parentId =
    explicitDestination === undefined
      ? sceneInsertionParent(document, selected)
      : explicitDestination
  const parent = document.nodes.find((node) => node.id === parentId)
  if (!shapes && !locator) return null
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="mld-kicker">
        {COPY.scene.add}
      </h3>
      {document.nodes.some((node) => node.kind === 'group') && (
        <details className="order-last text-xs text-mld-muted">
          <summary className="min-h-11 cursor-pointer py-2" title={parent?.name}>
            {parent ? `No conjunto ${parent.name}` : 'Fora de conjunto'}
          </summary>
          <label>
            Adicionar em
            <select
              name="createmenu-1"
              aria-label="Destino da nova peça"
              className="min-h-11 w-full rounded border border-mld-border bg-mld-surface text-mld-text"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
            >
              <option value="auto">Automático</option>
              <option value="root">Fora de conjunto</option>
              {document.nodes
                .filter((node) => node.kind === 'group')
                .map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name}
                  </option>
                ))}
            </select>
          </label>
        </details>
      )}
      <div className={SCENE_TILE_GRID}>
        {shapes &&
          SHAPES.map(([kind, icon]) => (
            <SceneTile
              key={kind}
              icon={icon}
              label={kind === 'plane' ? COPY.scene.plane : COPY.shapes[kind]}
              ink={`var(--mld-shape-${kind === 'plane' ? 'special' : kind})`}
              tint
              onClick={() =>
                run(
                  (source) =>
                    addScenePrimitiveNear(
                      source,
                      kind,
                      kind === 'plane' ? COPY.scene.plane : COPY.shapes[kind],
                      selected,
                      undefined,
                      explicitDestination,
                    ),
                  'created',
                )
              }
            />
          ))}
        {locator && (
          <SceneTile
            icon={Crosshair}
            label="Apoio"
            aria-label={COPY.scene.addLocator}
            ink="var(--mld-shape-special)"
            tint
            onClick={() =>
              run((source) => addSceneLocator(source, COPY.scene.locatorName), 'created')
            }
          />
        )}
      </div>
    </section>
  )
}
