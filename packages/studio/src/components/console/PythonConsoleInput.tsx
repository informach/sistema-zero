import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { Button } from '#ui'
import { isPythonProject } from '../../core/editableProject'
import { assertStudioRuntimeOperationAccess } from '../../runtime/registry'
import { useLogsStore } from '../../state/logsStore'
import { useProjectStore } from '../../state/projectStore'
import { usePythonEditorConsole } from '../../state/studioStores'
import { useStudioRuntimeEnvironment } from '../../studio/runtime-environment'

const emptySubscribe = () => () => {}
const noSnapshot = () => null

/** Commands run in the current CPython namespace; they never change saved source files. */
export function PythonConsoleInput() {
  const id = useId()
  const project = useProjectStore((state) => state.project)
  const author = useProjectStore((state) => state.editingAccess === 'author')
  const environment = useStudioRuntimeEnvironment()
  const channel = usePythonEditorConsole()
  const view = useSyncExternalStore(
    channel?.subscribe ?? emptySubscribe,
    channel?.getSnapshot ?? noSnapshot,
    noSnapshot,
  )
  const log = useLogsStore((state) => state.push)
  const [source, setSource] = useState('')
  const [issue, setIssue] = useState<string | null>(null)
  const submission = useRef<object | null>(null)
  const runId = view?.identity?.runId
  // biome-ignore lint/correctness/useExhaustiveDependencies: new owners invalidate pending UI replies, even with unchanged source.
  useEffect(() => {
    submission.current = null
    setIssue(null)
    return () => {
      submission.current = null
    }
  }, [runId, project?.id])
  if (!project || !isPythonProject(project) || project.kind !== 'pro') return null
  let permitted = false
  if (author && environment) {
    try {
      assertStudioRuntimeOperationAccess(
        { project, catalog: environment.catalog, access: environment.access(project) },
        'python-repl',
      )
      permitted = true
    } catch {
      /* The host can disable the REPL independently of running the project. */
    }
  }
  const ready =
    permitted &&
    channel &&
    view?.status === 'completed' &&
    view.identity?.projectId === project.id &&
    runId
  async function send() {
    if (!ready || !channel || !project || !runId || submission.current || !source.trim()) return
    const token = {},
      command = source
    submission.current = token
    setIssue(null)
    log({ source: 'sz-preview', kind: 'info', parts: [`>>> ${command}`], timestamp: Date.now() })
    try {
      await channel.evaluate(project.id, runId, command)
      if (submission.current === token) setSource((current) => (current === command ? '' : current))
    } catch (error) {
      if (
        submission.current === token &&
        !(error instanceof DOMException && error.name === 'AbortError')
      )
        setIssue(error instanceof Error ? error.message : 'Não foi possível executar o comando.')
    } finally {
      if (submission.current === token) submission.current = null
    }
  }
  return (
    <form
      className="shrink-0 space-y-1 border-t border-sz-border-soft px-3 py-2"
      onSubmit={(event) => {
        event.preventDefault()
        void send()
      }}
    >
      <label className="block text-xs text-sz-fg-soft" htmlFor={id}>
        Comando Python
      </label>
      <div className="flex items-end gap-2">
        <textarea
          id={id}
          aria-label="Comando Python"
          value={source}
          maxLength={20_000}
          rows={2}
          spellCheck={false}
          autoComplete="off"
          disabled={!permitted}
          className="min-w-0 flex-1 resize-y rounded border border-sz-border bg-sz-bg p-2 font-mono text-xs text-sz-fg"
          onChange={(event) => setSource(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              event.preventDefault()
              void send()
            }
          }}
        />
        <Button size="sm" type="submit" disabled={!ready || !source.trim()}>
          Executar comando
        </Button>
      </div>
      <p className="m-0 text-xs text-sz-fg-mute">
        {!permitted
          ? 'O console Python não está habilitado nesta tarefa.'
          : ready
            ? 'Ctrl+Enter executa na sessão atual. Reiniciar o jogo limpa os valores do console.'
            : 'Execute o projeto e espere o programa terminar para experimentar comandos Python.'}
      </p>
      {issue && (
        <p role="alert" className="m-0 text-xs text-sz-error">
          {issue}
        </p>
      )}
    </form>
  )
}
