import {
  readStudioProjectExamples,
  studioProjectExampleEnvironmentIssues,
} from '@sistemazero/core/learning'
import { InvalidContentCommandError } from './course.errors'
import type { LessonBlockContent } from './lesson-block'

/** Legacy whole-block writers cannot create, replace or erase the private registry. */
export function assertNoLegacyStudioExamples(content: unknown): void {
  if (content && typeof content === 'object' && Object.hasOwn(content, 'solutionProject'))
    throw new InvalidContentCommandError(
      'O gabarito global foi substituído por exemplos por parte. Converta o formato antigo.',
    )
  if (content && typeof content === 'object' && Object.hasOwn(content, 'projectExamples'))
    throw new InvalidContentCommandError('Edite os exemplos por parte no rascunho da aula.')
}

/** Call under the writer's existing lock/CAS, using the freshly read previous content. */
export function preserveStudioExamplesForLegacyWrite<T extends { kind: string }>(
  incoming: T,
  previous?: unknown,
): T & { projectExamples?: unknown } {
  assertNoLegacyStudioExamples(incoming)
  if (!previous || typeof previous !== 'object') return incoming
  if (Object.hasOwn(previous, 'solutionProject'))
    throw new InvalidContentCommandError(
      'Converta o gabarito global guardado antes de editar este bloco.',
    )
  const descriptor = Object.getOwnPropertyDescriptor(previous, 'projectExamples')
  if (!descriptor || ('value' in descriptor && descriptor.value === undefined)) return incoming
  if (!('value' in descriptor))
    throw new InvalidContentCommandError('Os exemplos guardados estão inválidos.')
  const read = readStudioProjectExamples(descriptor.value)
  if (read.kind !== 'valid')
    throw new InvalidContentCommandError('Os exemplos guardados estão inválidos.')
  const studio = incoming as T & Partial<Extract<LessonBlockContent, { kind: 'studio' }>>
  if (incoming.kind !== 'studio' || studio.gallery !== undefined) {
    if (!Object.keys(read.value.sections).length && !Object.keys(read.value.examples).length)
      return incoming
    throw new InvalidContentCommandError(
      'Remova as associações de exemplos antes de trocar o tipo deste Estúdio.',
    )
  }
  const issues = studioProjectExampleEnvironmentIssues(read.value, studio.initialProject)
  if (issues.length)
    throw new InvalidContentCommandError(
      issues[0]?.message ?? 'O ambiente dos exemplos é incompatível.',
    )
  return { ...incoming, projectExamples: read.value }
}
