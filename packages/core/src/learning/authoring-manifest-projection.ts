import { ValidationError } from '../errors'
import type { LessonDraftDocument } from './authoring'
import { readStudioProjectExamples, type StudioProjectExamples } from './studio-project-examples'

const PREFIXES: Readonly<Record<string, string>> = {
  interactive: 'cena',
  rich_text: 'texto',
  dialogue: 'fala',
  video: 'video',
  image: 'imagem',
  audio: 'audio',
  quiz: 'quiz',
  embed: 'html',
  ebook: 'ebook',
  studio: 'estudio',
  pinta: 'pinta',
  certificate: 'certificado',
  coming_soon: 'em-breve',
  materials: 'materiais',
}
export const LEARNING_IMPORT_BODY_MAX_BYTES = 2 * 1024 * 1024
/** Local file/formatting budget, separate from the immutable 2 MiB network body limit. */
export const LEARNING_MANIFEST_SOURCE_MAX_BYTES = 8 * LEARNING_IMPORT_BODY_MAX_BYTES
const UUID_PLACEHOLDER = '00000000-0000-4000-8000-000000000000'
export const MANIFEST_VIDEO_INSTRUCTIONS_TRUNCATED =
  'A orientação de um vídeo era longa demais para o manifesto e foi cortada no fim. O link do vídeo de origem foi preservado.'

/** Keep the existing export identity: IDs, never titles or array positions, determine keys. */
export function learningManifestKeyFor(prefix: string, id: string): string {
  const hex = id
    .replace(/[^0-9a-f]/gi, '')
    .toLowerCase()
    .slice(0, 8)
  return `${prefix}-${hex || 'sem-id'}`
}

export function remapStudioExampleSections(
  registry: StudioProjectExamples,
  identity: (sectionId: string) => string | undefined,
): StudioProjectExamples {
  const sections: StudioProjectExamples['sections'] = {}
  for (const [sectionId, binding] of Object.entries(registry.sections)) {
    const mapped = identity(sectionId)
    if (!mapped)
      throw new ValidationError(
        'Uma associação de exemplo aponta para uma parte que não existe no destino.',
      )
    if (Object.hasOwn(sections, mapped))
      throw new ValidationError('Duas partes geraram a mesma identidade de exemplo.')
    sections[mapped] = { ...binding }
  }
  return { version: 1, examples: registry.examples, sections }
}

/** Clone/portable conversion changes pedagogical bindings, never project or snapshot IDs. */
export function remapStudioExampleContent<T extends { kind: string }>(
  content: T,
  identity: (sectionId: string) => string | undefined,
): T {
  if (Object.hasOwn(content, 'solutionProject'))
    throw new ValidationError('Converta o gabarito global antes de copiar a aula.')
  const descriptor = Object.getOwnPropertyDescriptor(content, 'projectExamples')
  if (!descriptor) return content
  if (!('value' in descriptor)) throw new ValidationError('Os exemplos precisam ser dados JSON.')
  const read = readStudioProjectExamples(descriptor.value)
  if (read.kind === 'invalid')
    throw new ValidationError(read.issues[0]?.message ?? 'Exemplos inválidos.')
  if (read.kind === 'absent') return content
  if (content.kind !== 'studio')
    throw new ValidationError('Exemplos pertencem a um Estúdio incorporado.')
  return { ...content, projectExamples: remapStudioExampleSections(read.value, identity) }
}

