import { randomUUID } from 'node:crypto'
import { and, asc, desc, eq, inArray, ne, or, sql } from 'drizzle-orm'
import type {
  PublishedZappyBlock,
  ZappyKnowledgeHit,
  ZappyKnowledgeReport,
  ZappyKnowledgeRepository,
  ZappyKnowledgeSourceInput,
  ZappyKnowledgeSourceType,
} from '../../../domain/ports/zappy-knowledge-repository.port'
import { lessonsMissingVideoTranscript } from '../../../domain/zappy/zappy-knowledge-report'
import type { Database } from './db'
import {
  courses,
  lessonBlocks,
  lessons,
  zappyKnowledgeChunks,
  zappyKnowledgeSources,
} from './schema'

export class DrizzleZappyKnowledgeRepository implements ZappyKnowledgeRepository {
  constructor(private readonly db: Database) {}

  async courseIdForLesson(lessonId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ courseId: lessons.courseId })
      .from(lessons)
      .where(eq(lessons.id, lessonId))
      .limit(1)
    return row?.courseId ?? null
  }

  async upsert(input: ZappyKnowledgeSourceInput): Promise<{ id: string; changed: boolean }> {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`zappy-kb:${input.sourceRef}`}, 0))`,
      )
      // Um bloco pode mudar de tipo (texto → vídeo → PDF). A referência é a
      // identidade estável; remova a versão antiga para ela nunca seguir pesquisável.
      await tx
        .delete(zappyKnowledgeSources)
        .where(
          and(
            eq(zappyKnowledgeSources.sourceRef, input.sourceRef),
            ne(zappyKnowledgeSources.sourceType, input.sourceType),
          ),
        )
      const [existing] = await tx
        .select({
          id: zappyKnowledgeSources.id,
          contentHash: zappyKnowledgeSources.contentHash,
          status: zappyKnowledgeSources.status,
          error: zappyKnowledgeSources.error,
        })
        .from(zappyKnowledgeSources)
        .where(
          and(
            eq(zappyKnowledgeSources.lessonId, input.lessonId),
            eq(zappyKnowledgeSources.sourceType, input.sourceType),
            eq(zappyKnowledgeSources.sourceRef, input.sourceRef),
          ),
        )
        .limit(1)
      if (
        existing?.contentHash === input.contentHash &&
        existing.status === input.status &&
        existing.error === (input.error ?? null)
      ) {
        return { id: existing.id, changed: false }
      }

      const id = existing?.id ?? randomUUID()
      if (existing) {
        await tx
          .update(zappyKnowledgeSources)
          .set({
            courseId: input.courseId,
            contentHash: input.contentHash,
            status: input.status,
            error: input.error ?? null,
            updatedAt: input.now,
          })
          .where(eq(zappyKnowledgeSources.id, id))
        await tx.delete(zappyKnowledgeChunks).where(eq(zappyKnowledgeChunks.sourceId, id))
      } else {
        await tx.insert(zappyKnowledgeSources).values({
          id,
          courseId: input.courseId,
          lessonId: input.lessonId,
          sourceType: input.sourceType,
          sourceRef: input.sourceRef,
          contentHash: input.contentHash,
          status: input.status,
          error: input.error ?? null,
          createdAt: input.now,
          updatedAt: input.now,
        })
      }
      if (input.chunks.length > 0) {
        await tx.insert(zappyKnowledgeChunks).values(
          input.chunks.map((chunk, position) => ({
            id: randomUUID(),
            sourceId: id,
            position,
            content: chunk.content,
            normalizedText: chunk.normalizedText,
          })),
        )
      }
      return { id, changed: true }
    })
  }

  async deleteByRef(sourceRef: string): Promise<void> {
    await this.db
      .delete(zappyKnowledgeSources)
      .where(eq(zappyKnowledgeSources.sourceRef, sourceRef))
  }

  async search(lessonIds: string[], query: string, limit: number): Promise<ZappyKnowledgeHit[]> {
    if (lessonIds.length === 0 || !query) return []
    const tsQuery = sql`websearch_to_tsquery('portuguese', ${query})`
    const vector = sql`to_tsvector('portuguese', ${zappyKnowledgeChunks.normalizedText})`
    const rank = sql<number>`ts_rank(${vector}, ${tsQuery})`
    const rows = await this.db
      .select({
        courseId: courses.id,
        courseSlug: courses.slug,
        courseTitle: courses.title,
        lessonId: lessons.id,
        lessonTitle: lessons.title,
        sourceType: zappyKnowledgeSources.sourceType,
        content: zappyKnowledgeChunks.content,
        rank,
      })
      .from(zappyKnowledgeChunks)
      .innerJoin(zappyKnowledgeSources, eq(zappyKnowledgeSources.id, zappyKnowledgeChunks.sourceId))
      .innerJoin(lessons, eq(lessons.id, zappyKnowledgeSources.lessonId))
      .innerJoin(courses, eq(courses.id, zappyKnowledgeSources.courseId))
      .where(
        and(
          inArray(zappyKnowledgeSources.lessonId, lessonIds),
          eq(zappyKnowledgeSources.status, 'ready'),
          eq(lessons.isPublished, true),
          eq(courses.status, 'published'),
          or(
            sql`${vector} @@ ${tsQuery}`,
            sql`${zappyKnowledgeChunks.normalizedText} ilike ${`%${query}%`}`,
          ),
        ),
      )
      .orderBy(desc(rank), asc(zappyKnowledgeChunks.position))
      .limit(Math.max(1, Math.min(10, limit)))
    return rows.map((row) => ({
      courseId: row.courseId,
      courseSlug: row.courseSlug,
      courseTitle: row.courseTitle,
      lessonId: row.lessonId,
      lessonTitle: row.lessonTitle,
      sourceType: row.sourceType as ZappyKnowledgeSourceType,
      content: row.content,
    }))
  }

  async listPublishedKidsBlocks(): Promise<PublishedZappyBlock[]> {
    const rows = await this.db
      .select({
        blockId: lessonBlocks.id,
        courseId: courses.id,
        lessonId: lessons.id,
        kind: lessonBlocks.kind,
        content: lessonBlocks.content,
      })
      .from(lessonBlocks)
      .innerJoin(lessons, eq(lessons.id, lessonBlocks.lessonId))
      .innerJoin(courses, eq(courses.id, lessons.courseId))
      .where(
        and(
          eq(courses.audience, 'kids'),
          eq(courses.status, 'published'),
          eq(lessons.isPublished, true),
        ),
      )
      .orderBy(asc(courses.id), asc(lessons.sortOrder), asc(lessonBlocks.sortOrder))
    return rows
  }

  async report(): Promise<ZappyKnowledgeReport> {
    const [lessonRows, blockRows, sourceRows] = await Promise.all([
      this.db
        .select({
          courseId: courses.id,
          courseTitle: courses.title,
          lessonId: lessons.id,
          lessonTitle: lessons.title,
        })
        .from(lessons)
        .innerJoin(courses, eq(courses.id, lessons.courseId))
        .where(
          and(
            eq(courses.audience, 'kids'),
            eq(courses.status, 'published'),
            eq(lessons.isPublished, true),
          ),
        ),
      this.listPublishedKidsBlocks(),
      this.db
        .select({
          courseId: zappyKnowledgeSources.courseId,
          lessonId: zappyKnowledgeSources.lessonId,
          courseTitle: courses.title,
          lessonTitle: lessons.title,
          sourceRef: zappyKnowledgeSources.sourceRef,
          sourceType: zappyKnowledgeSources.sourceType,
          status: zappyKnowledgeSources.status,
          error: zappyKnowledgeSources.error,
        })
        .from(zappyKnowledgeSources)
        .innerJoin(courses, eq(courses.id, zappyKnowledgeSources.courseId))
        .innerJoin(lessons, eq(lessons.id, zappyKnowledgeSources.lessonId))
        .where(
          and(
            eq(courses.audience, 'kids'),
            eq(courses.status, 'published'),
            eq(lessons.isPublished, true),
          ),
        ),
    ])
    const readyVideoSourceRefs = new Set(
      sourceRows
        .filter((source) => source.status === 'ready' && source.sourceType === 'video-vtt')
        .map((source) => source.sourceRef),
    )
    const lessonsWithVideoWithoutTranscript = lessonsMissingVideoTranscript(
      lessonRows,
      blockRows,
      readyVideoSourceRefs,
    )
    const courseMap = new Map(
      lessonRows.map((lesson) => [
        lesson.courseId,
        { courseId: lesson.courseId, courseTitle: lesson.courseTitle },
      ]),
    )
    const coursesWithNotebook = new Set(
      sourceRows
        .filter((source) => source.sourceType === 'student-notebook' && source.status === 'ready')
        .map((source) => source.courseId),
    )
    return {
      publishedKidsLessons: lessonRows.length,
      readySources: sourceRows.filter((source) => source.status === 'ready').length,
      errorSources: sourceRows.filter(
        (source) => source.status === 'error' || source.status === 'empty',
      ).length,
      pendingSources: sourceRows.filter((source) => source.status === 'pending').length,
      lessonsWithVideoWithoutTranscript,
      coursesWithoutStudentNotebook: [...courseMap.values()].filter(
        (course) => !coursesWithNotebook.has(course.courseId),
      ),
      failedSources: sourceRows.flatMap((source) =>
        (source.status === 'error' || source.status === 'empty') && source.error
          ? [
              {
                sourceRef: source.sourceRef,
                sourceType: source.sourceType as ZappyKnowledgeSourceType,
                courseTitle: source.courseTitle,
                lessonTitle: source.lessonTitle,
                error: source.error,
              },
            ]
          : [],
      ),
    }
  }
}
