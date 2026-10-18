import { ValidationError } from '@sistemazero/core/errors'
import { StudioLivePublicationRuntimeRequestSchema } from '@sistemazero/core/studio/runtime-authorization'
import { Elysia, t } from 'elysia'
import type { LivePublicationService } from '../../../application/live/live-publication.service'
import type { AuthorizeLivePublicationRuntimeService } from '../../../application/studio/authorize-live-publication-runtime.service'
import { AccessDeniedError } from '../../../domain/entitlement/entitlement.errors'
import type { LiveBenefitsPort } from '../../../domain/ports/live-benefits.port'
import { assertInternalCaller, assertNoLiveSupportWrite } from '../auth'
import { resolveLiveActor } from './live.routes'

const uuid = () => t.String({ format: 'uuid' })
export function livePublicationRoutes(deps: {
  publication: LivePublicationService
  internalToken?: string
  benefits?: LiveBenefitsPort
  runtime?: AuthorizeLivePublicationRuntimeService
}) {
  return new Elysia({ name: 'live-publication' })
    .onBeforeHandle(({ headers, set }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      set.headers['cache-control'] = 'private, no-store'
    })
    .get(
      '/members/live/workspaces/:id/showcase',
      ({ headers, params, query }) => {
        // Preparing is the first step of publishing as the child: never in a support session.
        assertNoLiveSupportWrite(headers, 'POST')
        return deps.publication.prepare(
          resolveLiveActor(headers),
          params.id,
          query.revision,
          query.clientIdempotencyKey,
          query.audience,
        )
      },
      {
        params: t.Object({ id: uuid() }),
        query: t.Object({
          audience: t.Optional(t.Union([t.Literal('kids'), t.Literal('adult')])),
          revision: t.Numeric({ minimum: 1, multipleOf: 1 }),
          clientIdempotencyKey: uuid(),
        }),
      },
    )
    .post(
      '/members/live/workspaces/:id/publication-runtime',
      async ({ headers, params, body }) => {
        assertNoLiveSupportWrite(headers, 'POST')
        if (params.id !== body.context.workspaceId)
          throw new ValidationError('Projeto da oficina inválido.')
        if (!deps.runtime)
          throw new AccessDeniedError('O ambiente deste projeto não está disponível.')
        return deps.runtime.execute(resolveLiveActor(headers), body)
      },
      { params: t.Object({ id: uuid() }), body: StudioLivePublicationRuntimeRequestSchema },
    )
    .post(
      '/members/internal/live/mural-access',
      async ({ body }) => ({
        allowed: (await deps.benefits?.hasMural(body.accountId, body.userId, new Date())) ?? false,
      }),
      { body: t.Object({ userId: uuid(), accountId: uuid() }) },
    )
    .post(
      '/members/internal/live/showcase-eligibility',
      ({ body }) => deps.publication.verify(body),
      {
        body: t.Object({
          userId: uuid(),
          accountId: uuid(),
          workspaceId: uuid(),
          revision: t.Number({ minimum: 1, multipleOf: 1 }),
          playId: uuid(),
          audience: t.Optional(t.Union([t.Literal('kids'), t.Literal('adult')])),
          publicationToken: t.String({ minLength: 1, maxLength: 4096 }),
        }),
      },
    )
}
