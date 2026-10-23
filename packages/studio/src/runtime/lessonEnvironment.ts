import type { StudioProjectDocument } from '@sistemazero/core/studio/project-document'
import type { StudioLessonRuntimeRequest } from '@sistemazero/core/studio/runtime-authorization'
import { createContextualRuntimeEnvironment } from './contextEnvironment'
import type { ContextualRuntimeEnvironmentOptions } from './contextEnvironmentCore'

/** Recorded lessons keep their original confirmed baseline for the whole editor lifetime. */
export function createLessonRuntimeEnvironment(options: {
  project: StudioProjectDocument
  scope: { userId: string; lessonId: string; blockId: string; baselineId: string }
  signal: AbortSignal
  request(input: StudioLessonRuntimeRequest, signal: AbortSignal): Promise<unknown>
  languageRequest: NonNullable<
    NonNullable<ContextualRuntimeEnvironmentOptions['language']>['request']
  >
  clock?: () => number
}) {
  const { userId, lessonId, blockId, baselineId } = options.scope
  const context = { kind: 'lesson' as const, lessonId, blockId, baselineId }
  return createContextualRuntimeEnvironment({
    ...options,
    scope: { userId, context },
    language: { context: () => context, request: options.languageRequest },
    request: (candidate, signal) => options.request({ ...candidate, baselineId }, signal),
  })
}
