import { type ComponentType, type JSX, useCallback, useEffect, useRef, useState } from 'react'
import { COPY } from '../../core/copy'
import type { EditorStore } from '../../state/editorStore'
import { Button } from '../ui/Button'

export interface EditorModuleProps {
  editor: EditorStore
  onBack(): void
}

export type EditorModuleLoader = () => Promise<ComponentType<EditorModuleProps>>

type ModuleState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; Editor: ComponentType<EditorModuleProps> }

function useEditorModule(load: EditorModuleLoader) {
  const [state, setState] = useState<ModuleState>({ status: 'loading' })
  const generation = useRef(0)
  const retry = useCallback(() => {
    const request = ++generation.current
    setState({ status: 'loading' })
    Promise.resolve()
      .then(load)
      .then(
        (Editor) => {
          if (generation.current === request) setState({ status: 'ready', Editor })
        },
        () => {
          if (generation.current === request) setState({ status: 'error' })
        },
      )
  }, [load])
  useEffect(() => {
    retry()
    return () => {
      generation.current += 1
    }
  }, [retry])
  return { state, retry }
}

/** Loads just the chosen workshop; import failure cannot discard an already-open editor. */
export function DeferredEditor({
  load,
  editor,
  onBack,
}: EditorModuleProps & { load: EditorModuleLoader }): JSX.Element {
  const { state, retry } = useEditorModule(load)
  if (state.status === 'ready') return <state.Editor editor={editor} onBack={onBack} />
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p role={state.status === 'error' ? 'alert' : 'status'} className="text-base text-mld-text">
        {state.status === 'error' ? COPY.editor.loadError : COPY.editor.loading}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {state.status === 'error' && <Button onClick={retry}>{COPY.gallery.retry}</Button>}
        <Button variant="outline" onClick={onBack}>
          {COPY.editor.backToGallery}
        </Button>
      </div>
    </div>
  )
}
