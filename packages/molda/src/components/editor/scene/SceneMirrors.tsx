import { useId, useState } from 'react'
import { COPY } from '../../../core/copy'
import { SCENE_TOOL_ACCESS_COPY } from '../../../core/sceneToolAccessCopy'
import { addSceneMirror, removeSceneMirrors } from '../../../scene/commands'
import { useMoldaToolAccess } from '../../toolAccess'
import { Button } from '../../ui/Button'
import type { useSceneWorkshop } from './useSceneWorkshop'

/**
 * Os espelhos da peça. No básico (`model.mirror`) é o espelho no MEIO: X em 0, sem escolher eixo
 * nem posição, e só ele se retira. Y, Z e a posição são `model.mirror-axis`. Um espelho que a
 * criança ainda não pode mexer continua na peça: trancar tira a autoria, nunca a leitura.
 */
export function SceneMirrors({ workshop }: { workshop: ReturnType<typeof useSceneWorkshop> }) {
  const [axis, setAxis] = useState<'x' | 'y' | 'z'>('x')
  const offsetId = useId()
  const { can } = useMoldaToolAccess()
  const anyAxis = can('model.mirror-axis')
  const { primary, document, run } = workshop
  if (primary?.kind !== 'mesh' || (!anyAxis && !can('model.mirror'))) return null
  const copy = COPY.scene
  const mirrors = document.mirrors.filter(
    (mirror) =>
      mirror.sourceId === primary.id && (anyAxis || (mirror.axis === 'x' && mirror.offset === 0)),
  )
  return (
    <details className="rounded-xl border border-mld-border p-2">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold">
        {copy.mirrors}
      </summary>
      <p className="py-2 text-sm text-mld-muted">
        {anyAxis ? copy.mirrorHint : SCENE_TOOL_ACCESS_COPY.mirrorMiddleHint}
      </p>
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (!anyAxis) {
            run((source) => addSceneMirror(source, primary.id, { axis: 'x', offset: 0 }))
            return
          }
          const value = new FormData(event.currentTarget).get('offset')
          const offset = typeof value === 'string' && value.trim() ? Number(value) : NaN
          run((source) => addSceneMirror(source, primary.id, { axis, offset }))
        }}
      >
        {anyAxis && (
          <>
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
          </>
        )}
        {/* No básico o espelho do meio é um só: com ele criado, fica só o "Tirar". */}
        {(anyAxis || mirrors.length === 0) && (
          <Button type="submit" className="w-full text-sm">
            {copy.addMirror}
          </Button>
        )}
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
