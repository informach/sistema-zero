import { randomUUID } from 'node:crypto'
import { and, asc, desc, eq, gt, inArray, like, ne, or, sql } from 'drizzle-orm'
import type {
  PublishedZappyBlock,
  ZappyKnowledgeHit,
  ZappyKnowledgeReport,
  ZappyKnowledgeRepository,
  ZappyKnowledgeSourceInput,
  ZappyKnowledgeSourceType,
} from '../../../domain/ports/zappy-knowledge-repository.port'
import {
  coursesMissingStudentNotebook,
  lessonsMissingVideoTranscript,
} from '../../../domain/zappy/zappy-knowledge-report'
import type { Database } from './db'
import {
  courses,
  lessonBlocks,
  lessons,
  zappyKnowledgeChunks,
  zappyKnowledgeSources,
} from './schema'

interface ComparableZappySource {
  id: string
  courseId: string
  lessonId: string
  blockId: string | null
  blockRevision: string | null
  contentHash: string
  status: string
  error: string | null
}

export function zappyKnowledgeSourceUnchanged(
  existing: ComparableZappySource,
  input: ZappyKnowledgeSourceInput,
): boolean {
  return (
    existing.courseId === input.courseId &&
    existing.lessonId === input.lessonId &&
    existing.blockId === input.blockId &&
    existing.blockRevision === input.blockRevision &&
    existing.contentHash === input.contentHash &&
    existing.status === input.status &&
    existing.error === (input.error ?? null)
  )
}

export function effectiveZappyKnowledgeStatus(input: {
  status: string
  blockRevision: string | null
  authoritativeBlockRevision: string
}): string {
  return input.blockRevision === input.authoritativeBlockRevision ? input.status : 'pending'
}

export class DrizzleZappyKnowledgeRepository implements ZappyKnowledgeRepository {
  constructor(private readonly db: Database) {}

  async blockAuthorityForSource(sourceRef: string) {
    const [row] = await this.db
      .select({
        blockId: lessonBlocks.id,
        courseId: courses.id,
        lessonId: lessons.id,
        blockRevision: lessonBlocks.contentRevision,
      })
      .from(lessonBlocks)
      .innerJoin(lessons, eq(lessons.id, lessonBlocks.lessonId))
      .innerJoin(courses, eq(courses.id, lessons.courseId))
      .where(sql`${sourceRef} = 'block:' || ${lessonBlocks.id}::text`)
      .limit(1)
    return row ?? null
  }

