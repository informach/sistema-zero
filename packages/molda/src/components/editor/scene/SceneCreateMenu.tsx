import { useId } from 'react'
import { COPY } from '../../../core/copy'
import { SCENE_TOOL_ACCESS_COPY } from '../../../core/sceneToolAccessCopy'
import { addSceneLocator, addScenePrimitive } from '../../../scene/commands'
import { useMoldaToolAccess } from '../../toolAccess'
import { Box, Circle, Crosshair, Cylinder, type LucideIcon, TriangleRight } from '../../ui/icons'
import { SCENE_TILE_GRID, SceneTile } from './SceneTile'
import type { useSceneWorkshop } from './useSceneWorkshop'

const SHAPES: ReadonlyArray<['box' | 'wedge' | 'cylinder' | 'sphere', LucideIcon]> = [
  ['box', Box],
  ['wedge', TriangleRight],
  ['cylinder', Cylinder],
  ['sphere', Circle],
]

/**
 * As quatro formas (`model.pieces`) e o ponto de apoio (`model.locator`), À VISTA em ladrilhos
 * com a cor de cada forma, como as "peças prontas" da tela-modelo (11/09/2026). Antes moravam
 * atrás de um `<details>`; o que pagou a conta dos ladrilhos à vista foi "Mais ferramentas", que
 * recolheu a caixa, o laço, os grupos e a malha (a catraca dos controles encarados não sobe).
 * Sem nenhuma das duas famílias, a seção some.
 */
export function SceneCreateMenu({ run }: Pick<ReturnType<typeof useSceneWorkshop>, 'run'>) {
  const { can } = useMoldaToolAccess()
  const headingId = useId()
  const shapes = can('model.pieces')
  const locator = can('model.locator')
  if (!shapes && !locator) return null
  return (
    <section aria-labelledby={headingId} className="space-y-2">
      <h3 id={headingId} className="mld-kicker">
        {locator ? COPY.scene.add : SCENE_TOOL_ACCESS_COPY.addShape}
      </h3>
      <div className={SCENE_TILE_GRID}>
        {shapes &&
          SHAPES.map(([kind, icon]) => (
            <SceneTile
              key={kind}
              icon={icon}
              label={COPY.shapes[kind]}
              ink={`var(--mld-shape-${kind})`}
              onClick={() =>
                run((source) => addScenePrimitive(source, kind, COPY.shapes[kind]), 'created')
              }
            />
          ))}
        {locator && (
          <SceneTile
            icon={Crosshair}
            label={COPY.scene.addLocator}
            ink="var(--mld-shape-special)"
            onClick={() =>
              run((source) => addSceneLocator(source, COPY.scene.locatorName), 'created')
            }
          />
        )}
      </div>
    </section>
  )
}
