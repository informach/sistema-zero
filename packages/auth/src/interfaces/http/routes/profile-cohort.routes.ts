import { UnauthorizedError } from '@sistemazero/core/http'
import { Elysia, t } from 'elysia'
import type { ReadProfileCohortService } from '../../../application/internal/read-profile-cohort.service'
import { MAX_PROFILE_COHORT_PAGE } from '../../../domain/ports/profile-cohort-repository.port'
import { requireInternalToken } from '../internal-auth'

/** Separate from ownership: bootstrap reads all profiles, including ones that cannot authorize a session. */
export function profileCohortRoutes(deps: {
  read: ReadProfileCohortService
  internalToken: string | undefined
}) {
  const limit = t.Integer({ minimum: 1, maximum: MAX_PROFILE_COHORT_PAGE })
  return new Elysia().post(
    '/auth/internal/kids-journey/profile-cohort',
    ({ headers, body, set }) => {
      // Unlike generic dev S2S routes, a complete cohort is never exposed without a configured token.
      if (!deps.internalToken || headers['x-auth-user-id'] || headers['x-auth-impersonator-id'])
        throw new UnauthorizedError('Origem interna inválida')
      requireInternalToken(headers, deps.internalToken)
      set.headers['cache-control'] = 'private, no-store'
      return deps.read.execute(body)
    },
    {
      body: t.Union([
        t.Object({ kind: t.Literal('start'), limit }, { additionalProperties: false }),
        t.Object(
          {
            kind: t.Literal('continue'),
            upperBound: t.String({ format: 'uuid' }),
            cursor: t.Union([t.String({ format: 'uuid' }), t.Null()]),
            limit,
          },
          { additionalProperties: false },
        ),
      ]),
    },
  )
}
