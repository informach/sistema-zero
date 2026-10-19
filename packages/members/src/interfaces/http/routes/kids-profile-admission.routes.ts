import { IDENTITY_UUID_PATTERN } from '@sistemazero/core/identity'
import { UnauthorizedError } from '@sistemazero/core/http'
import { Elysia, t } from 'elysia'
import type { KidsProfileAdmissionService } from '../../../application/kids-journey/kids-profile-admission.service'
import { assertInternalCaller } from '../auth'

/** Private direct Auth→Members route; never registered in the public API gateway. */
export function kidsProfileAdmissionRoutes(deps: {
  service: KidsProfileAdmissionService
  admissionToken: string | undefined
}) {
  return new Elysia({ prefix: '/members/internal/kids-journey' })
    .onTransform(({ headers }) => {
      // Unlike general local S2S helpers, missing admission configuration always fails closed.
      if (!deps.admissionToken) throw new UnauthorizedError('Profile admission is not configured')
      assertInternalCaller(headers['x-internal-token'], deps.admissionToken)
      if (headers['x-auth-user-id'] || headers['x-auth-impersonator-id'])
        throw new UnauthorizedError('Profile admission requires the Auth service context')
    })
    .post(
      '/admission',
      async ({ body, set }) => {
        set.headers['cache-control'] = 'private, no-store'
        const receipt = await deps.service.initialize(body)
        if (!receipt) {
          set.status = 202
          return { status: 'not_ready' as const }
        }
        return receipt
      },
      {
        body: t.Object(
          { userId: t.String({ pattern: IDENTITY_UUID_PATTERN }), accountId: t.String({ pattern: IDENTITY_UUID_PATTERN }) },
          { additionalProperties: false },
        ),
      },
    )
}
