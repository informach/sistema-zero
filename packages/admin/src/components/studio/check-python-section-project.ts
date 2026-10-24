import { awaitWithSignal } from '@sistemazero/core/http'
import {
  type SectionPythonProjectCheck,
  SectionPythonProjectTestResponseSchema,
} from '@sistemazero/core/learning'
import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import { apiSend } from '../../lib/api'
import type { StudioAuthoringRuntimeScope } from './use-studio-authoring-runtime'

/** Same server checker as the learner gate. The Admin browser never decides correctness. */
export async function checkPythonSectionProject(input: {
  project: unknown
  referenceProject?: unknown
  checks: readonly SectionPythonProjectCheck[]
  scope: StudioAuthoringRuntimeScope
  signal: AbortSignal
  assertCurrent(): void
}) {
  const lifetime = new AbortController()
  const signal = AbortSignal.any([input.signal, lifetime.signal, AbortSignal.timeout(170_000)])
  const scope = structuredClone(input.scope),
    checks = structuredClone(input.checks)
  const project = copyStudioProjectJson(input.project)
  const referenceProject =
    input.referenceProject === undefined ? undefined : copyStudioProjectJson(input.referenceProject)
  const assertOwnerCurrent = input.assertCurrent
  const assertCurrent = () => {
    signal.throwIfAborted()
    assertOwnerCurrent()
  }
  try {
    assertCurrent()
    const raw = await awaitWithSignal(
      () =>
        apiSend(
          '/api/members/python-project-checks/test',
          'POST',
          {
            project,
            ...(referenceProject === undefined ? {} : { referenceProject }),
            checks,
            context: scope.context,
          },
          { signal },
        ),
      signal,
    )
    assertCurrent()
    const grade = SectionPythonProjectTestResponseSchema.parse(raw)
    if (
      grade.results.length !== checks.length ||
      new Set(grade.results.map((result) => result.checkId)).size !== checks.length ||
      checks.some((check) => !grade.results.some((result) => result.checkId === check.id))
    )
      throw new Error('O servidor não relatou exatamente os objetivos solicitados.')
    return grade.results.map((result) => ({
      ...result,
      label: checks.find((check) => check.id === result.checkId)!.label,
    }))
  } catch (error) {
    signal.throwIfAborted()
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string' &&
      !(error instanceof Error)
    )
      throw new Error(error.message, { cause: error })
    throw error
  } finally {
    lifetime.abort()
  }
}
