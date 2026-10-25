import {
  assertStudioPythonActivityScope,
  type StudioPythonActivity,
  type StudioPythonActivityFeedback,
  StudioPythonActivitySchema,
  verifyStudioPythonActivityFeedback,
} from '@sistemazero/core/studio/python-activity'
import {
  type StudioExecutionIdentity,
  type StudioHostAudioPreference,
  type StudioRuntimeEvent,
  type StudioRuntimeImage,
  type StudioRuntimeSession,
  StudioRuntimeUnavailableError,
} from '../types'
import { createPythonAudioService } from './audio/service'
import { createPythonBootResourceBroker } from './bootResourceBroker'
import { preparePythonBootResourceHost } from './bootResourceHost'
import { readPythonFrameMessage } from './frameMessages'
import {
  type PythonFrameCommand,
  type PythonRuntimePayload,
  samePythonExecutionIdentity,
} from './frameProtocol'
import type { PythonExecutionSnapshot } from './protocol'
import type { PythonSavedFile } from './savedFiles'
import { isPythonRequestId } from './workerEvents'

type Command = PythonFrameCommand extends infer Value
  ? Value extends PythonFrameCommand
    ? Omit<Value, 'protocol' | 'challenge' | 'identity' | 'commandId'>
    : never
  : never

const frameOwners = new WeakMap<HTMLIFrameElement, symbol>()

