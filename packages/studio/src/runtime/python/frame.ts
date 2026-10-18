import {
  type StudioPythonActivity,
  type StudioPythonActivityFeedback,
  StudioPythonActivitySchema,
} from '@sistemazero/core/studio/python-activity'
import type { StudioRuntimeImage } from '../types'
import {
  isPythonChallenge,
  PYTHON_FRAME_PROTOCOL,
  type PythonFrameMessage,
  type PythonRuntimePayload,
  readPythonExecutionIdentity,
  samePythonExecutionIdentity,
} from './frameProtocol'
import { installPythonPlayerBridge } from './playerBridge'
import { createProtectedPythonWorker } from './protectedWorker'
import { hasTurtleExtension } from './turtle/contract'
import type { TurtleRenderer } from './turtle/renderer'
import { readPythonWireSnapshot } from './wireSnapshot'
import { createPythonWorkerSupervisor } from './workerSupervisor'

const challenge = location.hash.slice(1)
let initialized = false
async function initialize(event: MessageEvent<unknown>) {
  if (
    initialized ||
    event.source !== parent ||
    event.ports.length !== 2 ||
    !isPythonChallenge(challenge)
  )
    return
  const value = event.data
  if (
    !value ||
    typeof value !== 'object' ||
    !('type' in value) ||
    value.type !== 'python-frame-init' ||
    !('protocol' in value) ||
    value.protocol !== PYTHON_FRAME_PROTOCOL ||
    !('challenge' in value) ||
    value.challenge !== challenge ||
    !('bootResources' in value) ||
    value.bootResources !== 1 ||
    !('identity' in value) ||
    !('snapshot' in value)
  )
    return
  const identity = readPythonExecutionIdentity(value.identity)
  if (!identity) return
  initialized = true
  removeEventListener('message', initialize)
  const port = event.ports[0]!
  const resources = event.ports[1]!
  let sequence = 0
  let commandSequence = 0
  let closed = false
  let supervisor: ReturnType<typeof createPythonWorkerSupervisor> | undefined
  let bootstrap: ReturnType<typeof createProtectedPythonWorker> | undefined
  let renderer: TurtleRenderer | undefined
  let activity: StudioPythonActivity | undefined
  let activityControlsApplied = false
  const playerBridge = new AbortController()
  function send(
    message:
      | { type: 'prepared' }
      | { type: 'event'; event: PythonRuntimePayload }
      | { type: 'activity-result'; requestId: string; feedback: StudioPythonActivityFeedback }
      | {
          type: 'ack'
          commandId: number
          ok: boolean
          error?: string
          snapshot?: StudioRuntimeImage | null
        },
  ) {
    if (closed) return
    const payload: PythonFrameMessage = {
      ...message,
      protocol: PYTHON_FRAME_PROTOCOL,
      challenge,
      identity: identity!,
      sequence: ++sequence,
    }
    port.postMessage(payload)
  }
  function close() {
    if (closed) return
    closed = true
    playerBridge.abort()
    supervisor?.stop()
    if (!supervisor) bootstrap?.worker.terminate()
    bootstrap?.release()
    renderer?.dispose()
    port.close()
    resources.close()
    removeEventListener('pagehide', close)
  }
  function fail(message: string) {
    send({ type: 'event', event: { type: 'failed', code: 'runtime-unavailable', message } })
    close()
  }
  port.onmessageerror = () => fail('Não foi possível ler o comando do estúdio.')
  port.onmessage = async (event: MessageEvent<unknown>) => {
    if (closed) return
    const command = event.data
    if (
      !command ||
      typeof command !== 'object' ||
      !('protocol' in command) ||
      command.protocol !== PYTHON_FRAME_PROTOCOL ||
      !('challenge' in command) ||
      command.challenge !== challenge ||
      !('commandId' in command) ||
      typeof command.commandId !== 'number' ||
      !Number.isSafeInteger(command.commandId) ||
      command.commandId !== commandSequence + 1 ||
      !('identity' in command)
    ) {
      fail('Canal de execução inválido.')
      return
    }
    const incoming = readPythonExecutionIdentity(command.identity)
    if (!incoming || !samePythonExecutionIdentity(incoming, identity!)) {
      fail('O comando pertence a outra execução.')
      return
    }
    commandSequence = command.commandId
    try {
      if (!supervisor || !('type' in command)) throw new Error('O ambiente ainda não está pronto.')
      if (command.type === 'capture') {
        send({
          type: 'ack',
          commandId: command.commandId,
          ok: true,
          snapshot: (await renderer?.capture()) ?? null,
        })
        return
      }
      if (command.type === 'stop') supervisor.stop()
      else if (command.type === 'run') supervisor.run()
      else if (command.type === 'activity-controls') {
        if (!activity || activityControlsApplied)
          throw new Error('Os controles da tarefa não estão disponíveis nesta execução.')
        activityControlsApplied = true
        const controls = activity.recipe
        if (controls && (controls.keys.length || controls.clicks.length)) {
          if (!renderer) throw new Error('Os controles desta tarefa exigem Turtle.')
          await renderer.prepareActivityControls()
          if (closed) return
          renderer.dispatchActivityControls(controls)
        }
      } else if (
        command.type === 'activity-check' &&
        'requestId' in command &&
        typeof command.requestId === 'string'
      ) {
        if (
          activity?.recipe &&
          (activity.recipe.keys.length || activity.recipe.clicks.length) &&
          !activityControlsApplied
        )
          throw new Error('Aplique os controles da tarefa antes da observação.')
        // FIFO: the flag reaches the worker before the resumed graphics response.
        supervisor.checkActivity(command.requestId)
        renderer?.requestCheckpoint()
      } else if (
        command.type === 'evaluate' &&
        'requestId' in command &&
        typeof command.requestId === 'string' &&
        'source' in command &&
        typeof command.source === 'string'
      )
        supervisor.evaluate(command.requestId, command.source)
      else if (
        command.type === 'input' &&
        'requestId' in command &&
        typeof command.requestId === 'string' &&
        'response' in command &&
        command.response &&
        typeof command.response === 'object' &&
        'kind' in command.response
      ) {
        const response = command.response
        if (response.kind === 'eof') supervisor.provideInput(command.requestId, { kind: 'eof' })
        else if (
          response.kind === 'line' &&
          'text' in response &&
          typeof response.text === 'string'
        )
          supervisor.provideInput(command.requestId, { kind: 'line', text: response.text })
        else throw new Error('Entrada inválida.')
      } else throw new Error('Comando de execução inválido.')
      send({ type: 'ack', commandId: command.commandId, ok: true })
      if (command.type === 'stop') close()
    } catch (error) {
      send({
        type: 'ack',
        commandId: command.commandId,
        ok: false,
        error:
          error instanceof Error ? error.message.slice(0, 4000) : 'Falha ao executar o comando.',
      })
    }
  }
  addEventListener('pagehide', close, { once: true })
  port.start()
  try {
    activity =
      'activity' in value && value.activity !== undefined
        ? StudioPythonActivitySchema.parse(value.activity)
        : undefined
    const snapshot = readPythonWireSnapshot(value.snapshot)
    if (
      snapshot.projectId !== identity.projectId ||
      snapshot.revision !== identity.revision ||
      snapshot.configuration.runtime.manifestSha256 !== identity.runtimeManifestSha256
    )
      throw new Error('O snapshot pertence a outra execução.')
    if (hasTurtleExtension(snapshot.configuration.extensions)) {
      const module: typeof import('./turtle/renderer') = await import(
        /* @vite-ignore */
        new URL('./turtle-renderer.mjs', import.meta.url).href
      )
      if (closed) return
      document.documentElement.style.height = '100%'
      document.body.style.cssText =
        'margin:0;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden'
      renderer = module.createTurtleRenderer(document.body, { activityPresentation: !!activity })
      installPythonPlayerBridge({
        parent,
        origin: event.origin,
        signal: playerBridge.signal,
        canvas: () => document.body.querySelector('canvas'),
        capture: async () => (await renderer?.capture()) ?? null,
      })
    }
    bootstrap = createProtectedPythonWorker(
      'execution',
      resources,
      hasTurtleExtension(snapshot.configuration.extensions),
    )
    supervisor = createPythonWorkerSupervisor({
      worker: bootstrap.worker,
      snapshot,
      ...(activity
        ? {
            activity,
            onActivityResult(requestId: string, feedback: StudioPythonActivityFeedback) {
              send({ type: 'activity-result', requestId, feedback })
            },
          }
        : {}),
      emit(event) {
        send({ type: 'event', event })
        if (event.type === 'failed') close()
      },
      onReady() {
        bootstrap?.release()
        send({ type: 'prepared' })
      },
      onRelease() {
        bootstrap?.release()
        renderer?.dispose()
      },
      ...(renderer
        ? {
            graphics: (request: string, images: { id: number; bytes: Uint8Array<ArrayBuffer> }[]) =>
              renderer!.exchange(request, images),
          }
        : {}),
    })
  } catch (error) {
    fail(
      error instanceof Error
        ? error.message.slice(0, 4000)
        : 'Não foi possível preparar o ambiente Python.',
    )
  }
}
if (parent !== window && isPythonChallenge(challenge)) {
  addEventListener('message', initialize)
  parent.postMessage(
    { type: 'python-frame-ready', protocol: PYTHON_FRAME_PROTOCOL, challenge, bootResources: 1 },
    '*',
  )
}
