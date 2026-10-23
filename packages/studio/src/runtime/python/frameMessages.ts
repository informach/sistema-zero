import { isStudioPortablePath } from '@sistemazero/core/studio/project-environment'
import { readStudioRuntimeImage } from '../snapshotImage'
import {
  type PythonFrameMessage,
  type PythonRuntimePayload,
  readPythonExecutionIdentity,
} from './frameProtocol'
import { isPythonRequestId, readPythonWorkerEvent } from './workerEvents'

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length <= max
const integer = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

function readPayload(raw: unknown): PythonRuntimePayload | undefined {
  if (!record(raw)) return
  if (
    raw.type === 'state' &&
    ['ready', 'running', 'waiting-input', 'completed', 'stopped'].includes(raw.state as string)
  )
    return {
      type: 'state',
      state: raw.state as 'ready' | 'running' | 'waiting-input' | 'completed' | 'stopped',
    }
  if (raw.type === 'console') {
    const parsed = readPythonWorkerEvent({ type: 'console', batches: [raw] })
    if (parsed?.type === 'console') return { type: 'console', ...parsed.batches[0]! }
  }
  if (raw.type === 'input-request' && isPythonRequestId(raw.requestId) && text(raw.prompt, 4000))
    return { type: 'input-request', requestId: raw.requestId, prompt: raw.prompt }
  if (
    raw.type === 'repl-result' &&
    isPythonRequestId(raw.requestId) &&
    (raw.status === 'completed' || raw.status === 'failed') &&
    text(raw.text, 16000)
  )
    return { type: 'repl-result', requestId: raw.requestId, status: raw.status, text: raw.text }
  if (
    raw.type === 'diagnostic' &&
    typeof raw.path === 'string' &&
    isStudioPortablePath(raw.path) &&
    integer(raw.line) &&
    integer(raw.column) &&
    text(raw.message, 8000) &&
    text(raw.traceback, 16000)
  )
    return {
      type: 'diagnostic',
      path: raw.path,
      line: raw.line,
      column: raw.column,
      message: raw.message,
      traceback: raw.traceback,
    }
  if (
    raw.type === 'failed' &&
    (raw.code === 'runtime-unavailable' ||
      raw.code === 'package-unavailable' ||
      raw.code === 'program-error' ||
      raw.code === 'quota-exceeded') &&
    text(raw.message, 8000)
  )
    return { type: 'failed', code: raw.code, message: raw.message }
}

/** Host validates even the private frame channel; forwarded data never confers authority. */
export function readPythonFrameMessage(raw: unknown): PythonFrameMessage | undefined {
  if (
    !record(raw) ||
    raw.protocol !== 1 ||
    typeof raw.challenge !== 'string' ||
    !/^[a-f0-9]{64}$/.test(raw.challenge) ||
    !integer(raw.sequence) ||
    raw.sequence === 0
  )
    return
  const identity = readPythonExecutionIdentity(raw.identity)
  if (!identity) return
  const common = {
    protocol: 1 as const,
    challenge: raw.challenge,
    sequence: raw.sequence,
    identity,
  }
  if (raw.type === 'prepared') return { ...common, type: 'prepared' }
  if (raw.type === 'audio-request') {
    const parsed = readPythonWorkerEvent({ ...raw, type: 'audio' })
    if (parsed?.type === 'audio')
      return {
        ...common,
        type: 'audio-request',
        requestId: parsed.requestId,
        request: parsed.request,
      }
    return
  }
  if (raw.type === 'activity-result') {
    const parsed = readPythonWorkerEvent(raw)
    if (parsed?.type === 'activity-result') return { ...common, ...parsed }
    return
  }
  if (
    raw.type === 'ack' &&
    integer(raw.commandId) &&
    raw.commandId > 0 &&
    typeof raw.ok === 'boolean' &&
    (raw.error === undefined || text(raw.error, 4000))
  ) {
    const snapshot = raw.snapshot === null ? null : readStudioRuntimeImage(raw.snapshot)
    if (Object.hasOwn(raw, 'snapshot') && (snapshot === undefined || !raw.ok)) return
    return {
      ...common,
      type: 'ack',
      commandId: raw.commandId,
      ok: raw.ok,
      ...(raw.error === undefined ? {} : { error: raw.error }),
      ...(snapshot === undefined ? {} : { snapshot }),
    }
  }
  if (raw.type === 'event') {
    const event = readPayload(raw.event)
    if (event) return { ...common, type: 'event', event }
  }
}
