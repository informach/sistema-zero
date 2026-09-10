import { COPY } from '../../../core/copy'
import { addSceneLocator, addScenePrimitive } from '../../../scene/commands'
import { Button } from '../../ui/Button'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function SceneCreateMenu({ run }: Pick<ReturnType<typeof useSceneWorkshop>, 'run'>) {
  return (
    <details className="rounded-lg border border-mld-border bg-mld-surface px-3">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold">
        {COPY.scene.add}
      </summary>
      <div className="grid grid-cols-2 gap-1 pb-2">
        {(['box', 'wedge', 'cylinder', 'sphere'] as const).map((kind) => (
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
        <Button
          className="col-span-2 text-sm"
          onClick={() =>
            run((source) => addSceneLocator(source, COPY.scene.locatorName), 'created')
          }
        >
          {COPY.scene.addLocator}
        </Button>
      </div>
    </details>
  )
}
