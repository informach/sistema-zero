import { ValidationError } from '@sistemazero/core/errors'
import {
  type DraftBlock,
  isLearningManifest,
  type LessonDraftDocument,
  validateLessonSections,
} from '@sistemazero/core/learning'
import { LessonNotFoundError } from '../../domain/course/course.errors'
import { importedLearningId, isImportedLearningId } from '../../domain/learning/learning-import'
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

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** O Vimeo já escolhido para um bloco de vídeo, pela fonte do bloco ou pelo `plannedVideos`. */
function linkedVimeoId(document: LessonDraftDocument, block: DraftBlock): string | null {
  if (block.content.kind !== 'video') return null
  const planned = document.plannedVideos.find((video) => video.blockId === block.id)
  if (planned?.videoId) return planned.videoId
  const { src } = block.content
  if (typeof src !== 'string' || src.trim() === '') return null
  return src.match(/vimeo\.com\/(?:video\/)?(\d{6,12})/)?.[1] ?? src.trim()
}

/**
 * "Vídeo vinculado (Vimeo 123) · Seção". O número do Vimeo vai junto porque o vídeo que sai do
 * rascunho continua no Vimeo, e é por ele que a autora o escolhe de novo se precisar.
 */
function removalLabel(document: LessonDraftDocument, block: DraftBlock): string {
  const section = document.sections.find((candidate) => candidate.blockIds.includes(block.id))
  const vimeo = linkedVimeoId(document, block)
  const kind = vimeo
    ? `Vídeo vinculado (Vimeo ${vimeo})`
    : (BLOCK_KIND_LABELS[block.content.kind] ?? block.content.kind)
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
    // O manifesto é a fonte da verdade do que ELE criou: um bloco de importação anterior que não
    // está mais no arquivo sai do rascunho nos dois modos, inclusive vídeo já vinculado (o vídeo
    // continua no Vimeo e a versão publicada só muda ao publicar). Pedido da dona em 07/10/2026,
    // depois de reimportar o Dia 2 do Desafio numa aula que já tinha recebido o Dia 1 e achar o
    // vídeo antigo grudado na última parte: "quero subir o manifesto e já configurar tudo".
    // O que muda entre os modos é só o que a autora criou à mão no Admin.
    const retained =
      mode === 'replace' ? [] : omitted.filter((block) => !isImportedLearningId(block.id))
    for (const block of omitted) {
      if (retained.includes(block)) continue
      const key = retireIds.has(block.id)
        ? manifest.retireBlockKeys?.find(
            (candidate) => importedLearningId(lessonId, 'block', candidate) === block.id,
          )
        : undefined
      const vimeo = linkedVimeoId(draft.document, block)
      actions.push(
        key
          ? { id: block.id, label: vimeo ? `${key} (Vimeo ${vimeo})` : key, action: 'retire' }
          : { id: block.id, label: removalLabel(draft.document, block), action: 'remove' },
      )
    }
    for (const block of retained) add(block)
    // Blocos criados no Admin continuam visíveis até a autora decidir onde colocá-los.
    const closing =
      document.sections.findLast((s) => s.intent === 'closing') ?? document.sections.at(-1)
    if (closing && retained.length) closing.blockIds.push(...retained.map((b) => b.id))
    const leaving = omitted.filter((block) => !retained.includes(block))
    const linkedLeaving = leaving.filter((block) => linkedVimeoId(draft.document, block))
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
    // As seções vêm SEMPRE inteiras do manifesto, então as que ele não tem saem nos dois modos.
    const removedSections = draft.document.sections
      .filter((section) => !sectionIds.has(section.id))
      .map((section) => ({ id: section.id, title: section.title }))
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
        ...(leaving.length || removedSections.length
          ? [
              mode === 'replace'
                ? `A substituição removerá ${leaving.length} bloco(s) e ${removedSections.length} seção(ões) ausentes no manifesto.`
                : `Sai do rascunho o que não está mais no manifesto: ${plural(leaving.length, 'bloco', 'blocos')} e ${plural(removedSections.length, 'seção', 'seções')}.`,
            ]
          : mode === 'replace'
            ? ['O manifesto já representa todo o rascunho; não há conteúdo adicional para remover.']
            : []),
        ...(linkedLeaving.length
          ? [
              linkedLeaving.length === 1
                ? 'Um vídeo já vinculado sai do rascunho porque o manifesto não tem mais esse vídeo. Ele continua no Vimeo, com o número na lista abaixo.'
                : `${linkedLeaving.length} vídeos já vinculados saem do rascunho porque o manifesto não tem mais esses vídeos. Eles continuam no Vimeo, com o número na lista abaixo.`,
            ]
          : []),
        ...(leaving.length
          ? [
              'Projetos e entregas já salvos pelos alunos e o histórico de evidências não são apagados.',
            ]
          : []),
        ...(draft.isPublished
          ? ['A aula publicada permanece disponível. Esta importação altera somente o rascunho.']
          : []),
        ...(retained.length
          ? [
              retained.length === 1
                ? 'Um bloco criado aqui no Admin, fora do manifesto, fica no fim da última seção.'
                : `${retained.length} blocos criados aqui no Admin, fora do manifesto, ficam no fim da última seção.`,
            ]
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
