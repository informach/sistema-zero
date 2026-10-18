import type { StudioProjectDocument } from '@sistemazero/core/studio/project-document'
import type { StudioLessonRuntimeRequest } from '@sistemazero/core/studio/runtime-authorization'
import { createContextualRuntimeEnvironment } from './contextEnvironment'

/** Recorded lessons keep their original confirmed baseline for the whole editor lifetime. */
export function createLessonRuntimeEnvironment(options: {
  project: StudioProjectDocument
  scope: { userId: string; lessonId: string; blockId: string; baselineId: string }
  signal: AbortSignal
  request(input: StudioLessonRuntimeRequest, signal: AbortSignal): Promise<unknown>
  clock?: () => number
}) {
  const { userId, lessonId, blockId, baselineId } = options.scope
  return createContextualRuntimeEnvironment({
    ...options,
    scope: { userId, context: { kind: 'lesson', lessonId, blockId, baselineId } },
    request: (candidate, signal) => options.request({ ...candidate, baselineId }, signal),
  })
}
