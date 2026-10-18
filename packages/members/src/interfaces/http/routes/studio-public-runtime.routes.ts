import { StudioPublicRuntimeRequestSchema } from '@sistemazero/core/studio/runtime-authorization'
import { Elysia } from 'elysia'
import type { AuthorizePublicRuntimeService } from '../../../application/studio/authorize-public-runtime.service'
import { AccessDeniedError } from '../../../domain/entitlement/entitlement.errors'
import { assertInternalCaller, assertMemberShellConsumer } from '../auth'

export function studioPublicRuntimeRoutes(deps: {
  service?: AuthorizePublicRuntimeService
  internalToken?: string
}) {
  return new Elysia({ name: 'studio-public-runtime' })
    .onTransform(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      assertMemberShellConsumer(headers['x-consumer-id'])
    })
    .post(
      '/members/internal/studio/public-runtime',
      async ({ body, set }) => {
        set.headers['Cache-Control'] = 'private, no-store'
        if (!deps.service) throw new AccessDeniedError('O ambiente deste jogo não está disponível.')
        return deps.service.execute(body)
      },
      { body: StudioPublicRuntimeRequestSchema },
    )
}
