import { StudioPythonActivityFeedbackSchema } from '@sistemazero/core/studio/python-activity'
import { readStudioPythonMissionObservation } from '@sistemazero/core/studio/python-mission-observation'
import { readPythonAudioRequest } from './audio/contract'
import { PYTHON_CONSOLE_LIMITS, type PythonConsoleBatch, type PythonWorkerEvent } from './protocol'

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length <= max
export const isPythonRequestId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value)
const count = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

/** Copy a bounded subset; never forward objects or arbitrary fields from the worker. */
export function readPythonWorkerEvent(raw: unknown): PythonWorkerEvent | undefined {
  if (!record(raw)) return
  switch (raw.type) {
    case 'mission-result': {
      if (!isPythonRequestId(raw.requestId)) return
      try {
        return {
          type: 'mission-result',
          requestId: raw.requestId,
          observation: readStudioPythonMissionObservation(raw.observation),
        }
      } catch {
        return
      }
    }
    case 'audio': {
      if (!isPythonRequestId(raw.requestId)) return
      try {
        readPythonAudioRequest(raw.request)
      } catch {
        return
      }
      return { type: 'audio', requestId: raw.requestId, request: raw.request as string }
    }
    case 'activity-result': {
      if (
        !isPythonRequestId(raw.requestId) ||
        !record(raw.feedback) ||
        !Array.isArray(raw.feedback.results) ||
        raw.feedback.results.length > 50
      )
        return
      const parsed = StudioPythonActivityFeedbackSchema.safeParse(raw.feedback)
      if (parsed.success)
        return { type: 'activity-result', requestId: raw.requestId, feedback: parsed.data }
      return
    }
    case 'graphics': {
      if (
        !isPythonRequestId(raw.requestId) ||
        !text(raw.request, 2_000_000) ||
        !Array.isArray(raw.images) ||
        raw.images.length > 128
      )
        return
      let total = 0
      const images: { id: number; bytes: Uint8Array<ArrayBuffer> }[] = []
      const ids = new Set<number>()
      for (const entry of raw.images) {
        if (
          !record(entry) ||
          // Id 0 is legal: Pygame Zero sends its draw list as attachment 0.
          !count(entry.id) ||
          ids.has(entry.id) ||
          !(entry.bytes instanceof Uint8Array) ||
          !(entry.bytes.buffer instanceof ArrayBuffer) ||
          entry.bytes.byteLength > 16 * 1024 * 1024
        )
          return
        total += entry.bytes.byteLength
        if (total > 32 * 1024 * 1024) return
        ids.add(entry.id)
        images.push({ id: entry.id, bytes: entry.bytes as Uint8Array<ArrayBuffer> })
      }
      return { type: 'graphics', requestId: raw.requestId, request: raw.request, images }
    }
    case 'booted':
      if (text(raw.pythonVersion, 32) && text(raw.pyodideVersion, 32))
        return {
          type: 'booted',
          pythonVersion: raw.pythonVersion,
          pyodideVersion: raw.pyodideVersion,
        }
      return
    case 'prepared':
      return { type: 'prepared' }
    case 'input-request':
      if (isPythonRequestId(raw.requestId))
        return { type: 'input-request', requestId: raw.requestId }
      return
    case 'result':
      if (
        !isPythonRequestId(raw.requestId) ||
        typeof raw.ok !== 'boolean' ||
        !text(raw.text, 8000) ||
        (raw.traceback !== undefined && !text(raw.traceback, 16000))
      )
        return
      return {
        type: 'result',
        requestId: raw.requestId,
        ok: raw.ok,
        text: raw.text,
        ...(raw.traceback === undefined ? {} : { traceback: raw.traceback }),
      }
    case 'failed':
      if (text(raw.message, 4000)) return { type: 'failed', message: raw.message }
      return
    case 'console': {
      if (
        !Array.isArray(raw.batches) ||
        raw.batches.length > PYTHON_CONSOLE_LIMITS.retainedChunks + 2
      )
        return
      const batches: PythonConsoleBatch[] = []
      let chars = 0
      for (const batch of raw.batches) {
        if (
          !record(batch) ||
          (batch.stream !== 'stdout' && batch.stream !== 'stderr') ||
          !text(batch.text, PYTHON_CONSOLE_LIMITS.batchChars) ||
          !count(batch.omittedLines) ||
          !count(batch.omittedChars) ||
          batch.omittedLines > batch.omittedChars
        )
          return
        chars += batch.text.length
        if (chars > PYTHON_CONSOLE_LIMITS.retainedChars) return
        batches.push({
          stream: batch.stream,
          text: batch.text,
          omittedLines: batch.omittedLines,
          omittedChars: batch.omittedChars,
        })
      }
      return { type: 'console', batches }
    }
  }
}
