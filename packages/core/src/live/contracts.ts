import type { InteractiveBlock, PublicInteractiveBlock } from '../learning'

/** Public wire contracts. All dates are UTC ISO instants; identifiers are UUIDs. */
export type LiveOccurrenceState = 'scheduled' | 'lobby' | 'live' | 'ended' | 'cancelled'
export type LiveAccessStatus = 'scheduled' | 'available' | 'expired' | 'revoked'
export type LiveSpeakingMode = 'open' | 'turns' | 'listen'
export type LiveSupervisionStatus = 'present' | 'reconnecting' | 'unavailable'
export type LiveRecordingState =
  | 'not_started'
  | 'starting'
  | 'recording'
  | 'paused'
  | 'processing'
  | 'review'
  | 'ready'
  | 'failed'
export interface LiveMaterial {
  id: string
  title: string
  storageKey: string
  fileName: string
}
export interface LiveLessonPlan {
  title: string
  instructions: string
  /** Immutable, server-validated Studio project reference. */
  starterProjectId: string | null
  /** Zero-based earlier lesson whose canonical project this lesson continues. */
  continueProjectFrom?: number | null
  materials: LiveMaterial[]
  steps?: LiveLearningStep[]
}
export interface LiveLearningBlock {
  id: string
  revision: string
  content: InteractiveBlock
}
export interface LiveLearningStep {
  id: string
  title: string
  instructions: string
  blocks: LiveLearningBlock[]
}
export interface LiveLearningStepView extends Omit<LiveLearningStep, 'blocks'> {
  blocks: { id: string; revision: string; content: PublicInteractiveBlock }[]
}
export interface LiveLessonPlanView extends Omit<LiveLessonPlan, 'steps'> {
  steps?: LiveLearningStepView[]
}
export interface LiveProgram {
  id: string
  title: string
  description: string
  status: 'draft' | 'published' | 'archived'
  revision: number
  lessons: LiveLessonPlan[]
  createdAt: string
}
export interface LiveCohort {
  id: string
  programId: string
  title: string
  timeZone: string
  capacity: number
  accessDays: number
  teacherIds: string[]
  status: 'draft' | 'open' | 'closed' | 'archived'
  createdAt: string
}
export interface LiveSession {
  id: string
  cohortId: string
  order: number
  plan: LiveLessonPlan
  startsAt: string
  endsAt: string
  accessEndsAt: string
  occurrenceId: string
}
export interface LiveEnrollment {
  id: string
  cohortId: string
  accountId: string
  learnerId: string | null
  learnerName: string
  status: 'active' | 'revoked'
  source: 'manual' | 'purchase'
  createdAt: string
}
export interface LiveParticipation {
  learnerId: string
  displayName: string
  deviceId: string
  admission: 'waiting' | 'admitted' | 'removed'
  joinedAt: string
  seenAt: string
  handAt: string | null
  helpAt: string | null
  microphoneLocked: boolean
  cameraLocked: boolean
  turnGranted: boolean
  muteEpoch: number
  activity?: LiveActivityReport & { reportedAt: string }
}
export interface LiveActivityReport {
  stepId: string | null
  saveState: 'not-open' | 'saving' | 'saved' | 'offline'
}
export interface LiveChatMessage {
  id: string
  authorId: string
  authorName: string
  role: 'teacher' | 'learner'
  text: string
  createdAt: string
  removed: boolean
  pinned: boolean
}
export interface LiveOccurrence {
  id: string
  sessionId: string
  startsAt: string
  endsAt: string
  hardEndsAt: string
  state: LiveOccurrenceState
  version: number
  speakingMode: LiveSpeakingMode
  chatEnabled: boolean
  teachers: Record<string, string>
  participants: LiveParticipation[]
  messages: LiveChatMessage[]
  guidance?: LiveGuidance | null
  suggestedStepId?: string | null
  recording: {
    state: LiveRecordingState
    published: boolean
    version: number
    storageKey: string | null
  }
}
export interface LiveLessonAccessView {
  startsAt: string
  endsAt: string
  status: LiveAccessStatus
  canOpen: boolean
  canJoinMedia: boolean
  canWatchRecording: boolean
}
export type LiveProgramSummary = Omit<LiveProgram, 'lessons'> & { lessonCount: number }
export interface LiveCatalogView {
  nextCursor?: string | null
  programs: LiveProgramSummary[]
  cohorts: LiveCohort[]
  sessions: LiveSessionSummary[]
  enrollments: LiveEnrollment[]
}
export type LiveSessionSummary = Omit<LiveSession, 'plan'> & {
  title: string
  /** Operational schedule; startsAt/accessEndsAt remain the original commercial window. */
  occurrenceStartsAt?: string
  occurrenceEndsAt?: string
}
export interface LiveRecordingSummary {
  occurrenceId: string
  startsAt: string
  recording: Omit<LiveOccurrence['recording'], 'storageKey'>
}
export interface LiveRoomView {
  session: LiveSessionSummary
  cohort: LiveCohort
  plan?: LiveLessonPlanView | null
  planRevision: string
  access: LiveLessonAccessView
  occurrence: LiveOccurrence | null
  recordings?: LiveRecordingSummary[]
  role: 'teacher' | 'learner'
  actorId: string
  supervision: LiveSupervisionStatus
  serverTime: string
  mediaReady: boolean
}
export type LiveControl =
  | { kind: 'suggest-step'; stepId: string | null }
  | { kind: 'guide'; target: LiveGuidance['target']; learnerId: string | null }
  | { kind: 'start' | 'end' | 'open-lobby' }
  | { kind: 'speaking-mode'; mode: LiveSpeakingMode }
  | { kind: 'chat'; enabled: boolean }
  | { kind: 'admit' | 'remove' | 'grant-turn' | 'revoke-turn'; learnerId: string }
  | {
      kind:
        | 'mute'
        | 'lower-hands'
        | 'lock-microphone'
        | 'unlock-microphone'
        | 'lock-camera'
        | 'unlock-camera'
      learnerId: string | null
    }
  | { kind: 'remove-message' | 'pin-message'; messageId: string }
export interface LiveCreateProgram {
  title: string
  description: string
  lessons: LiveLessonPlan[]
}
export interface LiveCreateCohort {
  title: string
  timeZone: string
  capacity: number
  accessDays: number
  teacherIds: string[]
  /** One interval per program lesson, in its original order. */
  schedule: { startsAt: string; endsAt: string }[]
}
export interface LiveJoinRequest {
  deviceId: string
  takeover: boolean
}
export interface LiveWriteGuard {
  expectedRevision: number
  writerEpoch: number
  mutationId: string
}
export interface LiveGuidance {
  id: string
  target:
    | 'studio-run'
    | 'studio-stop'
    | 'studio-blocks'
    | 'studio-code'
    | 'studio-save'
    | 'room-hand'
    | 'room-help'
  learnerId: string | null
  expiresAt: string
}
