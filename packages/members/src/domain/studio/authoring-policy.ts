import type { StudioAuthoringCatalog } from '@sistemazero/core/studio/authoring-catalog'
import type { StudioProjectCuration } from '@sistemazero/core/studio/project-capabilities'
import type { StudioProjectDocument } from '@sistemazero/core/studio/project-document'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { InvalidContentCommandError } from '../course/course.errors'
import { createStudioProjectPolicy } from './project-policy'

/** A publication check, not an execution grant. The host owns the verified configuration. */
export interface StudioAuthoringPolicy {
  assert(project: StudioProjectDocument, curation: StudioProjectCuration): void
  describe(): StudioAuthoringCatalog
}

/** Only trusted deployment configuration enters here; never a request/project field. */
export async function createStudioAuthoringPolicy(raw: unknown): Promise<StudioAuthoringPolicy> {
  const policy = await createStudioProjectPolicy(raw)
  return {
    // A caller may prepare UI options, but cannot mutate the server's approval policy.
    describe: policy.describe,
    assert(project, curation) {
      const resolved = policy.resolve(studioRuntimeSubject(project), {
        hostOperations: [],
        grantedCapabilities: [],
        curation,
      })
      if (resolved.releaseStatus !== 'active')
        throw new InvalidContentCommandError(
          'Escolha um ambiente ativo antes de publicar novos projetos para a turma.',
        )
    },
  }
}
