import { Box, Circle, Square } from '../../ui/icons'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function SceneSelectionModes({
  workshop,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
}) {
  const mode = workshop.components.selection?.mode ?? 'whole'
  return (
    <fieldset className="mld-float mld-selection-modes" aria-label="Escolher">
      <span className="text-xs font-semibold text-mld-muted">Escolher:</span>
      {(
        [
          { mode: 'whole', label: 'Peça inteira', icon: Box },
          { mode: 'face', label: 'Face', icon: Square },
          { mode: 'vertex', label: 'Ponto', icon: Circle },
        ] as const
      ).map(({ mode: next, label, icon: Icon }) => (
        <button
          type="button"
          key={next}
          aria-pressed={mode === next}
          disabled={next !== 'whole' && !workshop.components.canEdit}
          onClick={() =>
            workshop.requestTransition(() => {
              workshop.setTool('select')
              if (next === 'whole') workshop.components.close()
              else if (workshop.components.selection) workshop.components.setMode(next)
              else workshop.components.open(next)
            })
          }
        >
          <Icon aria-hidden="true" />
          {label}
        </button>
      ))}
    </fieldset>
  )
}
