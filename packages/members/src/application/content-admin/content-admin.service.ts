import { isStudioProTemplateId } from '@sistemazero/core/studio'
import {
  ContentNotFoundError,
  CourseConflictError,
  CourseNotFoundError,
  InvalidContentCommandError,
  LessonNotFoundError,
  NoPublishedLessonError,
  NoShowcaseBlockError,
} from '../../domain/course/course.errors'
import {
  isCompletionGatingBlock,
  type LessonBlockContent,
  MAX_STUDIO_PROJECT_CHARS,
} from '../../domain/course/lesson-block'
import { validateQuizAuthoring } from '../../domain/course/quiz'
import { validateStudioActivityAuthoring } from '../../domain/course/studio-activity'
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
  // Sem checar duplicatas, `[a,a]` passaria por `[a,b]` (mesmo tamanho, ambos ∈ set):
  // o reorder gravaria a→0,a→1 e NUNCA tocaria `b` → sortOrder colidido/furado.
  const seen = new Set<string>()
  for (const id of provided) {
    if (!set.has(id)) throw new InvalidContentCommandError('Id desconhecido na reordenação')
    if (seen.has(id)) throw new InvalidContentCommandError('Id repetido na reordenação')
    seen.add(id)
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
    // Curso-base (kids, slot 1) sem bloco de Estúdio com vitrine em aula publicada
    // nunca qualifica → a etapa não destrava. Marca p/ o painel avisar o operador.
    const foundationIds = items
      .filter((course) => course.audience === 'kids' && course.careerSlot === 1)
      .map((course) => course.id)
    const withShowcase = new Set(
      foundationIds.length > 0
        ? await this.content.listCourseIdsWithShowcaseBlock(foundationIds)
        : [],
    )
    return {
      items: items.map((course) =>
        toCourseView(
          course,
          course.audience === 'kids' && course.careerSlot === 1
            ? withShowcase.has(course.id)
            : undefined,
        ),
      ),
      total,
      limit: filter.limit,
      offset: filter.offset,
    }
  }

  async create(fields: CourseFields): Promise<CourseView> {
    // Curso novo nasce sem aulas → nunca pode nascer `published`.
    if (fields.status === 'published') throw new NoPublishedLessonError()
    // Audiência ausente → `adult`; trava sequencial ausente → `true` (padrão LIGADO).
    const normalized = {
      ...fields,
      audience: fields.audience ?? 'adult',
      sequentialLock: fields.sequentialLock ?? true,
      level: fields.level ?? 'iniciante',
      track: fields.track ?? '2d',
      careerSlot: fields.careerSlot ?? null,
    }
    assertCareerSlot(normalized)
    return toCourseView(await this.content.createCourse(normalized))
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
    if (fields.version === undefined || fields.version !== existing.version) {
      throw new CourseConflictError()
    }
    // Guard: curso `published` exige ≥1 aula publicada (visível ao aluno).
    if (fields.status === 'published' && (await this.content.countPublishedLessons(id)) === 0) {
      throw new NoPublishedLessonError()
    }
    // `salesPageUrl` vive em `metadata` (jsonb): atualiza SÓ essa chave,
    // preservando as demais; objeto que ficou vazio volta a `null`.
    // `audience` AUSENTE preserva a atual (≠ do salesPageUrl, que limpa): um
    // PATCH de build antigo do admin sem o campo não rebaixa curso kids → adult.
    // `sequentialLock` AUSENTE também PRESERVA a atual (mesma régua do audience).
    // `level` AUSENTE idem (build antigo do admin sem o campo não rebaixa a dificuldade).
    // `track` AUSENTE idem (build antigo sem o eixo 2D/3D não re-tagueia o curso).
    const {
      salesPageUrl,
      audience,
      sequentialLock,
      level,
      track,
      careerSlot,
      version: _version,
      ...rest
    } = fields
    const merged = {
      ...existing,
      ...rest,
      audience: audience ?? existing.audience,
      sequentialLock: sequentialLock ?? existing.sequentialLock,
      level: level ?? existing.level,
      track: track ?? existing.track,
      careerSlot: careerSlot === undefined ? existing.careerSlot : careerSlot,
      metadata: withSalesPageUrl(existing.metadata, salesPageUrl),
    }
    assertCareerSlot(merged)
    // Curso-base kids (slot 1) publicado exige uma aula PUBLICADA com bloco de Estúdio
    // de vitrine — sem ela o aluno nunca qualifica o slot e a etapa trava (armadilha do
    // fail-open). Guard SÓ NA TRANSIÇÃO para o estado-armadilha: um curso que JÁ está
    // preso (rollout pré-career_slot) segue editável (título etc.) — a correção acontece
    // no editor de AULA, e o aviso ⚠️ da listagem cobre a detecção. Caminho inverso
    // (remover a vitrine de curso-base publicado) fica de fora — follow-up documentado.
    const becomesTrapped =
      merged.status === 'published' && merged.audience === 'kids' && merged.careerSlot === 1
    const wasTrapped =
      existing.status === 'published' && existing.audience === 'kids' && existing.careerSlot === 1
    if (becomesTrapped && !wasTrapped) {
      const withShowcase = await this.content.listCourseIdsWithShowcaseBlock([id])
      if (withShowcase.length === 0) throw new NoShowcaseBlockError()
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

function assertCareerSlot(course: {
  audience: string
  level: string
  track: string
  careerSlot: number | null
}): void {
  if (course.careerSlot === null) return
  if (course.level === 'lenda') {
    throw new InvalidContentCommandError(
      'Curso Lenda é bônus da formatura — não ocupa posição na carreira',
    )
  }
  if (course.audience !== 'kids') {
    throw new InvalidContentCommandError('Somente cursos Kids podem ocupar a carreira')
  }
  const maximum = course.level === 'iniciante' && course.track === '2d' ? 6 : 5
  if (
    !Number.isInteger(course.careerSlot) ||
    course.careerSlot < 1 ||
    course.careerSlot > maximum
  ) {
    throw new InvalidContentCommandError(`Esta etapa aceita posições de 1 a ${maximum} na carreira`)
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

/** Coerência semântica do bloco (além do shape TypeBox). Quiz/estúdio incoerente → 400. */
function assertBlockCoherent(content: LessonBlockContent): void {
  if (content.kind === 'quiz') {
    const problem = validateQuizAuthoring(content)
    if (problem) throw new InvalidContentCommandError(problem)
    return
  }
  // Estúdio: limita o peso no jsonb e valida o discriminante crítico do projeto
  // Pro. O restante do snapshot continua defensivo e é sanitizado pelo Studio.
  if (content.kind === 'studio') {
    if (JSON.stringify(content.initialProject).length > MAX_STUDIO_PROJECT_CHARS) {
      throw new InvalidContentCommandError('Projeto inicial excede o tamanho máximo permitido')
    }
    if (
      content.initialProject &&
      typeof content.initialProject === 'object' &&
      !Array.isArray(content.initialProject) &&
      (content.initialProject as { kind?: unknown }).kind === 'pro'
    ) {
      const project = content.initialProject as {
        tree?: unknown
        proMeta?: { templateId?: unknown }
      }
      if (
        !project.tree ||
        typeof project.tree !== 'object' ||
        Array.isArray(project.tree) ||
        !isStudioProTemplateId(project.proMeta?.templateId)
      ) {
        throw new InvalidContentCommandError('Escolha um modelo Pro válido')
      }
    }
    // Atividade (auto-correção): coerência além do shape TypeBox (ids únicos,
    // code com source, testcase com função+casos, nota de corte com ≥1 checagem).
    if (content.activity) {
      const problem = validateStudioActivityAuthoring(content.activity)
      if (problem) throw new InvalidContentCommandError(problem)
    }
  }
}

async function assertSingleCertificateBlock(
  content: ContentAdminRepository,
  courseId: string,
  excludeBlockId?: string,
): Promise<void> {
  if ((await content.countCertificateBlocks(courseId, { excludeBlockId })) > 0) {
    throw new InvalidContentCommandError('O curso já possui um bloco de certificado')
  }
}

// A aula do certificado pode ter conteúdo livre (vídeo/texto/imagem de encerramento),
// mas NÃO blocos que travam a conclusão (quiz com nota de corte / estúdio): a emissão
// conclui essa aula DIRETO, sem passar pelos gates de mark-lesson-complete — um gate ali
// seria pulado (o aluno emitiria o diploma sem fazer a atividade). Ver isCompletionGatingBlock.
const CERTIFICATE_LESSON_NO_GATES =
  'A aula do certificado não pode ter blocos que travam a conclusão (quiz com nota de corte ou estúdio).'

export class BlockAdminService {
  constructor(private readonly content: ContentAdminRepository) {}

  async create(lessonId: string, content: LessonBlockContent): Promise<BlockView> {
    assertBlockCoherent(content)
    const lesson = await this.content.findLessonById(lessonId)
    if (!lesson) throw new LessonNotFoundError()
    if (content.kind === 'certificate') {
      await assertSingleCertificateBlock(this.content, lesson.courseId)
      // Conteúdo livre convive com o certificado; bloco travante (quiz-com-nota/estúdio) não.
      if (await this.content.lessonHasGatingBlock(lessonId)) {
        throw new InvalidContentCommandError(CERTIFICATE_LESSON_NO_GATES)
      }
    } else if (
      isCompletionGatingBlock(content) &&
      (await this.content.lessonHasCertificateBlock(lessonId))
    ) {
      throw new InvalidContentCommandError(CERTIFICATE_LESSON_NO_GATES)
    }
    return toBlockView(await this.content.createBlock(lessonId, content.kind, content))
  }

  async update(id: string, content: LessonBlockContent): Promise<BlockView> {
    assertBlockCoherent(content)
    if (content.kind === 'certificate') {
      const courseId = await this.content.findBlockCourseId(id)
      if (!courseId) throw new ContentNotFoundError('Bloco não encontrado')
      await assertSingleCertificateBlock(this.content, courseId, id)
      // Virar certificado só é permitido se a aula não tiver blocos TRAVANTES (os outros ok).
      const lessonId = await this.content.findBlockLessonId(id)
      if (lessonId && (await this.content.lessonHasGatingBlock(lessonId, { excludeBlockId: id }))) {
        throw new InvalidContentCommandError(CERTIFICATE_LESSON_NO_GATES)
      }
    } else if (isCompletionGatingBlock(content)) {
      // Virar um bloco em gate (quiz-com-nota/estúdio) numa aula que TEM certificado → barra.
      const lessonId = await this.content.findBlockLessonId(id)
      if (lessonId && (await this.content.lessonHasCertificateBlock(lessonId))) {
        throw new InvalidContentCommandError(CERTIFICATE_LESSON_NO_GATES)
      }
    }
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
