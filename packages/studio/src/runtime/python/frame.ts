import './configureProtectedSchemas'

import {
  type StudioPythonActivity,
  type StudioPythonActivityFeedback,
  StudioPythonActivitySchema,
} from '@sistemazero/core/studio/python-activity'
import {
  readStudioPythonMissionProbe,
  type StudioPythonMissionFrameObservation,
} from '@sistemazero/core/studio/python-mission-observation'
import { executionKeyEvent, readExecutionKey } from '../../studentTests/keyEvent'
import type { StudioRuntimeImage } from '../types'
import { pythonCanvasExtension } from './canvasExtension'
import { createFramePause } from './framePause'
import {
  isPythonChallenge,
  PYTHON_FRAME_PROTOCOL,
  type PythonFrameMessage,
  type PythonRuntimePayload,
  readPythonExecutionIdentity,
  samePythonExecutionIdentity,
} from './frameProtocol'
import { createPgzeroAudioQueue } from './pgzero/audioQueue'
import type { PgzeroAudioCommand } from './pgzero/protocol'
import type { PgzeroRenderer } from './pgzero/renderer'
import { installPythonPlayerBridge } from './playerBridge'
import { createProtectedPythonWorker } from './protectedWorker'
import type { RaylibRenderer } from './raylib/renderer'
import type { TurtleRenderer } from './turtle/renderer'
import { readPythonWireSnapshot } from './wireSnapshot'
import { isPythonRequestId } from './workerEvents'
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
  let renderer: TurtleRenderer | PgzeroRenderer | RaylibRenderer | undefined
  let rendererReady = false
  let workerReady = false
  let prepared = false
  let activity: StudioPythonActivity | undefined
  let activityControlsApplied = false
  let audioSequence = 0
  let pendingAudio:
    | { id: string; resolve(value: string): void; reject(reason: unknown): void }
    | undefined
  // sz_audio (one request at a time from Python) and Pygame Zero (commands that travel with
  // each frame) share the host's media channel through one ordered queue.
  const audio = createPgzeroAudioQueue({
    send(request) {
      return new Promise<string>((resolve, reject) => {
        if (closed || !prepared) {
          reject(new Error('O canal de áudio não está disponível.'))
          return
        }
        const id = `audio-${++audioSequence}`
        pendingAudio = { id, resolve, reject }
        send({ type: 'audio-request', requestId: id, request })
      })
    },
  })
  const queueAudio = (request: string) => audio.request(request)
  const pgzeroAudio = (commands: readonly PgzeroAudioCommand[], watch: boolean) =>
    audio.pgzero(commands, watch)
  const playerBridge = new AbortController()
  function send(
    message:
      | { type: 'prepared' }
      | { type: 'event'; event: PythonRuntimePayload }
      | { type: 'activity-result'; requestId: string; feedback: StudioPythonActivityFeedback }
      | { type: 'mission-result'; requestId: string; result: StudioPythonMissionFrameObservation }
      | { type: 'audio-request'; requestId: string; request: string }
      | { type: 'saved-file'; path: string; bytes: Uint8Array<ArrayBuffer> | null }
      | {
          type: 'perf'
          slice: { fps: number; frameMsAvg: number; frameMsMax: number; canvas: boolean }
        }
      | { type: 'pause'; held: boolean; frame: number }
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
  /**
   * A aba Desempenho. Com a medida ligada, o quadro olha, a cada quadro da tela, quantos quadros o
   * renderizador já pintou, e manda uma fatia a cada meio segundo: os quadros por segundo e o
   * intervalo entre dois quadros pintados (médio e o maior). Não toca no programa nem no worker,
   * e desligada não custa nada. O programa sem tela (só print e input) manda fatias sem quadros.
   */
  let perf: { frame: number; timer: ReturnType<typeof setInterval> } | null = null
  // A aba Investigar: a pausa na troca de quadro (`framePause.ts`), nos programas que desenham na
  // tela (Turtle, Pygame Zero, pygame-ce e Raylib); o programa sem tela recusa o comando. O Turtle
  // pausa na próxima resposta, e a espera dele é acordada para ela chegar.
  const pause = createFramePause({
    onHeld: (frame) => send({ type: 'pause', held: true, frame }),
  })
  let pausable = false
  let pauseOnAnyReply = false
  const wakeTurtle = () => {
    if (pauseOnAnyReply && renderer && 'requestCheckpoint' in renderer) renderer.requestCheckpoint()
  }
  function stopPerf() {
    if (!perf) return
    cancelAnimationFrame(perf.frame)
    clearInterval(perf.timer)
    perf = null
  }
  function startPerf() {
    stopPerf()
    let painted = renderer?.paintedFrames() ?? 0
    let paintedAt = performance.now()
    let frames = 0
    let total = 0
    let longest = 0
    let sliceStart = performance.now()
    const state = { frame: 0, timer: 0 as unknown as ReturnType<typeof setInterval> }
    const watch = () => {
      const now = performance.now()
      const current = renderer?.paintedFrames() ?? painted
      if (current !== painted) {
        const interval = now - paintedAt
        frames += current - painted
        total += interval
        longest = Math.max(longest, interval)
        painted = current
        paintedAt = now
      }
      state.frame = requestAnimationFrame(watch)
    }
    state.frame = requestAnimationFrame(watch)
    state.timer = setInterval(() => {
      if (!renderer) {
        send({ type: 'perf', slice: { fps: 0, frameMsAvg: 0, frameMsMax: 0, canvas: false } })
        return
      }
      const now = performance.now()
      const seconds = Math.max((now - sliceStart) / 1000, 0.001)
      // Um quadro que ainda não chegou também conta como atraso (o programa parado no meio dele).
      const waiting = now - paintedAt
      send({
        type: 'perf',
        slice: {
          fps: Math.min(1000, frames / seconds),
          frameMsAvg: Math.min(60_000, frames ? total / frames : waiting),
          frameMsMax: Math.min(60_000, Math.max(longest, frames ? 0 : waiting)),
          canvas: true,
        },
      })
      frames = 0
      total = 0
      longest = 0
      sliceStart = now
    }, 500)
    perf = state
  }
  function close() {
    if (closed) return
    closed = true
    stopPerf()
    pause.dispose()
    pendingAudio?.reject(new DOMException('Execução encerrada.', 'AbortError'))
    pendingAudio = undefined
    audio.close()
    playerBridge.abort()
    supervisor?.stop()
    if (!supervisor) bootstrap?.worker.terminate()
    bootstrap?.release()
    disposeRenderer()
    port.close()
    resources.close()
    removeEventListener('pagehide', close)
  }
  function fail(message: string) {
    send({ type: 'event', event: { type: 'failed', code: 'runtime-unavailable', message } })
    close()
  }
  function disposeRenderer() {
    const current = renderer
    renderer = undefined
    current?.dispose()
  }
  function announcePrepared() {
    if (closed || prepared || !workerReady || !rendererReady) return
    if (renderer) {
      try {
        installPythonPlayerBridge({
          parent,
          origin: event.origin,
          signal: playerBridge.signal,
          canvas: () => document.body.querySelector('canvas'),
          capture: async () => (await renderer?.capture()) ?? null,
        })
      } catch {
        fail('Não foi possível preparar os controles do ambiente gráfico Python.')
        return
      }
    }
    prepared = true
    send({ type: 'event', event: { type: 'state', state: 'ready' } })
    send({ type: 'prepared' })
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
      if ('type' in command && command.type === 'stop') {
        // A game is usually stopped, not ended: keep what it saved a moment ago.
        await supervisor?.flushSaved(100)
        supervisor?.stop()
        send({ type: 'ack', commandId: command.commandId, ok: true })
        close()
        return
      }
      if (!supervisor || !('type' in command)) throw new Error('O ambiente ainda não está pronto.')
      if (!prepared) throw new Error('O ambiente ainda não está pronto.')
      if (command.type === 'capture') {
        send({
          type: 'ack',
          commandId: command.commandId,
          ok: true,
          snapshot: (await renderer?.capture()) ?? null,
        })
        return
      }
      if (command.type === 'run') supervisor.run()
      else if (command.type === 'perf' && 'on' in command && typeof command.on === 'boolean') {
        if (command.on) startPerf()
        else stopPerf()
      } else if (command.type === 'pause' && 'on' in command && typeof command.on === 'boolean') {
        if (!pausable) throw new Error('Este programa ainda não pausa pelo Estúdio.')
        pause.set(command.on)
        if (command.on) wakeTurtle()
      } else if (command.type === 'step') {
        if (!pause.step()) throw new Error('O programa não está pausado.')
        wakeTurtle()
      } else if (command.type === 'key' && 'down' in command && typeof command.down === 'boolean') {
        // A tecla do teste chega como a do teclado: no desenho (o Turtle escuta nele) e, subindo,
        // na janela (Pygame Zero, pygame-ce e Raylib). Sem desenho, na janela.
        const key = readExecutionKey('key' in command ? command.key : undefined)
        if (!key) throw new Error('Tecla de teste inválida.')
        const target: EventTarget = document.body.querySelector('canvas') ?? window
        target.dispatchEvent(
          new KeyboardEvent(command.down ? 'keydown' : 'keyup', {
            ...executionKeyEvent(key),
            bubbles: true,
            cancelable: true,
          }),
        )
      } else if (
        command.type === 'audio-response' &&
        'requestId' in command &&
        isPythonRequestId(command.requestId) &&
        pendingAudio?.id === command.requestId &&
        'response' in command &&
        typeof command.response === 'string' &&
        command.response.length <= 2048
      ) {
        const pending = pendingAudio
        pendingAudio = undefined
        pending.resolve(command.response)
      } else if (command.type === 'activity-controls') {
        if (!activity || activityControlsApplied)
          throw new Error('Os controles da tarefa não estão disponíveis nesta execução.')
        activityControlsApplied = true
        const controls = activity.recipe
        if (controls && (controls.keys.length || controls.clicks.length)) {
          if (!renderer || !('prepareActivityControls' in renderer))
            throw new Error('Os controles desta tarefa exigem Turtle.')
          await renderer.prepareActivityControls()
          if (closed) return
          renderer.dispatchActivityControls(controls)
        }
      } else if (command.type === 'mission-observe') {
        if (!('mission' in value) || value.mission !== true)
          throw new Error('Esta execução não oferece observação de missão.')
        if (
          !('requestId' in command) ||
          typeof command.requestId !== 'string' ||
          !('probe' in command)
        )
          throw new Error('A sonda da missão está incompleta.')
        supervisor.observeMission(command.requestId, readStudioPythonMissionProbe(command.probe))
        if (renderer && 'requestCheckpoint' in renderer) renderer.requestCheckpoint()
        // Pausado, a ponte espera num pedido curto: uma volta deixa o ponto de checagem responder.
        pause.wake()
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
        if (renderer && 'requestCheckpoint' in renderer) renderer.requestCheckpoint()
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
    if ('mission' in value && value.mission !== undefined && value.mission !== true)
      throw new Error('Modo de observação inválido.')
    if ('background' in value && value.background !== undefined && value.background !== true)
      throw new Error('Modo de apresentação Python inválido.')
    const focus = !('background' in value && value.background === true)
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
    const canvas = pythonCanvasExtension(snapshot.configuration.extensions)
    pausable = canvas !== undefined
    pauseOnAnyReply = canvas === 'python-turtle'
    rendererReady = !canvas
    const ready = () => {
      document.documentElement.style.height = '100%'
      document.body.style.cssText =
        'margin:0;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#000'
      rendererReady = true
      announcePrepared()
    }
    const rendererFailed = (error: unknown) =>
      fail(
        error instanceof Error
          ? error.message.slice(0, 4000)
          : 'Não foi possível preparar o ambiente gráfico Python.',
      )
    if (canvas === 'python-turtle')
      void import(
        /* @vite-ignore */
        new URL('./turtle-renderer.mjs', import.meta.url).href
      )
        .then((module: typeof import('./turtle/renderer')) => {
          if (closed) return
          renderer = module.createTurtleRenderer(document.body, {
            activityPresentation: !!activity,
            focus,
          })
          ready()
        })
        .catch(rendererFailed)
    else if (canvas === 'python-pgzero' || canvas === 'python-pygame')
      void import(
        /* @vite-ignore */
        new URL('./pgzero-renderer.mjs', import.meta.url).href
      )
        .then((module: typeof import('./pgzero/renderer')) => {
          if (closed) return
          renderer = module.createPgzeroRenderer(document.body, {
            focus,
            name: canvas === 'python-pygame' ? 'Pygame-ce' : 'Pygame Zero',
            ...('mission' in value && value.mission === true ? { mission: true as const } : {}),
            onAudio: pgzeroAudio,
            takeEndedVoices: (limit) => audio.takeEnded(limit),
            onTitle: (title) => {
              if (document.title !== title) document.title = title
            },
          })
          ready()
        })
        .catch(rendererFailed)
    else if (canvas === 'python-raylib-2d' || canvas === 'python-raylib-3d')
      void import(
        /* @vite-ignore */
        new URL('./raylib-renderer.mjs', import.meta.url).href
      )
        .then((module: typeof import('./raylib/renderer')) => {
          if (closed) return
          renderer = module.createRaylibRenderer(document.body, {
            focus,
            onAudio: pgzeroAudio,
            takeEndedVoices: (limit) => audio.takeEnded(limit),
            onTitle: (title) => {
              if (document.title !== title) document.title = title
            },
          })
          ready()
        })
        .catch(rendererFailed)
    bootstrap = createProtectedPythonWorker('execution', resources, canvas ?? null)
    supervisor = createPythonWorkerSupervisor({
      worker: bootstrap.worker,
      snapshot,
      ...('mission' in value && value.mission === true
        ? {
            mission: true as const,
            onMissionResult(requestId, observation) {
              const pose =
                observation.type === 'sprite' &&
                observation.observed.found &&
                observation.observed.objectId !== undefined
                  ? renderer && 'missionPose' in renderer
                    ? renderer.missionPose(observation.observed.objectId)
                    : null
                  : undefined
              send({
                type: 'mission-result',
                requestId,
                result: {
                  observation,
                  ...(observation.type === 'sprite' ? { pose: pose ?? null } : {}),
                },
              })
            },
          }
        : {}),
      ...(activity
        ? {
            activity,
            onActivityResult(requestId: string, feedback: StudioPythonActivityFeedback) {
              send({ type: 'activity-result', requestId, feedback })
            },
          }
        : {}),
      emit(event) {
        // The supervisor may finish first. Keep its initial ready behind the
        // same barrier as the renderer; the host requires ready before prepared.
        if (!prepared && event.type === 'state' && event.state === 'ready') return
        send({ type: 'event', event })
        if (event.type === 'failed') close()
      },
      onReady() {
        bootstrap?.release()
        workerReady = true
        announcePrepared()
      },
      onRelease() {
        bootstrap?.release()
        playerBridge.abort()
        disposeRenderer()
        pendingAudio?.reject(new DOMException('Execução encerrada.', 'AbortError'))
        pendingAudio = undefined
      },
      audio(request) {
        if (!prepared || closed)
          return Promise.reject(new Error('O canal de áudio não está disponível.'))
        return queueAudio(request)
      },
      onSavedFile(path, bytes) {
        send({ type: 'saved-file', path, bytes })
      },
      ...(canvas
        ? {
            graphics: (
              request: string,
              images: { id: number; bytes: Uint8Array<ArrayBuffer> }[],
            ) => {
              const current = renderer
              if (!prepared || !current || closed)
                throw new Error('O ambiente gráfico ainda não está pronto.')
              return pause.exchange(
                request,
                () => current.exchange(request, images),
                () => current.paintedFrames(),
                pauseOnAnyReply,
              )
            },
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
