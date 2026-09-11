import { COPY } from '../../../core/copy'
import { SCENE_TOOL_ACCESS_COPY } from '../../../core/sceneToolAccessCopy'
import { addSceneLocator, addScenePrimitive } from '../../../scene/commands'
import { useMoldaToolAccess } from '../../toolAccess'
import { Button } from '../../ui/Button'
import type { useSceneWorkshop } from './useSceneWorkshop'

/** As quatro formas (`model.pieces`) e o ponto de apoio (`model.locator`); sem nenhum, some. */
export function SceneCreateMenu({ run }: Pick<ReturnType<typeof useSceneWorkshop>, 'run'>) {
  const { can } = useMoldaToolAccess()
  const shapes = can('model.pieces')
  const locator = can('model.locator')
  if (!shapes && !locator) return null
  return (
    <details className="rounded-lg border border-mld-border bg-mld-surface px-3">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold">
        {locator ? COPY.scene.add : SCENE_TOOL_ACCESS_COPY.addShape}
      </summary>
      <div className="grid grid-cols-2 gap-1 pb-2">
        {shapes &&
          (['box', 'wedge', 'cylinder', 'sphere'] as const).map((kind) => (
            <Button
              key={kind}
              className="px-2 text-sm"
              onClick={() =>
                run((source) => addScenePrimitive(source, kind, COPY.shapes[kind]), 'created')
              }
            >
              {COPY.shapes[kind]}
            </Button>
          ))}
        {locator && (
          <Button
            className="col-span-2 text-sm"
            onClick={() =>
              run((source) => addSceneLocator(source, COPY.scene.locatorName), 'created')
            }
          >
            {COPY.scene.addLocator}
          </Button>
        )}
      </div>
    </details>
  )
}
