import { useRef, useState } from 'react'
import { normalizeAssetName } from '../../../core/names'
import type { MoldaSceneDocument } from '../../../scene/document'
import type { EditorStore } from '../../../state/editorStore'
import { useOptionalMoldaApp } from '../../appContext'
import { Button } from '../../ui/Button'

export function SceneProjectName({
  name,
  editor,
  requestTransition,
}: {
  name: string
  editor: EditorStore<MoldaSceneDocument>
  requestTransition?: (action: () => void) => void
}) {
  const app = useOptionalMoldaApp()
  const disclosure = useRef<HTMLDetailsElement>(null)
  const [error, setError] = useState<string | null>(null)
  return (
    <details ref={disclosure} className="relative min-w-0 flex-1">
      <summary
        aria-label={`Renomear ${name}`}
        className="mld-display flex min-h-11 cursor-pointer list-none items-center gap-1 text-base"
      >
        <h1 tabIndex={-1} className="flex min-w-0 items-center gap-1">
          <span className="truncate" title={name}>
            {name}
          </span>
        </h1>
        <span aria-hidden="true" className="text-sm text-mld-muted">
          ✎
        </span>
      </summary>
      <form
        className="mld-drop left-0 top-full mt-2"
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return
          event.preventDefault()
          event.stopPropagation()
          event.currentTarget.reset()
          setError(null)
          if (disclosure.current) {
            disclosure.current.open = false
            disclosure.current.querySelector('summary')?.focus()
          }
        }}
        onSubmit={(event) => {
          event.preventDefault()
          const value = String(new FormData(event.currentTarget).get('name') ?? '')
          const rename = () => {
            const state = editor.getState(),
              normalized = normalizeAssetName(value)
            if (!normalized) {
              setError('Dê um nome com até 48 letras ou números.')
              return
            }
            if (
              app?.gallery
                .getState()
                .assets.some((asset) => asset.id !== state.content.id && asset.name === normalized)
            ) {
              setError('Você já tem uma criação com esse nome. Experimente outro.')
              return
            }
            if (state.content.name !== normalized)
              state.commit({ ...state.saveSnapshot(), name: normalized })
            setError(null)
            if (disclosure.current) {
              disclosure.current.open = false
              disclosure.current.querySelector('summary')?.focus()
            }
          }
          if (requestTransition) requestTransition(rename)
          else rename()
        }}
      >
        <label className="space-y-1 text-sm font-bold">
          Nome da criação
          <input
            key={name}
            name="name"
            defaultValue={name}
            maxLength={48}
            required
            className="min-h-11 w-full rounded-lg border border-mld-border bg-mld-surface px-2 text-sm"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-mld-danger">
            {error}
          </p>
        )}
        <Button type="submit">Guardar nome</Button>
      </form>
    </details>
  )
}
