import type { LearningAttemptView, LearningBlockProgress } from '@sistemazero/core/learning'
import type {
  LiveCohort,
  LiveEnrollment,
  LiveOccurrence,
  LiveProgram,
  LiveSession,
} from '@sistemazero/core/live'

export interface LiveActor {
  id: string
  accountId: string
  name: string
  staff: boolean
}
export interface LiveAccessGrant {
  id: string
  enrollmentId: string
  sessionId: string
  startsAt: string
  endsAt: string
  revokedAt: string | null
}
export interface LiveAuditEntry {
  id: string
  actorId: string
  action: string
  targetId: string
  createdAt: string
}
export interface LiveReplayPosition {
  sessionId: string
  learnerId: string
  accountId: string
  version: number
  positionSeconds: number
}
export interface LiveLearningWrite {
  sessionId: string
  learnerId: string
  accountId: string
  progress: LearningBlockProgress
  attempt?: LearningAttemptView
}
/** The bounded cohort aggregate is serialized with a database row lock. */
export interface LiveCohortAggregate {
  cohort: LiveCohort
  sessions: LiveSession[]
  occurrences: LiveOccurrence[]
  enrollments: LiveEnrollment[]
  grants: LiveAccessGrant[]
  /** Only new events: repositories append them, never overwrite the audit history. */
  audit: LiveAuditEntry[]
  replayPositions?: LiveReplayPosition[]
  learningWrites?: LiveLearningWrite[]
}
export interface LiveRepository {
  listPrograms(): Promise<LiveProgram[]>
  findProgram(id: string): Promise<LiveProgram | null>
  createProgram(program: LiveProgram): Promise<void>
  updateProgram(id: string, mutate: (program: LiveProgram) => void): Promise<LiveProgram>
  createCohort(aggregate: LiveCohortAggregate): Promise<void>
  listCohorts(query?: LiveCatalogQuery): Promise<LiveCohortAggregate[]>
  overdueOccurrences(now: Date): Promise<string[]>
  findCohort(id: string): Promise<LiveCohortAggregate | null>
  findBySession(id: string): Promise<LiveCohortAggregate | null>
  findByOccurrence(id: string): Promise<LiveCohortAggregate | null>
  findByEnrollment(id: string): Promise<LiveCohortAggregate | null>
  readReplayPosition(sessionId: string, learnerId: string, version: number): Promise<number>
  readLearningProgress(
    sessionId: string,
    learnerId: string,
    accountId: string,
  ): Promise<LearningBlockProgress[]>
  findLearningAttempt(
    sessionId: string,
    learnerId: string,
    accountId: string,
    id: string,
  ): Promise<LearningAttemptView | null>
  transaction<T>(
    cohortId: string,
    mutate: (aggregate: LiveCohortAggregate) => T | Promise<T>,
    accountId?: string,
  ): Promise<T>
}
export interface LiveCatalogQuery {
  actor: LiveActor
  mode: 'learner' | 'parents' | 'admin'
  cursor?: string
  limit: number
}
/** Auth is the authority for family ownership, including a child with no Members activity. */
export interface LiveProfileOwnershipPort {
  assertOwnership(accountId: string, learnerId: string | null): Promise<{ name: string }>
}
