import { type CourseModality, courseModalityOf } from '@sistemazero/core/course/modality'
import type { LiveStudioConfig } from '@sistemazero/core/live'
import { and, asc, eq, inArray, ne } from 'drizzle-orm'
import type {
  LiveCoursePort,
  LiveCourseRecord,
  LiveLessonSections,
  LiveStudioBlockRecord,
} from '../../../domain/ports/live-course.port'
import type { Database } from './db'
import {
  courses,
  activeLessonBlocks as lessonBlocks,
  lessonStructures,
  lessons,
  modules,
} from './schema'

type CourseRow = typeof courses.$inferSelect

/**
 * PONTO ÚNICO de leitura da modalidade do curso pelas oficinas. A coluna `modality` chega pela
 * migration 0109 (frente "curso"); até lá, um curso ao vivo se declara em `metadata.modality`.
 * Com a coluna presente, ela manda (o padrão dela é `recorded`). Quando a coluna existir em
 * todo lugar, troque por `courseModalityOf(row.modality)` e filtre no SQL.
 */
export function courseModality(row: {
  metadata?: Record<string, unknown> | null
  modality?: unknown
}): CourseModality {
  return courseModalityOf(row.modality ?? row.metadata?.modality)
}

function studioConfig(content: Record<string, unknown>): LiveStudioConfig {
  const config: LiveStudioConfig = {}
  if (typeof content.level === 'string') config.level = content.level
  if (Array.isArray(content.allowBlocks))
    config.allowBlocks = content.allowBlocks.filter((item) => typeof item === 'string')
  if (Array.isArray(content.allowCategories))
    config.allowCategories = content.allowCategories.filter((item) => typeof item === 'string')
  if (Array.isArray(content.allowedModes))
    config.allowedModes = content.allowedModes.filter(
      (mode): mode is 'blocks' | 'bridge' | 'code' =>
        mode === 'blocks' || mode === 'bridge' || mode === 'code',
    )
  if (typeof content.allowLevelReveal === 'boolean')
    config.allowLevelReveal = content.allowLevelReveal
  return config
}

/** Leitura dos cursos AO VIVO e das aulas PUBLICADAS para as oficinas (sem escrita). */
export class DrizzleLiveCourseRepository implements LiveCoursePort {
  constructor(private readonly db: Database) {}

  private async publishedLessons(courseIds: string[]) {
    if (!courseIds.length) return new Map<string, { id: string; title: string }[]>()
    const rows = await this.db
      .select({ id: lessons.id, title: lessons.title, courseId: lessons.courseId })
      .from(lessons)
      .innerJoin(modules, eq(modules.id, lessons.moduleId))
      .where(and(inArray(lessons.courseId, courseIds), eq(lessons.isPublished, true)))
      .orderBy(asc(modules.sortOrder), asc(lessons.sortOrder))
    const byCourse = new Map<string, { id: string; title: string }[]>()
    for (const row of rows) {
      const list = byCourse.get(row.courseId) ?? []
      list.push({ id: row.id, title: row.title })
      byCourse.set(row.courseId, list)
    }
    return byCourse
  }

  private async records(rows: CourseRow[]): Promise<LiveCourseRecord[]> {
    const lessonsByCourse = await this.publishedLessons(rows.map((row) => row.id))
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      audience: row.audience,
      description: row.description ?? '',
      coverImageUrl: row.coverImageUrl,
      status: row.status,
      modality: courseModality(row),
      lessons: lessonsByCourse.get(row.id) ?? [],
    }))
  }

  async findCourse(courseId: string) {
    const rows = await this.db.select().from(courses).where(eq(courses.id, courseId)).limit(1)
    return (await this.records(rows))[0] ?? null
  }

  async listLiveCourses(filter: { ids?: string[]; audience?: 'adult' | 'kids' }) {
    if (filter.ids && !filter.ids.length) return []
    const rows = await this.db
      .select()
      .from(courses)
      .where(
        and(
          ne(courses.status, 'archived'),
          filter.ids ? inArray(courses.id, filter.ids) : undefined,
          filter.audience ? eq(courses.audience, filter.audience) : undefined,
        ),
      )
      .orderBy(asc(courses.title), asc(courses.id))
    // A modalidade é filtrada aqui (e não no SQL) enquanto a coluna pode não existir.
    return this.records(rows.filter((row) => courseModality(row) === 'live'))
  }

  async lessonSections(lessonId: string): Promise<LiveLessonSections | null> {
    const [lesson] = await this.db
      .select({ id: lessons.id, courseId: lessons.courseId, published: lessons.isPublished })
      .from(lessons)
      .where(eq(lessons.id, lessonId))
      .limit(1)
    if (!lesson) return null
    const [structure] = await this.db
      .select({ sections: lessonStructures.sections })
      .from(lessonStructures)
      .where(eq(lessonStructures.lessonId, lessonId))
    return {
      lessonId: lesson.id,
      courseId: lesson.courseId,
      published: lesson.published,
      // Sem estrutura gravada, a aula publicada tem UMA parte, com o id da aula
      // (`defaultLessonSection`, a mesma régua do player).
      sectionIds: structure?.sections.map((section) => section.id) ?? [lesson.id],
    }
  }

  async studioBlock(lessonId: string, blockId: string): Promise<LiveStudioBlockRecord | null> {
    const [row] = await this.db
      .select({
        blockId: lessonBlocks.id,
        lessonId: lessonBlocks.lessonId,
        kind: lessonBlocks.kind,
        content: lessonBlocks.content,
        courseId: lessons.courseId,
        published: lessons.isPublished,
      })
      .from(lessonBlocks)
      .innerJoin(lessons, eq(lessons.id, lessonBlocks.lessonId))
      .where(and(eq(lessonBlocks.id, blockId), eq(lessonBlocks.lessonId, lessonId)))
      .limit(1)
    if (row?.kind !== 'studio' || !row.published || row.content.kind !== 'studio') return null
    const content = row.content as unknown as Record<string, unknown>
    const chain = typeof content.chain === 'string' ? content.chain.trim() : ''
    return {
      blockId: row.blockId,
      lessonId: row.lessonId,
      courseId: row.courseId,
      chain: chain || null,
      initialProject: row.content.initialProject,
      studio: studioConfig(content),
    }
  }
}
