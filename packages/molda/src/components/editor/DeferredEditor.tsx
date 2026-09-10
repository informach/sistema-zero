import { type ComponentType, type JSX, useCallback, useEffect, useRef, useState } from 'react'
import { COPY } from '../../core/copy'
import type { EditorStore } from '../../state/editorStore'
import { Button } from '../ui/Button'

export interface EditorModuleProps {
  editor: EditorStore
  onBack(): void
}

export type EditorModuleLoader = () => Promise<ComponentType<EditorModuleProps>>

type ModuleState<Props extends object> =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; Editor: ComponentType<Props> }

// Successful modules can reopen synchronously. Rejections never enter this cache.
const loadedModules = new WeakMap<object, unknown>()

function useEditorModule<Props extends object>(load: () => Promise<ComponentType<Props>>) {
  const [state, setState] = useState<ModuleState<Props>>(() => {
    const Editor = loadedModules.get(load) as ComponentType<Props> | undefined
    return Editor ? { status: 'ready', Editor } : { status: 'loading' }
  })
  const generation = useRef(0)
  const retry = useCallback(() => {
    const request = ++generation.current
    const loaded = loadedModules.get(load) as ComponentType<Props> | undefined
    if (loaded) {
      setState({ status: 'ready', Editor: loaded })
      return
    }
    setState({ status: 'loading' })
    Promise.resolve()
      .then(load)
      .then(
        (Editor) => {
          loadedModules.set(load, Editor)
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
  return <DeferredModule load={load} props={{ editor, onBack }} onBack={onBack} />
}

/** A rejected import is retried with a fresh request; no cached React.lazy rejection. */
export function DeferredModule<Props extends object>({
  load,
  props,
  onBack,
  reloadPage = false,
  backLabel = COPY.editor.backToGallery,
}: {
  load: () => Promise<ComponentType<Props>>
  props: Props
  onBack(): void
  reloadPage?: boolean
  backLabel?: string
}): JSX.Element {
  const { state, retry } = useEditorModule(load)
  if (state.status === 'ready') return <state.Editor {...props} />
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p role={state.status === 'error' ? 'alert' : 'status'} className="text-base text-mld-text">
        {state.status === 'error' ? COPY.editor.loadError : COPY.editor.loading}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {state.status === 'error' && <Button onClick={retry}>{COPY.gallery.retry}</Button>}
        {state.status === 'error' && reloadPage && (
          <Button onClick={() => window.location.reload()}>{COPY.editor.reloadPage}</Button>
        )}
        <Button variant="outline" onClick={onBack}>
          {backLabel}
        </Button>
      </div>
    </div>
  )
}
