import { Elysia, t } from 'elysia'
import type { AccessCheckService } from '../../../application/access-check/access-check.service'
import type { StudioBuilderService } from '../../../application/studio-pro/studio-builder.service'
import { StudioAiUnavailableError } from '../../../domain/ai-usage/studio-ai.errors'
import { AccessDeniedError } from '../../../domain/entitlement/entitlement.errors'
import { assertInternalCaller, assertMemberShellConsumer } from '../auth'

export function studioBuilderRoutes(deps: {
  service?: StudioBuilderService
  internalToken?: string
  accessCheck: AccessCheckService
}) {
  return new Elysia({ prefix: '/members/internal/studio-ai' })
    .onTransform(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      assertMemberShellConsumer(headers['x-consumer-id'])
    })
    .post('/builder/cleanup', async ({ set }) => {
      set.headers['Cache-Control'] = 'no-store'
      if (!deps.service) throw new StudioAiUnavailableError()
      return { deleted: await deps.service.purgeExpired() }
    })
    .post(
      '/builder/history',
      async ({ body, set }) => {
        set.headers['Cache-Control'] = 'no-store'
        if (!deps.service) throw new StudioAiUnavailableError()
        if (!body.actor.privileged) {
          const access = await deps.accessCheck.execute(body.actor.accountId, ['estudio-completo'])
          if (
            !access.grants.includes('estudio-completo') &&
            !access.communities.includes('estudio-completo')
          )
            throw new AccessDeniedError('Você não tem acesso ao Estúdio Completo')
        }
        return { page: await deps.service.list(body.actor, body.query) }
      },
      {
        body: t.Object({
          actor: t.Object({
            accountId: t.String({ format: 'uuid' }),
            userId: t.String({ format: 'uuid' }),
            privileged: t.Boolean(),
          }),
          query: t.Unknown(),
        }),
      },
    )
    .post(
      '/builder',
      async ({ body, set }) => {
        set.headers['Cache-Control'] = 'no-store'
        if (!deps.service) throw new StudioAiUnavailableError()
        const removingProject =
          body.command !== null &&
          typeof body.command === 'object' &&
          'operation' in body.command &&
          body.command.operation === 'remove-project'
        if (!body.actor.privileged && !removingProject) {
          const access = await deps.accessCheck.execute(body.actor.accountId, ['estudio-completo'])
          if (
            !access.grants.includes('estudio-completo') &&
            !access.communities.includes('estudio-completo')
          )
            throw new AccessDeniedError('Você não tem acesso ao Estúdio Completo')
        }
        return { state: await deps.service.execute(body.actor, body.command) }
      },
      {
        body: t.Object({
          actor: t.Object({
            accountId: t.String({ format: 'uuid' }),
            userId: t.String({ format: 'uuid' }),
            privileged: t.Boolean(),
          }),
          command: t.Unknown(),
        }),
      },
    )
}
