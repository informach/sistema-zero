import { COPY } from '../../../core/copy'
import { Box, Circle, Minus, Square } from '../../ui/icons'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function SceneSelectionModes({
  workshop,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
}) {
  const mode = workshop.components.selection?.mode ?? 'whole'
  return (
    <fieldset className="mld-float mld-selection-modes" aria-label="Escolher">
      <span className="hidden text-xs font-semibold text-mld-muted sm:block">Escolher:</span>
      {(
        [
          { mode: 'whole', label: 'Peça inteira', icon: Box },
          { mode: 'vertex', label: COPY.scene.componentModes.vertex, icon: Circle },
          { mode: 'edge', label: COPY.scene.componentModes.edge, icon: Minus },
          { mode: 'face', label: COPY.scene.componentModes.face, icon: Square },
        ] as const
      ).map(({ mode: next, label, icon: Icon }) => (
        <button
          type="button"
          key={next}
          aria-pressed={mode === next}
          disabled={
            next !== 'whole' && (!workshop.components.canEdit || workshop.components.blocked)
          }
          onClick={() =>
            workshop.requestTransition(() => {
              workshop.setTool('select')
              if (next === 'whole') workshop.components.close()
              else if (workshop.components.selection) workshop.components.setMode(next)
              else workshop.components.open(next)
            })
          }
        >
          <Icon aria-hidden="true" className="max-sm:hidden" />
          {label}
        </button>
      ))}
    </fieldset>
  )
}
