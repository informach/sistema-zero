import { randomUUID } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import type {
  LearningAttemptView,
  LearningBlockProgress,
  LessonSection,
  SectionProgressRecord,
} from '@sistemazero/core/learning'
import { validateLessonSections } from '@sistemazero/core/learning'
import { and, asc, desc, eq, gte, lt, lte, or, sql } from 'drizzle-orm'
import type { CourseAudience } from '../../../domain/course/course'
import { LessonNotFoundError } from '../../../domain/course/course.errors'
import { LearningConflictError } from '../../../domain/learning/learning.errors'
import type {
  LearningOwner,
  LearningRepository,
  SaveLearningProgress,
} from '../../../domain/ports/learning-repository.port'
import type { Database } from './db'
import { lockLearningOwner } from './learning-owner-lock'
import { lockLessonStructure } from './lesson-structure'
import {
  courses,
  learningAttempts,
  lessonBlockProgress,
  activeLessonBlocks as lessonBlocks,
  lessonEvidence,
  lessonNavigation,
  lessonSectionProgress,
  lessonStructures,
  lessons,
} from './schema'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
const owned = (owner: LearningOwner) =>
  and(
    eq(lessonBlockProgress.userId, owner.userId),
    eq(lessonBlockProgress.accountId, owner.accountId),
  )
function progressView(row: typeof lessonBlockProgress.$inferSelect): LearningBlockProgress {
  return {
    blockId: row.blockId,
    revision: row.revision,
    positionSeconds: row.positionSeconds,
    answers: row.answers,
    hintsUsed: row.hintsUsed,
    attemptsCount: row.attemptsCount,
    result: row.result,
    updatedAt: row.updatedAt.toISOString(),
  }
}
function attemptView(row: typeof learningAttempts.$inferSelect): LearningAttemptView {
  return {
    id: row.id,
    blockId: row.blockId,
    revision: row.revision,
    answers: row.answers,
    hintsUsed: row.hintsUsed,
    result: row.result,
    createdAt: row.createdAt.toISOString(),
  }
}

export class DrizzleLearningRepository implements LearningRepository {
  constructor(private readonly db: Database) {}

