import { ForbiddenError, UnauthorizedError } from '@sistemazero/core/http'
import { Elysia, t } from 'elysia'
import type { KidsJourneyConfigurationService } from '../../../application/kids-journey/kids-journey-configuration.service'
import { assertInternalCaller, requireAdmin, resolveAccountId, resolveUserId } from '../auth'

const version = t.Integer({ minimum: 1, maximum: 2_147_483_646 })
const hash = t.String({ pattern: '^[a-f0-9]{64}$' })
const params = t.Object({ id: t.String({ format: 'uuid' }) })

/** Read-only staff access is distinct from publication/configuration by an active Admin account. */
function policyActor(headers: Record<string, string | undefined>): string {
  requireAdmin(headers, true)
  if (headers['x-auth-user-role'] !== 'admin' && headers['x-auth-user-role'] !== 'superadmin')
    throw new ForbiddenError('Somente administradores podem alterar a jornada global.')
  const actorId = resolveUserId(headers)
  if (
    resolveAccountId(headers) !== actorId ||
    headers['x-auth-account-id'] !== undefined ||
    headers['x-auth-profile-name'] !== undefined ||
    headers['x-auth-profile-public'] !== undefined ||
    headers['x-auth-impersonator-id'] !== undefined ||
    headers['x-auth-impersonation-mode'] !== undefined ||
    headers['x-auth-kids-context']
  )
    throw new ForbiddenError('Use sua conta administrativa para alterar a jornada global.')
  return actorId
}

/** Mount only with the canonical reader/award/admission rollout; no public/internal wildcard. */
export function kidsJourneyRoutes(deps: {
  service: KidsJourneyConfigurationService
  internalToken: string | undefined
}) {
  return new Elysia({ name: 'kids-journey-configuration', prefix: '/members/admin/journey/kids' })
    .onTransform(({ headers, set }) => {
      if (!deps.internalToken) throw new UnauthorizedError('Origem administrativa não configurada')
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      requireAdmin(headers, true)
      set.headers['cache-control'] = 'private, no-store'
    })
    .get('', async ({ headers }) => {
      // Presentation metadata uses the exact mutation guard, captured before the read.
      let canEdit = false
      try {
        policyActor(headers)
        canEdit = true
      } catch (error) {
        if (!(error instanceof ForbiddenError) && !(error instanceof UnauthorizedError)) throw error
      }
      return { ...(await deps.service.policy()), permissions: { canEdit } }
    })
    .get('/history', ({ query }) => deps.service.history(query), {
      query: t.Object({
        beforeVersion: t.Optional(version),
        limit: t.Optional(t.Integer({ minimum: 1, maximum: 100 })),
      }),
    })
    .post(
      '/preview',
      ({ body }) =>
        deps.service.preview(
          { expectedVersion: body.expectedVersion, policy: body.policy },
          body.profiles,
        ),
      {
        body: t.Object(
          {
            expectedVersion: version,
            policy: t.Unknown(),
            profiles: t.Optional(
              t.Array(
                t.Object({
                  userId: t.String({ format: 'uuid' }),
                  accountId: t.String({ format: 'uuid' }),
                }),
                { maxItems: 20 },
              ),
            ),
          },
          { additionalProperties: false },
        ),
      },
    )
    .post(
      '/preparations',
      ({ headers, body }) =>
        deps.service.prepare({
          expectedVersion: body.expectedVersion,
          policy: body.policy,
          reason: body.reason,
          actorId: policyActor(headers),
        }),
      {
        body: t.Object(
          {
            expectedVersion: version,
            policy: t.Unknown(),
            reason: t.String({ minLength: 1, maxLength: 500 }),
          },
          { additionalProperties: false },
        ),
      },
    )
    .get('/preparations/:id', ({ params }) => deps.service.preparation(params.id), { params })
    .post(
      '/preparations/:id/advance',
      ({ headers, params }) => {
        policyActor(headers)
        return deps.service.advance(params.id)
      },
      { params },
    )
    .post(
      '/preparations/:id/publish',
      ({ headers, params, body }) =>
        deps.service.publish({
          preparationId: params.id,
          expectedVersion: body.expectedVersion,
          draftHash: body.draftHash,
          catalogHash: body.catalogHash,
          cohortHash: body.cohortHash,
          actorId: policyActor(headers),
        }),
      {
        params,
        body: t.Object(
          { expectedVersion: version, draftHash: hash, catalogHash: hash, cohortHash: hash },
          { additionalProperties: false },
        ),
      },
    )
}
