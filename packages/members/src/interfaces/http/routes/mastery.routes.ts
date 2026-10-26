import { ForbiddenError } from '@sistemazero/core/http'
import { StudioMasteryReviewRuntimeSourceRequestSchema } from '@sistemazero/core/studio/runtime-authorization'
import { Elysia, t } from 'elysia'
import type { MasteryService } from '../../../application/mastery/mastery.service'
import type { AuthorizeMasteryReviewRuntimeService } from '../../../application/studio/authorize-mastery-review-runtime.service'
import {
  assertInternalCaller,
  requireAdmin,
  resolveAccountId,
  resolveStudioFreeActor,
  resolveUserId,
} from '../auth'

const audience = t.Union([t.Literal('kids'), t.Literal('adult')])
const learnerQuery = t.Object({ audience })
function reviewer(headers: Record<string, string | undefined>) {
  requireAdmin(headers, true)
  const id = resolveUserId(headers)
  if (
    id !== resolveAccountId(headers) ||
    headers['x-auth-account-id'] ||
    headers['x-auth-kids-context'] ||
    headers['x-auth-impersonator-id'] ||
    headers['x-auth-impersonation-mode']
  )
    throw new ForbiddenError('Use sua própria conta da equipe para revisar Maestrias.')
  return id
}
export function masteryRoutes(deps: {
  service: Pick<MasteryService, 'get' | 'evidence' | 'submit' | 'queue' | 'detail' | 'review'>
  runtime?: Pick<AuthorizeMasteryReviewRuntimeService, 'execute'>
  internalToken?: string
}) {
  return new Elysia({ name: 'creator-masteries' })
    .onTransform(({ headers, set }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      set.headers['cache-control'] = 'private, no-store'
    })
    .get(
      '/members/journey/masteries',
      ({ headers, query }) => deps.service.get(resolveStudioFreeActor(headers, query.audience)),
      { query: learnerQuery },
    )
    .get(
      '/members/journey/masteries/evidence',
      ({ headers, query }) =>
        deps.service.evidence(resolveStudioFreeActor(headers, query.audience)),
      { query: learnerQuery },
    )
    .post(
      '/members/journey/masteries/:areaId/levels/:level/submissions',
      ({ headers, query, params, body }) => {
        const actor = resolveStudioFreeActor(headers, query.audience)
        if (actor.readOnly)
          throw new ForbiddenError('A sessão de suporte não pode enviar uma Maestria.')
        return deps.service.submit(actor, params.areaId, params.level, body)
      },
      {
        query: learnerQuery,
        params: t.Object({
          areaId: t.String({ minLength: 1, maxLength: 80 }),
          level: t.Numeric({ minimum: 1, maximum: 3 }),
        }),
        body: t.Object({
          evidenceId: t.String({ format: 'uuid' }),
          message: t.Optional(t.String({ maxLength: 1000 })),
        }),
      },
    )
    .get(
      '/members/admin/journey/masteries/submissions',
      ({ headers, query }) => {
        requireAdmin(headers, true)
        return deps.service.queue({
          audience: query.audience,
          status: query.status ?? 'pending',
          limit: query.limit ?? 30,
          offset: query.offset ?? 0,
        })
      },
      {
        query: t.Object({
          audience,
          status: t.Optional(
            t.Union([t.Literal('pending'), t.Literal('reviewed'), t.Literal('all')]),
          ),
          limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
          offset: t.Optional(t.Numeric({ minimum: 0, maximum: 100000 })),
        }),
      },
    )
    .get(
      '/members/admin/journey/masteries/submissions/:id',
      ({ headers, params }) => {
        requireAdmin(headers, true)
        return deps.service.detail(params.id)
      },
      { params: t.Object({ id: t.String({ format: 'uuid' }) }) },
    )
    .post(
      '/members/admin/journey/masteries/submissions/:id/review',
      ({ headers, params, body }) => deps.service.review(params.id, reviewer(headers), body),
      {
        params: t.Object({ id: t.String({ format: 'uuid' }) }),
        body: t.Unknown(),
      },
    )
    .post(
      '/members/admin/studio/mastery-review-runtime',
      ({ headers, body, request }) => {
        const userId = reviewer(headers)
        if (!deps.runtime) throw new ForbiddenError('O ambiente de revisão não está disponível.')
        return deps.runtime.execute(
          { userId, accountId: userId, privileged: true, readOnly: false },
          body,
          AbortSignal.any([request.signal, AbortSignal.timeout(50_000)]),
        )
      },
      { body: StudioMasteryReviewRuntimeSourceRequestSchema },
    )
}
