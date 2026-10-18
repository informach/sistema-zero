import {
  assertStudioPythonActivityScope,
  type StudioPythonActivity,
  type StudioPythonActivityFeedback,
  StudioPythonActivitySchema,
  verifyStudioPythonActivityFeedback,
} from '@sistemazero/core/studio/python-activity'
import type { StudioRuntimeInput } from '../types'
import type { PythonRuntimePayload } from './frameProtocol'
import type { PythonExecutionSnapshot, PythonWorkerCommand } from './protocol'
import vendor from './vendor-manifest.json'
import { isPythonRequestId, readPythonWorkerEvent } from './workerEvents'

type Phase =
  | 'booting'
  | 'preparing'
  | 'ready'
  | 'running'
  | 'waiting-input'
  | 'completed'
  | 'failed'
  | 'stopped'

/** Trusted frame boundary. Worker FFI can forge every event, including result and booted. */
export function createPythonWorkerSupervisor(options: {
  worker: Worker
  snapshot: PythonExecutionSnapshot
  activity?: StudioPythonActivity
  onActivityResult?(requestId: string, feedback: StudioPythonActivityFeedback): void
  emit(event: PythonRuntimePayload): void
  onReady(): void
  /** Releases bootstrap URLs and other frame-owned resources, never learner cleanup. */
  onRelease(): void
  graphics?(
    request: string,
    images: { id: number; bytes: Uint8Array<ArrayBuffer> }[],
  ): Promise<string>
}) {
  const { worker } = options
  const activity =
    options.activity === undefined ? undefined : StudioPythonActivitySchema.parse(options.activity)
  if (activity) {
    assertStudioPythonActivityScope(activity, options.snapshot.configuration)
    if (!options.onActivityResult) throw new Error('O canal da tarefa não está disponível.')
  }
  let phase: Phase = 'booting'
  let operation: { kind: 'run' | 'evaluate'; id: string } | undefined
  let inputId: string | undefined
  let windowStart = performance.now()
  let messages = 0
  let consoleChars = 0
  let consoleChunks = 0
  let released = false
  let pendingGraphics: string | undefined
  let activityRequested = false
  let pendingActivity:
    | { id: string; idle: boolean; timer: ReturnType<typeof setTimeout> }
    | undefined
  const bootTimer = setTimeout(
    () => fail('runtime-unavailable', 'O ambiente Python demorou demais para iniciar.'),
    30_000,
  )

  const terminal = () => phase === 'failed' || phase === 'stopped'
  function release() {
    if (released) return
    released = true
    clearTimeout(bootTimer)
    // Invalidate authority first, then disconnect listeners and terminate.
    operation = undefined
    inputId = undefined
    pendingGraphics = undefined
    if (pendingActivity) clearTimeout(pendingActivity.timer)
    pendingActivity = undefined
    worker.removeEventListener('message', message)
    worker.removeEventListener('error', error)
    worker.removeEventListener('messageerror', messageError)
    worker.terminate()
    options.onRelease()
  }
  function fail(code: 'runtime-unavailable' | 'program-error' | 'quota-exceeded', message: string) {
    if (terminal()) return
    phase = 'failed'
    release()
    if (phase === 'failed') options.emit({ type: 'failed', code, message })
  }
  function send(command: PythonWorkerCommand) {
    worker.postMessage(command)
  }
  function state(next: 'ready' | 'running' | 'waiting-input' | 'completed') {
    phase = next
    options.emit({ type: 'state', state: next })
    // A callback may legitimately start the next REPL command. Only terminal
    // revocation cancels delivery from this generation, not state progression.
    return !terminal()
  }
  function error(event: ErrorEvent) {
    event.preventDefault()
    fail('runtime-unavailable', event.message.slice(0, 4000) || 'Falha do worker Python.')
  }
  function messageError() {
    fail('runtime-unavailable', 'Não foi possível ler uma mensagem do interpretador.')
  }
  function message(event: MessageEvent<unknown>) {
    if (terminal()) return
    const now = performance.now()
    if (now - windowStart >= 1000) {
      windowStart = now
      messages = consoleChars = consoleChunks = 0
    }
    if (++messages > 256) {
      fail('quota-exceeded', 'O programa excedeu o limite de mensagens.')
      return
    }
    const value = readPythonWorkerEvent(event.data)
    if (!value) {
      fail('program-error', 'O programa enviou uma mensagem inválida.')
      return
    }
    switch (value.type) {
      case 'activity-result': {
        const pending = pendingActivity
        if (
          !activity ||
          !pending ||
          value.requestId !== pending.id ||
          phase !== 'running' ||
          inputId ||
          pendingGraphics
        )
          break
        let feedback: StudioPythonActivityFeedback
        try {
          feedback = verifyStudioPythonActivityFeedback(value.feedback, activity)
        } catch {
          break
        }
        clearTimeout(pending.timer)
        pendingActivity = undefined
        if (pending.idle && !state('completed')) return
        try {
          options.onActivityResult!(pending.id, feedback)
        } catch {
          fail('runtime-unavailable', 'Não foi possível enviar a correção da tarefa.')
        }
        return
      }
      case 'graphics': {
        if (phase !== 'running' || !options.graphics || pendingGraphics) break
        pendingGraphics = value.requestId
        Promise.resolve()
          .then(() => {
            if (terminal()) return undefined
            return options.graphics!(value.request, value.images)
          })
          .then((response) => {
            if (terminal() || pendingGraphics !== value.requestId) return
            if (typeof response !== 'string' || response.length > 128_000)
              throw new Error('Resposta gráfica inválida.')
            pendingGraphics = undefined
            send({ type: 'graphics-response', requestId: value.requestId, response })
          })
          .catch((error) =>
            fail(
              'program-error',
              error instanceof Error ? error.message.slice(0, 4000) : 'Falha Turtle.',
            ),
          )
        return
      }
      case 'failed':
        fail('runtime-unavailable', value.message)
        return
      case 'console':
        consoleChars += value.batches.reduce((sum, batch) => sum + batch.text.length, 0)
        consoleChunks += value.batches.length
        if (consoleChars > 256_000 || consoleChunks > 512) {
          fail('quota-exceeded', 'O programa excedeu o limite de saída.')
          return
        }
        for (const batch of value.batches) {
          if (terminal()) return
          options.emit({ type: 'console', ...batch })
        }
        return
      case 'booted':
        if (
          phase !== 'booting' ||
          value.pythonVersion !== vendor.pythonVersion ||
          value.pyodideVersion !== vendor.pyodideVersion
        )
          break
        phase = 'preparing'
        try {
          send({ type: 'prepare', snapshot: options.snapshot, ...(activity ? { activity } : {}) })
        } catch {
          fail('runtime-unavailable', 'Não foi possível preparar os arquivos do programa.')
        }
        return
      case 'prepared':
        if (phase !== 'preparing') break
        clearTimeout(bootTimer)
        if (state('ready')) options.onReady()
        return
      case 'input-request':
        if (phase !== 'running' || !operation || inputId || pendingGraphics) break
        inputId = value.requestId
        if (state('waiting-input'))
          options.emit({ type: 'input-request', requestId: value.requestId, prompt: '' })
        return
      case 'result': {
        if (
          phase !== 'running' ||
          !operation ||
          value.requestId !== operation.id ||
          inputId ||
          pendingGraphics
        )
          break
        const kind = operation.kind
        operation = undefined
        if (kind === 'evaluate') {
          if (!state('completed')) return
          options.emit({
            type: 'repl-result',
            requestId: value.requestId,
            status: value.ok ? 'completed' : 'failed',
            text: value.traceback ?? value.text,
          })
        } else if (value.ok) {
          if (pendingActivity) {
            // The program finished before reaching a cooperative checkpoint.
            // The worker grades on the now-idle interpreter, without reentry.
            pendingActivity.idle = true
            state('running')
          } else state('completed')
        } else {
          if (value.traceback)
            options.emit({
              type: 'diagnostic',
              path: options.snapshot.configuration.python.entrypoint,
              line: 0,
              column: 0,
              message: value.text,
              traceback: value.traceback,
            })
          fail('program-error', value.text)
        }
        return
      }
    }
    fail('program-error', 'O interpretador enviou uma mensagem fora de ordem.')
  }
  worker.addEventListener('message', message)
  worker.addEventListener('error', error)
  worker.addEventListener('messageerror', messageError)

  function start(kind: 'run' | 'evaluate', id: string, source?: string) {
    if ((kind === 'run' ? phase !== 'ready' : phase !== 'completed') || !isPythonRequestId(id))
      throw new Error('O interpretador está ocupado ou não está pronto.')
    if (kind === 'evaluate' && (typeof source !== 'string' || source.length > 20_000))
      throw new Error('Comando do console inválido.')
    operation = { kind, id }
    if (!state('running')) throw new Error('A execução foi interrompida.')
    try {
      send(
        kind === 'run'
          ? { type: 'run', requestId: id }
          : { type: 'evaluate', requestId: id, source: source! },
      )
    } catch (error) {
      fail('runtime-unavailable', 'Não foi possível iniciar o comando.')
      throw error
    }
  }
  return {
    get phase() {
      return phase
    },
    run() {
      start('run', 'entrypoint')
    },
    evaluate(requestId: string, source: string) {
      start('evaluate', requestId, source)
    },
    checkActivity(requestId: string) {
      if (
        !activity ||
        activityRequested ||
        !isPythonRequestId(requestId) ||
        (phase !== 'running' && phase !== 'completed') ||
        inputId ||
        (phase === 'running' && operation?.kind !== 'run')
      )
        throw new Error('A tarefa não pode ser corrigida nesta execução.')
      activityRequested = true
      const idle = phase === 'completed'
      pendingActivity = {
        id: requestId,
        idle,
        timer: setTimeout(
          () =>
            fail('program-error', 'O programa não respondeu à correção da tarefa dentro do prazo.'),
          10_000,
        ),
      }
      if (idle && !state('running')) throw new Error('A execução foi interrompida.')
      try {
        send({ type: 'activity-check', requestId })
      } catch (error) {
        fail('runtime-unavailable', 'Não foi possível solicitar a correção da tarefa.')
        throw error
      }
    },
    provideInput(requestId: string, response: StudioRuntimeInput) {
      if (phase !== 'waiting-input' || requestId !== inputId)
        throw new Error('Esta entrada não corresponde à pergunta atual.')
      if (
        !response ||
        (response.kind !== 'eof' &&
          (response.kind !== 'line' ||
            typeof response.text !== 'string' ||
            response.text.length > 4096 ||
            /[\r\n]/.test(response.text)))
      )
        throw new Error('Entrada de texto inválida.')
      inputId = undefined
      if (!state('running')) throw new Error('A execução foi interrompida.')
      try {
        send({
          type: 'input',
          requestId,
          response:
            response.kind === 'eof' ? { kind: 'eof' } : { kind: 'line', text: response.text },
        })
      } catch (error) {
        fail('runtime-unavailable', 'Não foi possível enviar a resposta.')
        throw error
      }
    },
    stop() {
      if (phase === 'stopped') return
      phase = 'stopped'
      release()
      options.emit({ type: 'state', state: 'stopped' })
    },
  }
}
