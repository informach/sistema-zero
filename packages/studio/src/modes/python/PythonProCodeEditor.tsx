import 'monaco-editor/esm/vs/basic-languages/python/python.contribution.js'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { useEffect, useRef, useState } from 'react'
import { isPythonProject } from '../../core/editableProject'
import { attachPythonEditorLanguage } from '../../python/language/editorSession'
import { createPythonFileOperations } from '../../python/language/fileOperations'
import { attachPythonFormatter } from '../../python/language/formatter'
import { useProjectStore, useProjectStoreApi } from '../../state/projectStore'
import { useStudioExecution } from '../../studio/observation'
import { useStudioRuntimeEnvironment } from '../../studio/runtime-environment'
import { MonacoTabs } from '../pro/ProMonacoTabs'
import type { ProWorkspaceEditorProps } from '../pro/ProWorkspace'

/** The common editor owns tabs, buffers and history. Python owns its language providers. */
export function PythonProCodeEditor({ onProLanguageReady, ...props }: ProWorkspaceEditorProps) {
  const environment = useStudioRuntimeEnvironment()
  const execution = useStudioExecution()
  const owner = useRef({ environment, execution })
  owner.current = { environment, execution }
  const container = useRef<HTMLDivElement>(null)
  const store = useProjectStoreApi()
  const projectId = useProjectStore((state) => state.project?.id)
  const pythonProject = useProjectStore((state) => state.project?.programmingLanguage === 'python')
  const entrypoint = useProjectStore((state) => {
    const project = state.project
    return project && isPythonProject(project) ? project.python.entrypoint : null
  })
  const tree = useProjectStore((state) => state.project?.tree)
  const [ready, setReady] = useState<{
    editor: monaco.editor.IStandaloneCodeEditor
    prefix: string
  } | null>(null)
  const session = useRef<ReturnType<typeof attachPythonEditorLanguage> | null>(null)
  const callbacks = useRef({ ...props, onProLanguageReady })
  callbacks.current = { ...props, onProLanguageReady }
  const [issue, setIssue] = useState<string | null>(null)
  useEffect(() => {
    if (!ready) return
    const formatter = attachPythonFormatter(monaco, ready.prefix)
    return () => formatter.dispose()
  }, [ready])
  useEffect(() => {
    if (!ready || !projectId || !pythonProject) return
    const provider =
      environment?.createPythonLanguage?.(() => {
        const project = store.getState().project
        return project?.id === projectId && isPythonProject(project) ? project : null
      }) ?? environment?.pythonLanguage
    if (!provider || !environment) {
      const message =
        'A análise Python não está disponível neste ambiente. Você pode editar e executar o projeto.'
      setIssue(message)
      callbacks.current.onProAnalysis?.({ status: 'error', message })
      return
    }
    const writerEpoch = execution.writerEpoch,
      editingAccess = execution.editingAccess
    const operations = createPythonFileOperations({
      project() {
        const state = store.getState(),
          project = state.project
        return owner.current.environment === environment &&
          owner.current.execution.writerEpoch === writerEpoch &&
          owner.current.execution.editingAccess === editingAccess &&
          editingAccess !== 'observer' &&
          state.editingAccess !== 'observer' &&
          project?.id === projectId &&
          isPythonProject(project) &&
          project.kind === 'pro'
          ? project
          : null
      },
      environment: () => owner.current.environment,
      writerEpoch: () => owner.current.execution.writerEpoch ?? null,
      mountFrame() {
        if (!container.current) throw new Error('O editor Python foi encerrado.')
        const frame = document.createElement('iframe')
        frame.hidden = true
        container.current.append(frame)
        return { frame, release: () => frame.remove() }
      },
    })
    const active = attachPythonEditorLanguage({
      monaco,
      editor: ready.editor,
      prefix: ready.prefix,
      projectId,
      entrypoint: () => {
        const project = store.getState().project
        return project?.id === projectId && isPythonProject(project)
          ? project.python.entrypoint
          : ''
      },
      provider,
      renameFiles: operations.rename,
      referencesToFile: operations.references,
      validateRename: operations.validateRename,
      tree: () =>
        store.getState().project?.id === projectId ? (store.getState().project?.tree ?? {}) : {},
      openFile: (path) => callbacks.current.onActiveFileChange?.(path),
      diagnostics: (items) => callbacks.current.onProDiagnostics?.(items),
      analysis: (state) => {
        setIssue(state.status === 'error' ? state.message : null)
        callbacks.current.onProAnalysis?.(state)
      },
    })
    session.current = active
    const lost = () => {
      active.dispose()
      callbacks.current.onProLanguageReady?.(null)
      setIssue('O contexto da análise mudou. Seu código continua preservado.')
    }
    environment.signal?.addEventListener('abort', lost, { once: true })
    callbacks.current.onProLanguageReady?.(active.workspace)
    return () => {
      active.dispose()
      environment.signal?.removeEventListener('abort', lost)
      operations.dispose()
      if (session.current === active) session.current = null
      callbacks.current.onProLanguageReady?.(null)
    }
  }, [
    ready,
    projectId,
    pythonProject,
    environment,
    execution.writerEpoch,
    execution.editingAccess,
    store,
  ])
  useEffect(() => {
    if (tree && entrypoint) session.current?.update()
  }, [tree, entrypoint])
  return (
    <div ref={container} className="flex h-full min-h-0 flex-col">
      {issue && (
        <div role="status" className="flex shrink-0 flex-wrap items-center gap-2 px-3 py-1 text-xs">
          <span>{issue}</span>
          {(environment?.pythonLanguage || environment?.createPythonLanguage) && (
            <button
              type="button"
              className="min-h-8 underline"
              onClick={() => session.current?.retry()}
            >
              Reconectar análise
            </button>
          )}
        </div>
      )}
      <div className="min-h-0 flex-1">
        <MonacoTabs
          {...props}
          indentSize={4}
          onEditorReady={(editor, scope) => {
            setReady((current) =>
              editor && scope
                ? current?.editor === editor && current.prefix === scope.modelPathPrefix
                  ? current
                  : { editor, prefix: scope.modelPathPrefix }
                : null,
            )
            props.onEditorReady?.(editor, scope)
          }}
        />
      </div>
    </div>
  )
}
