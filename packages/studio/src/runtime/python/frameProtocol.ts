import { isStudioProjectId } from '@sistemazero/core/studio/project-format'
import type {
  StudioPythonActivity,
  StudioPythonActivityFeedback,
} from '@sistemazero/core/studio/python-activity'
import type {
  StudioExecutionIdentity,
  StudioRuntimeEvent,
  StudioRuntimeImage,
  StudioRuntimeInput,
} from '../types'
import type { PythonExecutionSnapshot } from './protocol'

export type PythonRuntimePayload = StudioRuntimeEvent extends infer Event
  ? Event extends StudioRuntimeEvent
    ? Omit<Event, 'identity' | 'sequence'>
    : never
  : never
export const PYTHON_FRAME_PROTOCOL = 1
export const isPythonChallenge = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)
const identifier = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value)

export function readPythonExecutionIdentity(raw: unknown): StudioExecutionIdentity | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return
  const value = raw as Record<string, unknown>
  if (
    !isStudioProjectId(value.projectId) ||
    !isPythonChallenge(value.revision) ||
    !isPythonChallenge(value.runtimeManifestSha256) ||
    !identifier(value.instanceId) ||
    !identifier(value.runId) ||
    (value.writerEpoch !== null &&
      (typeof value.writerEpoch !== 'number' ||
        !Number.isSafeInteger(value.writerEpoch) ||
        value.writerEpoch < 0))
  )
    return
  return {
    projectId: value.projectId,
    revision: value.revision,
    runtimeManifestSha256: value.runtimeManifestSha256,
    instanceId: value.instanceId,
    runId: value.runId,
    writerEpoch: value.writerEpoch,
  }
}
export function samePythonExecutionIdentity(
  a: StudioExecutionIdentity,
  b: StudioExecutionIdentity,
) {
  return (
    a.projectId === b.projectId &&
    a.revision === b.revision &&
    a.runtimeManifestSha256 === b.runtimeManifestSha256 &&
    a.instanceId === b.instanceId &&
    a.runId === b.runId &&
    a.writerEpoch === b.writerEpoch
  )
}

export interface PythonFrameInitialization {
  type: 'python-frame-init'
  protocol: 1
  challenge: string
  identity: StudioExecutionIdentity
  snapshot: PythonExecutionSnapshot
  activity?: StudioPythonActivity
  bootResources?: 1
}
export type PythonFrameCommand = {
  protocol: 1
  challenge: string
  commandId: number
  identity: StudioExecutionIdentity
} & (
  | { type: 'run' | 'stop' | 'capture' | 'activity-controls' }
  | { type: 'evaluate'; requestId: string; source: string }
  | { type: 'activity-check'; requestId: string }
  | { type: 'input'; requestId: string; response: StudioRuntimeInput }
)
export type PythonFrameMessage = {
  protocol: 1
  challenge: string
  sequence: number
  identity: StudioExecutionIdentity
} & (
  | { type: 'prepared' }
  | { type: 'event'; event: PythonRuntimePayload }
  | { type: 'activity-result'; requestId: string; feedback: StudioPythonActivityFeedback }
  | {
      type: 'ack'
      commandId: number
      ok: boolean
      error?: string
      snapshot?: StudioRuntimeImage | null
    }
)
