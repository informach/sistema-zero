import { ValidationError } from '@sistemazero/core/errors'
import { AdultJourneyPolicySchema, KidsJourneyPolicySchema } from '@sistemazero/core/journey'
import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  gt,
  inArray,
  isNotNull,
  isNull,
  notExists,
  or,
  sql,
} from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { AccessDeniedError } from '../../../domain/entitlement/entitlement.errors'
import type {
  MasteryAwardRecord,
  MasteryAwardResult,
  MasteryEvidence,
  MasteryOwner,
  MasteryRepository,
  MasteryReviewRecord,
  MasterySubmissionProgressRecord,
  MasterySubmissionRecord,
} from '../../../domain/ports/mastery-repository.port'
import type { Database } from './db'
import { beginLockedKidsJourneyMilestone } from './kids-journey.repository'
import {
  adultJourneyPolicy,
  courses,
  kidsJourneyPolicy,
  lessonEvidence,
  lessons,
  masteryAwards,
  masteryReviews,
  masterySubmissions,
} from './schema'
import { lockStudioAccount } from './studio-lesson-binding.repository'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
/** Caller holds the account/fence. Match course milestone order before policy/materialization. */
async function beginKidsReceipt(tx: Transaction, owner: MasteryOwner) {
  if (owner.audience !== 'kids') return undefined
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`creation-quota:${owner.userId}`}, 0))`,
  )
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`gamification:${owner.userId}`}, 0))`,
  )
  return beginLockedKidsJourneyMilestone(tx, { userId: owner.userId, accountId: owner.accountId })
}

const ownerWhere = (owner: MasteryOwner) =>
  and(
    eq(masterySubmissions.userId, owner.userId),
    eq(masterySubmissions.accountId, owner.accountId),
    eq(masterySubmissions.audience, owner.audience),
  )
const { evidencePayload: _snapshotColumn, ...summaryColumns } = getTableColumns(masterySubmissions)
function submissionSummary(
  row: Omit<typeof masterySubmissions.$inferSelect, 'evidencePayload'>,
): MasterySubmissionProgressRecord {
  return {
    id: row.id,
    userId: row.userId,
    accountId: row.accountId,
    audience: row.audience,
    masteryId: row.masteryId,
    level: row.level,
    areaTitle: row.areaTitle,
    policyVersion: row.policyVersion,
    definition: row.definition,
    message: row.message,
    submittedAt: row.submittedAt,
    evidence: {
      id: row.evidenceId,
      title: row.evidenceTitle,
      lessonId: row.evidenceLessonId,
      kind: row.evidenceKind,
      revision: row.evidenceRevision,
      createdAt: row.evidenceCreatedAt,
    },
  }
}
function submission(row: typeof masterySubmissions.$inferSelect): MasterySubmissionRecord {
  const summary = submissionSummary(row)
  return { ...summary, evidence: { ...summary.evidence, payload: row.evidencePayload } }
}

export class DrizzleMasteryRepository implements MasteryRepository {
  constructor(private readonly db: Database) {}
  async listAwards(owner: MasteryOwner) {
    return this.db
      .select()
      .from(masteryAwards)
      .where(
        and(
          eq(masteryAwards.userId, owner.userId),
          eq(masteryAwards.accountId, owner.accountId),
          eq(masteryAwards.audience, owner.audience),
        ),
      )
  }

