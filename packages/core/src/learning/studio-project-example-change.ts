import { ValidationError } from '../errors'
import type { DraftBlock, LessonDraftDocument } from './authoring'
import {
  readStudioProjectExamples,
  type StudioProjectExamples,
  type StudioSectionExampleBinding,
  studioProjectExampleEnvironmentIssues,
} from './studio-project-examples'

export type StudioProjectExampleRole = 'entry' | 'solution'
export type StudioProjectExampleAction =
  | { type: 'save'; exampleId: string; project: unknown }
  | { type: 'reuse'; exampleId: string }
  | { type: 'clear' }
export interface StudioProjectExampleChange {
  type: 'studio-example'
  blockId: string
  sectionId: string
  role: StudioProjectExampleRole
  action: StudioProjectExampleAction
}

function ownValue(content: object, field: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(content, field)
  if (!descriptor) return undefined
  if (!('value' in descriptor)) throw new ValidationError('A autoria precisa usar dados JSON.')
  return descriptor.value
}

function readRegistry(raw: unknown): StudioProjectExamples {
  const read = readStudioProjectExamples(raw)
  if (read.kind === 'invalid')
    throw new ValidationError(read.issues[0]?.message ?? 'Os exemplos desta parte estão inválidos.')
  return read.kind === 'absent' ? { version: 1, examples: {}, sections: {} } : read.value
}

/** Prune only the current document. Restore/undo snapshots remain independent documents. */
export function pruneStudioProjectExamples(
  registry: StudioProjectExamples,
  keepSection: (sectionId: string) => boolean = () => true,
): StudioProjectExamples {
  const sections: Record<string, StudioSectionExampleBinding> = {}
  const used = new Set<string>()
  for (const [sectionId, binding] of Object.entries(registry.sections)) {
    if (!keepSection(sectionId) || (!binding.entryExampleId && !binding.solutionExampleId)) continue
    sections[sectionId] = { ...binding }
    if (binding.entryExampleId) used.add(binding.entryExampleId)
    if (binding.solutionExampleId) used.add(binding.solutionExampleId)
  }
  return {
    version: 1,
    examples: Object.fromEntries(Object.entries(registry.examples).filter(([id]) => used.has(id))),
    sections,
  }
}

/**
 * Pure shared reducer. The server calls it under the existing lesson lock/CAS; the Admin uses
 * exactly the same edit locally. Snapshot IDs never derive from the project's own identity.
 */
export function applyStudioProjectExampleChange<T extends { kind: string }>(
  document: LessonDraftDocument<T>,
  change: StudioProjectExampleChange,
): LessonDraftDocument<T> {
  const block = document.blocks.find((candidate) => candidate.id === change.blockId)
  const section = document.sections.find((candidate) => candidate.id === change.sectionId)
  if (block?.content.kind !== 'studio' || ownValue(block.content, 'gallery') !== undefined)
    throw new ValidationError('Escolha um Estúdio incorporado desta aula para os exemplos.')
  if (Object.hasOwn(block.content, 'solutionProject'))
    throw new ValidationError('Converta o gabarito global para exemplos por parte antes de editar.')
  if (!section || section.workspaceBlockId !== block.id)
    throw new ValidationError('A parte precisa usar este Estúdio antes de associar um exemplo.')
  if (change.role !== 'entry' && change.role !== 'solution')
    throw new ValidationError('Escolha um exemplo de entrada ou uma solução desta parte.')

  const current = readRegistry(ownValue(block.content, 'projectExamples'))
  const examples = { ...current.examples }
  const sections = { ...current.sections }
  const binding = { ...sections[section.id] }
  const role = change.role === 'entry' ? 'entryExampleId' : 'solutionExampleId'
  if (change.action.type === 'clear') delete binding[role]
  else if (change.action.type === 'reuse') {
    if (!Object.hasOwn(examples, change.action.exampleId))
      throw new ValidationError('O exemplo escolhido não existe neste Estúdio.')
    binding[role] = change.action.exampleId
  } else if (change.action.type === 'save') {
    if (Object.hasOwn(examples, change.action.exampleId))
      throw new ValidationError(
        'Um exemplo guardado é imutável. Guarde a alteração com um novo ID.',
      )
    // The boundary parser below copies and validates this untrusted project before returning it.
    const proposedSections = {
      ...sections,
      [section.id]: { ...binding, [role]: change.action.exampleId },
    }
    const referenced = new Set(
      Object.values(proposedSections).flatMap((part) =>
        [part.entryExampleId, part.solutionExampleId].filter(
          (id): id is string => typeof id === 'string',
        ),
      ),
    )
    const proposed = readRegistry({
      version: 1,
      examples: Object.fromEntries(
        Object.entries({ ...examples, [change.action.exampleId]: change.action.project }).filter(
          ([id]) => referenced.has(id),
        ),
      ),
      sections: proposedSections,
    })
    const next = pruneStudioProjectExamples(proposed)
    return withExamples(document, block, next)
  } else throw new ValidationError('A alteração de exemplo não é reconhecida.')

  sections[section.id] = binding
  const next = pruneStudioProjectExamples({ version: 1, examples, sections })
  return withExamples(document, block, next)
}

