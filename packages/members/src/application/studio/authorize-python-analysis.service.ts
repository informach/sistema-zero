import {
  type StudioPythonAnalysisAuthorization,
  StudioPythonAnalysisAuthorizationSchema,
} from '@sistemazero/core/studio/python-language-authorization'
import { StudioContextualRuntimeDecisionSchema } from '@sistemazero/core/studio/runtime-authorization'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import type { AuthorizeAuthoringRuntimeService } from './authorize-authoring-runtime.service'
import type { AuthorizeFreeRuntimeService } from './authorize-free-runtime.service'
import type { AuthorizeLessonRuntimeService } from './authorize-lesson-runtime.service'
import type { AuthorizeLiveRuntimeService } from './authorize-live-runtime.service'

export interface PythonAnalysisActor {
  audience?: 'kids' | 'adult'
  userId: string
  accountId: string
  name: string
  privileged: boolean
  readOnly: boolean
}

/** Same domain authorization as execution, reached through a separate analysis
 * quota. No reusable browser decision, entitlement cache or language-process state. */
export class AuthorizePythonAnalysisService {
  constructor(
    private readonly services: {
      lesson?: Pick<AuthorizeLessonRuntimeService, 'execute'>
      authoring?: Pick<AuthorizeAuthoringRuntimeService, 'execute'>
      free?: Pick<AuthorizeFreeRuntimeService, 'execute'>
      live?: Pick<AuthorizeLiveRuntimeService, 'execute'>
    },
  ) {}

  async execute(actor: PythonAnalysisActor, raw: StudioPythonAnalysisAuthorization) {
    if (actor.readOnly)
      throw new AccessDeniedError('A prévia de suporte não inicia análise neste projeto.')
    const input = StudioPythonAnalysisAuthorizationSchema.parse(raw)
    const { context, ...candidate } = input
    switch (context.kind) {
      case 'lesson': {
        if (!this.services.lesson) break
        return StudioContextualRuntimeDecisionSchema.parse(
          await this.services.lesson.execute(
            actor,
            { lessonId: context.lessonId, blockId: context.blockId },
            { ...candidate, baselineId: context.baselineId },
          ),
        )
      }
      case 'authoring': {
        if (!this.services.authoring) break
        return StudioContextualRuntimeDecisionSchema.parse(
          await this.services.authoring.execute(actor, { ...candidate, context }),
        )
      }
      case 'free': {
        if (!this.services.free || !actor.audience) break
        return StudioContextualRuntimeDecisionSchema.parse(
          await this.services.free.execute(
            { ...actor, audience: actor.audience },
            { ...candidate, context },
          ),
        )
      }
      case 'live': {
        if (!this.services.live) break
        const { expectedWorkspaceRevision, ...lease } = context
        return StudioContextualRuntimeDecisionSchema.parse(
          await this.services.live.execute(
            {
              id: actor.userId,
              accountId: actor.accountId,
              name: actor.name,
              staff: actor.privileged,
            },
            { ...candidate, context: lease, expectedWorkspaceRevision },
          ),
        )
      }
    }
    throw new AccessDeniedError('A análise Python ainda não está disponível neste contexto.')
  }
}
