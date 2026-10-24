import './configureProtectedSchemas'

import { StudioPythonActivitySchema } from '@sistemazero/core/studio/python-activity'
import { isPythonCanvasExtension, type PythonCanvasExtension } from './canvasExtension'
import { createPythonConsoleBuffer } from './consoleBuffer'
import { createPythonInterpreter, PYODIDE_VERSION, PYTHON_VERSION } from './interpreter'
import {
  PYTHON_CONSOLE_LIMITS,
  PYTHON_GRAPHICS_REPLY_LIMITS,
  type PythonGraphicsReply,
  type PythonWorkerEvent,
} from './protocol'
import { readPythonWireSnapshot } from './wireSnapshot'

const post = globalThis.postMessage.bind(globalThis)
const send = (event: PythonWorkerEvent) => post(event)
const output = createPythonConsoleBuffer()
let flushTimer: ReturnType<typeof setTimeout> | undefined
let phase: 'booting' | 'booted' | 'preparing' | 'prepared' | 'running' | 'completed' | 'failed' =
  'booting'
let pendingInput: { id: string; resolve(value: string): void } | undefined
let inputSequence = 0
let graphicsSequence = 0
let pendingGraphics: { id: string; resolve(value: PythonGraphicsReply): void } | undefined
let audioSequence = 0
let pendingAudio: { id: string; resolve(value: string): void } | undefined
let activityRequest: string | undefined
let activityFinished = false
let hasActivity = false
let missionRequest: string | undefined
const requestId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value)
// Another message can invalidate the execution while Python is suspended.
const hasFailed = () => phase === 'failed'

function flush() {
  clearTimeout(flushTimer)
  flushTimer = undefined
  const batches = output.drain()
  if (batches.length) send({ type: 'console', batches })
}
function scheduleOutput() {
  if (flushTimer === undefined)
    flushTimer = setTimeout(flush, PYTHON_CONSOLE_LIMITS.flushIntervalMs)
}
function failure(error: unknown) {
  phase = 'failed'
  flush()
  send({
    type: 'failed',
    message:
      error instanceof Error ? error.message.slice(0, 4000) : 'Falha do interpretador Python.',
  })
}

let bootStarted = false

