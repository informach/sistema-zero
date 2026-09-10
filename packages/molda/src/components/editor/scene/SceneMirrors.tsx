import { useId, useState } from 'react'
import { COPY } from '../../../core/copy'
import { addSceneMirror, removeSceneMirrors } from '../../../scene/commands'
import { Button } from '../../ui/Button'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function SceneMirrors({ workshop }: { workshop: ReturnType<typeof useSceneWorkshop> }) {
  const [axis, setAxis] = useState<'x' | 'y' | 'z'>('x')
  const offsetId = useId()
  const { primary, document, run } = workshop
  if (primary?.kind !== 'mesh') return null
  const copy = COPY.scene
  const mirrors = document.mirrors.filter((mirror) => mirror.sourceId === primary.id)
  return (
    <details className="rounded-xl border border-mld-border p-2">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold">
        {copy.mirrors}
      </summary>
      <p className="py-2 text-sm text-mld-muted">{copy.mirrorHint}</p>
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault()
          const value = new FormData(event.currentTarget).get('offset')
          const offset = typeof value === 'string' && value.trim() ? Number(value) : NaN
          run((source) => addSceneMirror(source, primary.id, { axis, offset }))
        }}
      >
        <div className="grid grid-cols-3 gap-1">
          {(['x', 'y', 'z'] as const).map((name) => (
            <Button
              key={name}
              className="px-2 text-sm"
              aria-pressed={axis === name}
              onClick={() => setAxis(name)}
            >
              {name.toUpperCase()}
            </Button>
          ))}
        </div>
        <label htmlFor={offsetId} className="text-sm font-bold">
          {copy.mirrorOffset}
        </label>
        <input
          id={offsetId}
          name="offset"
          type="number"
          step="any"
          required
          defaultValue={0}
          className="min-h-11 w-full rounded-lg border border-mld-border bg-mld-bg px-3 text-sm"
        />
        <Button type="submit" className="w-full text-sm">
          {copy.addMirror}
        </Button>
      </form>
      {mirrors.length > 0 && (
        <ul className="mt-2 space-y-1">
          {mirrors.map((mirror) => (
            <li key={mirror.id}>
              <Button
                className="w-full text-sm"
                onClick={() => run((source) => removeSceneMirrors(source, [mirror.id]))}
              >
                {copy.removeMirror(mirror.axis.toUpperCase(), mirror.offset)}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </details>
  )
}
