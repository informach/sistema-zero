import { ValidationError } from '@sistemazero/core/errors'
import {
  type DraftBlock,
  isLearningManifest,
  type LessonDraftDocument,
  validateLessonSections,
} from '@sistemazero/core/learning'
import { LessonNotFoundError } from '../../domain/course/course.errors'
import { importedLearningId } from '../../domain/learning/learning-import'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { LessonDraftRepository } from '../../domain/ports/lesson-draft-repository.port'
import { stableJson } from '../../domain/shared/stable-json'

export type LearningImportMode = 'preserve' | 'replace'

const BLOCK_KIND_LABELS: Readonly<Record<string, string>> = {
  certificate: 'Certificado',
  dialogue: 'Fala do Zappy',
  gallery: 'Galeria',
  interactive: 'Experiência',
  materials: 'Materiais',
  pinta: 'Pinta',
  project: 'Projeto',
  quiz: 'Quiz',
  rich_text: 'Texto',
  studio: 'Estúdio',
  submission: 'Entrega',
  video: 'Vídeo',
}

function removalLabel(document: LessonDraftDocument, block: DraftBlock): string {
  const section = document.sections.find((candidate) => candidate.blockIds.includes(block.id))
  const kind = BLOCK_KIND_LABELS[block.content.kind] ?? block.content.kind
  return section ? `${kind} · ${section.title}` : kind
}

function importedContent(
  authored: DraftBlock['content'],
  previous: DraftBlock['content'] | undefined,
): DraftBlock['content'] {
  if (!previous || previous.kind !== authored.kind) return authored
  if (authored.kind === 'pinta') return { ...authored, initialAsset: previous.initialAsset }
  if (authored.kind === 'materials' && Array.isArray(authored.items)) {
    if (!Array.isArray(previous.items) || authored.items.length === 0)
      return { ...authored, items: Array.isArray(previous.items) ? previous.items : authored.items }
    const ids = new Set(
      authored.items.flatMap((item) =>
        item && typeof item === 'object' && 'id' in item && typeof item.id === 'string'
          ? [item.id]
          : [],
      ),
    )
    const uploaded = previous.items.filter(
      (item) =>
        item &&
        typeof item === 'object' &&
        'kind' in item &&
        item.kind === 'file' &&
        'id' in item &&
        typeof item.id === 'string' &&
        !ids.has(item.id),
    )
    return { ...authored, items: [...uploaded, ...authored.items] }
  }
  if (authored.kind === 'certificate')
    return {
      ...authored,
      ...(previous.baseImageUrl !== undefined ? { baseImageUrl: previous.baseImageUrl } : {}),
      ...(previous.signatures !== undefined ? { signatures: previous.signatures } : {}),
      ...(previous.accentColor !== undefined ? { accentColor: previous.accentColor } : {}),
    }
  return authored
}

export class LearningImportService {
  constructor(
    private readonly repository: LessonDraftRepository,
    private readonly courses: CourseRepository,
  ) {}

