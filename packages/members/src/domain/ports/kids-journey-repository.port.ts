import type {
  KidsCourseMilestone,
  KidsJourneyCourseFact,
  KidsJourneyEarned,
  KidsJourneyPolicy,
} from '@sistemazero/core/journey'
import type { CourseLevel, CourseTrack } from '../course/course'

/** Authenticated account ownership; pedagogical rights belong to the profile. */
export interface KidsJourneyOwner {
  userId: string
  accountId: string
}

/** Raw tags are needed for field-by-field fallback of pre-snapshot XP events. */
export interface KidsJourneyCatalogCourse extends KidsJourneyCourseFact {
  level: CourseLevel
  track: CourseTrack
}

export interface KidsJourneyPolicyRecord {
  version: number
  policy: KidsJourneyPolicy
  updatedAt: Date | null
}

export interface KidsJourneyEarnedRecord extends KidsJourneyOwner {
  earned: KidsJourneyEarned
  policyVersion: number
  updatedAt: Date
}

export interface KidsJourneyProfileSnapshot extends KidsJourneyOwner {
  milestones: readonly KidsCourseMilestone[]
  earned: KidsJourneyEarned
}

/** One consistent database snapshot, with no reconciliation/write side effects. */
export interface KidsJourneySnapshot {
  policy: KidsJourneyPolicyRecord
  catalog: readonly KidsJourneyCatalogCourse[]
  profiles: ReadonlyMap<string, KidsJourneyProfileSnapshot>
}

export const KIDS_JOURNEY_PREPARATION_STATUSES = [
  'preparing',
  'ready',
  'stale',
  'published',
] as const
export type KidsJourneyPreparationStatus = (typeof KIDS_JOURNEY_PREPARATION_STATUSES)[number]

export interface KidsJourneyPreparation {
  id: string
  expectedVersion: number
  sourcePolicy: KidsJourneyPolicy
  candidatePolicy: KidsJourneyPolicy
  draftHash: string
  catalogHash: string
  catalog: readonly KidsJourneyCatalogCourse[]
  /** UUID keyset, bounded at creation. Never a timestamp supplied by a client. */
  cursor: string | null
  upperBound: string | null
  processed: number
  status: KidsJourneyPreparationStatus
  actorId: string
  reason: string
  createdAt: Date
  updatedAt: Date
}

export interface KidsJourneyRevision extends KidsJourneyPolicyRecord {
  previousVersion: number
  preparationId: string
  actorId: string
  reason: string
  draftHash: string
  catalogHash: string
}

export type KidsJourneyPreparationProgress =
  | { status: 'advanced'; preparation: KidsJourneyPreparation }
  | { status: 'conflict' | 'stale' | 'unowned' | 'missing' }

export interface KidsJourneyRepository {
  readSnapshot(owners: readonly KidsJourneyOwner[]): Promise<KidsJourneySnapshot>
  /** Server-internal only; CAS + account fence + immutable owner + monotonic union. */
  freezeEarned(
    owner: KidsJourneyOwner,
    expectedVersion: number,
    earned: KidsJourneyEarned,
  ): Promise<'frozen' | 'conflict' | 'deleted'>
  createPreparation(input: {
    expectedVersion: number
    candidatePolicy: KidsJourneyPolicy
    actorId: string
    reason: string
  }): Promise<KidsJourneyPreparation | null>
  getPreparation(id: string): Promise<KidsJourneyPreparation | null>
  /** Freeze exactly the next bounded owner under the outgoing policy, atomically with cursor. */
  advancePreparation(
    id: string,
    expectedCursor: string | null,
  ): Promise<KidsJourneyPreparationProgress>
  /** Low-level only: consumers must stay disconnected until the T3 award hook is deployed. */
  publishPrepared(input: {
    preparationId: string
    expectedVersion: number
    draftHash: string
    catalogHash: string
    actorId: string
  }): Promise<KidsJourneyPolicyRecord | null>
  listHistory(beforeVersion?: number, limit?: number): Promise<readonly KidsJourneyRevision[]>
}