  async listEvidence(owner: LearningOwner, lessonId: string, beforeId?: string) {
    const scope = and(
      eq(lessonEvidence.userId, owner.userId),
      eq(lessonEvidence.lessonId, lessonId),
    )
    const [cursor] = beforeId
      ? await this.db
          // Preserve PostgreSQL microseconds when comparing the next page.
          .select({
            id: lessonEvidence.id,
            createdAt: sql<string>`${lessonEvidence.createdAt}::text`,
          })
          .from(lessonEvidence)
          .where(and(scope, eq(lessonEvidence.id, beforeId)))
          .limit(1)
      : []
    if (beforeId && !cursor) return []
    const rows = await this.db
      .select({
        id: lessonEvidence.id,
        kind: lessonEvidence.kind,
        blockId: lessonEvidence.blockId,
        sectionId: lessonEvidence.sectionId,
        revision: lessonEvidence.revision,
        createdAt: lessonEvidence.createdAt,
        payload: sql<unknown>`jsonb_build_object('sectionTitle', ${lessonEvidence.payload}->'sectionTitle', 'blockTitle', coalesce(${lessonEvidence.payload}->'definition'->'title', ${lessonEvidence.payload}->'definition'->'initialProject'->'name'), 'score', coalesce(${lessonEvidence.payload}->'score', ${lessonEvidence.payload}->'attempt'->'score'), 'passed', coalesce(${lessonEvidence.payload}->'passed', ${lessonEvidence.payload}->'attempt'->'passed'), 'results', ${lessonEvidence.payload}->'results', 'checks', ${lessonEvidence.payload}->'checks')`,
      })
      .from(lessonEvidence)
      .where(
        and(
          scope,
          cursor
            ? or(
                lt(lessonEvidence.createdAt, sql`${cursor.createdAt}::timestamptz`),
                and(
                  eq(lessonEvidence.createdAt, sql`${cursor.createdAt}::timestamptz`),
                  lt(lessonEvidence.id, cursor.id),
                ),
              )
            : undefined,
        ),
      )
      .orderBy(desc(lessonEvidence.createdAt), desc(lessonEvidence.id))
      .limit(101)
    return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))
  }
  async getEvidence(owner: LearningOwner, lessonId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(lessonEvidence)
      .where(
        and(
          eq(lessonEvidence.userId, owner.userId),
          eq(lessonEvidence.lessonId, lessonId),
          eq(lessonEvidence.id, id),
        ),
      )
    return row ? { ...row, createdAt: row.createdAt.toISOString() } : null
  }

  private async withOwner<T>(
    owner: LearningOwner,
    work: (tx: Transaction) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      await lockLearningOwner(tx, owner)
      return work(tx)
    })
  }
  private async assertRevision(
    tx: Transaction,
    lessonId: string,
    blockId: string,
    revision: string,
  ) {
    const [block] = await tx
      .select({ revision: lessonBlocks.contentRevision })
      .from(lessonBlocks)
      .where(and(eq(lessonBlocks.id, blockId), eq(lessonBlocks.lessonId, lessonId)))
      .for('share')
    if (!block) throw new LessonNotFoundError()
    if (block.revision !== revision) throw new LearningConflictError()
  }
  async getSectionProgress(
    owner: LearningOwner,
    lessonId: string,
  ): Promise<SectionProgressRecord[]> {
    const rows = await this.db
      .select()
      .from(lessonSectionProgress)
      .where(
        and(
          eq(lessonSectionProgress.userId, owner.userId),
          eq(lessonSectionProgress.accountId, owner.accountId),
          eq(lessonSectionProgress.lessonId, lessonId),
        ),
      )
    return rows.map((r) => ({
      sectionId: r.sectionId,
      revision: r.revision,
      completedAt: r.completedAt?.toISOString() ?? null,
      projectPassed: r.projectPassed,
    }))
  }
  async saveSectionProgress(
    owner: LearningOwner,
    lessonId: string,
    structureRevision: string,
    records: SectionProgressRecord[],
    blockRevisions: { id: string; revision: string }[],
    evidence?: import('@sistemazero/core/learning').LessonEvidence,
  ) {
    if (!records.length) return
    await this.withOwner(owner, async (tx) => {
      await lockLessonStructure(tx, lessonId)
      const [structure] = await tx
        .select()
        .from(lessonStructures)
        .where(eq(lessonStructures.lessonId, lessonId))
      if (
        !structure ||
        structure.revision !== structureRevision ||
        records.some((r) => !structure.sections.some((s) => s.id === r.sectionId))
      )
        throw new LearningConflictError()
      for (const b of blockRevisions) await this.assertRevision(tx, lessonId, b.id, b.revision)
      if (evidence)
        await tx
          .insert(lessonEvidence)
          .values({ ...evidence, ...owner, lessonId, createdAt: new Date(evidence.createdAt) })
      for (const r of records) {
        await tx
          .insert(lessonSectionProgress)
          .values({
            ...owner,
            lessonId,
            ...r,
            completedAt: r.completedAt ? new Date(r.completedAt) : null,
          })
          .onConflictDoUpdate({
            target: [
              lessonSectionProgress.userId,
              lessonSectionProgress.lessonId,
              lessonSectionProgress.sectionId,
            ],
            set: {
              revision: r.revision,
              completedAt: r.completedAt ? new Date(r.completedAt) : null,
              projectPassed: sql`case when ${lessonSectionProgress.revision} = ${r.revision} then ${lessonSectionProgress.projectPassed} or ${r.projectPassed} else ${r.projectPassed} end`,
            },
            setWhere: and(
              eq(lessonSectionProgress.accountId, owner.accountId),
              sql`${lessonSectionProgress.completedAt} is null`,
            ),
          })
      }
    })
  }
  async getStructure(lessonId: string) {
    const [row] = await this.db
      .select()
      .from(lessonStructures)
      .where(eq(lessonStructures.lessonId, lessonId))
    return row
      ? { revision: row.revision, sections: row.sections, supportBlockIds: row.supportBlockIds }
      : null
  }
  async saveStructure(
    lessonId: string,
    expectedRevision: string | null,
    sections: LessonSection[],
  ) {
    return this.db.transaction(async (tx) => {
      await lockLessonStructure(tx, lessonId)
      const [lesson] = await tx.select().from(lessons).where(eq(lessons.id, lessonId))
      if (!lesson) throw new LessonNotFoundError()
      const blocks = await tx.select().from(lessonBlocks).where(eq(lessonBlocks.lessonId, lessonId))
      const invalid = validateLessonSections(sections, blocks)
      if (invalid) throw new ValidationError(invalid)
      if (lesson.isPublished && sections.some((s) => s.pendingMedia.length))
        throw new ValidationError('Despublique a aula antes de marcar mídias pendentes.')
      const revision = randomUUID()
      if (expectedRevision === null) {
        const [saved] = await tx
          .insert(lessonStructures)
          .values({ lessonId, revision, sections })
          .onConflictDoNothing()
          .returning()
        return saved ? { revision, sections } : null
      }
      const [saved] = await tx
        .update(lessonStructures)
        .set({ revision, sections })
        .where(
          and(
            eq(lessonStructures.lessonId, lessonId),
            eq(lessonStructures.revision, expectedRevision),
          ),
        )
        .returning()
      return saved ? { revision, sections } : null
    })
  }
  async getProgress(owner: LearningOwner, lessonId: string) {
    const [navigation, blocks] = await Promise.all([
      this.db
        .select()
        .from(lessonNavigation)
        .where(
          and(
            eq(lessonNavigation.userId, owner.userId),
            eq(lessonNavigation.accountId, owner.accountId),
            eq(lessonNavigation.lessonId, lessonId),
          ),
        )
        .limit(1),
      this.db
        .select()
        .from(lessonBlockProgress)
        .where(and(owned(owner), eq(lessonBlockProgress.lessonId, lessonId))),
    ])
    return { sectionId: navigation[0]?.sectionId ?? null, blocks: blocks.map(progressView) }
  }
  async saveNavigation(owner: LearningOwner, lessonId: string, sectionId: string) {
    await this.withOwner(owner, async (tx) => {
      await lockLessonStructure(tx, lessonId)
      const [structure] = await tx
        .select()
        .from(lessonStructures)
        .where(eq(lessonStructures.lessonId, lessonId))
      if (structure && !structure.sections.some((s) => s.id === sectionId))
        throw new LearningConflictError()
      await tx
        .insert(lessonNavigation)
        .values({ ...owner, lessonId, sectionId, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: [lessonNavigation.userId, lessonNavigation.lessonId],
          set: { sectionId, updatedAt: new Date() },
          setWhere: eq(lessonNavigation.accountId, owner.accountId),
        })
    })
  }
  async saveProgress(input: SaveLearningProgress) {
    return this.withOwner(input, async (tx) => {
      const p = input.progress
      await this.assertRevision(tx, input.lessonId, p.blockId, p.revision)
      const [row] = await tx
        .insert(lessonBlockProgress)
        .values({
          ...input.progress,
          userId: input.userId,
          accountId: input.accountId,
          lessonId: input.lessonId,
          updatedAt: new Date(p.updatedAt),
        })
        .onConflictDoUpdate({
          target: [lessonBlockProgress.userId, lessonBlockProgress.blockId],
          set: {
            revision: p.revision,
            positionSeconds: p.positionSeconds,
            answers: p.answers,
            hintsUsed: sql`case when ${lessonBlockProgress.revision} = ${p.revision} then greatest(${lessonBlockProgress.hintsUsed}, ${p.hintsUsed}) else ${p.hintsUsed} end`,
            updatedAt: new Date(p.updatedAt),
            result: sql`case when ${lessonBlockProgress.revision} = ${p.revision} then ${lessonBlockProgress.result} else null end`,
            attemptsCount: sql`case when ${lessonBlockProgress.revision} = ${p.revision} then ${lessonBlockProgress.attemptsCount} else 0 end`,
          },
          setWhere: eq(lessonBlockProgress.accountId, input.accountId),
        })
        .returning()
      if (!row) throw new LessonNotFoundError()
      return progressView(row)
    })
  }
  async findAttempt(owner: LearningOwner, id: string) {
    const [row] = await this.db
      .select()
      .from(learningAttempts)
      .where(
        and(
          eq(learningAttempts.id, id),
          eq(learningAttempts.userId, owner.userId),
          eq(learningAttempts.accountId, owner.accountId),
        ),
      )
    return row ? attemptView(row) : null
  }
  async recordAttempt(owner: LearningOwner, lessonId: string, attempt: LearningAttemptView) {
    return this.withOwner(owner, async (tx) => {
      await this.assertRevision(tx, lessonId, attempt.blockId, attempt.revision)
      const [inserted] = await tx
        .insert(learningAttempts)
        .values({ ...attempt, ...owner, lessonId, createdAt: new Date(attempt.createdAt) })
        .onConflictDoNothing()
        .returning({ id: learningAttempts.id })
      if (!inserted) {
        const [existing] = await tx
          .select()
          .from(learningAttempts)
          .where(
            and(
              eq(learningAttempts.id, attempt.id),
              eq(learningAttempts.userId, owner.userId),
              eq(learningAttempts.accountId, owner.accountId),
              eq(learningAttempts.blockId, attempt.blockId),
            ),
          )
        if (!existing) throw new LessonNotFoundError()
        if (existing.revision !== attempt.revision) throw new LearningConflictError()
        const [row] = await tx
          .select()
          .from(lessonBlockProgress)
          .where(and(owned(owner), eq(lessonBlockProgress.blockId, attempt.blockId)))
        if (!row) throw new LearningConflictError()
        return progressView(row)
      }
      const [row] = await tx
        .insert(lessonBlockProgress)
        .values({
          ...owner,
          lessonId,
          blockId: attempt.blockId,
          revision: attempt.revision,
          positionSeconds: null,
          answers: attempt.answers,
          hintsUsed: attempt.hintsUsed,
          attemptsCount: 1,
          result: attempt.result,
          updatedAt: new Date(attempt.createdAt),
        })
        .onConflictDoUpdate({
          target: [lessonBlockProgress.userId, lessonBlockProgress.blockId],
          set: {
            revision: attempt.revision,
            answers: attempt.answers,
            hintsUsed: sql`case when ${lessonBlockProgress.revision} = ${attempt.revision} then greatest(${lessonBlockProgress.hintsUsed}, ${attempt.hintsUsed}) else ${attempt.hintsUsed} end`,
            attemptsCount: sql`case when ${lessonBlockProgress.revision} = ${attempt.revision} then ${lessonBlockProgress.attemptsCount} + 1 else 1 end`,
            result: sql`case when ${lessonBlockProgress.revision} = ${attempt.revision} and ${lessonBlockProgress.result}->>'passed' = 'true' then ${lessonBlockProgress.result} else ${JSON.stringify(attempt.result)}::jsonb end`,
            updatedAt: new Date(attempt.createdAt),
          },
          setWhere: eq(lessonBlockProgress.accountId, owner.accountId),
        })
        .returning()
      if (!row) throw new LessonNotFoundError()
      return progressView(row)
    })
  }
  async listAttempts(owner: LearningOwner, lessonId: string) {
    return (
      await this.db
        .select()
        .from(learningAttempts)
        .where(
          and(
            eq(learningAttempts.userId, owner.userId),
            eq(learningAttempts.accountId, owner.accountId),
            eq(learningAttempts.lessonId, lessonId),
          ),
        )
        .orderBy(desc(learningAttempts.createdAt), desc(learningAttempts.id))
        .limit(200)
    ).map(attemptView)
  }
  async listActiveAccounts(audience: CourseAudience, since: Date, until: Date) {
    const rows = await this.db
      .selectDistinct({ accountId: lessonBlockProgress.accountId })
      .from(lessonBlockProgress)
      .innerJoin(lessons, eq(lessons.id, lessonBlockProgress.lessonId))
      .innerJoin(courses, eq(courses.id, lessons.courseId))
      .where(
        and(
          eq(courses.audience, audience),
          eq(courses.status, 'published'),
          eq(lessons.isPublished, true),
          gte(lessonBlockProgress.updatedAt, since),
          lte(lessonBlockProgress.updatedAt, until),
        ),
      )
    return rows.map((row) => row.accountId)
  }
  async weeklyTopics(
    accountId: string,
    userId: string,
    audience: CourseAudience,
    since: Date,
    until: Date,
  ) {
    const rows = await this.db
      .select({
        lessonId: lessons.id,
        lessonTitle: lessons.title,
        sections: lessonStructures.sections,
        blockId: lessonBlockProgress.blockId,
      })
      .from(lessonBlockProgress)
      .innerJoin(lessons, eq(lessons.id, lessonBlockProgress.lessonId))
      .innerJoin(courses, eq(courses.id, lessons.courseId))
      .innerJoin(lessonStructures, eq(lessonStructures.lessonId, lessons.id))
      .innerJoin(
        lessonBlocks,
        and(
          eq(lessonBlocks.id, lessonBlockProgress.blockId),
          eq(lessonBlocks.contentRevision, lessonBlockProgress.revision),
        ),
      )
      .where(
        and(
          eq(lessonBlockProgress.userId, userId),
          eq(lessonBlockProgress.accountId, accountId),
          gte(lessonBlockProgress.updatedAt, since),
          lte(lessonBlockProgress.updatedAt, until),
          eq(courses.audience, audience),
          eq(courses.status, 'published'),
          eq(lessons.isPublished, true),
        ),
      )
      .orderBy(asc(lessons.sortOrder))
      .limit(500)
    const topics = new Map<string, { lessonId: string; lessonTitle: string; topics: string[] }>()
    for (const row of rows) {
      const lesson = topics.get(row.lessonId) ?? {
        lessonId: row.lessonId,
        lessonTitle: row.lessonTitle,
        topics: [],
      }
      for (const section of row.sections.filter((s) => s.blockIds.includes(row.blockId))) {
        const topic = section.objective || section.title
        if (!lesson.topics.includes(topic)) lesson.topics.push(topic)
      }
      topics.set(row.lessonId, lesson)
    }
    return [...topics.values()]
  }
  async listProfileIdsByAccount(accountId: string, audience: CourseAudience) {
    const rows = await this.db
      .selectDistinct({ userId: lessonBlockProgress.userId })
      .from(lessonBlockProgress)
      .innerJoin(lessons, eq(lessons.id, lessonBlockProgress.lessonId))
      .innerJoin(courses, eq(courses.id, lessons.courseId))
      .where(
        and(
          eq(lessonBlockProgress.accountId, accountId),
          eq(courses.audience, audience),
          eq(courses.status, 'published'),
          eq(lessons.isPublished, true),
        ),
      )
    return rows.map((row) => row.userId)
  }
}