/** Module evaluation is inert; the private bootstrap configures its reader before starting once. */
export async function startPythonWorker(options: { canvas?: PythonCanvasExtension | null }) {
  if (bootStarted) throw new Error('O worker Python já foi iniciado.')
  bootStarted = true
  if (
    !options ||
    typeof options !== 'object' ||
    Reflect.ownKeys(options).some((key) => key !== 'canvas') ||
    (options.canvas !== undefined &&
      options.canvas !== null &&
      !isPythonCanvasExtension(options.canvas))
  )
    throw new Error('Configuração inicial do worker Python inválida.')
  try {
    const interpreter = await createPythonInterpreter({
      startupCanvas: options.canvas,
      onBootLine(stream, text) {
        output.append(stream, `${text}\n`)
        scheduleOutput()
      },
      write(stream, bytes) {
        const consumed = output.write(stream, bytes)
        scheduleOutput()
        return consumed
      },
      requestLine() {
        if (phase !== 'running' || pendingInput || pendingAudio || pendingGraphics)
          return Promise.reject(new Error('Entrada fora de uma execução ativa.'))
        flush()
        return new Promise((resolve) => {
          const id = `input-${++inputSequence}`
          pendingInput = { id, resolve }
          send({ type: 'input-request', requestId: id })
        })
      },
      graphics(request, images) {
        if (phase !== 'running' || pendingGraphics || pendingAudio || pendingInput)
          return Promise.reject(new Error('Atualização gráfica fora de ordem.'))
        return new Promise((resolve) => {
          const id = `graphics-${++graphicsSequence}`
          pendingGraphics = { id, resolve }
          post({ type: 'graphics', requestId: id, request, images } satisfies PythonWorkerEvent, {
            transfer: images.map((image) => image.bytes.buffer),
          })
        })
      },
      audio(request) {
        if (phase !== 'running' || pendingAudio || pendingGraphics || pendingInput)
          return Promise.reject(new Error('Pedido de áudio fora de ordem.'))
        return new Promise((resolve) => {
          const id = `audio-${++audioSequence}`
          pendingAudio = { id, resolve }
          send({ type: 'audio', requestId: id, request })
        })
      },
      activityRequested: () => activityRequest !== undefined && !activityFinished,
      onActivityResult(feedback) {
        if (!activityRequest || activityFinished || phase !== 'running')
          throw new Error('Resultado de tarefa fora de ordem.')
        activityFinished = true
        flush()
        send({ type: 'activity-result', requestId: activityRequest, feedback })
      },
      onMissionResult(observation) {
        if (!missionRequest || hasFailed()) throw new Error('Observação de missão fora de ordem.')
        const requestId = missionRequest
        missionRequest = undefined
        flush()
        send({ type: 'mission-result', requestId, observation })
      },
    })
    addEventListener('message', async (event: MessageEvent<unknown>) => {
      if (phase === 'failed') return
      const message = event.data
      try {
        if (!message || typeof message !== 'object' || !('type' in message))
          throw new Error('Comando Python inválido.')
        if (message.type === 'audio-response') {
          if (
            !pendingAudio ||
            !('requestId' in message) ||
            message.requestId !== pendingAudio.id ||
            !('response' in message) ||
            typeof message.response !== 'string' ||
            message.response.length > 2048
          )
            throw new Error('Resposta de áudio fora de ordem.')
          const pending = pendingAudio
          pendingAudio = undefined
          pending.resolve(message.response)
          return
        }
        if (message.type === 'graphics-response') {
          if (
            !pendingGraphics ||
            !('requestId' in message) ||
            message.requestId !== pendingGraphics.id ||
            !('response' in message) ||
            typeof message.response !== 'string' ||
            message.response.length > PYTHON_GRAPHICS_REPLY_LIMITS.textChars
          )
            throw new Error('Resposta gráfica fora de ordem.')
          const bytes = 'bytes' in message ? message.bytes : undefined
          if (
            bytes !== undefined &&
            (!(bytes instanceof Uint8Array) ||
              !(bytes.buffer instanceof ArrayBuffer) ||
              bytes.byteLength > PYTHON_GRAPHICS_REPLY_LIMITS.bytes)
          )
            throw new Error('Resposta gráfica fora de ordem.')
          const pending = pendingGraphics
          pendingGraphics = undefined
          pending.resolve(
            bytes === undefined
              ? message.response
              : { text: message.response, bytes: bytes as Uint8Array<ArrayBuffer> },
          )
          return
        }
        if (message.type === 'input') {
          if (
            !('requestId' in message) ||
            message.requestId !== pendingInput?.id ||
            !pendingInput ||
            !('response' in message)
          )
            throw new Error('Esta entrada não corresponde à pergunta atual.')
          const response = message.response
          if (!response || typeof response !== 'object' || !('kind' in response))
            throw new Error('Entrada de texto inválida.')
          let line: string | null
          if (response.kind === 'eof') line = null
          else if (
            response.kind === 'line' &&
            'text' in response &&
            typeof response.text === 'string' &&
            response.text.length <= 4096 &&
            !/[\r\n]/.test(response.text)
          )
            line = response.text
          else throw new Error('Entrada de texto inválida.')
          const input = pendingInput
          pendingInput = undefined
          input.resolve(JSON.stringify({ line }))
          return
        }
        if (message.type === 'prepare') {
          if (phase !== 'booted' || !('snapshot' in message))
            throw new Error('Preparação Python fora de ordem.')
          phase = 'preparing'
          const activity =
            'activity' in message && message.activity !== undefined
              ? StudioPythonActivitySchema.parse(message.activity)
              : undefined
          hasActivity = activity !== undefined
          if ('mission' in message && message.mission !== undefined && message.mission !== true)
            throw new Error('Modo de observação Python inválido.')
          await interpreter.prepare(
            readPythonWireSnapshot(message.snapshot),
            activity,
            'mission' in message && message.mission === true,
          )
          if (hasFailed()) return
          phase = 'prepared'
          send({ type: 'prepared' })
          return
        }
        if (!('requestId' in message) || !requestId(message.requestId))
          throw new Error('Comando sem identificação válida.')
        const id = message.requestId
        if (message.type === 'mission-observe') {
          if (
            missionRequest ||
            !('probe' in message) ||
            !['running', 'completed'].includes(phase) ||
            pendingInput ||
            (activityRequest && !activityFinished)
          )
            throw new Error('A missão não pode ser observada agora.')
          interpreter.requestMission(message.probe)
          missionRequest = id
          if (phase === 'completed') {
            phase = 'running'
            await interpreter.flushMission()
            if (!hasFailed()) phase = 'completed'
          }
          return
        }
        if (message.type === 'activity-check') {
          if (
            !hasActivity ||
            activityRequest ||
            pendingInput ||
            !['running', 'completed'].includes(phase)
          )
            throw new Error('Esta execução não pode corrigir a tarefa agora.')
          activityRequest = id
          if (phase === 'completed') {
            phase = 'running'
            await interpreter.checkActivity()
            if (hasFailed()) return
            phase = 'completed'
          }
          // A running Turtle program observes this flag from its own Python flow.
          // Never call the interpreter while execute.callPromising is suspended.
          return
        }
        if (message.type === 'run' && phase === 'prepared') {
          phase = 'running'
          const result = await interpreter.run()
          flush()
          if (hasFailed()) return
          phase = result.ok ? 'completed' : 'failed'
          send({ type: 'result', requestId: id, ...result })
          if (result.ok && interpreter.hasPendingMission) {
            phase = 'running'
            await interpreter.flushMission()
            if (hasFailed()) return
            phase = 'completed'
          }
          if (result.ok && activityRequest && !activityFinished) {
            phase = 'running'
            await interpreter.checkActivity()
            if (hasFailed()) return
            phase = 'completed'
          }
          return
        }
        if (
          message.type === 'evaluate' &&
          phase === 'completed' &&
          'source' in message &&
          typeof message.source === 'string' &&
          message.source.length <= 20_000
        ) {
          phase = 'running'
          const result = await interpreter.evaluate(message.source)
          flush()
          if (hasFailed()) return
          phase = 'completed'
          send({ type: 'result', requestId: id, ...result })
          return
        }
        throw new Error('O interpretador está ocupado ou o comando não está disponível.')
      } catch (error) {
        failure(error)
      }
    })
    phase = 'booted'
    flush()
    send({ type: 'booted', pythonVersion: PYTHON_VERSION, pyodideVersion: PYODIDE_VERSION })
  } catch (error) {
    failure(error)
  }
}
