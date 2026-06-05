import {
  ContentNotFoundError,
  CourseConflictError,
  CourseNotFoundError,
  InvalidContentCommandError,
  LessonNotFoundError,
  NoPublishedLessonError,
} from '../../domain/course/course.errors'
import type { LessonBlockContent } from '../../domain/course/lesson-block'
import { validateQuizAuthoring } from '../../domain/course/quiz'
import type {
  AttachmentFields,
  ContentAdminRepository,
  CourseFields,
  LessonFields,
  ListCoursesAdminFilter,
  ModuleFields,
} from '../../domain/ports/content-admin-repository.port'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import {
  type AttachmentView,
  type BlockView,
  type CourseTreeView,
  type CourseView,
  type LessonContentView,
  type LessonView,
  type ModuleView,
  toAttachmentView,
  toBlockView,
  toCourseTreeView,
  toCourseView,
  toLessonContentView,
  toLessonView,
  toModuleView,
} from '../mappers/admin-content-views'

/** Reordenação só vale se os ids enviados forem EXATAMENTE os filhos atuais (sem furos). */
function assertSameSet(current: string[], provided: string[]): void {
  if (current.length !== provided.length) {
    throw new InvalidContentCommandError('A reordenação precisa conter exatamente os itens atuais')
  }
  const set = new Set(current)
  for (const id of provided) {
    if (!set.has(id)) throw new InvalidContentCommandError('Id desconhecido na reordenação')
  }
}

// ── Cursos ──────────────────────────────────────────────────────────────────
export class CourseAdminService {
  constructor(
    private readonly content: ContentAdminRepository,
    private readonly courses: CourseRepository,
  ) {}

  async list(
    filter: ListCoursesAdminFilter,
  ): Promise<{ items: CourseView[]; total: number; limit: number; offset: number }> {
    const { items, total } = await this.content.listCoursesAdmin(filter)
    return {
      items: items.map(toCourseView),
      total,
      limit: filter.limit,
      offset: filter.offset,
    }
  }

  async create(fields: CourseFields): Promise<CourseView> {
    // Curso novo nasce sem aulas → nunca pode nascer `published`.
    if (fields.status === 'published') throw new NoPublishedLessonError()
    return toCourseView(await this.content.createCourse(fields))
  }

  async get(id: string): Promise<CourseTreeView> {
    const course = await this.courses.findCourseById(id)
    if (!course) throw new CourseNotFoundError()
    const outline = await this.courses.findOutline(id)
    return toCourseTreeView(course, outline)
  }

  async update(id: string, fields: CourseFields): Promise<CourseView> {
    const existing = await this.courses.findCourseById(id)
    if (!existing) throw new CourseNotFoundError()
    // Guard: curso `published` exige ≥1 aula publicada (visível ao aluno).
    if (fields.status === 'published' && (await this.content.countPublishedLessons(id)) === 0) {
      throw new NoPublishedLessonError()
    }
    // `salesPageUrl` vive em `metadata` (jsonb): atualiza SÓ essa chave,
    // preservando as demais; objeto que ficou vazio volta a `null`.
    const { salesPageUrl, ...rest } = fields
    const merged = {
      ...existing,
      ...rest,
      metadata: withSalesPageUrl(existing.metadata, salesPageUrl),
    }
    const ok = await this.content.updateCourse(merged)
    if (!ok) throw new CourseConflictError()
    const fresh = await this.courses.findCourseById(id)
    return toCourseView(fresh ?? merged)
  }

  async remove(id: string): Promise<{ ok: true }> {
    if (!(await this.content.deleteCourse(id))) throw new CourseNotFoundError()
    return { ok: true }
  }
}

/**
 * Substitui só a chave `salesPageUrl` do `metadata` do curso, preservando as
 * demais (o metadata é um saco de extras livres — não pode ser sobrescrito
 * inteiro pelo form). `null`/vazio remove a chave; objeto vazio → `null`.
 */
function withSalesPageUrl(
  metadata: Record<string, unknown> | null,
  salesPageUrl: string | null,
): Record<string, unknown> | null {
  const next: Record<string, unknown> = { ...(metadata ?? {}) }
  if (salesPageUrl) next.salesPageUrl = salesPageUrl
  else delete next.salesPageUrl
  return Object.keys(next).length > 0 ? next : null
}

// ── Módulos ─────────────────────────────────────────────────────────────────
export class ModuleAdminService {
  constructor(
    private readonly content: ContentAdminRepository,
    private readonly courses: CourseRepository,
  ) {}

  async create(courseId: string, fields: ModuleFields): Promise<ModuleView> {
    if (!(await this.courses.findCourseById(courseId))) throw new CourseNotFoundError()
    return toModuleView(await this.content.createModule(courseId, fields))
  }

  async update(id: string, fields: ModuleFields): Promise<ModuleView> {
    const updated = await this.content.updateModule(id, fields)
    if (!updated) throw new ContentNotFoundError('Módulo não encontrado')
    return toModuleView(updated)
  }

  async remove(id: string): Promise<{ ok: true }> {
    const mod = await this.content.findModuleById(id)
    if (!mod) throw new ContentNotFoundError('Módulo não encontrado')
    // Guard simétrico ao de publicar o curso: excluir o módulo que contém as
    // ÚLTIMAS aulas publicadas de um curso `published` o deixaria à venda vazio.
    const course = await this.courses.findCourseById(mod.courseId)
    if (course?.status === 'published') {
      const remaining = await this.content.countPublishedLessons(mod.courseId, {
        excludeModuleId: id,
      })
      const total = await this.content.countPublishedLessons(mod.courseId)
      if (remaining === 0 && total > 0) {
        throw new NoPublishedLessonError(
          'Este módulo contém as últimas aulas publicadas — despublique o curso antes de excluí-lo',
        )
      }
    }
    if (!(await this.content.deleteModule(id)))
      throw new ContentNotFoundError('Módulo não encontrado')
    return { ok: true }
  }

