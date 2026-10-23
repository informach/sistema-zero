import { ValidationError } from '../errors'
import type { LessonDraftDocument } from './authoring'
import { isLearningManifest, type LearningManifest } from './index'
import {
  readManifestStudioProjectExamples,
  readStudioProjectExamples,
  studioProjectExampleEnvironmentIssues,
} from './studio-project-examples'

export interface LegacyStudioSolutionConversion {
  blockId: string
  exampleId: string
  sectionIds: string[]
}

/** Conversion removes the retired global field; callers must use the private registry. */
export type ConvertedStudioSolutionContent<T extends { kind: string }> = {
  [Key in keyof T as Key extends 'solutionProject' ? never : Key]: T[Key]
} & {
  projectExamples?: unknown
}

/** Friendly error detection only; the canonical manifest validator still decides acceptance. */
export function hasLegacyStudioManifestSolution(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const blocks = Object.getOwnPropertyDescriptor(value, 'blocks')
  if (!blocks || !('value' in blocks) || !Array.isArray(blocks.value)) return false
  return blocks.value.some((block: unknown) => {
    if (!block || typeof block !== 'object') return false
    const content = Object.getOwnPropertyDescriptor(block, 'content')
    return Boolean(
      content &&
        'value' in content &&
        content.value &&
        typeof content.value === 'object' &&
        Object.hasOwn(content.value, 'solutionProject'),
    )
  })
}

/** Explicit data conversion only; consumers never consult the retired global field. */
export function convertLegacyStudioSolutionBlocks<T extends { kind: string }>(
  blocks: readonly { id: string; content: T }[],
  sections: readonly { id: string; workspaceBlockId: string | null }[],
  newExampleId: (blockId: string) => string,
  identity: 'persisted' | 'manifest' = 'persisted',
): {
  blocks: { id: string; content: ConvertedStudioSolutionContent<T> }[]
  converted: LegacyStudioSolutionConversion[]
} {
  const converted: LegacyStudioSolutionConversion[] = []
  const next = blocks.map((block) => {
    if (
      Object.values(Object.getOwnPropertyDescriptors(block.content)).some(
        (entry) => !('value' in entry),
      )
    )
      throw new ValidationError('O conteúdo da aula precisa ser dados JSON.')
    const descriptor = Object.getOwnPropertyDescriptor(block.content, 'solutionProject')
    if (!descriptor) return block
    if (!('value' in descriptor))
      throw new ValidationError('O gabarito antigo precisa ser dados JSON.')
    if (Object.hasOwn(block.content, 'projectExamples'))
      throw new ValidationError(
        'A aula mistura gabarito global e exemplos por parte. Revise o conflito antes de converter.',
      )
    if (
      block.content.kind !== 'studio' ||
      Object.getOwnPropertyDescriptor(block.content, 'gallery')?.value !== undefined
    )
      throw new ValidationError('O gabarito antigo não pertence a um Estúdio incorporado.')
    const sectionIds = sections
      .filter((section) => section.workspaceBlockId === block.id)
      .map((section) => section.id)
    if (!sectionIds.length)
      throw new ValidationError(
        'O gabarito antigo não tem uma parte correspondente. Associe o Estúdio antes de converter.',
      )
    const exampleId = newExampleId(block.id)
    const registry: unknown = {
      version: 1,
      examples: { [exampleId]: descriptor.value },
      sections: Object.fromEntries(sectionIds.map((id) => [id, { solutionExampleId: exampleId }])),
    }
    const read =
      identity === 'manifest'
        ? readManifestStudioProjectExamples(registry)
        : readStudioProjectExamples(registry)
    if (read.kind !== 'valid')
      throw new ValidationError(
        read.kind === 'invalid'
          ? (read.issues[0]?.message ?? 'Gabarito antigo inválido.')
          : 'Gabarito antigo ausente.',
      )
    const initial = Object.getOwnPropertyDescriptor(block.content, 'initialProject')
    if (!initial || !('value' in initial))
      throw new ValidationError('Projeto inicial inválido para a conversão.')
    const [issue] = studioProjectExampleEnvironmentIssues(read.value, initial.value)
    if (issue) throw new ValidationError(issue.message)
    const content = { ...block.content, projectExamples: read.value }
    Reflect.deleteProperty(content, 'solutionProject')
    converted.push({ blockId: block.id, exampleId, sectionIds })
    return { ...block, content }
  })
  return { blocks: next, converted }
}

export function convertLegacyStudioSolutions<T extends { kind: string }>(
  document: LessonDraftDocument<T>,
  newExampleId: (blockId: string) => string,
): {
  document: LessonDraftDocument<ConvertedStudioSolutionContent<T>>
  converted: LegacyStudioSolutionConversion[]
} {
  const result = convertLegacyStudioSolutionBlocks(document.blocks, document.sections, newExampleId)
  return { document: { ...document, blocks: result.blocks }, converted: result.converted }
}

/** Explicit file converter. The normal importer accepts only its canonical v5 output. */
export function convertLegacyLearningManifest(
  value: unknown,
  newExampleId: (blockKey: string) => string,
): { manifest: LearningManifest; converted: LegacyStudioSolutionConversion[] } {
  const record = (input: unknown): input is Record<string, unknown> =>
    typeof input === 'object' && input !== null && !Array.isArray(input)
  if (
    !record(value) ||
    value.version !== 5 ||
    !Array.isArray(value.blocks) ||
    !Array.isArray(value.sections)
  )
    throw new ValidationError('O conversor aceita somente um manifesto v5 completo.')
  const blocks: { id: string; content: { kind: string; [key: string]: unknown } }[] = []
  for (const block of value.blocks) {
    if (!record(block) || typeof block.key !== 'string')
      throw new ValidationError('Bloco de manifesto inválido.')
    if (!Object.hasOwn(block, 'content')) continue
    if (!record(block.content) || typeof block.content.kind !== 'string')
      throw new ValidationError('Conteúdo de manifesto inválido.')
    blocks.push({ id: block.key, content: { ...block.content, kind: block.content.kind } })
  }
  const sections = value.sections.map((section) => {
    if (
      !record(section) ||
      typeof section.key !== 'string' ||
      !(section.workspaceKey === null || typeof section.workspaceKey === 'string')
    )
      throw new ValidationError('Parte de manifesto inválida.')
    return { id: section.key, workspaceBlockId: section.workspaceKey }
  })
  const result = convertLegacyStudioSolutionBlocks(blocks, sections, newExampleId, 'manifest')
  const contentByKey = new Map(result.blocks.map((block) => [block.id, block.content]))
  const next = {
    ...value,
    blocks: value.blocks.map((block) => {
      if (!record(block) || typeof block.key !== 'string')
        throw new ValidationError('Bloco de manifesto inválido.')
      const content = contentByKey.get(block.key)
      return content ? { ...block, content } : block
    }),
  }
  if (!isLearningManifest(next))
    throw new ValidationError(
      'O manifesto convertido ainda é inválido. Revise as partes, os objetivos e os limites.',
    )
  return { manifest: next, converted: result.converted }
}
