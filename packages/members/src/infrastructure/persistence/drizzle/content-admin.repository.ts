import { randomUUID } from 'node:crypto'
import { and, asc, count, eq, inArray, type SQL, sql } from 'drizzle-orm'
import type {
  Course,
  Lesson,
  LessonAttachment,
  LessonBlock,
  Module,
} from '../../../domain/course/course'
import { DuplicateSlugError } from '../../../domain/course/course.errors'
import type { LessonBlockContent, LessonBlockKind } from '../../../domain/course/lesson-block'
import type {
  AttachmentFields,
  ContentAdminRepository,
  CourseFields,
  LessonFields,
  ListCoursesAdminFilter,
  ModuleFields,
} from '../../../domain/ports/content-admin-repository.port'
import type { Database } from './db'
import {
  courses,
  lessonAttachments,
  lessonBlocks,
  lessonCompletions,
  lessons,
  modules,
} from './schema'

type CourseRow = typeof courses.$inferSelect
type ModuleRow = typeof modules.$inferSelect
type LessonRow = typeof lessons.$inferSelect
type BlockRow = typeof lessonBlocks.$inferSelect
type AttachmentRow = typeof lessonAttachments.$inferSelect

const toCourse = (r: CourseRow): Course => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  subtitle: r.subtitle,
  description: r.description,
  coverImageUrl: r.coverImageUrl,
  status: r.status,
  metadata: r.metadata ?? null,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
})
const toModule = (r: ModuleRow): Module => ({
  id: r.id,
  courseId: r.courseId,
  title: r.title,
  summary: r.summary,
  sortOrder: r.sortOrder,
})
const toLesson = (r: LessonRow): Lesson => ({
  id: r.id,
  moduleId: r.moduleId,
  courseId: r.courseId,
  slug: r.slug,
  title: r.title,
  sortOrder: r.sortOrder,
  estimatedMinutes: r.estimatedMinutes,
  isPublished: r.isPublished,
})
const toBlock = (r: BlockRow): LessonBlock => ({
  id: r.id,
  lessonId: r.lessonId,
  kind: r.kind,
  sortOrder: r.sortOrder,
  content: r.content,
})
const toAttachment = (r: AttachmentRow): LessonAttachment => ({
  id: r.id,
  lessonId: r.lessonId,
  label: r.label,
  url: r.url,
  fileType: r.fileType,
  sizeBytes: r.sizeBytes,
  sortOrder: r.sortOrder,
})

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === '23505'
  )
}

export class DrizzleContentAdminRepository implements ContentAdminRepository {
  constructor(private readonly db: Database) {}

  // ── Cursos ──────────────────────────────────────────────────────────────
  async listCoursesAdmin(
    filter: ListCoursesAdminFilter,
  ): Promise<{ items: Course[]; total: number }> {
    const clauses: SQL[] = []
    const q = filter.q?.trim()
    if (q) {
      const like = `%${q}%`
      const m = sql`(${courses.title} ilike ${like} or ${courses.slug} ilike ${like})`
      clauses.push(m)
    }
    if (filter.status) clauses.push(eq(courses.status, filter.status))
    const where = clauses.length > 0 ? and(...clauses) : undefined

    const [rows, [counted]] = await Promise.all([
      this.db
        .select()
        .from(courses)
        .where(where)
        .orderBy(asc(courses.title))
        .limit(filter.limit)
        .offset(filter.offset),
      this.db.select({ c: count() }).from(courses).where(where),
    ])
    return { items: rows.map(toCourse), total: counted?.c ?? 0 }
  }

  async createCourse(fields: CourseFields): Promise<Course> {
    const now = new Date()
    const row = {
      id: randomUUID(),
      version: 0,
      slug: fields.slug,
      title: fields.title,
      subtitle: fields.subtitle,
      description: fields.description,
      coverImageUrl: fields.coverImageUrl,
      status: fields.status,
      metadata: null,
      createdAt: now,
      updatedAt: now,
    }
    try {
      await this.db.insert(courses).values(row)
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateSlugError('Já existe um curso com esse slug')
      throw error
    }
    return toCourse(row as CourseRow)
  }

  async updateCourse(course: Course): Promise<boolean> {
    // O caso de uso carrega (com a version atual) e nos passa o curso já mesclado.
    const expectedVersion = await this.currentVersion(course.id)
    if (expectedVersion === null) return false
    try {
      const updated = await this.db
        .update(courses)
        .set({
          slug: course.slug,
          title: course.title,
          subtitle: course.subtitle,
          description: course.description,
          coverImageUrl: course.coverImageUrl,
          status: course.status,
          updatedAt: new Date(),
          version: expectedVersion + 1,
        })
        .where(and(eq(courses.id, course.id), eq(courses.version, expectedVersion)))
        .returning({ id: courses.id })
      return updated.length > 0
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateSlugError('Já existe um curso com esse slug')
      throw error
    }
  }

