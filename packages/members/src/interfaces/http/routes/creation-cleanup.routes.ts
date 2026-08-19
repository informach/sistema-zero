import { Elysia } from 'elysia'
import type { CreationCleanupService } from '../../../application/admin/creation-cleanup/creation-cleanup.service'
import { assertInternalCaller } from '../auth'
import { CreationCleanupFailureBody, IdParams } from '../dtos'

/** Endpoints S2S consumidos pelo worker do member-shell (autenticado via gateway HMAC). */
export function creationCleanupRoutes(deps: {
  cleanup: CreationCleanupService
  internalToken?: string
}) {
  return new Elysia({ prefix: '/members/internal/creation-cleanups' })
    .onTransform(({ headers }) =>
      assertInternalCaller(headers['x-internal-token'], deps.internalToken),
    )
    .post('/claim', async ({ set }) => {
      const job = await deps.cleanup.claim()
      if (!job) {
        set.status = 204
        return
      }
      return { job }
    })
    .post(
      '/:id/complete',
      async ({ params }) => ({ completed: await deps.cleanup.complete(params.id) }),
      { params: IdParams },
    )
    .post(
      '/:id/fail',
      async ({ params, body }) => ({
        released: await deps.cleanup.fail(params.id, body.error, body.attempts),
      }),
      { params: IdParams, body: CreationCleanupFailureBody },
    )
}
