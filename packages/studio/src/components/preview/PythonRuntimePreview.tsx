import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Button } from '#ui'
import type { PythonProjectDocument } from '../../core/editableProject'
import type { StudioRuntimeCapture } from '../../runtime/capture'
import type { StudioRuntimeEnvironment } from '../../runtime/environment'
import { pythonProjectNeedsAudioGesture } from '../../runtime/python/audio/activation'
import { isPythonCanvasExtension } from '../../runtime/python/canvasExtension'
import {
  createPythonExecutionController,
  type PythonExecutionController,
  type PythonExecutionView,
} from '../../runtime/python/controller'
import type { StudioRuntimeEvent } from '../../runtime/types'

export interface PythonRuntimePreviewProps {
  project: PythonProjectDocument
  environment: StudioRuntimeEnvironment | null
  canExecute: boolean
  muted?: boolean
  canExecuteNow?(): boolean
  autoRun?: boolean
  writerEpoch?: number | null
  capture?: StudioRuntimeCapture | null
  /** Allows a synchronous editor-buffer flush before capturing the run document. */
  beforeRun?(): void
  currentProject?(): PythonProjectDocument | null
  onEvent?(event: StudioRuntimeEvent): void
  onRunningChange?(running: boolean): void
  /** Editor-only command bridge; the public player does not expose an authoring console. */
  onControllerReady?(controller: PythonExecutionController | null): void
}

const idle: PythonExecutionView = { status: 'idle' }
const idleSnapshot = () => idle
const emptySubscribe = () => () => {}
const statusLabels: Record<PythonExecutionView['status'], string> = {
  idle: 'Pronto para executar',
  loading: 'Preparando Python…',
  ready: 'Iniciando…',
  running: 'Executando',
  'waiting-input': 'Esperando sua resposta',
  paused: 'Pausado',
  completed: 'Programa concluído',
  stopped: 'Parado',
  failed: 'Não foi possível executar',
}
const executing = (status: PythonExecutionView['status']) =>
  ['loading', 'ready', 'running', 'waiting-input', 'paused'].includes(status)
const isCancelled = (error: unknown) => error instanceof DOMException && error.name === 'AbortError'