  async upsert(input: ZappyKnowledgeSourceInput): Promise<{ id: string; changed: boolean } | null> {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`zappy-kb:${input.sourceRef}`}, 0))`,
      )
      // Serializa contra a edição do bloco e revalida a autoridade na MESMA
      // transação da escrita. Isso fecha a janela em que uma extração antiga
      // podia sobrescrever uma revisão mais nova depois do primeiro SELECT.
      const [authority] = await tx
        .select({
          blockId: lessonBlocks.id,
          courseId: courses.id,
          lessonId: lessons.id,
          blockRevision: lessonBlocks.contentRevision,
        })
        .from(lessonBlocks)
        .innerJoin(lessons, eq(lessons.id, lessonBlocks.lessonId))
        .innerJoin(courses, eq(courses.id, lessons.courseId))
        .where(eq(lessonBlocks.id, input.blockId))
        .limit(1)
        .for('update')
      if (
        !authority ||
        input.sourceRef !== `block:${authority.blockId}` ||
        input.courseId !== authority.courseId ||
        input.lessonId !== authority.lessonId ||
        input.blockRevision !== authority.blockRevision
      ) {
        return null
      }
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
          courseId: zappyKnowledgeSources.courseId,
          lessonId: zappyKnowledgeSources.lessonId,
          blockId: zappyKnowledgeSources.blockId,
          blockRevision: zappyKnowledgeSources.blockRevision,
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
      if (existing && zappyKnowledgeSourceUnchanged(existing, input)) {
        return { id: existing.id, changed: false }
      }

      const id = existing?.id ?? randomUUID()
      if (existing) {
        await tx
          .update(zappyKnowledgeSources)
          .set({
            courseId: input.courseId,
            lessonId: input.lessonId,
            blockId: input.blockId,
            blockRevision: input.blockRevision,
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
          blockId: input.blockId,
          blockRevision: input.blockRevision,
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

  async reconcilePublishedBlockSources(): Promise<number> {
    // O anti-join consulta o estado ATUAL dentro do próprio DELETE. Um bloco
    // publicado durante o backfill deixa de correr o risco de ser apagado por
    // uma lista de refs capturada antes da edição concorrente.
    const authoritativeBlockExists = sql`exists (
      select 1
      from ${lessonBlocks}
      inner join ${lessons} on ${lessons.id} = ${lessonBlocks.lessonId}
      inner join ${courses} on ${courses.id} = ${lessons.courseId}
      where ${zappyKnowledgeSources.sourceRef} = 'block:' || ${lessonBlocks.id}::text
        and ${courses.audience} = 'kids'
        and ${courses.status} = 'published'
        and ${lessons.isPublished} = true
        and (
          (${zappyKnowledgeSources.sourceType} = 'rich-text' and ${lessonBlocks.content}->>'kind' = 'rich_text')
          or (${zappyKnowledgeSources.sourceType} = 'video-vtt' and ${lessonBlocks.content}->>'kind' = 'video')
          or (
            ${zappyKnowledgeSources.sourceType} = 'student-notebook'
            and ${lessonBlocks.content}->>'kind' = 'ebook'
            and coalesce((${lessonBlocks.content}->>'zappyStudentNotebook')::boolean, false)
          )
        )
    )`
    const deleted = await this.db
      .delete(zappyKnowledgeSources)
      .where(
        and(like(zappyKnowledgeSources.sourceRef, 'block:%'), sql`not ${authoritativeBlockExists}`),
      )
      .returning({ id: zappyKnowledgeSources.id })
    return deleted.length
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
      .innerJoin(lessonBlocks, eq(lessonBlocks.id, zappyKnowledgeSources.blockId))
      .innerJoin(lessons, eq(lessons.id, zappyKnowledgeSources.lessonId))
      .innerJoin(courses, eq(courses.id, zappyKnowledgeSources.courseId))
      .where(
        and(
          inArray(zappyKnowledgeSources.lessonId, lessonIds),
          eq(zappyKnowledgeSources.status, 'ready'),
          eq(lessonBlocks.lessonId, zappyKnowledgeSources.lessonId),
          eq(zappyKnowledgeSources.blockRevision, lessonBlocks.contentRevision),
          or(
            and(
              eq(zappyKnowledgeSources.sourceType, 'rich-text'),
              sql`${lessonBlocks.content}->>'kind' = 'rich_text'`,
            ),
            and(
              eq(zappyKnowledgeSources.sourceType, 'video-vtt'),
              sql`${lessonBlocks.content}->>'kind' = 'video'`,
            ),
            and(
              eq(zappyKnowledgeSources.sourceType, 'student-notebook'),
              sql`${lessonBlocks.content}->>'kind' = 'ebook'`,
              sql`coalesce((${lessonBlocks.content}->>'zappyStudentNotebook')::boolean, false)`,
            ),
          ),
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

  async listPublishedKidsBlocks(
    input: { after?: string; limit?: number } = {},
  ): Promise<PublishedZappyBlock[]> {
    const clauses = [
      eq(courses.audience, 'kids'),
      eq(courses.status, 'published'),
      eq(lessons.isPublished, true),
    ]
    if (input.after) clauses.push(gt(lessonBlocks.id, input.after))
    const query = this.db
      .select({
        blockId: lessonBlocks.id,
        courseId: courses.id,
        lessonId: lessons.id,
        blockRevision: lessonBlocks.contentRevision,
        kind: lessonBlocks.kind,
        content: lessonBlocks.content,
      })
      .from(lessonBlocks)
      .innerJoin(lessons, eq(lessons.id, lessonBlocks.lessonId))
      .innerJoin(courses, eq(courses.id, lessons.courseId))
      .where(and(...clauses))
      .orderBy(asc(lessonBlocks.id))
    return input.limit ? query.limit(input.limit) : query
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
          blockRevision: zappyKnowledgeSources.blockRevision,
          authoritativeBlockRevision: lessonBlocks.contentRevision,
        })
        .from(zappyKnowledgeSources)
        .innerJoin(lessonBlocks, eq(lessonBlocks.id, zappyKnowledgeSources.blockId))
        .innerJoin(courses, eq(courses.id, zappyKnowledgeSources.courseId))
        .innerJoin(lessons, eq(lessons.id, zappyKnowledgeSources.lessonId))
        .where(
          and(
            eq(courses.audience, 'kids'),
            eq(courses.status, 'published'),
            eq(lessons.isPublished, true),
            eq(lessonBlocks.lessonId, zappyKnowledgeSources.lessonId),
          ),
        ),
    ])
    const effectiveSources = sourceRows.map((source) => ({
      ...source,
      status: effectiveZappyKnowledgeStatus(source),
    }))
    const readyVideoSourceRefs = new Set(
      effectiveSources
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
    const publishedCourses = [...courseMap.values()]
    return {
      publishedKidsLessons: lessonRows.length,
      readySources: effectiveSources.filter((source) => source.status === 'ready').length,
      errorSources: effectiveSources.filter(
        (source) => source.status === 'error' || source.status === 'empty',
      ).length,
      pendingSources: effectiveSources.filter((source) => source.status === 'pending').length,
      lessonsWithVideoWithoutTranscript,
      coursesWithoutStudentNotebook: coursesMissingStudentNotebook(publishedCourses, blockRows),
      failedSources: effectiveSources.flatMap((source) =>
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
