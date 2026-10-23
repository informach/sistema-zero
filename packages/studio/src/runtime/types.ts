import type { StudioProjectDocument } from '@sistemazero/core/studio/project-document'
import type {
  StudioPythonActivity,
  StudioPythonActivityFeedback,
} from '@sistemazero/core/studio/python-activity'
import type { StudioRuntimeImage } from '@sistemazero/core/studio/runtime-image'

export type { StudioRuntimeImage } from '@sistemazero/core/studio/runtime-image'

export interface StudioExecutionIdentity {
  projectId: string
  revision: string
  instanceId: string
  runId: string
  writerEpoch: number | null
  runtimeManifestSha256: string
}

/** EOF is distinct from an empty line and never means stopping the runtime. */
export type StudioRuntimeInput = { kind: 'line'; text: string } | { kind: 'eof' }

export interface StudioRuntimeSnapshot extends StudioRuntimeImage {
  identity: StudioExecutionIdentity
}

export type StudioRuntimeEvent = { identity: StudioExecutionIdentity; sequence: number } & (
  | {
      type: 'state'
      state: 'ready' | 'running' | 'waiting-input' | 'paused' | 'completed' | 'stopped'
    }
  | {
      type: 'console'
      stream: 'stdout' | 'stderr'
      text: string
      omittedLines: number
      omittedChars: number
    }
  | { type: 'input-request'; requestId: string; prompt: string }
  | { type: 'repl-result'; requestId: string; status: 'completed' | 'failed'; text: string }
  | {
      type: 'diagnostic'
      path: string
      line: number
      column: number
      message: string
      traceback: string
    }
  | {
      type: 'failed'
      code: 'runtime-unavailable' | 'package-unavailable' | 'program-error' | 'quota-exceeded'
      message: string
    }
)

export interface StudioRuntimeSession {
  /** Available only on a dedicated Python activity generation. Never server authority. */
  applyPythonActivityControls?(): Promise<void>
  checkPythonActivity?(): Promise<StudioPythonActivityFeedback>
  readonly identity: StudioExecutionIdentity
  readonly playback:
    | { kind: 'stop-only' }
    | { kind: 'pausable'; pause(): Promise<void>; resume(): Promise<void> }
  readonly repl:
    | { kind: 'unavailable' }
    | { kind: 'python'; evaluate(input: { requestId: string; source: string }): Promise<void> }
  /** Acknowledges start. Completion and errors arrive through the event stream. */
  run(): Promise<void>
  subscribe(listener: (event: StudioRuntimeEvent) => void): () => void
  /** Idempotent; authority is invalidated before asynchronous resource reclamation. */
  stop(): Promise<void>
  dispose(): Promise<void>
  provideInput(requestId: string, response: StudioRuntimeInput): Promise<void>
  /** Captures an already presented frame. It never executes or changes learner source. */
  captureSnapshot?(): Promise<StudioRuntimeSnapshot | null>
}

export interface StudioRuntimePrepareInput {
  /** Trusted host UI preference. Never supplied by learner source or frame messages. */
  hostAudio?: StudioHostAudioPreference
  /** Host-owned lesson criteria, separate from the editable project and its execution digest. */
  pythonActivity?: StudioPythonActivity
  /** Captured and semantically validated before requesting execution. */
  project: StudioProjectDocument
  identity: StudioExecutionIdentity
  signal: AbortSignal
  /** Host-created and already mounted; never supplied by the learner's document. */
  frame: HTMLIFrameElement
}

export interface StudioHostAudioPreference {
  readonly getMuted: () => boolean
  readonly subscribe: (listener: () => void) => () => void
}

export interface StudioRuntimeProvider {
  readonly id: string
  /** Each call produces an independent execution generation; failures reject. */
  prepare(input: StudioRuntimePrepareInput): Promise<StudioRuntimeSession>
}

export class StudioRuntimeUnavailableError extends Error {
  constructor(
    readonly reasonCode: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'StudioRuntimeUnavailableError'
  }
}
