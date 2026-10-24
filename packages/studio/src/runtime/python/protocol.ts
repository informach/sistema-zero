import type {
  StudioPythonProjectConfig,
  StudioRuntimeSelection,
} from '@sistemazero/core/studio/project-environment'
import type {
  StudioPythonActivity,
  StudioPythonActivityFeedback,
} from '@sistemazero/core/studio/python-activity'

/** Temporary execution filesystem. It never represents a persistence command. */
export interface PythonExecutionSnapshot {
  version: 1
  projectId: string
  revision: string
  configuration: {
    runtime: StudioRuntimeSelection
    extensions: { id: string; version: string }[]
    python: StudioPythonProjectConfig
  }
  directories: string[]
  files: {
    path: string
    kind: 'source' | 'asset'
    sha256: string
    bytes: Uint8Array<ArrayBuffer>
  }[]
}

export type PythonConsoleStream = 'stdout' | 'stderr'
export interface PythonConsoleBatch {
  stream: PythonConsoleStream
  text: string
  omittedLines: number
  /** UTF-16 units discarded, including output with no newline at all. */
  omittedChars: number
}

/** Limits are applied inside the worker, before posting anything to the frame. */
export const PYTHON_CONSOLE_LIMITS = Object.freeze({
  retainedChunks: 128,
  retainedChars: 64_000,
  chunkChars: 4_096,
  decodeBytes: 4_096,
  batchChars: 8_000,
  flushIntervalMs: 32,
})

export type PythonWorkerCommand =
  | { type: 'prepare'; snapshot: PythonExecutionSnapshot; activity?: StudioPythonActivity }
  | { type: 'activity-check'; requestId: string }
  | { type: 'run'; requestId: string }
  | { type: 'evaluate'; requestId: string; source: string }
  | { type: 'input'; requestId: string; response: { kind: 'line'; text: string } | { kind: 'eof' } }
  | {
      type: 'graphics-response'
      requestId: string
      response: string
      /** Pixels of a Pygame Zero vector image (`images.x.get_at` on an SVG), transferred. */
      bytes?: Uint8Array<ArrayBuffer>
    }
  | { type: 'audio-response'; requestId: string; response: string }

/** A graphics reply: text, or text with bytes (the pixels of a Pygame Zero vector image). */
export type PythonGraphicsReply = string | { text: string; bytes: Uint8Array<ArrayBuffer> }
export const PYTHON_GRAPHICS_REPLY_LIMITS = Object.freeze({
  textChars: 128_000,
  /** A 4096 × 4096 RGBA image. */
  bytes: 64 * 1024 * 1024,
})

/** Worker output is always untrusted at the supervisor boundary, including these events. */
export type PythonWorkerEvent =
  | { type: 'booted'; pythonVersion: string; pyodideVersion: string }
  | { type: 'prepared' }
  | { type: 'activity-result'; requestId: string; feedback: StudioPythonActivityFeedback }
  | { type: 'console'; batches: PythonConsoleBatch[] }
  | { type: 'input-request'; requestId: string }
  | { type: 'result'; requestId: string; ok: boolean; text: string; traceback?: string }
  | { type: 'failed'; message: string }
  | { type: 'audio'; requestId: string; request: string }
  | {
      type: 'graphics'
      requestId: string
      request: string
      images: { id: number; bytes: Uint8Array<ArrayBuffer> }[]
    }
