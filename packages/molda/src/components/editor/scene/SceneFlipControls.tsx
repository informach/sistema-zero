import { useMemo, useState } from 'react'
import { COPY } from '../../../core/copy'
import { evaluateSceneNodeFlags } from '../../../scene/evaluate'
import { flipSceneNodes } from '../../../scene/flipNodes'
import { Button } from '../../ui/Button'
import { FlipHorizontal2 } from '../../ui/icons'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function SceneFlipControls({ workshop }: { workshop: ReturnType<typeof useSceneWorkshop> }) {
  const [inPlace, setInPlace] = useState(false)
  const flags = useMemo(() => evaluateSceneNodeFlags(workshop.index.scene), [workshop.index])
  if (workshop.mode !== 'model' || !workshop.selected.length) return null
  const copy = COPY.scene
  const disabled = [...workshop.covered].some((id) => flags.get(id)?.locked)
  return (
    <details className="mld-disclosure">
      <summary>
        <span className="flex items-center gap-2">
          <FlipHorizontal2 aria-hidden="true" className="size-4" />
          {copy.flipTitle}
        </span>
      </summary>
      <fieldset disabled={disabled} aria-label={copy.flipTitle} className="space-y-2 px-1 pb-2">
        <p className="text-sm text-mld-muted">{inPlace ? copy.flipInPlaceHint : copy.flipHint}</p>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-mld-text">
          <input
            type="checkbox"
            name="flip-in-place"
            className="size-5 accent-mld-accent"
            checked={inPlace}
            onChange={(event) => setInPlace(event.target.checked)}
          />
          {copy.flipInPlace}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['x', 'y', 'z'] as const).map((axis) => (
            <Button
              key={axis}
              className="gap-2 text-sm"
              aria-label={copy.flipAxis(axis.toUpperCase())}
              onClick={() =>
                workshop.run((source) => flipSceneNodes(source, workshop.selected, axis, inPlace))
              }
            >
              <span aria-hidden="true" className="mld-axis" data-axis={axis}>
                {axis.toUpperCase()}
              </span>
              {copy.flipTitle}
            </Button>
          ))}
        </div>
      </fieldset>
    </details>
  )
}
