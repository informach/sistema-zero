import type {
  CreatorJourneyCourseFact,
  CreatorJourneyCurriculum,
  CreatorJourneyView,
  CreatorMasteryAward,
  CreatorMasteryId,
  CreatorMasteryLevel,
  MasteryReviewInput,
} from '@sistemazero/core/journey'

export interface MasteryOwner {
  userId: string
  accountId: string
  audience: 'kids' | 'adult'
}
export interface MasteryContext {
  policyVersion: number
  curriculum: CreatorJourneyCurriculum | null
  catalog: readonly CreatorJourneyCourseFact[]
  view: CreatorJourneyView | null
  milestones: readonly { courseId: string; completed: boolean }[]
  paused?: boolean
}
export interface MasteryEvidence {
  id: string
  title: string
  lessonId: string
  kind: string
  revision: string
  payload: unknown
  createdAt: Date
}
export interface MasterySubmissionRecord extends MasteryOwner {
  id: string
  masteryId: CreatorMasteryId
  level: 1 | 2 | 3
  areaTitle: string
  policyVersion: number
  definition: CreatorMasteryLevel
  evidence: MasteryEvidence
  message: string | null
  submittedAt: Date
}
export interface MasteryReviewRecord extends MasteryReviewInput {
  id: string
  submissionId: string
  reviewerId: string
  reviewedAt: Date
}
export type MasterySubmissionProgressRecord = Omit<MasterySubmissionRecord, 'evidence'> & {
  evidence: Omit<MasteryEvidence, 'payload'>
}
export interface MasteryAwardRecord extends MasteryOwner, CreatorMasteryAward {
  submissionId: string
  reviewId: string
  awardedAt: Date
}
export type MasteryAwardResult =
  | { status: 'saved' | 'existing'; award: MasteryAwardRecord }
  | { status: 'deferred' }
export interface MasteryRepository {
  listAwards(owner: MasteryOwner): Promise<MasteryAwardRecord[]>
  listEvidence(owner: MasteryOwner): Promise<Omit<MasteryEvidence, 'payload'>[]>
  findEvidence(owner: MasteryOwner, evidenceId: string): Promise<MasteryEvidence | null>
  list(owner: MasteryOwner): Promise<{
    submissions: MasterySubmissionProgressRecord[]
    reviews: MasteryReviewRecord[]
    awards: MasteryAwardRecord[]
  }>
  /** Serializes learner writes, deduplicates exact evidence+rubric and rejects writes after erasure. */
  submit(record: MasterySubmissionRecord): Promise<MasterySubmissionRecord>
  findSubmission(id: string): Promise<MasterySubmissionRecord | null>
  findReview(submissionId: string): Promise<MasteryReviewRecord | null>
  listQueue(filter: {
    audience: 'kids' | 'adult'
    status: 'pending' | 'reviewed' | 'all'
    limit: number
    offset: number
  }): Promise<{ submission: MasterySubmissionProgressRecord; review: MasteryReviewRecord | null }[]>
  /** CAS: only the latest submission can receive one immutable review. False means stale/already reviewed. */
  review(record: MasteryReviewRecord): Promise<boolean>
  /** Monotonic, one award per learner/audience/area/level, backed by the immutable approved review. */
  award(
    record: MasteryAwardRecord,
    authorization: { policyVersion: number },
  ): Promise<MasteryAwardResult>
}
