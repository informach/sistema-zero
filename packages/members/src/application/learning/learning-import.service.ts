import { ValidationError } from '@sistemazero/core/errors'
import {
  type DraftBlock,
  isLearningManifest,
  type LessonDraftDocument,
  lessonCompletionRequirements,
  validateLessonSections,
} from '@sistemazero/core/learning'
import { LessonNotFoundError } from '../../domain/course/course.errors'
import { importedLearningId } from '../../domain/learning/learning-import'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { LessonDraftRepository } from '../../domain/ports/lesson-draft-repository.port'
import { stableJson } from '../../domain/shared/stable-json'

export class LearningImportService {
  constructor(
    private readonly repository: LessonDraftRepository,
    private readonly courses: CourseRepository,
  ) {}

  async preview(lessonId: string, manifest: unknown) {
    if (!isLearningManifest(manifest))
      throw new ValidationError(
        'Manifesto de aula inválido. Confira os blocos, seções e referências.',
      )
    const [draft, lesson] = await Promise.all([
      this.repository.read(lessonId),
      this.courses.findLessonWithContent(lessonId),
    ])
    if (!lesson) throw new LessonNotFoundError()
    const course = await this.courses.findCourseById(lesson.courseId)
    if (course?.slug !== manifest.courseSlug || draft.document.slug !== manifest.lessonSlug)
      throw new ValidationError(
        'Este manifesto pertence a outro curso ou aula. Vincule-o ao destino aberto antes de importar.',
      )
    const document: LessonDraftDocument = {
      ...draft.document,
      title: manifest.title,
      blocks: [],
      sections: [],
      supportBlockIds: [],
      plannedVideos: [],
    }
    const mapping = new Map<string, string>()
    const used = new Set<string>()
    const actions: Array<{ id: string; action: 'create' | 'update' | 'preserve' }> = []
    const add = (block: DraftBlock) => {
      if (used.has(block.id)) throw new ValidationError('Bloco duplicado no manifesto.')
      used.add(block.id)
      document.blocks.push(block)
      const previous = draft.document.blocks.find((b) => b.id === block.id)
      actions.push({
        id: block.id,
        action: previous
          ? stableJson(previous.content) === stableJson(block.content)
            ? 'preserve'
            : 'update'
          : 'create',
      })
    }
    const plannedVideo = (key: string, instructions: string) => {
      const generatedId = importedLearningId(lessonId, 'block', key)
      const owner = manifest.sections.find(
        (s) =>
          s.blockKeys.includes(key) ||
          s.pendingMedia.some((_, index) => key === `video-${s.key}-${index + 1}`),
      )
      const sectionId = owner ? importedLearningId(lessonId, 'section', owner.key) : null
      const legacy = draft.document.plannedVideos.find(
        (v) =>
          !used.has(v.blockId) &&
          v.instructions === instructions &&
          draft.document.sections.some((s) => s.id === sectionId && s.blockIds.includes(v.blockId)),
      )
      const blockId = draft.document.blocks.some((b) => b.id === generatedId)
        ? generatedId
        : (legacy?.blockId ?? generatedId)
      const previous = draft.document.blocks.find((b) => b.id === blockId)
      if (previous && previous.content.kind !== 'video')
        throw new ValidationError('Um vídeo planejado mudou de tipo. Revise o manifesto.')
      add(previous ?? { id: blockId, content: { kind: 'video', provider: 'vimeo', src: '' } })
      const saved = draft.document.plannedVideos.find((v) => v.blockId === blockId)
      const source = previous?.content.src
      const videoId =
        saved?.videoId ??
        (typeof source === 'string'
          ? (source.match(/vimeo\.com\/(?:video\/)?(\d{6,12})/)?.[1] ?? null)
          : null)
      document.plannedVideos.push({ blockId, instructions, videoId })
      return blockId
    }
    for (const entry of manifest.blocks) {
      if ('plannedVideo' in entry) {
        mapping.set(entry.key, plannedVideo(entry.key, entry.plannedVideo))
      } else if ('existing' in entry) {
        const block = draft.document.blocks.filter((b) => b.content.kind === entry.existing.kind)[
          entry.existing.index
        ]
        if (!block) {
          const kind =
            entry.existing.kind === 'studio'
              ? 'Estúdio'
              : entry.existing.kind === 'pinta'
                ? 'Pinta'
                : entry.existing.kind
          throw new ValidationError(
            `Este manifesto reutiliza o bloco de ${kind} nº ${entry.existing.index + 1} da aula (referência "${entry.key}"), mas ele ainda não existe no rascunho. ` +
              `Em Percurso da aula, use "Adicionar conteúdo aqui", adicione e configure esse bloco e confira a importação novamente. ` +
              'O manifesto contém a organização e as atividades; o conteúdo do bloco referenciado precisa estar cadastrado na aula.',
          )
        }
        mapping.set(entry.key, block.id)
        add(block)
      } else {
        const id = importedLearningId(lessonId, 'block', entry.key)
        const previous = draft.document.blocks.find((b) => b.id === id)
        if (previous && previous.content.kind !== entry.content.kind)
          throw new ValidationError(
            `O bloco ${entry.key} mudou de tipo na autoria. Revise o manifesto.`,
          )
        mapping.set(entry.key, id)
        add({ id, content: { ...entry.content } })
      }
    }
    const mapped = (key: string) => {
      const id = mapping.get(key)
      if (!id) throw new ValidationError(`Referência ausente: ${key}`)
      return id
    }
    document.sections = manifest.sections.map((s) => ({
      id: importedLearningId(lessonId, 'section', s.key),
      title: s.title,
      objective: s.objective,
      intent: s.intent,
      blockIds: [
        ...s.blockKeys.map(mapped),
        ...s.pendingMedia.map((instructions, index) =>
          plannedVideo(`video-${s.key}-${index + 1}`, instructions),
        ),
      ],
      workspaceBlockId: s.workspaceKey ? mapped(s.workspaceKey) : null,
      externalTool: s.externalTool,
      pendingMedia: [],
      ...(s.completion
        ? { completion: { ...s.completion, blockIds: s.completion.blockIds.map(mapped) } }
        : {}),
    }))
    const retained = draft.document.blocks.filter((b) => !used.has(b.id))
    for (const block of retained) add(block)
    const requiredIds = new Set(
      retained
        .filter(
          (block) =>
            lessonCompletionRequirements({
              completed: false,
              blocks: [{ ...block, kind: block.content.kind }],
            }).length,
        )
        .map((b) => b.id),
    )
    const closing =
      document.sections.findLast((s) => s.intent === 'closing') ?? document.sections.at(-1)
    if (closing)
      closing.blockIds.push(...retained.filter((b) => requiredIds.has(b.id)).map((b) => b.id))
    document.supportBlockIds = retained.filter((b) => !requiredIds.has(b.id)).map((b) => b.id)
    for (const video of draft.document.plannedVideos)
      if (
        !document.plannedVideos.some((v) => v.blockId === video.blockId) &&
        document.blocks.some((b) => b.id === video.blockId)
      )
        document.plannedVideos.push(video)
    const invalid = validateLessonSections(
      document.sections,
      document.blocks.map((b) => ({ id: b.id, kind: b.content.kind })),
      document.supportBlockIds,
    )
    if (invalid) throw new ValidationError(invalid)
    return {
      lessonId,
      fingerprint: draft.revision,
      title: document.title,
      sections: document.sections,
      blocks: actions,
      document,
      warnings: [
        ...(draft.isPublished
          ? ['A aula publicada permanece disponível. Esta importação altera somente o rascunho.']
          : []),
        ...(requiredIds.size
          ? ['As atividades obrigatórias existentes foram mantidas no fechamento.']
          : []),
        ...(document.supportBlockIds.length
          ? ['Materiais opcionais existentes ficam no apoio recolhido.']
          : []),
        ...(document.plannedVideos.length
          ? [
              'Os vídeos planejados aparecem nas seções. Vincule-os pelo uploader Vimeo antes de publicar.',
            ]
          : []),
      ],
    }
  }

  async apply(
    lessonId: string,
    manifest: unknown,
    expectedFingerprint: string,
    authorId: string,
    operationId: string,
  ) {
    const plan = await this.preview(lessonId, manifest)
    const draft = await this.repository.replace(
      lessonId,
      authorId,
      expectedFingerprint,
      operationId,
      plan.document,
    )
    return {
      ok: true,
      sections: draft.document.sections,
      blocks: plan.blocks,
      revision: draft.revision,
    }
  }
}