function withExamples<T extends { kind: string }>(
  document: LessonDraftDocument<T>,
  block: DraftBlock<T>,
  registry: StudioProjectExamples,
): LessonDraftDocument<T> {
  const issues = studioProjectExampleEnvironmentIssues(
    registry,
    ownValue(block.content, 'initialProject'),
  )
  if (issues.length)
    throw new ValidationError(issues[0]?.message ?? 'O ambiente do exemplo é incompatível.')
  return {
    ...document,
    blocks: document.blocks.map((candidate) =>
      candidate.id === block.id
        ? { ...candidate, content: { ...candidate.content, projectExamples: registry } }
        : candidate,
    ),
  }
}

/** Ordinary block payloads do not carry examples; the local and persisted reducers preserve them. */
export function preserveStudioExampleContent<T extends { kind: string }>(
  incoming: T,
  previous: unknown,
): T {
  if (Object.hasOwn(incoming, 'projectExamples'))
    throw new ValidationError('Edite os exemplos por parte no rascunho da aula.')
  if (Object.hasOwn(incoming, 'solutionProject'))
    throw new ValidationError(
      'O gabarito global foi substituído por exemplos por parte. Converta o formato antigo.',
    )
  if (!previous || typeof previous !== 'object') return incoming
  if (Object.hasOwn(previous, 'solutionProject'))
    throw new ValidationError('Converta o gabarito global guardado antes de editar este bloco.')
  const raw = ownValue(previous, 'projectExamples')
  if (raw === undefined) return incoming
  if (incoming.kind !== 'studio' || ownValue(incoming, 'gallery') !== undefined) {
    const registry = readRegistry(raw)
    if (!Object.keys(registry.sections).length && !Object.keys(registry.examples).length)
      return incoming
    throw new ValidationError(
      'Remova as associações de exemplos antes de trocar o tipo deste Estúdio.',
    )
  }
  return { ...incoming, projectExamples: raw }
}

/** Structural edits never carry snapshots; removed/retargeted parts release only their bindings. */
export function pruneLessonStudioExamples<T extends { kind: string }>(
  document: LessonDraftDocument<T>,
): LessonDraftDocument<T> {
  return {
    ...document,
    blocks: document.blocks.map((block) => {
      const raw = ownValue(block.content, 'projectExamples')
      if (raw === undefined) return block
      const rawSections = raw && typeof raw === 'object' ? ownValue(raw, 'sections') : undefined
      const keepSection = (sectionId: string) =>
        document.sections.some(
          (section) => section.id === sectionId && section.workspaceBlockId === block.id,
        )
      // Reordering parts retains their identities: do not copy large snapshots for a move.
      if (
        rawSections &&
        typeof rawSections === 'object' &&
        !Array.isArray(rawSections) &&
        Object.keys(rawSections).every(keepSection)
      )
        return block
      const current = readRegistry(raw)
      const next = pruneStudioProjectExamples(current, keepSection)
      return { ...block, content: { ...block.content, projectExamples: next } }
    }),
  }
}