  private evidenceQuery(owner: MasteryOwner, evidenceId?: string) {
    return this.db
      .select({
        id: lessonEvidence.id,
        title: lessons.title,
        lessonId: lessonEvidence.lessonId,
        kind: lessonEvidence.kind,
        revision: lessonEvidence.revision,
        payload: lessonEvidence.payload,
        createdAt: lessonEvidence.createdAt,
      })
      .from(lessonEvidence)
      .innerJoin(lessons, eq(lessons.id, lessonEvidence.lessonId))
      .innerJoin(courses, eq(courses.id, lessons.courseId))
      .where(
        and(
          eq(lessonEvidence.userId, owner.userId),
          eq(lessonEvidence.accountId, owner.accountId),
          eq(courses.audience, owner.audience),
          inArray(lessonEvidence.kind, ['studio', 'section_project']),
          evidenceId ? eq(lessonEvidence.id, evidenceId) : undefined,
        ),
      )
      .orderBy(desc(lessonEvidence.createdAt), desc(lessonEvidence.id))
      .limit(evidenceId ? 1 : 200)
  }
  async listEvidence(owner: MasteryOwner): Promise<Omit<MasteryEvidence, 'payload'>[]> {
    return this.db
      .select({
        id: lessonEvidence.id,
        title: lessons.title,
        lessonId: lessonEvidence.lessonId,
        kind: lessonEvidence.kind,
        revision: lessonEvidence.revision,
        createdAt: lessonEvidence.createdAt,
      })
      .from(lessonEvidence)
      .innerJoin(lessons, eq(lessons.id, lessonEvidence.lessonId))
      .innerJoin(courses, eq(courses.id, lessons.courseId))
      .where(
        and(
          eq(lessonEvidence.userId, owner.userId),
          eq(lessonEvidence.accountId, owner.accountId),
          eq(courses.audience, owner.audience),
          inArray(lessonEvidence.kind, ['studio', 'section_project']),
        ),
      )
      .orderBy(desc(lessonEvidence.createdAt), desc(lessonEvidence.id))
      .limit(200)
  }
  async findEvidence(owner: MasteryOwner, evidenceId: string) {
    return (await this.evidenceQuery(owner, evidenceId))[0] ?? null
  }
  async list(owner: MasteryOwner) {
    const [rows, awards] = await Promise.all([
      this.db
        .select({ submission: summaryColumns, review: masteryReviews })
        .from(masterySubmissions)
        .leftJoin(masteryReviews, eq(masteryReviews.submissionId, masterySubmissions.id))
        .where(ownerWhere(owner))
        .orderBy(masterySubmissions.submittedAt, masterySubmissions.id),
      this.listAwards(owner),
    ])
    return {
      submissions: rows.map((row) => submissionSummary(row.submission)),
      reviews: rows.flatMap((row) => (row.review ? [row.review] : [])),
      awards,
    }
  }
  async submit(record: MasterySubmissionRecord) {
    record = structuredClone(record)
    return this.db.transaction(async (tx) => {
      await lockStudioAccount(tx, record.accountId)
      const [admitted] = await tx
        .select({
          definition: masterySubmissions.definition,
          policyVersion: masterySubmissions.policyVersion,
          areaTitle: masterySubmissions.areaTitle,
        })
        .from(masterySubmissions)
        .where(
          and(
            ownerWhere(record),
            eq(masterySubmissions.masteryId, record.masteryId),
            eq(masterySubmissions.level, record.level),
          ),
        )
        .orderBy(asc(masterySubmissions.submittedAt), asc(masterySubmissions.id))
        .limit(1)
      // Concurrent first submissions may have been authorized against different policy versions.
      // The first persisted admission wins; dedup must use that rubric too.
      if (admitted) record = { ...record, ...admitted }
      const duplicate = await tx
        .select()
        .from(masterySubmissions)
        .where(
          and(
            ownerWhere(record),
            eq(masterySubmissions.masteryId, record.masteryId),
            eq(masterySubmissions.level, record.level),
            eq(masterySubmissions.evidenceId, record.evidence.id),
            eq(masterySubmissions.rubricVersion, record.definition.rubric.version),
          ),
        )
        .limit(1)
      if (duplicate[0]) return submission(duplicate[0])
      await tx.insert(masterySubmissions).values({
        id: record.id,
        userId: record.userId,
        accountId: record.accountId,
        audience: record.audience,
        masteryId: record.masteryId,
        level: record.level,
        areaTitle: record.areaTitle,
        policyVersion: record.policyVersion,
        rubricVersion: record.definition.rubric.version,
        definition: record.definition,
        message: record.message,
        submittedAt: record.submittedAt,
        evidenceId: record.evidence.id,
        evidenceTitle: record.evidence.title,
        evidenceLessonId: record.evidence.lessonId,
        evidenceKind: record.evidence.kind,
        evidenceRevision: record.evidence.revision,
        evidencePayload: record.evidence.payload,
        evidenceCreatedAt: record.evidence.createdAt,
      })
      return record
    })
  }
  async findSubmission(id: string) {
    const row = (
      await this.db.select().from(masterySubmissions).where(eq(masterySubmissions.id, id)).limit(1)
    )[0]
    return row ? submission(row) : null
  }
  async findReview(submissionId: string) {
    return (
      (
        await this.db
          .select()
          .from(masteryReviews)
          .where(eq(masteryReviews.submissionId, submissionId))
          .limit(1)
      )[0] ?? null
    )
  }
  async listQueue(filter: {
    audience: 'kids' | 'adult'
    status: 'pending' | 'reviewed' | 'all'
    limit: number
    offset: number
  }) {
    const newer = alias(masterySubmissions, 'newer_mastery_submission')
    const superseded = this.db
      .select({ id: newer.id })
      .from(newer)
      .where(
        and(
          eq(newer.userId, masterySubmissions.userId),
          eq(newer.audience, masterySubmissions.audience),
          eq(newer.masteryId, masterySubmissions.masteryId),
          eq(newer.level, masterySubmissions.level),
          or(
            gt(newer.submittedAt, masterySubmissions.submittedAt),
            and(
              eq(newer.submittedAt, masterySubmissions.submittedAt),
              gt(newer.id, masterySubmissions.id),
            ),
          ),
        ),
      )
    const rows = await this.db
      .select({ submission: summaryColumns, review: masteryReviews })
      .from(masterySubmissions)
      .leftJoin(masteryReviews, eq(masteryReviews.submissionId, masterySubmissions.id))
      .where(
        and(
          eq(masterySubmissions.audience, filter.audience),
          notExists(superseded),
          filter.status === 'pending'
            ? isNull(masteryReviews.id)
            : filter.status === 'reviewed'
              ? isNotNull(masteryReviews.id)
              : undefined,
        ),
      )
      .orderBy(desc(masterySubmissions.submittedAt), desc(masterySubmissions.id))
      .limit(filter.limit)
      .offset(filter.offset)
    return rows.map((row) => ({
      submission: submissionSummary(row.submission),
      review: row.review,
    }))
  }
  async review(record: MasteryReviewRecord) {
    const current = await this.findSubmission(record.submissionId)
    if (!current) return false
    return this.db.transaction(async (tx) => {
      await lockStudioAccount(tx, current.accountId)
      const reconcileKidsJourney = await beginKidsReceipt(tx, current)
      const latest = (
        await tx
          .select({ id: masterySubmissions.id })
          .from(masterySubmissions)
          .where(
            and(
              ownerWhere(current),
              eq(masterySubmissions.masteryId, current.masteryId),
              eq(masterySubmissions.level, current.level),
            ),
          )
          .orderBy(desc(masterySubmissions.submittedAt), desc(masterySubmissions.id))
          .limit(1)
      )[0]
      if (latest?.id !== record.submissionId) return false
      const saved = await tx
        .insert(masteryReviews)
        .values(record)
        .onConflictDoNothing()
        .returning({ id: masteryReviews.id })
      // A nucleus equivalence can unlock a tool before the final award. Preserve
      // that right even if this owner was already captured by a pending policy.
      if (saved.length) await reconcileKidsJourney?.()
      return saved.length === 1
    })
  }
  async award(
    record: MasteryAwardRecord,
    authorization: { policyVersion: number },
  ): Promise<MasteryAwardResult> {
    record = structuredClone(record)
    const policyVersion = authorization.policyVersion
    return this.db.transaction(async (tx): Promise<MasteryAwardResult> => {
      try {
        await lockStudioAccount(tx, record.accountId)
      } catch (error) {
        if (error instanceof AccessDeniedError) return { status: 'deferred' }
        throw error
      }
      let reconcileKidsJourney: (() => Promise<void>) | undefined
      if (record.audience === 'kids') {
        // Same writer order as course milestones. A preparation may have already
        // captured this learner, so the new receipt and every course it opens
        // must become durable together before publication can take the policy.
        reconcileKidsJourney = await beginKidsReceipt(tx, record)
        const [current] = await tx
          .select()
          .from(kidsJourneyPolicy)
          .where(eq(kidsJourneyPolicy.id, 'kids'))
        const parsed = KidsJourneyPolicySchema.safeParse(current?.policy)
        if (
          current?.phase !== 'published' ||
          current.version !== policyVersion ||
          !parsed.success ||
          parsed.data.mode !== 'active' ||
          !parsed.data.curriculum
        )
          return { status: 'deferred' }
      } else {
        // Adult publication captures awards before locking policy. Match that order;
        // taking a policy row lock before an INSERT's implicit table lock can deadlock.
        await tx.execute(sql`lock table ${masteryAwards} in row exclusive mode`)
        const [current] = await tx
          .select()
          .from(adultJourneyPolicy)
          .where(eq(adultJourneyPolicy.id, 'adult'))
          .for('share')
        const parsed = AdultJourneyPolicySchema.safeParse(current?.policy)
        if (current?.version !== policyVersion || !parsed.success || !parsed.data.curriculum)
          return { status: 'deferred' }
      }
      const row = (
        await tx
          .select({ submission: masterySubmissions, review: masteryReviews })
          .from(masterySubmissions)
          .innerJoin(masteryReviews, eq(masteryReviews.submissionId, masterySubmissions.id))
          .where(
            and(
              ownerWhere(record),
              eq(masterySubmissions.id, record.submissionId),
              eq(masteryReviews.id, record.reviewId),
            ),
          )
          .limit(1)
      )[0]
      if (
        !row ||
        row.submission.masteryId !== record.masteryId ||
        row.submission.level !== record.level ||
        (record.capabilities ?? []).some(
          (capability) => !row.submission.definition.grants?.includes(capability),
        ) ||
        !row.submission.definition.rubric.criteria.every((c) =>
          row.review.criteria.some((r) => r.criterionId === c.id && r.result === 'approved'),
        )
      )
        throw new ValidationError('A conquista exige uma revisão aprovada da própria entrega.')
      const [saved] = await tx
        .insert(masteryAwards)
        .values(record)
        .onConflictDoNothing()
        .returning()
      if (saved) {
        await reconcileKidsJourney?.()
        return { status: 'saved', award: saved }
      }
      const [existing] = await tx
        .select()
        .from(masteryAwards)
        .where(
          and(
            eq(masteryAwards.userId, record.userId),
            eq(masteryAwards.accountId, record.accountId),
            eq(masteryAwards.audience, record.audience),
            eq(masteryAwards.masteryId, record.masteryId),
            eq(masteryAwards.level, record.level),
          ),
        )
      if (existing) {
        await reconcileKidsJourney?.()
        return { status: 'existing', award: existing }
      }
      return { status: 'deferred' }
    })
  }
}