  async preview(lessonId: string, manifest: unknown, mode: LearningImportMode = 'preserve') {
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
      plannedVideos: [],
    }
    const mapping = new Map<string, string>()
    const used = new Set<string>()
    let replacedStudioProject = false
    const actions: Array<{
      id: string
      label?: string
      action: 'create' | 'update' | 'preserve' | 'retire' | 'remove'
    }> = []
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
      } else {
        const generatedId = importedLearningId(lessonId, 'block', entry.key)
        const creative = ['studio', 'pinta', 'materials', 'certificate'].includes(
          entry.content.kind,
        )
        const candidates =
          creative && !draft.document.blocks.some((b) => b.id === generatedId)
            ? draft.document.blocks.filter(
                (b) => b.content.kind === entry.content.kind && !used.has(b.id),
              )
            : []
        if (candidates.length > 1)
          throw new ValidationError(
            `Há mais de um bloco de ${entry.content.kind} na aula. A importação não pode escolher qual ID preservar para "${entry.key}".`,
          )
        const id = candidates[0]?.id ?? generatedId
        const previous = draft.document.blocks.find((b) => b.id === id)
        if (previous && previous.content.kind !== entry.content.kind)
          throw new ValidationError(
            `O bloco ${entry.key} mudou de tipo na autoria. Revise o manifesto.`,
          )
        if (
          previous?.content.kind === 'studio' &&
          entry.content.kind === 'studio' &&
          stableJson(previous.content.initialProject) !== stableJson(entry.content.initialProject)
        )
          replacedStudioProject = true
        mapping.set(entry.key, id)
        add({ id, content: importedContent({ ...entry.content }, previous?.content) })
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
    const retireIds = new Set(
      (manifest.retireBlockKeys ?? []).map((key) => importedLearningId(lessonId, 'block', key)),
    )
    const omitted = draft.document.blocks.filter((block) => !used.has(block.id))
    const retained: DraftBlock[] = []
    if (mode === 'replace') {
      for (const block of omitted)
        actions.push({
          id: block.id,
          label: removalLabel(draft.document, block),
          action: 'remove',
        })
    } else {
      for (const block of draft.document.blocks.filter((b) => retireIds.has(b.id))) {
        if (!['rich_text', 'dialogue', 'interactive', 'materials'].includes(block.content.kind))
          throw new ValidationError(
            'Só instruções, descobertas e materiais importados podem ser aposentados pelo manifesto. Projetos, mídias e quizzes são preservados.',
          )
        const key = manifest.retireBlockKeys?.find(
          (key) => importedLearningId(lessonId, 'block', key) === block.id,
        )
        actions.push({ id: block.id, label: key ?? block.content.kind, action: 'retire' })
      }
      retained.push(...omitted.filter((block) => !retireIds.has(block.id)))
      for (const block of retained) add(block)
      // Blocos avulsos existentes continuam visíveis até a autora decidir onde colocá-los.
      const closing =
        document.sections.findLast((s) => s.intent === 'closing') ?? document.sections.at(-1)
      if (closing) closing.blockIds.push(...retained.map((b) => b.id))
    }
    for (const video of draft.document.plannedVideos)
      if (
        !document.plannedVideos.some((v) => v.blockId === video.blockId) &&
        document.blocks.some((b) => b.id === video.blockId)
      )
        document.plannedVideos.push(video)
    const invalid = validateLessonSections(
      document.sections,
      document.blocks.map((b) => ({ id: b.id, kind: b.content.kind })),
    )
    if (invalid) throw new ValidationError(invalid)
    const sectionIds = new Set(document.sections.map((section) => section.id))
    const removedSections =
      mode === 'replace'
        ? draft.document.sections
            .filter((section) => !sectionIds.has(section.id))
            .map((section) => ({ id: section.id, title: section.title }))
        : []
    return {
      lessonId,
      fingerprint: draft.revision,
      title: document.title,
      sections: document.sections,
      blocks: actions,
      removedSections,
      document,
      warnings: [
        ...(replacedStudioProject
          ? [
              'O projeto inicial do Estúdio será substituído pelo manifesto. Projetos e entregas já salvos pelos alunos não são apagados.',
            ]
          : []),
        ...(mode === 'replace'
          ? [
              omitted.length || removedSections.length
                ? `A substituição removerá ${omitted.length} bloco(s) e ${removedSections.length} seção(ões) ausentes no manifesto.`
                : 'O manifesto já representa todo o rascunho; não há conteúdo adicional para remover.',
            ]
          : []),
        ...(actions.some((action) => action.action === 'retire')
          ? [
              'Os blocos importados listados como aposentados sairão do rascunho. Projetos, vídeos originais e histórico de evidências são preservados.',
            ]
          : []),
        ...(draft.isPublished
          ? ['A aula publicada permanece disponível. Esta importação altera somente o rascunho.']
          : []),
        ...(retained.length
          ? ['Os materiais opcionais existentes ficam no fim da última seção.']
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
    mode: LearningImportMode = 'preserve',
  ) {
    const plan = await this.preview(lessonId, manifest, mode)
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
