import type { StudioMasteryReviewRuntimeRequest } from '@sistemazero/core/studio/runtime-authorization'
import type { PythonProjectDocument } from '../core/editableProject'
import { createContextualRuntimeEnvironmentCore } from './contextEnvironmentCore'

/** Read-only review has a snapshot-bound parser, without language server, source upload or draft authority. */
export function createMasteryReviewPythonRuntimeEnvironment(options: {
  project: PythonProjectDocument
  userId: string
  submissionId: string
  signal: AbortSignal
  request(input: StudioMasteryReviewRuntimeRequest, signal: AbortSignal): Promise<unknown>
  clock?: () => number
}) {
  const context = { kind: 'mastery-review' as const, submissionId: options.submissionId }
  return createContextualRuntimeEnvironmentCore(
    {
      project: options.project,
      scope: { userId: options.userId, context },
      signal: options.signal,
      clock: options.clock,
      request: (candidate, signal) =>
        options.request(
          candidate.operation === 'analyze' ? { context, operation: 'analyze' } : { context },
          signal,
        ),
    },
    null,
  )
}
