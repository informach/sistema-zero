import type {
  LiveCohort,
  LiveEnrollment,
  LiveOccurrence,
  LiveSession,
} from '@sistemazero/core/live'

export interface LiveActor {
  id: string
  accountId: string
  name: string
  staff: boolean
  /** superadmin/admin (not plain staff): cohort edits, access extensions, every cohort's roster. */
  admin?: boolean
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
}
/** What a room command needs before taking the cohort lock (one indexed read). */
export interface LiveSessionRef {
  cohortId: string
  /** The live course lesson of this encounter (null only in an old script cohort). */
  lessonId: string | null
  occurrenceId: string
}
export interface LiveRepository {
  createCohort(aggregate: LiveCohortAggregate): Promise<void>
  /** Only course cohorts (`courseId`): old script cohorts are archived and ignored. */
  listCohorts(query?: LiveCatalogQuery): Promise<LiveCohortAggregate[]>
  overdueOccurrences(now: Date): Promise<string[]>
  findCohort(id: string): Promise<LiveCohortAggregate | null>
  findBySession(id: string): Promise<LiveCohortAggregate | null>
  findByOccurrence(id: string): Promise<LiveCohortAggregate | null>
  findByEnrollment(id: string): Promise<LiveCohortAggregate | null>
  /** One indexed lookup; lets a mutation lock the cohort without loading it twice. */
  sessionRef(sessionId: string): Promise<LiveSessionRef | null>
  readReplayPosition(sessionId: string, learnerId: string, version: number): Promise<number>
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
  /** The course platform (Kids × adults), read from the cohort's course summary. */
  audience?: 'adult' | 'kids'
  /**
   * Child/parents: an OPEN cohort is discovery only when its course is one of these (the
   * published live courses). Own seats and assigned teaching are always listed.
   */
  discoverableCourseIds?: string[]
}
/** Auth is the authority for family ownership, including a child with no Members activity. */
export interface LiveProfileOwnershipPort {
  assertOwnership(accountId: string, learnerId: string | null): Promise<{ name: string }>
}
