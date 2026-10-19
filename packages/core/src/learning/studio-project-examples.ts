import { isStudioAuthoringProject, type StudioAuthoringProject } from '../studio/authoring-project'
import { studioProjectContinuityIssue } from '../studio/project-continuity'
import { copyStudioProjectJson, StudioProjectJsonError } from '../studio/project-json'

export const STUDIO_PROJECT_EXAMPLE_LIMITS = Object.freeze({
  maxProjectChars: 1_500_000,
  maxSections: 60,
  maxExamples: 120,
  maxLessonBytes: 2 * 1024 * 1024,
})
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MANIFEST_KEY = /^[a-z][a-z0-9-]{0,79}$/

export interface StudioSectionExampleBinding {
  entryExampleId?: string
  solutionExampleId?: string
}
export interface StudioProjectExamples {
  version: 1
  /** Snapshot IDs are independent of the IDs inside the project documents. */
  examples: Record<string, StudioAuthoringProject>
  sections: Record<string, StudioSectionExampleBinding>
}

/** Private preview inventory; reports identities/names, never source or assets. */
export function studioExampleBindings(registry: StudioProjectExamples) {
  return Object.entries(registry.sections).flatMap(([sectionId, binding]) =>
    (['entryExampleId', 'solutionExampleId'] as const).flatMap((role) => {
      const exampleId = binding[role]
      return exampleId
        ? [
            {
              sectionId,
              role,
              exampleId,
              exampleName: registry.examples[exampleId]?.name ?? 'Exemplo',
            },
          ]
        : []
    }),
  )
}
export interface StudioProjectExampleIssue {
  path: string
  code: 'shape' | 'limit' | 'reference' | 'project' | 'orphan' | 'context'
  message: string
}
export type StudioProjectExamplesRead =
  | { kind: 'absent' }
  | { kind: 'invalid'; issues: StudioProjectExampleIssue[] }
  | { kind: 'valid'; value: StudioProjectExamples; bytes: number }
export type StudioSectionExamplesRead =
  | { kind: 'absent' }
  | { kind: 'invalid'; issues: StudioProjectExampleIssue[] }
  | { kind: 'resolved'; entry?: StudioAuthoringProject; solution?: StudioAuthoringProject }

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const hasOnly = (value: Record<string, unknown>, names: readonly string[]) =>
  Object.keys(value).every((key) => names.includes(key))
const invalid = (
  path: string,
  code: StudioProjectExampleIssue['code'],
  message: string,
): StudioProjectExamplesRead => ({ kind: 'invalid', issues: [{ path, code, message }] })

/**
 * Validate private authoring JSON once at the boundary. Unknown versions, dangling references,
 * accessors and prototype keys are errors, never absence and never a legacy-solution fallback.
 */
function readProjectExamples(
  raw: unknown,
  validSectionIdentity: (value: string) => boolean,
): StudioProjectExamplesRead {
  if (raw === undefined) return { kind: 'absent' }
  let copied: unknown
  try {
    copied = copyStudioProjectJson(raw, {
      nodes: 500_000,
      textChars: STUDIO_PROJECT_EXAMPLE_LIMITS.maxLessonBytes,
      depth: 40_064,
    })
  } catch (error) {
    return invalid(
      '',
      error instanceof StudioProjectJsonError && error.code === 'json-budget' ? 'limit' : 'shape',
      error instanceof Error ? error.message : 'Exemplos inválidos.',
    )
  }
  if (
    !record(copied) ||
    copied.version !== 1 ||
    !hasOnly(copied, ['version', 'examples', 'sections']) ||
    !record(copied.examples) ||
    !record(copied.sections)
  )
    return invalid(
      '',
      'shape',
      'O registro de exemplos precisa usar a versão 1 e os campos conhecidos.',
    )
  const exampleEntries = Object.entries(copied.examples)
  const sectionEntries = Object.entries(copied.sections)
  if (
    exampleEntries.length > STUDIO_PROJECT_EXAMPLE_LIMITS.maxExamples ||
    sectionEntries.length > STUDIO_PROJECT_EXAMPLE_LIMITS.maxSections
  )
    return invalid('', 'limit', 'A aula excede o limite de exemplos ou partes.')

  let serialized: string
  try {
    serialized = JSON.stringify(copied)
  } catch (error) {
    return invalid(
      '',
      'shape',
      error instanceof Error ? error.message : 'Exemplos não serializáveis.',
    )
  }
  const bytes = new TextEncoder().encode(serialized).byteLength
  if (bytes > STUDIO_PROJECT_EXAMPLE_LIMITS.maxLessonBytes)
    return invalid('', 'limit', 'Os exemplos excedem 2 MiB de JSON na aula.')

  const examples: Record<string, StudioAuthoringProject> = {}
  for (const [id, project] of exampleEntries) {
    if (!UUID.test(id))
      return invalid(`examples.${id}`, 'shape', 'O exemplo precisa de um ID próprio válido.')
    if (!isStudioAuthoringProject(project))
      return invalid(
        `examples.${id}`,
        'project',
        'O projeto de exemplo precisa estar no formato atual de autoria.',
      )
    if (JSON.stringify(project).length > STUDIO_PROJECT_EXAMPLE_LIMITS.maxProjectChars)
      return invalid(`examples.${id}`, 'limit', 'O projeto de exemplo excede o tamanho permitido.')
    examples[id] = project
  }

  const sections: Record<string, StudioSectionExampleBinding> = {}
  const used = new Set<string>()
  for (const [sectionId, binding] of sectionEntries) {
    if (
      !validSectionIdentity(sectionId) ||
      !record(binding) ||
      !hasOnly(binding, ['entryExampleId', 'solutionExampleId']) ||
      Object.keys(binding).length === 0
    )
      return invalid(
        `sections.${sectionId}`,
        'shape',
        'A associação precisa indicar uma parte e um exemplo.',
      )
    const parsed: StudioSectionExampleBinding = {}
    for (const role of ['entryExampleId', 'solutionExampleId'] as const) {
      const id = binding[role]
      if (id === undefined) continue
      if (typeof id !== 'string' || !UUID.test(id) || !Object.hasOwn(examples, id))
        return invalid(
          `sections.${sectionId}.${role}`,
          'reference',
          'A associação aponta para um exemplo que não existe neste bloco.',
        )
      parsed[role] = id
      used.add(id)
    }
    if (!parsed.entryExampleId && !parsed.solutionExampleId)
      return invalid(
        `sections.${sectionId}`,
        'shape',
        'A associação não aponta para nenhum exemplo.',
      )
    sections[sectionId] = parsed
  }
  const orphan = exampleEntries.find(([id]) => !used.has(id))
  if (orphan)
    return invalid(`examples.${orphan[0]}`, 'orphan', 'Há um exemplo sem associação com uma parte.')
  return { kind: 'valid', value: { version: 1, examples, sections }, bytes }
}