export interface LearningManifestDraftProjection {
  version: 5
  courseSlug: string
  lessonSlug: string
  title: string
  blocks: (
    | { key: string; content: Record<string, unknown> }
    | { key: string; plannedVideo: string }
  )[]
  sections: Record<string, unknown>[]
}
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Same portable shaping for final export and size preflight; deliberately accepts draft WIP. */
export function projectLessonManifestDraft<T extends { kind: string }>(
  document: LessonDraftDocument<T>,
  courseSlug: string,
): { manifest: LearningManifestDraftProjection; warnings: string[] } {
  const blockKeys = new Map(
    document.blocks.map((block) => [
      block.id,
      learningManifestKeyFor(PREFIXES[block.content.kind] ?? 'bloco', block.id),
    ]),
  )
  const sectionKeys = new Map(
    document.sections.map((section) => [section.id, learningManifestKeyFor('secao', section.id)]),
  )
  if (
    new Set(blockKeys.values()).size !== document.blocks.length ||
    new Set(sectionKeys.values()).size !== document.sections.length
  )
    throw new ValidationError('Duas peças da aula geraram a mesma chave de manifesto.')
  const mapped = (id: string) => {
    const key = blockKeys.get(id)
    if (!key) throw new ValidationError('Uma parte aponta para um bloco que não existe na aula.')
    return key
  }
  const warnings: string[] = []
  const blocks: LearningManifestDraftProjection['blocks'] = document.blocks.map((block) => {
    const content: Record<string, unknown> = { ...block.content }
    const key = mapped(block.id)
    if (content.kind === 'video') {
      const source = typeof content.src === 'string' ? content.src.trim() : ''
      const link = source ? `Vídeo de origem: ${source}` : ''
      const instructions =
        document.plannedVideos.find((video) => video.blockId === block.id)?.instructions.trim() ??
        ''
      const whole = [instructions, link].filter(Boolean).join('\n')
      if (whole.length <= 5000) return { key, plannedVideo: whole || 'Vídeo a produzir.' }
      if (!warnings.includes(MANIFEST_VIDEO_INSTRUCTIONS_TRUNCATED))
        warnings.push(MANIFEST_VIDEO_INSTRUCTIONS_TRUNCATED)
      const remaining = Math.max(0, 5000 - link.length - 1)
      return { key, plannedVideo: `${instructions.slice(0, remaining)}\n${link}`.trim() }
    }
    if (content.kind === 'dialogue')
      return {
        key,
        content: {
          kind: 'dialogue',
          text: content.text,
          ...(content.pose ? { pose: content.pose } : {}),
        },
      }
    if (content.kind === 'rich_text')
      return { key, content: { kind: 'rich_text', markdown: content.markdown ?? '' } }
    if (content.kind === 'quiz')
      return {
        key,
        content: { kind: 'quiz', passingScore: content.passingScore, questions: content.questions },
      }
    if (content.kind === 'interactive' && record(content.activity)) {
      const activity = { ...content.activity }
      delete activity.vozes
      delete activity.instructionAudioUrl
      content.activity = activity
    }
    if (content.kind === 'materials' && Array.isArray(content.items))
      content.items = content.items.filter((item) => !record(item) || item.kind !== 'file')
    if (content.kind === 'studio') {
      if (Object.hasOwn(content, 'solutionProject'))
        throw new ValidationError(
          'Converta o gabarito global para exemplos por parte antes de exportar.',
        )
      const examples = readStudioProjectExamples(content.projectExamples)
      if (examples.kind === 'invalid')
        throw new ValidationError(examples.issues[0]?.message ?? 'Exemplos inválidos.')
      if (examples.kind === 'valid')
        content.projectExamples = remapStudioExampleSections(examples.value, (id) =>
          sectionKeys.get(id),
        )
    }
    return { key, content }
  })
  const sections = document.sections.map((section) => ({
    key: sectionKeys.get(section.id),
    title: section.title,
    objective: section.objective,
    intent: section.intent,
    blockKeys: section.blockIds.map(mapped),
    workspaceKey: section.workspaceBlockId ? mapped(section.workspaceBlockId) : null,
    externalTool: section.externalTool,
    pendingMedia: [],
    ...(section.teacherNotes?.trim() ? { teacherNotes: section.teacherNotes } : {}),
    ...(section.completion
      ? {
          completion: {
            ...section.completion,
            blockIds: section.completion.blockIds.map(mapped),
            ...(section.completion.materialItems
              ? {
                  materialItems: section.completion.materialItems.map((item) => ({
                    blockId: mapped(item.blockId),
                    itemIds: [...item.itemIds],
                  })),
                }
              : {}),
          },
        }
      : {}),
  }))
  return {
    manifest: {
      version: 5,
      courseSlug,
      lessonSlug: document.slug,
      title: document.title,
      blocks,
      sections,
    },
    warnings,
  }
}

/** Count the actual JSON transport envelope, including CAS/idempotency and selected mode. */
export function learningImportBodyBytes(
  document: unknown,
  mode: 'preserve' | 'replace' = 'preserve',
  expectedFingerprint = UUID_PLACEHOLDER,
  operationId = UUID_PLACEHOLDER,
): number {
  return new TextEncoder().encode(
    JSON.stringify({ document, mode, expectedFingerprint, operationId }),
  ).byteLength
}

/** A portable download must fit the local reader too, independently of pretty-print inflation. */
export function learningManifestSource(document: unknown): string {
  const pretty = `${JSON.stringify(document, null, 2)}\n`
  if (new TextEncoder().encode(pretty).byteLength <= LEARNING_MANIFEST_SOURCE_MAX_BYTES)
    return pretty
  const compact = `${JSON.stringify(document)}\n`
  if (new TextEncoder().encode(compact).byteLength <= LEARNING_MANIFEST_SOURCE_MAX_BYTES)
    return compact
  throw new ValidationError('O arquivo do manifesto excede o limite de leitura de 16 MiB.')
}
