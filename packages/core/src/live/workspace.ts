import type { LiveSession, LiveWriteGuard } from './contracts'

export function liveProjectOrigin(sessions: LiveSession[], session: LiveSession): LiveSession {
  let origin = session
  while (origin.plan.continueProjectFrom != null) {
    const previous = origin.plan.continueProjectFrom
    if (!Number.isInteger(previous) || previous < 0 || previous >= origin.order)
      throw new Error('A continuidade precisa apontar para um encontro anterior.')
    const parent = sessions.find(
      (item) => item.order === previous && item.cohortId === session.cohortId,
    )
    if (!parent) throw new Error('Encontro de origem não encontrado.')
    origin = parent
  }
  return origin
}

export const LIVE_ASSISTANCE_REQUEST_MS = 60_000
export function assistanceRequestExpired(
  assistance: LiveAssistanceView | null,
  now: Date,
): boolean {
  return (
    assistance?.status === 'requested' &&
    Date.parse(assistance.requestedAt) + LIVE_ASSISTANCE_REQUEST_MS <= now.getTime()
  )
}

export interface LiveAssistanceView {
  id: string
  teacherId: string
  teacherName: string
  status: 'requested' | 'active' | 'returning'
  requestedAt: string
  checkpointRevision: number | null
  sessionId?: string
  cursor?: {
    x: number
    y: number
    target?: LiveCursorTarget
    revision?: number
    expiresAt: string
  } | null
}
export interface LiveCursorTarget {
  kind: 'control' | 'block'
  id: string
}
export interface LiveWorkspaceView {
  id: string
  sessionId: string
  contextSessionId?: string
  learnerId: string
  revision: number
  writerEpoch: number
  writerId: string
  writerDeviceId: string | null
  leaseExpiresAt: string | null
  project: Record<string, unknown>
  assistance: LiveAssistanceView | null
  updatedAt: string
  /**
   * The lesson grant expired without a Studio continuation: the owner (and an assigned
   * teacher) can still view and export, but every write is refused.
   */
  readOnly?: boolean
}
export interface LiveWorkspaceCommitRequest extends LiveWriteGuard {
  deviceId: string
  project: Record<string, unknown>
}

/** Polling retains cursor/lease updates without resending unchanged project assets. */
export type LiveWorkspaceUpdate = Omit<LiveWorkspaceView, 'project'> & {
  project?: Record<string, unknown>
}
