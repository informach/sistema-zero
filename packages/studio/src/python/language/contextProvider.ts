import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { studioProjectContinuityIssue } from '@sistemazero/core/studio/project-continuity'
import type { StudioProjectDocument } from '@sistemazero/core/studio/project-document'
import type { StudioPythonAnalysisAuthorization } from '@sistemazero/core/studio/python-language-authorization'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { createPythonLanguageHttpProvider } from './httpProvider'

/** The editor supplies its current store, never a captured seed or runtime grant. */
export function createPythonAnalysisAuthorization(options: {
  initialProject: StudioProjectDocument
  project(): StudioProjectDocument | null
  context(): StudioPythonAnalysisAuthorization['context']
}) {
  const initial = studioRuntimeSubject(options.initialProject)
  const changed = () => new DOMException('O contexto da análise Python mudou.', 'AbortError')
  function current(projectId: string) {
    const project = options.project()
    if (
      project?.programmingLanguage !== 'python' ||
      project.id !== projectId ||
      project.id !== initial.id ||
      studioProjectContinuityIssue(project, initial)
    )
      throw changed()
    return project
  }
  return async (
    projectId: string,
    signal: AbortSignal,
  ): Promise<StudioPythonAnalysisAuthorization> => {
    signal.throwIfAborted()
    const subject = studioRuntimeSubject(current(projectId))
    const context = structuredClone(options.context())
    const revision = await sha256Hex(canonicalJson(subject))
    signal.throwIfAborted()
    if (canonicalJson(studioRuntimeSubject(current(projectId))) !== canonicalJson(subject))
      throw changed()
    return { context, subject, revision, operation: 'analyze' }
  }
}

export function createContextualPythonLanguageProvider(options: {
  initialProject: StudioProjectDocument
  project(): StudioProjectDocument | null
  context(): StudioPythonAnalysisAuthorization['context']
  signal: AbortSignal
  schedule?(operation: () => Promise<Response>): Promise<Response>
  request?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}) {
  return createPythonLanguageHttpProvider({
    signal: options.signal,
    schedule: options.schedule,
    request: options.request,
    authorization: createPythonAnalysisAuthorization(options),
  })
}