  private async currentVersion(id: string): Promise<number | null> {
    const [row] = await this.db
      .select({ version: courses.version })
      .from(courses)
      .where(eq(courses.id, id))
      .limit(1)
    return row ? row.version : null
  }

  async countPublishedLessons(courseId: string): Promise<number> {
    const [row] = await this.db
      .select({ c: count() })
      .from(lessons)
      .where(and(eq(lessons.courseId, courseId), eq(lessons.isPublished, true)))
    return row?.c ?? 0
  }

  async deleteCourse(id: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      await tx.delete(lessonCompletions).where(eq(lessonCompletions.courseId, id))
      const deleted = await tx
        .delete(courses)
        .where(eq(courses.id, id))
        .returning({ id: courses.id })
      return deleted.length > 0
    })
  }

  // ── Módulos ─────────────────────────────────────────────────────────────
  async findModuleById(id: string): Promise<Module | null> {
    const [row] = await this.db.select().from(modules).where(eq(modules.id, id)).limit(1)
    return row ? toModule(row) : null
  }

  async createModule(courseId: string, fields: ModuleFields): Promise<Module> {
    const now = new Date()
    const [agg] = await this.db
      .select({ next: sql<number>`coalesce(max(${modules.sortOrder}), -1) + 1` })
      .from(modules)
      .where(eq(modules.courseId, courseId))
    const sortOrder = agg?.next ?? 0
    const row = {
      id: randomUUID(),
      courseId,
      title: fields.title,
      summary: fields.summary,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    }
    await this.db.insert(modules).values(row)
    return toModule(row as ModuleRow)
  }

  async updateModule(id: string, fields: ModuleFields): Promise<Module | null> {
    const [row] = await this.db
      .update(modules)
      .set({ title: fields.title, summary: fields.summary, updatedAt: new Date() })
      .where(eq(modules.id, id))
      .returning()
    return row ? toModule(row) : null
  }

  async deleteModule(id: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const lessonRows = await tx
        .select({ id: lessons.id })
        .from(lessons)
        .where(eq(lessons.moduleId, id))
      const lessonIds = lessonRows.map((r) => r.id)
      if (lessonIds.length > 0) {
        await tx.delete(lessonCompletions).where(inArray(lessonCompletions.lessonId, lessonIds))
      }
      const deleted = await tx
        .delete(modules)
        .where(eq(modules.id, id))
        .returning({ id: modules.id })
      return deleted.length > 0
    })
  }

  async listModuleIds(courseId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: modules.id })
      .from(modules)
      .where(eq(modules.courseId, courseId))
      .orderBy(asc(modules.sortOrder))
    return rows.map((r) => r.id)
  }

  async reorderModules(courseId: string, orderedIds: string[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await tx
          .update(modules)
          .set({ sortOrder: i, updatedAt: new Date() })
          .where(and(eq(modules.id, orderedIds[i] as string), eq(modules.courseId, courseId)))
      }
    })
  }

  // ── Aulas ───────────────────────────────────────────────────────────────
  async findLessonById(id: string): Promise<Lesson | null> {
    const [row] = await this.db.select().from(lessons).where(eq(lessons.id, id)).limit(1)
    return row ? toLesson(row) : null
  }

  async createLesson(moduleId: string, courseId: string, fields: LessonFields): Promise<Lesson> {
    const now = new Date()
    const [agg] = await this.db
      .select({ next: sql<number>`coalesce(max(${lessons.sortOrder}), -1) + 1` })
      .from(lessons)
      .where(eq(lessons.moduleId, moduleId))
    const sortOrder = agg?.next ?? 0
    const row = {
      id: randomUUID(),
      moduleId,
      courseId,
      slug: fields.slug,
      title: fields.title,
      sortOrder,
      estimatedMinutes: fields.estimatedMinutes,
      isPublished: fields.isPublished,
      createdAt: now,
      updatedAt: now,
    }
    try {
      await this.db.insert(lessons).values(row)
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DuplicateSlugError('Já existe uma aula com esse slug neste curso')
      }
      throw error
    }
    return toLesson(row as LessonRow)
  }

  async updateLesson(id: string, fields: LessonFields): Promise<Lesson | null> {
    try {
      const [row] = await this.db
        .update(lessons)
        .set({
          slug: fields.slug,
          title: fields.title,
          estimatedMinutes: fields.estimatedMinutes,
          isPublished: fields.isPublished,
          updatedAt: new Date(),
        })
        .where(eq(lessons.id, id))
        .returning()
      return row ? toLesson(row) : null
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DuplicateSlugError('Já existe uma aula com esse slug neste curso')
      }
      throw error
    }
  }

  async deleteLesson(id: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      await tx.delete(lessonCompletions).where(eq(lessonCompletions.lessonId, id))
      const deleted = await tx
        .delete(lessons)
        .where(eq(lessons.id, id))
        .returning({ id: lessons.id })
      return deleted.length > 0
    })
  }

  async listLessonIds(moduleId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: lessons.id })
      .from(lessons)
      .where(eq(lessons.moduleId, moduleId))
      .orderBy(asc(lessons.sortOrder))
    return rows.map((r) => r.id)
  }

  async reorderLessons(moduleId: string, orderedIds: string[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await tx
          .update(lessons)
          .set({ sortOrder: i, updatedAt: new Date() })
          .where(and(eq(lessons.id, orderedIds[i] as string), eq(lessons.moduleId, moduleId)))
      }
    })
  }

  // ── Blocos ──────────────────────────────────────────────────────────────
  async createBlock(
    lessonId: string,
    kind: LessonBlockKind,
    content: LessonBlockContent,
  ): Promise<LessonBlock> {
    const [agg] = await this.db
      .select({ next: sql<number>`coalesce(max(${lessonBlocks.sortOrder}), -1) + 1` })
      .from(lessonBlocks)
      .where(eq(lessonBlocks.lessonId, lessonId))
    const sortOrder = agg?.next ?? 0
    const row = { id: randomUUID(), lessonId, kind, sortOrder, content }
    await this.db.insert(lessonBlocks).values(row)
    return toBlock(row as BlockRow)
  }

  async updateBlock(
    id: string,
    kind: LessonBlockKind,
    content: LessonBlockContent,
  ): Promise<LessonBlock | null> {
    const [row] = await this.db
      .update(lessonBlocks)
      .set({ kind, content })
      .where(eq(lessonBlocks.id, id))
      .returning()
    return row ? toBlock(row) : null
  }

  async deleteBlock(id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(lessonBlocks)
      .where(eq(lessonBlocks.id, id))
      .returning({ id: lessonBlocks.id })
    return deleted.length > 0
  }

  async listBlockIds(lessonId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: lessonBlocks.id })
      .from(lessonBlocks)
      .where(eq(lessonBlocks.lessonId, lessonId))
      .orderBy(asc(lessonBlocks.sortOrder))
    return rows.map((r) => r.id)
  }

  async reorderBlocks(lessonId: string, orderedIds: string[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await tx
          .update(lessonBlocks)
          .set({ sortOrder: i })
          .where(
            and(eq(lessonBlocks.id, orderedIds[i] as string), eq(lessonBlocks.lessonId, lessonId)),
          )
      }
    })
  }

  // ── Anexos ──────────────────────────────────────────────────────────────
  async createAttachment(lessonId: string, fields: AttachmentFields): Promise<LessonAttachment> {
    const [agg] = await this.db
      .select({ next: sql<number>`coalesce(max(${lessonAttachments.sortOrder}), -1) + 1` })
      .from(lessonAttachments)
      .where(eq(lessonAttachments.lessonId, lessonId))
    const sortOrder = agg?.next ?? 0
    const row = {
      id: randomUUID(),
      lessonId,
      label: fields.label,
      url: fields.url,
      fileType: fields.fileType,
      sizeBytes: fields.sizeBytes,
      sortOrder,
    }
    await this.db.insert(lessonAttachments).values(row)
    return toAttachment(row as AttachmentRow)
  }

  async updateAttachment(id: string, fields: AttachmentFields): Promise<LessonAttachment | null> {
    const [row] = await this.db
      .update(lessonAttachments)
      .set({
        label: fields.label,
        url: fields.url,
        fileType: fields.fileType,
        sizeBytes: fields.sizeBytes,
      })
      .where(eq(lessonAttachments.id, id))
      .returning()
    return row ? toAttachment(row) : null
  }

  async deleteAttachment(id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(lessonAttachments)
      .where(eq(lessonAttachments.id, id))
      .returning({ id: lessonAttachments.id })
    return deleted.length > 0
  }

  async listAttachmentIds(lessonId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: lessonAttachments.id })
      .from(lessonAttachments)
      .where(eq(lessonAttachments.lessonId, lessonId))
      .orderBy(asc(lessonAttachments.sortOrder))
    return rows.map((r) => r.id)
  }

  async reorderAttachments(lessonId: string, orderedIds: string[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await tx
          .update(lessonAttachments)
          .set({ sortOrder: i })
          .where(
            and(
              eq(lessonAttachments.id, orderedIds[i] as string),
              eq(lessonAttachments.lessonId, lessonId),
            ),
          )
      }
    })
  }
}