/** Persistence/commands use section UUIDs; portable manifests use their existing stable keys. */
export function readStudioProjectExamples(raw: unknown): StudioProjectExamplesRead {
  return readProjectExamples(raw, (id) => UUID.test(id))
}
export function readManifestStudioProjectExamples(raw: unknown): StudioProjectExamplesRead {
  return readProjectExamples(raw, (key) => MANIFEST_KEY.test(key))
}

/** A validated registry may deliberately have no example for this part. */
export function resolveStudioSectionExamples(
  registry: StudioProjectExamples | undefined,
  sectionId: string,
): StudioSectionExamplesRead {
  if (!registry || !Object.hasOwn(registry.sections, sectionId)) return { kind: 'absent' }
  const binding = registry.sections[sectionId]
  if (!binding || (!binding.entryExampleId && !binding.solutionExampleId))
    return {
      kind: 'invalid',
      issues: [
        {
          path: `sections.${sectionId}`,
          code: 'reference',
          message: 'A associação de exemplos da parte está inválida.',
        },
      ],
    }
  const result: Extract<StudioSectionExamplesRead, { kind: 'resolved' }> = { kind: 'resolved' }
  for (const [role, target] of [
    ['entryExampleId', 'entry'],
    ['solutionExampleId', 'solution'],
  ] as const) {
    const id = binding[role]
    if (id === undefined) continue
    if (!Object.hasOwn(registry.examples, id) || !registry.examples[id])
      return {
        kind: 'invalid',
        issues: [
          {
            path: `sections.${sectionId}.${role}`,
            code: 'reference',
            message: 'O exemplo associado à parte não foi encontrado.',
          },
        ],
      }
    result[target] = registry.examples[id]
  }
  return result
}

/** Referential integrity is independent of database IDs versus portable manifest keys. */
export function studioProjectExampleSectionIssues(
  registry: StudioProjectExamples,
  blockId: string,
  sections: readonly { id: string; workspaceBlockId: string | null }[],
): StudioProjectExampleIssue[] {
  return Object.keys(registry.sections).flatMap((sectionId) => {
    const section = sections.find((candidate) => candidate.id === sectionId)
    return section?.workspaceBlockId === blockId
      ? []
      : [
          {
            path: `sections.${sectionId}`,
            code: 'context' as const,
            message: 'O exemplo precisa pertencer a uma parte que usa este Estúdio.',
          },
        ]
  })
}

/** Examples cannot change the runtime identity which the lesson's initial project authorizes. */
export function studioProjectExampleEnvironmentIssues(
  registry: StudioProjectExamples,
  initialProject: unknown,
): StudioProjectExampleIssue[] {
  if (!isStudioAuthoringProject(initialProject))
    return [
      {
        path: 'initialProject',
        code: 'project',
        message: 'Prepare um projeto inicial válido antes dos exemplos.',
      },
    ]
  return Object.entries(registry.examples).flatMap(([id, project]): StudioProjectExampleIssue[] => {
    const continuity = studioProjectContinuityIssue(project, initialProject)
    if (!continuity) return []
    const message =
      continuity === 'template'
        ? 'O exemplo precisa usar o mesmo modelo Pro do projeto inicial.'
        : continuity === 'runtime'
          ? 'O exemplo precisa usar o mesmo perfil e release autorizados do projeto inicial.'
          : 'O exemplo precisa usar a mesma linguagem e o mesmo tipo do projeto inicial.'
    return [{ path: `examples.${id}`, code: 'context', message }]
  })
}

/** The 2 MiB resource budget is shared by all private registries in a lesson. */
export function studioLessonProjectExamplesIssues(
  registries: readonly { blockId: string; bytes: number; registry: StudioProjectExamples }[],
): StudioProjectExampleIssue[] {
  const bytes = registries.reduce((sum, item) => sum + item.bytes, 0)
  const sections = registries.reduce(
    (sum, item) => sum + Object.keys(item.registry.sections).length,
    0,
  )
  const examples = registries.reduce(
    (sum, item) => sum + Object.keys(item.registry.examples).length,
    0,
  )
  if (
    bytes > STUDIO_PROJECT_EXAMPLE_LIMITS.maxLessonBytes ||
    sections > STUDIO_PROJECT_EXAMPLE_LIMITS.maxSections ||
    examples > STUDIO_PROJECT_EXAMPLE_LIMITS.maxExamples
  )
    return [
      {
        path: 'projectExamples',
        code: 'limit',
        message: 'A soma dos exemplos privados excede o limite permitido para esta aula.',
      },
    ]
  return []
}
