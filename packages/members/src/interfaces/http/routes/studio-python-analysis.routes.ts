import { StudioPythonAnalysisAuthorizationSchema } from '@sistemazero/core/studio/python-language-authorization'
import { Elysia } from 'elysia'
import type { AuthorizePythonAnalysisService } from '../../../application/studio/authorize-python-analysis.service'
import { AccessDeniedError } from '../../../domain/entitlement/entitlement.errors'
import {
  assertInternalCaller,
  isPrivilegedActor,
  resolveAccountId,
  resolveAdultLearnerId,
  resolveStudentName,
  resolveStudioFreeActor,
  resolveUserId,
} from '../auth'
import { AudienceQuery } from '../dtos'

export function studioPythonAnalysisRoutes(deps: {
  service?: AuthorizePythonAnalysisService
  internalToken?: string
}) {
  return new Elysia({ name: 'studio-python-analysis' })
    .onBeforeHandle(({ headers, set }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      set.headers['Cache-Control'] = 'private, no-store'
    })
    .post(
      '/members/studio/python-analysis',
      ({ headers, body, query }) => {
        if (!deps.service) throw new AccessDeniedError('A análise Python não está disponível.')
        return deps.service.execute(
          {
            ...(body.context.kind === 'free'
              ? resolveStudioFreeActor(headers, query.audience ?? 'kids')
              : {}),
            ...(body.context.kind === 'lesson' ? { audience: query.audience ?? 'kids' } : {}),
            userId:
              body.context.kind === 'lesson' && query.audience === 'adult'
                ? resolveAdultLearnerId(headers)
                : resolveUserId(headers),
            accountId: resolveAccountId(headers),
            name: resolveStudentName(headers),
            privileged: isPrivilegedActor(headers),
            readOnly: Boolean(headers['x-auth-impersonator-id']),
          },
          body,
        )
      },
      { body: StudioPythonAnalysisAuthorizationSchema, query: AudienceQuery },
    )
}