  async reorder(courseId: string, orderedIds: string[]): Promise<{ ok: true }> {
    assertSameSet(await this.content.listModuleIds(courseId), orderedIds)
    await this.content.reorderModules(courseId, orderedIds)
    return { ok: true }
  }
}

// ── Aulas ───────────────────────────────────────────────────────────────────
export class LessonAdminService {
  constructor(
    private readonly content: ContentAdminRepository,
    private readonly courses: CourseRepository,
  ) {}

  async create(moduleId: string, fields: LessonFields): Promise<LessonView> {
    const mod = await this.content.findModuleById(moduleId)
    if (!mod) throw new ContentNotFoundError('Módulo não encontrado')
    return toLessonView(await this.content.createLesson(moduleId, mod.courseId, fields))
  }

  async update(id: string, fields: LessonFields): Promise<LessonView> {
    const existing = await this.content.findLessonById(id)
    if (!existing) throw new LessonNotFoundError()
    // Despublicar a ÚLTIMA aula publicada de um curso `published` o deixaria à
    // venda vazio — o mesmo invariante do guard de publicar o curso, pelo avesso.
    if (existing.isPublished && !fields.isPublished) {
      await this.assertNotLastPublished(existing.courseId, id)
    }
    const updated = await this.content.updateLesson(id, fields)
    if (!updated) throw new LessonNotFoundError()
    return toLessonView(updated)
  }

  async remove(id: string): Promise<{ ok: true }> {
    const existing = await this.content.findLessonById(id)
    if (!existing) throw new LessonNotFoundError()
    if (existing.isPublished) {
      await this.assertNotLastPublished(existing.courseId, id)
    }
    if (!(await this.content.deleteLesson(id))) throw new LessonNotFoundError()
    return { ok: true }
  }

  /** Lança se remover/despublicar `lessonId` zerar as aulas publicadas de um curso `published`. */
  private async assertNotLastPublished(courseId: string, lessonId: string): Promise<void> {
    const course = await this.courses.findCourseById(courseId)
    if (course?.status !== 'published') return
    const remaining = await this.content.countPublishedLessons(courseId, {
      excludeLessonId: lessonId,
    })
    if (remaining === 0) {
      throw new NoPublishedLessonError(
        'Esta é a última aula publicada — despublique o curso antes de removê-la',
      )
    }
  }

  async reorder(moduleId: string, orderedIds: string[]): Promise<{ ok: true }> {
    assertSameSet(await this.content.listLessonIds(moduleId), orderedIds)
    await this.content.reorderLessons(moduleId, orderedIds)
    return { ok: true }
  }

  async getContent(lessonId: string): Promise<LessonContentView> {
    const lesson = await this.courses.findLessonWithContent(lessonId)
    if (!lesson) throw new LessonNotFoundError()
    return toLessonContentView(lesson)
  }
}

// ── Blocos ──────────────────────────────────────────────────────────────────

/** Coerência semântica do bloco (além do shape TypeBox). Quiz incoerente → 400. */
function assertBlockCoherent(content: LessonBlockContent): void {
  if (content.kind !== 'quiz') return
  const problem = validateQuizAuthoring(content)
  if (problem) throw new InvalidContentCommandError(problem)
}

export class BlockAdminService {
  constructor(private readonly content: ContentAdminRepository) {}

  async create(lessonId: string, content: LessonBlockContent): Promise<BlockView> {
    assertBlockCoherent(content)
    if (!(await this.content.findLessonById(lessonId))) throw new LessonNotFoundError()
    return toBlockView(await this.content.createBlock(lessonId, content.kind, content))
  }

  async update(id: string, content: LessonBlockContent): Promise<BlockView> {
    assertBlockCoherent(content)
    const updated = await this.content.updateBlock(id, content.kind, content)
    if (!updated) throw new ContentNotFoundError('Bloco não encontrado')
    return toBlockView(updated)
  }

  async remove(id: string): Promise<{ ok: true }> {
    if (!(await this.content.deleteBlock(id)))
      throw new ContentNotFoundError('Bloco não encontrado')
    return { ok: true }
  }

  async reorder(lessonId: string, orderedIds: string[]): Promise<{ ok: true }> {
    assertSameSet(await this.content.listBlockIds(lessonId), orderedIds)
    await this.content.reorderBlocks(lessonId, orderedIds)
    return { ok: true }
  }
}

// ── Anexos ──────────────────────────────────────────────────────────────────
export class AttachmentAdminService {
  constructor(private readonly content: ContentAdminRepository) {}

  async create(lessonId: string, fields: AttachmentFields): Promise<AttachmentView> {
    if (!(await this.content.findLessonById(lessonId))) throw new LessonNotFoundError()
    return toAttachmentView(await this.content.createAttachment(lessonId, fields))
  }

  async update(id: string, fields: AttachmentFields): Promise<AttachmentView> {
    const updated = await this.content.updateAttachment(id, fields)
    if (!updated) throw new ContentNotFoundError('Anexo não encontrado')
    return toAttachmentView(updated)
  }

  async remove(id: string): Promise<{ ok: true }> {
    if (!(await this.content.deleteAttachment(id)))
      throw new ContentNotFoundError('Anexo não encontrado')
    return { ok: true }
  }

  async reorder(lessonId: string, orderedIds: string[]): Promise<{ ok: true }> {
    assertSameSet(await this.content.listAttachmentIds(lessonId), orderedIds)
    await this.content.reorderAttachments(lessonId, orderedIds)
    return { ok: true }
  }
}
