import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm'
import type {
  Course,
  CourseAudience,
  Lesson,
  LessonAttachment,
  LessonBlock,
  LessonWithContent,
  Module,
  ModuleWithLessons,
} from '../../../domain/course/course'
import { ACCESSIBLE_COURSE_STATUSES } from '../../../domain/course/course'
import type { CourseRepository } from '../../../domain/ports/course-repository.port'
import type { Database } from './db'
import { courses, lessonAttachments, lessonBlocks, lessons, modules } from './schema'

function toCourse(row: typeof courses.$inferSelect): Course {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    coverImageUrl: row.coverImageUrl,
    status: row.status,
    audience: row.audience,
    sequentialLock: row.sequentialLock,
    level: row.level,
    track: row.track,
    metadata: row.metadata ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toModule(row: typeof modules.$inferSelect): Module {
  return {
    id: row.id,
    courseId: row.courseId,
    title: row.title,
    summary: row.summary,
    sortOrder: row.sortOrder,
  }
}

function toLesson(row: typeof lessons.$inferSelect): Lesson {
  return {
    id: row.id,
    moduleId: row.moduleId,
    courseId: row.courseId,
    slug: row.slug,
    title: row.title,
    sortOrder: row.sortOrder,
    estimatedMinutes: row.estimatedMinutes,
    isPublished: row.isPublished,
  }
}

function toBlock(row: typeof lessonBlocks.$inferSelect): LessonBlock {
  return {
    id: row.id,
    lessonId: row.lessonId,
    kind: row.kind,
    sortOrder: row.sortOrder,
    content: row.content,
  }
}

function toAttachment(row: typeof lessonAttachments.$inferSelect): LessonAttachment {
  return {
    id: row.id,
    lessonId: row.lessonId,
    label: row.label,
    url: row.url,
    fileType: row.fileType,
    sizeBytes: row.sizeBytes,
    sortOrder: row.sortOrder,
  }
}

export class DrizzleCourseRepository implements CourseRepository {
  constructor(private readonly db: Database) {}

  async findCourseBySlug(slug: string): Promise<Course | null> {
    const [row] = await this.db.select().from(courses).where(eq(courses.slug, slug)).limit(1)
    return row ? toCourse(row) : null
  }

  async findCourseById(id: string): Promise<Course | null> {
    const [row] = await this.db.select().from(courses).where(eq(courses.id, id)).limit(1)
    return row ? toCourse(row) : null
  }

  async findLesson(lessonId: string): Promise<Lesson | null> {
    const [row] = await this.db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1)
    return row ? toLesson(row) : null
  }

  async findAccessibleCoursesBySlugs(slugs: string[]): Promise<Course[]> {
    if (slugs.length === 0) return []
    const rows = await this.db
      .select()
      .from(courses)
      .where(
        and(inArray(courses.slug, slugs), inArray(courses.status, [...ACCESSIBLE_COURSE_STATUSES])),
      )
      // Mesma régua da vitrine: mais antigos primeiro (antes era ordem indefinida).
      .orderBy(asc(courses.createdAt))
    return rows.map(toCourse)
  }

  async findCoursesBySlugs(slugs: string[]): Promise<Course[]> {
    if (slugs.length === 0) return []
    const rows = await this.db.select().from(courses).where(inArray(courses.slug, slugs))
    return rows.map(toCourse)
  }

  async listPublishedCourses(audience: CourseAudience): Promise<Course[]> {
    const rows = await this.db
      .select()
      .from(courses)
      .where(and(eq(courses.status, 'published'), eq(courses.audience, audience)))
      // Ordem PADRÃO das vitrines: jornada de criação (mais antigos primeiro) —
      // decisão da usuária 13/07. A→Z virou opção do seletor no front.
      .orderBy(asc(courses.createdAt))
    return rows.map(toCourse)
  }

  async findOutline(
    courseId: string,
    opts?: { publishedOnly?: boolean },
  ): Promise<ModuleWithLessons[]> {
    const lessonWhere = opts?.publishedOnly
      ? and(eq(lessons.courseId, courseId), eq(lessons.isPublished, true))
      : eq(lessons.courseId, courseId)
    const [mods, less] = await Promise.all([
      this.db
        .select()
        .from(modules)
        .where(eq(modules.courseId, courseId))
        .orderBy(asc(modules.sortOrder)),
      this.db.select().from(lessons).where(lessonWhere).orderBy(asc(lessons.sortOrder)),
    ])
    const byModule = new Map<string, Lesson[]>()
    for (const l of less) {
      const arr = byModule.get(l.moduleId) ?? []
      arr.push(toLesson(l))
      byModule.set(l.moduleId, arr)
    }
    return mods.map((m) => ({ ...toModule(m), lessons: byModule.get(m.id) ?? [] }))
  }

  async findOutlinesByCourseIds(
    courseIds: string[],
    opts?: { publishedOnly?: boolean },
  ): Promise<Map<string, ModuleWithLessons[]>> {
    if (courseIds.length === 0) return new Map()
    const lessonWhere = opts?.publishedOnly
      ? and(inArray(lessons.courseId, courseIds), eq(lessons.isPublished, true))
      : inArray(lessons.courseId, courseIds)
    const [mods, less] = await Promise.all([
      this.db
        .select()
        .from(modules)
        .where(inArray(modules.courseId, courseIds))
        .orderBy(asc(modules.sortOrder)),
      this.db.select().from(lessons).where(lessonWhere).orderBy(asc(lessons.sortOrder)),
    ])
    // Aulas por módulo (a ordenação global por sortOrder preserva a relativa por módulo).
    const lessonsByModule = new Map<string, Lesson[]>()
    for (const l of less) {
      const arr = lessonsByModule.get(l.moduleId) ?? []
      arr.push(toLesson(l))
      lessonsByModule.set(l.moduleId, arr)
    }
    const out = new Map<string, ModuleWithLessons[]>()
    for (const m of mods) {
      const arr = out.get(m.courseId) ?? []
      arr.push({ ...toModule(m), lessons: lessonsByModule.get(m.id) ?? [] })
      out.set(m.courseId, arr)
    }
    return out
  }

  async findLessonWithContent(
    lessonId: string,
    opts?: { includeAttachments?: boolean },
  ): Promise<LessonWithContent | null> {
    const [lesson] = await this.db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1)
    if (!lesson) return null
    const wantAttachments = opts?.includeAttachments !== false
    const [blocks, attachments] = await Promise.all([
      this.db
        .select()
        .from(lessonBlocks)
        .where(eq(lessonBlocks.lessonId, lessonId))
        .orderBy(asc(lessonBlocks.sortOrder)),
      // Leituras que só usam blocos (GETs lazy do Studio) pedem `false` → pula a query.
      wantAttachments
        ? this.db
            .select()
            .from(lessonAttachments)
            .where(eq(lessonAttachments.lessonId, lessonId))
            .orderBy(asc(lessonAttachments.sortOrder))
        : Promise.resolve([]),
    ])
    return {
      ...toLesson(lesson),
      blocks: blocks.map(toBlock),
      attachments: attachments.map(toAttachment),
    }
  }

  async countLessons(courseId: string): Promise<number> {
    const [row] = await this.db
      .select({ c: count() })
      .from(lessons)
      .where(eq(lessons.courseId, courseId))
    return row?.c ?? 0
  }

  async countPublishedLessons(courseId: string): Promise<number> {
    const [row] = await this.db
      .select({ c: count() })
      .from(lessons)
      .where(and(eq(lessons.courseId, courseId), eq(lessons.isPublished, true)))
    return row?.c ?? 0
  }

  async listPublishedLessonIds(moduleId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: lessons.id })
      .from(lessons)
      .where(and(eq(lessons.moduleId, moduleId), eq(lessons.isPublished, true)))
    return rows.map((r) => r.id)
  }

  async findPrecedingStudioBlockInChain(
    courseId: string,
    lessonId: string,
    chain: string,
  ): Promise<{ blockId: string; lessonId: string } | null> {
    // Posição da aula atual no curso: (module.sortOrder, lesson.sortOrder).
    const [cur] = await this.db
      .select({ modSort: modules.sortOrder, lessonSort: lessons.sortOrder })
      .from(lessons)
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .where(eq(lessons.id, lessonId))
      .limit(1)
    if (!cur) return null

    // Bloco studio da MESMA cadeia, em aula PUBLICADA do curso, ANTES da posição
    // atual (comparação de tupla row-value do Postgres). O mais próximo "para trás".
    const [row] = await this.db
      .select({ blockId: lessonBlocks.id, lessonId: lessons.id })
      .from(lessonBlocks)
      .innerJoin(lessons, eq(lessonBlocks.lessonId, lessons.id))
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .where(
        and(
          eq(lessons.courseId, courseId),
          eq(lessons.isPublished, true),
          eq(lessonBlocks.kind, 'studio'),
          // `trim` nos DOIS lados: o `chain` do serviço já vem trimado; sem o `trim` no
          // valor armazenado, um `chain` autorado com espaço sobrando nunca casaria e o
          // carryover cairia silenciosamente no `initialProject` (perdendo o WIP do aluno).
          sql`trim(${lessonBlocks.content}->>'chain') = ${chain}`,
          sql`(${modules.sortOrder}, ${lessons.sortOrder}) < (${cur.modSort}, ${cur.lessonSort})`,
        ),
      )
      .orderBy(desc(modules.sortOrder), desc(lessons.sortOrder), desc(lessonBlocks.sortOrder))
      .limit(1)
    return row ? { blockId: row.blockId, lessonId: row.lessonId } : null
  }

  async countLessonsByCourseIds(courseIds: string[]): Promise<Map<string, number>> {
    if (courseIds.length === 0) return new Map()
    const rows = await this.db
      .select({ courseId: lessons.courseId, c: count() })
      .from(lessons)
      .where(inArray(lessons.courseId, courseIds))
      .groupBy(lessons.courseId)
    return new Map(rows.map((r) => [r.courseId, r.c]))
  }

  async countPublishedLessonsByCourseIds(courseIds: string[]): Promise<Map<string, number>> {
    if (courseIds.length === 0) return new Map()
    const rows = await this.db
      .select({ courseId: lessons.courseId, c: count() })
      .from(lessons)
      .where(and(inArray(lessons.courseId, courseIds), eq(lessons.isPublished, true)))
      .groupBy(lessons.courseId)
    return new Map(rows.map((r) => [r.courseId, r.c]))
  }
}