/** One host-owned iframe and one disposable execution generation. */
export function preparePythonFrameSession(options: {
  frame: HTMLIFrameElement
  frameURL: URL
  identity: StudioExecutionIdentity
  snapshot: PythonExecutionSnapshot
  signal: AbortSignal
  activity?: StudioPythonActivity
  hostAudio?: StudioHostAudioPreference
  /** A file the program saved; the host keeps it for the next run (savedFiles.ts). */
  onSavedFile?(file: PythonSavedFile): void
}): Promise<StudioRuntimeSession> {
  const { frame, signal } = options
  const identity = Object.freeze({ ...options.identity })
  const activity =
    options.activity === undefined ? undefined : StudioPythonActivitySchema.parse(options.activity)
  if (activity) assertStudioPythonActivityScope(activity, options.snapshot.configuration)
  if (signal.aborted)
    return Promise.reject(signal.reason ?? new DOMException('Execução cancelada.', 'AbortError'))
  if (!frame.isConnected)
    return Promise.reject(
      new StudioRuntimeUnavailableError(
        'frame-not-mounted',
        'A área de execução não está disponível.',
      ),
    )
  if (frameOwners.has(frame))
    return Promise.reject(
      new StudioRuntimeUnavailableError(
        'frame-in-use',
        'Encerre a execução anterior antes de reutilizar esta área.',
      ),
    )
  const challenge = [...crypto.getRandomValues(new Uint8Array(32))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  const url = new URL(options.frameURL)
  url.hash = challenge
  const owner = Symbol('python-frame-session')
  frameOwners.set(frame, owner)
  const listeners = new Set<(event: StudioRuntimeEvent) => void>()
  const pending = new Map<
    number,
    {
      capture: boolean
      resolve(snapshot?: StudioRuntimeImage | null): void
      reject(reason: unknown): void
      timer: ReturnType<typeof setTimeout>
    }
  >()
  let port: MessagePort | undefined
  const bootOwner = new AbortController()
  const bootSignal = AbortSignal.any([signal, bootOwner.signal])
  let bootBroker: ReturnType<typeof createPythonBootResourceBroker> | undefined
  let audio: ReturnType<typeof createPythonAudioService> | undefined
  let pendingAudio: string | undefined
  let active = true
  let prepared = false
  let disposed = false
  let closed = false
  let stopPromise: Promise<void> | undefined
  let commandId = 0
  let incomingSequence = 0
  let eventSequence = 0
  let state = 'preparing'
  let inputId: string | undefined
  let commandInFlight = false
  let captureInFlight = false
  let frameWindowStart = performance.now()
  let frameMessages = 0
  let activityRequested = false
  let activityControlsApplied = false
  let activityControlsInFlight = false
  let pendingActivity:
    | {
        requestId: string
        resolve(value: StudioPythonActivityFeedback): void
        reject(reason: unknown): void
        timer: ReturnType<typeof setTimeout>
      }
    | undefined

  return new Promise<StudioRuntimeSession>((resolve, reject) => {
    const preparationTimer = setTimeout(
      () => fail('O ambiente Python demorou demais para iniciar.'),
      35_000,
    )
    function emit(payload: PythonRuntimePayload) {
      const event = { ...payload, identity, sequence: ++eventSequence } as StudioRuntimeEvent
      for (const listener of [...listeners]) {
        if (
          !active &&
          !(payload.type === 'state' && payload.state === 'stopped') &&
          payload.type !== 'failed'
        )
          break
        try {
          listener(event)
        } catch (error) {
          reportError(error)
        }
      }
    }
    function rejectCommands(reason: unknown) {
      for (const waiting of pending.values()) {
        clearTimeout(waiting.timer)
        waiting.reject(reason)
      }
      pending.clear()
      if (pendingActivity) {
        clearTimeout(pendingActivity.timer)
        pendingActivity.reject(reason)
        pendingActivity = undefined
      }
    }
    function cleanup() {
      if (closed) return
      closed = true
      bootOwner.abort(new DOMException('Execução encerrada.', 'AbortError'))
      bootBroker?.dispose()
      audio?.dispose()
      pendingAudio = undefined
      clearTimeout(preparationTimer)
      window.removeEventListener('message', initialize)
      signal.removeEventListener('abort', aborted)
      port?.close()
      port = undefined
      rejectCommands(new DOMException('Execução encerrada.', 'AbortError'))
      if (frameOwners.get(frame) === owner) {
        frameOwners.delete(frame)
        frame.removeAttribute('srcdoc')
        frame.src = 'about:blank'
      }
    }
    function fail(message: string) {
      if (!active) return
      active = false
      state = 'failed'
      const error = new StudioRuntimeUnavailableError('python-frame-failed', message)
      reject(error)
      rejectCommands(error)
      emit({ type: 'failed', code: 'runtime-unavailable', message })
      cleanup()
    }
    function send(
      command: Command,
      timeout = 5000,
    ): Promise<StudioRuntimeImage | null | undefined> {
      if (!port || closed) return Promise.reject(new Error('O canal de execução está fechado.'))
      const id = ++commandId
      return new Promise<StudioRuntimeImage | null | undefined>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id)
          const error = new StudioRuntimeUnavailableError(
            'command-timeout',
            'O ambiente não confirmou o comando.',
          )
          reject(error)
          if (active) fail(error.message)
        }, timeout)
        pending.set(id, { capture: command.type === 'capture', resolve, reject, timer })
        try {
          port!.postMessage({
            ...command,
            protocol: 1,
            challenge,
            identity,
            commandId: id,
          } satisfies PythonFrameCommand)
        } catch (error) {
          clearTimeout(timer)
          pending.delete(id)
          reject(error)
        }
      })
    }
    function receive(event: MessageEvent<unknown>) {
      if (closed) return
      const now = performance.now()
      if (now - frameWindowStart >= 1000) {
        frameWindowStart = now
        frameMessages = 0
      }
      if (++frameMessages > 1000) {
        fail('O ambiente excedeu o limite de mensagens.')
        return
      }
      const message = readPythonFrameMessage(event.data)
      if (
        !message ||
        message.challenge !== challenge ||
        !samePythonExecutionIdentity(message.identity, identity) ||
        message.sequence !== incomingSequence + 1
      ) {
        fail('A mensagem não pertence à execução atual.')
        return
      }
      incomingSequence = message.sequence
      if (message.type === 'ack') {
        const waiting = pending.get(message.commandId)
        if (!waiting) {
          if (active) fail('Confirmação de comando fora de ordem.')
          return
        }
        clearTimeout(waiting.timer)
        pending.delete(message.commandId)
        if (message.ok && waiting.capture !== Object.hasOwn(message, 'snapshot')) {
          waiting.reject(new Error('A confirmação não corresponde ao comando.'))
          fail('A confirmação não corresponde ao comando.')
          return
        }
        if (message.ok) waiting.resolve(message.snapshot)
        else waiting.reject(new Error(message.error ?? 'O comando foi recusado.'))
        return
      }
      if (!active) return
      if (message.type === 'prepared') {
        if (prepared || state !== 'ready') {
          fail('Preparação Python fora de ordem.')
          return
        }
        prepared = true
        clearTimeout(preparationTimer)
        resolve(session)
        return
      }
      if (message.type === 'activity-result') {
        if (!activity || !pendingActivity || message.requestId !== pendingActivity.requestId) {
          fail('Resultado de tarefa fora de ordem.')
          return
        }
        let feedback: StudioPythonActivityFeedback
        try {
          feedback = verifyStudioPythonActivityFeedback(message.feedback, activity)
        } catch {
          fail('O resultado não corresponde à tarefa atual.')
          return
        }
        const waiting = pendingActivity
        pendingActivity = undefined
        clearTimeout(waiting.timer)
        waiting.resolve(feedback)
        return
      }
      if (message.type === 'saved-file') {
        if (!prepared) {
          fail('Arquivo guardado fora da execução atual.')
          return
        }
        try {
          options.onSavedFile?.({ path: message.path, bytes: message.bytes })
        } catch {
          // Keeping the file is best effort: the game goes on without it.
        }
        return
      }
      if (message.type === 'audio-request') {
        if (!prepared || state !== 'running' || pendingAudio) {
          fail('Pedido de áudio fora da execução atual.')
          return
        }
        pendingAudio = message.requestId
        void Promise.resolve()
          .then(async () => {
            if (!active || closed || pendingAudio !== message.requestId) return
            audio ??= createPythonAudioService({
              snapshot: options.snapshot,
              signal: bootSignal,
              onError: (error) => fail(error.message),
              hostAudio: options.hostAudio,
            })
            const response = await audio.exchange(message.request)
            if (!active || closed || pendingAudio !== message.requestId) return
            pendingAudio = undefined
            await send({ type: 'audio-response', requestId: message.requestId, response })
          })
          .catch((error: unknown) => {
            if (active) fail(error instanceof Error ? error.message : 'Falha do áudio Python.')
          })
        return
      }
      const payload = message.event
      if (payload.type === 'state') state = payload.state
      if (payload.type === 'input-request') inputId = payload.requestId
      if (payload.type === 'failed') {
        active = false
        state = 'failed'
        const error = new StudioRuntimeUnavailableError(payload.code, payload.message)
        reject(error)
        rejectCommands(error)
        emit(payload)
        cleanup()
      } else emit(payload)
    }
    async function initialize(event: MessageEvent<unknown>) {
      if (!active || port || event.source !== frame.contentWindow || event.origin !== 'null') return
      const message = event.data
      if (
        !message ||
        typeof message !== 'object' ||
        !('type' in message) ||
        message.type !== 'python-frame-ready' ||
        !('protocol' in message) ||
        message.protocol !== 1 ||
        !('challenge' in message) ||
        message.challenge !== challenge
      )
        return
      if (!('bootResources' in message) || message.bootResources !== 1) {
        fail('Protocolo de carregamento Python incompatível.')
        return
      }
      window.removeEventListener('message', initialize)
      const channel = new MessageChannel()
      port = channel.port1
      port.onmessage = receive
      port.onmessageerror = () => fail('Não foi possível ler a resposta do ambiente.')
      port.start()
      let resourcePort: MessagePort | undefined
      try {
        const result = await bootPreparation
        if (!result.ok) throw result.error
        const host = result.host
        if (!active || closed || bootSignal.aborted) {
          channel.port2.close()
          return
        }
        const resources = new MessageChannel()
        resourcePort = resources.port2
        bootBroker = createPythonBootResourceBroker({
          port: resources.port1,
          manifest: host.manifest,
          store: host.store,
          signal: bootSignal,
          onError: (error) => fail(error.message),
        })
        frame.contentWindow!.postMessage(
          {
            type: 'python-frame-init',
            protocol: 1,
            challenge,
            identity,
            snapshot: options.snapshot,
            ...(activity ? { activity } : {}),
            bootResources: 1,
          },
          '*',
          [channel.port2, resourcePort],
        )
      } catch {
        channel.port2.close()
        resourcePort?.close()
        fail('Não foi possível preparar o canal Python.')
      }
    }
    async function command(value: Command, expectedState: string) {
      if (!active || !prepared || commandInFlight || state !== expectedState)
        throw new Error('O interpretador está ocupado ou não está pronto.')
      commandInFlight = true
      try {
        await send(value)
      } finally {
        commandInFlight = false
      }
    }
    function stop(): Promise<void> {
      if (stopPromise) return stopPromise
      if (!active) {
        cleanup()
        return Promise.resolve()
      }
      // Revoke before any async wait; late frames cannot emit effects again.
      active = false
      bootOwner.abort(new DOMException('Execução interrompida.', 'AbortError'))
      bootBroker?.dispose()
      state = 'stopped'
      inputId = undefined
      reject(new DOMException('Execução cancelada.', 'AbortError'))
      clearTimeout(preparationTimer)
      rejectCommands(new DOMException('Execução interrompida.', 'AbortError'))
      // Reserve the promise before callbacks, which may call stop/dispose again.
      let finish!: () => void
      stopPromise = new Promise<void>((resolve) => {
        finish = resolve
      })
      emit({ type: 'state', state: 'stopped' })
      void (port ? send({ type: 'stop' }, 200) : Promise.resolve())
        .catch(() => {})
        .finally(() => {
          cleanup()
          finish()
        })
      return stopPromise
    }
    function aborted() {
      void stop()
    }
    const session: StudioRuntimeSession = {
      identity,
      playback: { kind: 'stop-only' },
      repl: {
        kind: 'python',
        async evaluate({ requestId, source }) {
          if (!isPythonRequestId(requestId) || typeof source !== 'string' || source.length > 20_000)
            throw new Error('Comando do console inválido.')
          await command({ type: 'evaluate', requestId, source }, 'completed')
        },
      },
      run: () => command({ type: 'run' }, 'ready'),
      ...(activity
        ? {
            async applyPythonActivityControls() {
              if (
                !active ||
                !prepared ||
                activityRequested ||
                activityControlsApplied ||
                activityControlsInFlight ||
                commandInFlight ||
                !['running', 'waiting-input', 'completed'].includes(state)
              )
                throw new Error('Os controles da tarefa não estão disponíveis nesta execução.')
              activityControlsApplied = true
              // Readiness may depend on input(). Keep that independent channel
              // available while the host waits for Turtle's first event-loop turn.
              activityControlsInFlight = true
              try {
                await send({ type: 'activity-controls' }, 12_000)
                if (!active) throw new DOMException('Execução encerrada.', 'AbortError')
              } finally {
                activityControlsInFlight = false
              }
            },
            async checkPythonActivity() {
              if (
                !active ||
                !prepared ||
                activityRequested ||
                activityControlsInFlight ||
                (!!activity.recipe &&
                  !!(activity.recipe.keys.length || activity.recipe.clicks.length) &&
                  !activityControlsApplied) ||
                commandInFlight ||
                (state !== 'running' && state !== 'completed') ||
                inputId
              )
                throw new Error('A tarefa não pode ser corrigida nesta execução.')
              activityRequested = true
              const requestId = `activity-${crypto.randomUUID()}`
              const feedback = new Promise<StudioPythonActivityFeedback>((resolve, reject) => {
                const timer = setTimeout(
                  () => fail('A correção Python não respondeu dentro do prazo.'),
                  12_000,
                )
                pendingActivity = { requestId, resolve, reject, timer }
              })
              try {
                const [, result] = await Promise.all([
                  send({ type: 'activity-check', requestId }),
                  feedback,
                ])
                if (!active) throw new DOMException('Execução encerrada.', 'AbortError')
                return result
              } catch (error) {
                if (pendingActivity) {
                  clearTimeout(pendingActivity.timer)
                  pendingActivity.reject(error)
                  pendingActivity = undefined
                }
                void stop()
                throw error
              }
            },
          }
        : {}),
      async captureSnapshot() {
        if (!active || !prepared || captureInFlight)
          throw new Error('A captura não está disponível nesta execução.')
        captureInFlight = true
        try {
          const snapshot = await send({ type: 'capture' })
          if (!active) throw new DOMException('Execução encerrada.', 'AbortError')
          return snapshot ? { ...snapshot, identity } : null
        } finally {
          captureInFlight = false
        }
      },
      subscribe(listener) {
        if (disposed) return () => {}
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      stop,
      async dispose() {
        if (disposed) return stopPromise
        disposed = true
        await stop()
        listeners.clear()
      },
      async provideInput(requestId, response) {
        if (
          requestId !== inputId ||
          !response ||
          (response.kind !== 'eof' &&
            (response.kind !== 'line' ||
              typeof response.text !== 'string' ||
              response.text.length > 4096 ||
              /[\r\n]/.test(response.text)))
        )
          throw new Error('Entrada de texto inválida.')
        await command(
          {
            type: 'input',
            requestId,
            response:
              response.kind === 'eof' ? { kind: 'eof' } : { kind: 'line', text: response.text },
          },
          'waiting-input',
        )
        if (inputId === requestId) inputId = undefined
      },
    }
    window.addEventListener('message', initialize)
    signal.addEventListener('abort', aborted, { once: true })
    // Public pinned metadata is independent of document loading. Observe failure
    // now, but consume it only after the authenticated hello negotiates this port.
    const bootPreparation = Promise.resolve()
      .then(() =>
        preparePythonBootResourceHost({
          frameURL: new URL('frame.html', url),
          runtimeManifestSha256: identity.runtimeManifestSha256,
          signal: bootSignal,
        }),
      )
      .then(
        (host) => ({ ok: true as const, host }),
        (error: unknown) => ({ ok: false as const, error }),
      )
    frame.removeAttribute('srcdoc')
    // Pro hosts keep COEP; anonymous framing permits this isolated runtime without cookies.
    frame.setAttribute('credentialless', '')
    frame.sandbox.value = 'allow-scripts allow-pointer-lock'
    frame.referrerPolicy = 'no-referrer'
    frame.src = url.href
  })
}
