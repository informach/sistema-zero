import { ValidationError } from '@sistemazero/core/errors'
import {
  defaultLessonSection,
  isLearningManifest,
  validateLessonSections,
} from '@sistemazero/core/learning'
import { LessonNotFoundError } from '../../domain/course/course.errors'
import { isCompletionGatingBlock } from '../../domain/course/lesson-block'
import { LearningConflictError } from '../../domain/learning/learning.errors'
import {
  importedLearningId,
  learningImportFingerprint,
} from '../../domain/learning/learning-import'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type {
  LearningImportPlan,
  LearningImportRepository,
} from '../../domain/ports/learning-import-repository.port'
import { stableJson } from '../../domain/shared/stable-json'

export class LearningImportService {
  constructor(
    private readonly repository: LearningImportRepository,
    private readonly courses: CourseRepository,
  ) {}
  async preview(lessonId: string, document: unknown): Promise<LearningImportPlan> {
    if (!isLearningManifest(document))
      throw new ValidationError(
        'Manifesto de aula inválido. Confira os blocos, seções e referências.',
      )
    const snapshot = await this.repository.snapshot(lessonId)
    if (!snapshot) throw new LessonNotFoundError()
    const { lesson } = snapshot
    const course = await this.courses.findCourseById(lesson.courseId)
    if (course?.slug !== document.courseSlug || lesson.slug !== document.lessonSlug)
      throw new ValidationError(
        'Este manifesto pertence a outro curso ou aula. Ajuste o destino no manifesto antes de importar.',
      )
    const mapping = new Map<string, string>()
    const blocks: LearningImportPlan['blocks'] = []
    const used = new Set<string>()
    for (const entry of document.blocks) {
      if ('existing' in entry) {
        const block = lesson.blocks.filter((b) => b.kind === entry.existing.kind)[
          entry.existing.index
        ]
        if (!block)
          throw new ValidationError(
            `Referência ausente: ${entry.key} (${entry.existing.kind}, posição ${entry.existing.index + 1}).`,
          )
        if (used.has(block.id))
          throw new ValidationError(`O bloco ${entry.key} foi referenciado duas vezes.`)
        mapping.set(entry.key, block.id)
        used.add(block.id)
        blocks.push({ id: block.id, content: block.content, action: 'preserve' })
      } else {
        const id = importedLearningId(lessonId, 'block', entry.key)
        if (used.has(id)) throw new ValidationError('Bloco duplicado no manifesto.')
        used.add(id)
        mapping.set(entry.key, id)
        const previous = lesson.blocks.find((b) => b.id === id)
        if (previous && previous.kind !== 'rich_text' && previous.kind !== 'interactive')
          throw new ValidationError(
            `O bloco ${entry.key} mudou de tipo na autoria. Revise o manifesto para preservar esse conteúdo.`,
          )
        blocks.push({
          id,
          content: entry.content,
          action: previous
            ? stableJson(previous.content) === stableJson(entry.content)
              ? 'preserve'
              : 'update'
            : 'create',
        })
      }
    }
    const mapped = (key: string): string => {
      const id = mapping.get(key)
      if (!id) throw new ValidationError(`Referência não encontrada: ${key}`)
      return id
    }
    const sections = document.sections.map((s) => ({
      id: importedLearningId(lessonId, 'section', s.key),
      title: s.title,
      objective: s.objective,
      intent: s.intent,
      blockIds: s.blockKeys.map(mapped),
      workspaceBlockId: s.workspaceKey ? mapped(s.workspaceKey) : null,
      externalTool: s.externalTool,
      pendingMedia: s.pendingMedia,
    }))
    const retained = lesson.blocks.filter((b) => !used.has(b.id))
    blocks.push(
      ...retained.map((b) => ({ id: b.id, content: b.content, action: 'preserve' as const })),
    )
    if (retained.length)
      sections.push(
        defaultLessonSection(
          importedLearningId(lessonId, 'section', 'retained'),
          'Materiais existentes da aula',
          retained.map((b) => b.id),
        ),
      )
    const invalid = validateLessonSections(
      sections,
      blocks.map((b) => ({ id: b.id, kind: b.content.kind })),
    )
    if (invalid) throw new ValidationError(invalid)
    if (
      blocks.some((b) => b.content.kind === 'certificate') &&
      blocks.some((b) => isCompletionGatingBlock(b.content))
    )
      throw new ValidationError('A aula de certificado não pode conter atividades obrigatórias.')
    return {
      lessonId,
      fingerprint: learningImportFingerprint(snapshot),
      title: document.title,
      blocks,
      sections,
      warnings: [
        ...(lesson.isPublished
          ? ['Despublique esta aula antes de aplicar a importação. A prévia está disponível.']
          : []),
        ...(retained.length
          ? [
              `${retained.length} bloco(s) existente(s) preservado(s) na seção de materiais. Revise sua posição na autoria.`,
            ]
          : []),
        ...(sections.some((s) => s.pendingMedia.length)
          ? ['Há mídias pendentes. A aula continuará em rascunho até a produção e vinculação.']
          : []),
      ],
    }
  }
  async apply(lessonId: string, document: unknown, expectedFingerprint: string) {
    const plan = await this.preview(lessonId, document)
    if (plan.fingerprint !== expectedFingerprint) throw new LearningConflictError()
    await this.repository.apply(plan)
    return {
      ok: true,
      sections: plan.sections,
      blocks: plan.blocks.map(({ id, action }) => ({ id, action })),
    }
  }
}