/** The same isolated surface is used in an editor and on the public play page. */
export function PythonRuntimePreview(props: PythonRuntimePreviewProps) {
  const root = useRef<HTMLDivElement>(null)
  const mount = useRef<HTMLDivElement>(null)
  const latest = useRef(props)
  const [controller, setController] = useState<PythonExecutionController | null>(null)
  const currentController = useRef<PythonExecutionController | null>(null)
  const inputSubmission = useRef<object | null>(null)
  const [sendingInput, setSendingInput] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const focusOnReady = useRef(false)
  const view = useSyncExternalStore(
    controller?.subscribe ?? emptySubscribe,
    controller?.getSnapshot ?? idleSnapshot,
    idleSnapshot,
  )

  useLayoutEffect(() => {
    latest.current = props
    currentController.current?.syncAudioPreference()
  })
  useLayoutEffect(() => {
    const instance = createPythonExecutionController({
      instanceId: crypto.randomUUID(),
      project: () =>
        latest.current.currentProject ? latest.current.currentProject() : latest.current.project,
      environment: () => latest.current.environment,
      canExecute: () => latest.current.canExecute && (latest.current.canExecuteNow?.() ?? true),
      writerEpoch: () => latest.current.writerEpoch ?? null,
      audioMuted: () => latest.current.muted ?? false,
      onEvent: (event) => latest.current.onEvent?.(event),
      mountFrame: () => {
        if (!mount.current) throw new Error('A área de execução foi fechada.')
        const frame = document.createElement('iframe')
        frame.title = 'Pré-visualização Python'
        frame.className = 'h-full w-full flex-1 border-0 bg-white'
        // The provider adds the sandbox and approved origin before loading any runtime bytes.
        mount.current.append(frame)
        return { frame, release: () => frame.remove() }
      },
    })
    currentController.current = instance
    setController(instance)
    return () => {
      if (currentController.current === instance) currentController.current = null
      void instance.dispose()
    }
  }, [])

  useLayoutEffect(() => {
    props.onControllerReady?.(controller)
    return () => props.onControllerReady?.(null)
  }, [controller, props.onControllerReady])

  // Permission/environment/owner changes revoke the old generation before passive effects.
  // biome-ignore lint/correctness/useExhaustiveDependencies: these host values are the invalidation keys of a running generation.
  useLayoutEffect(() => {
    if (controller) void controller.stop()
  }, [controller, props.project.id, props.environment, props.canExecute, props.writerEpoch])

  useEffect(() => {
    if (!controller || !props.capture) return
    return props.capture.register({
      identity: () => controller.getSnapshot().identity,
      capture: () => controller.capture(),
    })
  }, [controller, props.capture])

  // biome-ignore lint/correctness/useExhaustiveDependencies: only a new owner/project may auto-start; editing source must not restart the game.
  useEffect(() => {
    if (!controller || !props.autoRun || !props.canExecute || !props.environment) return
    if (pythonProjectNeedsAudioGesture(latest.current.project)) return
    try {
      latest.current.beforeRun?.()
    } catch (cause) {
      setError(String(cause))
      return
    }
    setError(null)
    // The controller publishes only the current generation's error. An old rejected Run must not overwrite it.
    void controller.run().catch(() => {})
    // Source edits do not restart a game while it is being played.
  }, [
    controller,
    props.project.id,
    props.environment,
    props.canExecute,
    props.autoRun,
    props.writerEpoch,
  ])

  useEffect(() => {
    latest.current.onRunningChange?.(executing(view.status))
  }, [view.status])
  // biome-ignore lint/correctness/useExhaustiveDependencies: each input request starts a fresh response, even when state remains waiting-input.
  useEffect(() => {
    setInput('')
    inputSubmission.current = null
    setSendingInput(false)
    if (view.status === 'running' && focusOnReady.current) {
      focusOnReady.current = false
      mount.current?.querySelector('iframe')?.focus()
    }
  }, [view.status, view.input?.requestId])

  // Turtle, Pygame Zero, Pygame-ce and the Raylib extensions draw on the execution canvas.
  const hasTurtle = props.project.installedExtensions.some((extension) =>
    isPythonCanvasExtension(extension.id),
  )
  useEffect(() => {
    const capture = props.capture
    if (
      !controller ||
      !capture ||
      !hasTurtle ||
      !view.identity ||
      !['running', 'completed', 'waiting-input'].includes(view.status)
    )
      return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const collect = async () => {
      try {
        if (document.visibilityState !== 'hidden') {
          const snapshot = await controller.capture()
          if (!cancelled && snapshot) capture.remember(snapshot)
        }
      } catch {
        /* Stop or a new owner invalidates pending capture. */
      }
      if (!cancelled) timer = setTimeout(collect, 15_000)
    }
    timer = setTimeout(collect, view.status === 'completed' ? 0 : 2_000)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [controller, props.capture, hasTurtle, view.identity, view.status])

  function run() {
    if (!controller) return
    try {
      latest.current.beforeRun?.()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível preparar o código.')
      return
    }
    focusOnReady.current = true
    setError(null)
    void controller.run().catch(() => {})
  }
  function sendInput(eof = false) {
    if (!controller || !view.input || inputSubmission.current) return
    const requestId = view.input.requestId
    const runId = view.identity?.runId
    const submission = {}
    inputSubmission.current = submission
    setSendingInput(true)
    setError(null)
    void controller
      .input(requestId, eof ? { kind: 'eof' } : { kind: 'line', text: input })
      .catch((cause: unknown) => {
        const current = controller.getSnapshot()
        if (
          currentController.current === controller &&
          current.identity?.runId === runId &&
          current.input?.requestId === requestId &&
          !isCancelled(cause)
        )
          setError(cause instanceof Error ? cause.message : 'Não foi possível enviar a resposta.')
      })
      .finally(() => {
        if (currentController.current === controller && inputSubmission.current === submission) {
          inputSubmission.current = null
          setSendingInput(false)
        }
      })
  }
  const previous = view.project
  const stale =
    previous &&
    (previous.files !== props.project.files ||
      previous.tree !== props.project.tree ||
      previous.assets !== props.project.assets ||
      previous.python !== props.project.python ||
      previous.runtime !== props.project.runtime ||
      previous.installedExtensions !== props.project.installedExtensions)
  return (
    <div
      ref={root}
      className="relative flex h-full min-h-0 flex-col bg-sz-bg"
      data-python-status={view.status}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-sz-border bg-sz-panel px-2 py-1">
        <Button
          size="sm"
          variant="primary"
          data-live-target="studio-run"
          disabled={
            !controller || !props.canExecute || !props.environment || view.status === 'loading'
          }
          onClick={run}
        >
          {view.identity ? 'Reiniciar' : 'Executar'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          data-live-target="studio-stop"
          disabled={!controller || (!view.identity && !executing(view.status))}
          onClick={() => {
            setError(null)
            void controller?.stop()
          }}
        >
          Parar
        </Button>
        <span className="min-w-0 flex-1 px-1 text-xs text-sz-fg-soft" role="status">
          {statusLabels[view.status]}
        </span>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Abrir prévia em tela cheia"
          onClick={() => {
            void root.current
              ?.requestFullscreen?.()
              .catch(() => setError('A tela cheia não está disponível neste navegador.'))
          }}
        >
          ⛶
        </Button>
      </div>
      {stale && (
        <p className="m-0 border-b border-sz-border px-3 py-1 text-xs text-sz-fg-soft">
          Seu código mudou. Clique em Reiniciar para executar a nova versão.
        </p>
      )}
      {(error ?? view.error) && (
        <p role="alert" className="m-0 border-b border-sz-border px-3 py-2 text-sm">
          {error ?? view.error}
        </p>
      )}
      {!props.environment && (
        <p className="px-3 text-sm text-sz-fg-soft">
          O ambiente Python ainda não está disponível nesta página.
        </p>
      )}
      <div ref={mount} className="flex min-h-0 flex-1 overflow-hidden bg-white" />
      {view.input && (
        <form
          className="flex flex-wrap items-center gap-2 border-t border-sz-border bg-sz-panel p-2"
          onSubmit={(event) => {
            event.preventDefault()
            sendInput()
          }}
        >
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
            {view.input.prompt || 'Digite sua resposta'}
            <input
              autoComplete="off"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-w-0 rounded border border-sz-border bg-sz-bg px-2 py-1 text-sz-fg"
            />
          </label>
          <Button size="sm" type="submit" disabled={sendingInput}>
            Enviar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            type="button"
            disabled={sendingInput}
            onClick={() => sendInput(true)}
            title="Encerra a entrada de texto (EOF), sem parar o programa"
          >
            Encerrar entrada
          </Button>
        </form>
      )}
    </div>
  )
}
