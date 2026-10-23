import { awaitWithSignal } from '@sistemazero/core/http'
import {
  type SectionPythonProjectCheck,
  sectionPythonProjectActivity,
} from '@sistemazero/core/learning'
import { studioProjectContinuityIssue } from '@sistemazero/core/studio/project-continuity'
import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import { apiSend } from '../../lib/api'
import type { StudioAuthoringRuntimeScope } from './use-studio-authoring-runtime'

/** Formative browser inspection only. Members independently inspects a student's submitted gate. */
export async function inspectPythonSectionProject(input: {
  project: unknown
  referenceProject?: unknown
  checks: readonly SectionPythonProjectCheck[]
  scope: StudioAuthoringRuntimeScope
  signal: AbortSignal
  assertCurrent(): void
}) {
  const lifetime = new AbortController()
  const signal = AbortSignal.any([input.signal, lifetime.signal, AbortSignal.timeout(60000)])
  const scope = structuredClone(input.scope)
  const activity = sectionPythonProjectActivity(input.checks, '')
  const rawProject = copyStudioProjectJson(input.project)
  const rawReference =
    input.referenceProject === undefined ? undefined : copyStudioProjectJson(input.referenceProject)
  const currentAssertion = input.assertCurrent
  const assertCurrent = () => {
    signal.throwIfAborted()
    currentAssertion()
  }
  const owned = <Value>(operation: () => Promise<Value>) => awaitWithSignal(operation, signal)
  try {
    assertCurrent()
    const { refinePythonProjectDocument } = await owned(
      () => import('@sistemazero/studio/python-project-validation'),
    )
    let project = await owned(() => refinePythonProjectDocument(rawProject))
    if (rawReference !== undefined) {
      const reference = await owned(() => refinePythonProjectDocument(rawReference))
      if (studioProjectContinuityIssue(project, reference))
        throw new Error('Escolha um projeto salvo no mesmo ambiente Python desta aula.')
      // The simulation is scoped to the authored workspace; source files/assets remain unchanged.
      project = { ...project, id: reference.id }
    }
    assertCurrent()
    const { createContextualRuntimeEnvironment } = await owned(
      () => import('@sistemazero/studio/contextual-runtime'),
    )
    const environment = await owned(() =>
      createContextualRuntimeEnvironment({
        project,
        scope,
        signal,
        request: (candidate, authorizationSignal) =>
          apiSend(
            '/api/members/studio/authoring-runtime',
            'POST',
            { ...candidate, context: scope.context },
            { signal: authorizationSignal },
          ),
      }),
    )
    assertCurrent()
    const { runPythonActivity } = await owned(() => import('@sistemazero/studio/python-activity'))
    const grade = await owned(() =>
      runPythonActivity(project, activity, { environment, signal, assertCurrent }),
    )
    assertCurrent()
    return grade.results.map((result) => ({
      ...result,
      label: activity.checks.find((check) => check.id === result.checkId)!.label,
    }))
  } finally {
    lifetime.abort()
  }
}
