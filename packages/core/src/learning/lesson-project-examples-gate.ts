import type { LessonDraftDocument } from './authoring'
import {
  LEARNING_IMPORT_BODY_MAX_BYTES,
  learningImportBodyBytes,
  projectLessonManifestDraft,
} from './authoring-manifest-projection'
import {
  readStudioProjectExamples,
  type StudioProjectExampleIssue,
  type StudioProjectExamples,
  studioLessonProjectExamplesIssues,
  studioProjectExampleEnvironmentIssues,
  studioProjectExampleSectionIssues,
} from './studio-project-examples'

export interface LessonStudioProjectExampleIssue extends StudioProjectExampleIssue {
  blockId?: string
}

/** Validate a final lesson document; callers remain responsible for their write protocol. */
export function inspectLessonStudioProjectExamples(
  sections: readonly { id: string; workspaceBlockId: string | null }[],
  blocks: readonly { id: string; content: unknown }[],
): {
  issues: LessonStudioProjectExampleIssue[]
  registries: ReadonlyMap<string, StudioProjectExamples>
} {
  const issues: LessonStudioProjectExampleIssue[] = []
  const registries: { blockId: string; bytes: number; registry: StudioProjectExamples }[] = []
  const byBlock = new Map<string, StudioProjectExamples>()
  for (const section of sections) {
    const completion = Object.getOwnPropertyDescriptor(section, 'completion')
    const forbidden = ['projectExamples', 'solutionProject'].some(
      (field) =>
        Object.hasOwn(section, field) ||
        (completion &&
          'value' in completion &&
          completion.value &&
          typeof completion.value === 'object' &&
          Object.hasOwn(completion.value, field)),
    )
    if (forbidden)
      issues.push({
        path: `sections.${section.id}`,
        code: 'context',
        message: 'Guarde exemplos somente no registro privado do Estúdio e associe-os à parte.',
      })
  }
  for (const block of blocks) {
    const content = block.content
    if (!content || typeof content !== 'object' || Array.isArray(content)) continue
    if (Object.hasOwn(content, 'solutionProject')) {
      issues.push({
        blockId: block.id,
        path: 'solutionProject',
        code: 'context',
        message:
          'Converta o gabarito global antigo para exemplos por parte antes de guardar a aula.',
      })
      continue
    }
    const descriptor = Object.getOwnPropertyDescriptor(content, 'projectExamples')
    if (!descriptor) continue
    if (!('value' in descriptor)) {
      issues.push({
        blockId: block.id,
        path: 'projectExamples',
        code: 'shape',
        message: 'Os exemplos precisam ser dados JSON.',
      })
      continue
    }
    if (descriptor.value === undefined) continue
    const kind = Object.getOwnPropertyDescriptor(content, 'kind')
    const gallery = Object.getOwnPropertyDescriptor(content, 'gallery')
    const initial = Object.getOwnPropertyDescriptor(content, 'initialProject')
    if (
      !kind ||
      !('value' in kind) ||
      kind.value !== 'studio' ||
      (gallery && (!('value' in gallery) || gallery.value !== undefined)) ||
      (initial && !('value' in initial))
    ) {
      issues.push({
        blockId: block.id,
        path: 'projectExamples',
        code: 'context',
        message: 'Exemplos pertencem a um Estúdio incorporado da aula.',
      })
      continue
    }
    const read = readStudioProjectExamples(descriptor.value)
    if (read.kind === 'invalid') {
      issues.push(...read.issues.map((issue) => ({ ...issue, blockId: block.id })))
      continue
    }
    if (read.kind === 'absent') continue
    registries.push({ blockId: block.id, bytes: read.bytes, registry: read.value })
    byBlock.set(block.id, read.value)
    issues.push(
      ...[
        ...studioProjectExampleSectionIssues(read.value, block.id, sections),
        ...studioProjectExampleEnvironmentIssues(read.value, initial?.value),
      ].map((issue) => ({ ...issue, blockId: block.id })),
    )
    const aggregate = studioLessonProjectExamplesIssues(registries)
    if (aggregate.length) return { issues: [...issues, ...aggregate], registries: byBlock }
  }
  return { issues, registries: byBlock }
}

export function lessonStudioProjectExampleIssues(
  sections: readonly { id: string; workspaceBlockId: string | null }[],
  blocks: readonly { id: string; content: unknown }[],
): LessonStudioProjectExampleIssue[] {
  return inspectLessonStudioProjectExamples(sections, blocks).issues
}

/** Size is independent of final export/publication validity: unfinished parts remain editable. */
export function lessonStudioExampleTransportIssues<T extends { kind: string }>(
  document: LessonDraftDocument<T>,
  courseSlug: string,
): LessonStudioProjectExampleIssue[] {
  if (!document.blocks.some((block) => Object.hasOwn(block.content, 'projectExamples'))) return []
  try {
    const { manifest } = projectLessonManifestDraft(document, courseSlug)
    if (learningImportBodyBytes(manifest) <= LEARNING_IMPORT_BODY_MAX_BYTES) return []
    return [
      {
        path: 'projectExamples',
        code: 'limit',
        message:
          'A aula com os exemplos excede 2 MiB no corpo de importação, incluindo projeto inicial e critérios. Reduza os snapshots antes de guardar.',
      },
    ]
  } catch (error) {
    return [
      {
        path: 'projectExamples',
        code: 'shape',
        message:
          error instanceof Error ? error.message : 'A aula não pôde ser preparada para transporte.',
      },
    ]
  }
}
